import type { Page } from "puppeteer";
import { consoleLog, randomDelay, randomDelayAfterError } from "@/utils.ts";
import {
  timeZone,
  timeLocale,
  localeOptions,
  appointmentDatesUrl,
  rescheduleAppointmentUrl,
  host,
  signInUrl,
  userAgent,
  getAppointmentTimesUrl,
} from "@/constants";
import fs from "fs";
import { sendDiscordNotification } from "@/discord";
import moment from "moment-timezone";
import { setupPuppeteer } from "@/puppeteer";
import { signIn } from "@/signIn";
import { book } from "@/book";

const screenshotsDir = "screenshots";
if (!fs.existsSync(screenshotsDir)) {
  fs.mkdirSync(screenshotsDir);
}

let currentPage: Page | undefined = undefined;

export async function bookEarlierAppointment({
  currentDate,
  minDate,
}: {
  currentDate: Date;
  minDate: Date;
}) {
  try {
    const page = await setupPuppeteer(currentPage);
    const { csrfToken, cookiesString } = await goToAppointmentUrl(page);

    const { firstAvailableDate, firstAvailableDateStr } =
      await continuouslyGetEarliestDate({
        page,
        cookiesString,
        csrfToken,
        currentDate: currentDate,
      });

    if (firstAvailableDate >= minDate && firstAvailableDate < currentDate) {
      consoleLog("Can book this appointment date:", firstAvailableDateStr);
      const { firstAvailableTimeStr } = await continuouslyGetEarliestTime({
        page,
        cookiesString,
        csrfToken,
        dateStr: firstAvailableDateStr,
      });
      const res = await book({
        csrfToken,
        cookiesString,
        dateStr: firstAvailableDateStr,
        timeStr: firstAvailableTimeStr,
      });
      consoleLog("🟢 Booking is completed:", res);
      consoleLog(res);
    }
  } catch (error) {
    consoleLog("CheckAppointmentDate error:", error);
  }
  return;
}

async function continuouslyGetEarliestDate({
  page,
  cookiesString,
  csrfToken,
  currentDate,
}: {
  page: Page;
  cookiesString: string;
  csrfToken: string;
  currentDate: Date;
}) {
  try {
    const processStartDate = new Date();
    consoleLog("Fetching the first available date...");
    const res = await fetch(appointmentDatesUrl, {
      method: "GET",
      headers: {
        Host: host,
        Referer: rescheduleAppointmentUrl,
        "Accept-Encoding": "gzip, deflate, br",
        Connection: "keep-alive",
        "Content-Type": "*/*",
        "X-Csrf-Token": csrfToken,
        "X-Requested-With": "XMLHttpRequest",
        Cookie: cookiesString,
        "User-Agent": userAgent,
      },
    });
    consoleLog(res.status, res.statusText);

    if (res.status >= 500 && res.status < 600) {
      consoleLog(`${res.status} status code. Waiting delay and retrying...`);
      await randomDelayAfterError();
      return continuouslyGetEarliestDate({
        page,
        cookiesString,
        csrfToken,
        currentDate,
      });
    }

    if (res.status >= 400 && res.status < 500) {
      consoleLog(`${res.status} status code. Waiting delay and retrying...`);
      await randomDelayAfterError();
      consoleLog("Doesn't seem to be signed in, refreshing the page...");
      await page.reload();
      const { cookiesString: coStr, csrfToken: csStr } =
        await goToAppointmentUrl(page);
      return continuouslyGetEarliestDate({
        page,
        cookiesString: coStr,
        csrfToken: csStr,
        currentDate,
      });
    }

    const resJson = await res.json();

    const dates: {
      date: Date;
      raw: string;
    }[] = resJson.map((i: { date: string }) => ({
      date: moment.tz(i.date, "YYYY-MM-DD", timeZone).toDate(),
      raw: i.date,
    }));
    let firstAvailableDateRaw = dates[0].raw;
    let firstAvailableDate = dates[0].date;
    for (let i = 0; i < dates.length; i++) {
      if (dates[i].date < firstAvailableDate) {
        firstAvailableDateRaw = dates[i].raw;
        firstAvailableDate = dates[i].date;
      }
    }
    consoleLog(
      "First available date is:",
      firstAvailableDate.toLocaleString(timeLocale, localeOptions),
      "///",
      firstAvailableDateRaw
    );

    if (firstAvailableDate >= currentDate) {
      consoleLog("Checking the availability after delay...");
      await randomDelay();
      return continuouslyGetEarliestDate({
        page,
        cookiesString,
        csrfToken,
        currentDate,
      });
    }

    consoleLog("🟢 Found an earlier date:", firstAvailableDate);

    await sendDiscordNotification({
      currentAppointmentDate: currentDate,
      earliestAppointmentDate: firstAvailableDate,
      processEndDate: new Date(),
      processStartDate: processStartDate,
    });

    return { firstAvailableDateStr: firstAvailableDateRaw, firstAvailableDate };
  } catch (error) {
    consoleLog("GetDate error:", error);
    await randomDelayAfterError();
    return continuouslyGetEarliestDate({
      page,
      cookiesString,
      csrfToken,
      currentDate,
    });
  }
}

async function continuouslyGetEarliestTime({
  page,
  cookiesString,
  csrfToken,
  dateStr,
}: {
  page: Page;
  cookiesString: string;
  csrfToken: string;
  dateStr: string;
}) {
  try {
    consoleLog("Fetching the first available time for:", dateStr);
    const res = await fetch(getAppointmentTimesUrl(dateStr), {
      method: "GET",
      headers: {
        Host: host,
        Referer: rescheduleAppointmentUrl,
        "Accept-Encoding": "gzip, deflate, br",
        Connection: "keep-alive",
        "Content-Type": "*/*",
        "X-Csrf-Token": csrfToken,
        "X-Requested-With": "XMLHttpRequest",
        Cookie: cookiesString,
        "User-Agent": userAgent,
      },
    });
    const firstAvailableTimeStr = "";
    consoleLog(res.status, res.statusText);

    consoleLog(
      "🟢 Successfully fetched the first available time: ",
      firstAvailableTimeStr,
      " for date: ",
      dateStr
    );

    return { firstAvailableTimeStr };
  } catch (error) {
    consoleLog("GetTime error:", error);
    await randomDelayAfterError();
    return continuouslyGetEarliestTime({
      page,
      cookiesString,
      csrfToken,
      dateStr,
    });
  }
}

async function goToAppointmentUrl(page: Page) {
  consoleLog("goToAppointmentUrl function called");
  try {
    if (page.url() !== rescheduleAppointmentUrl) {
      consoleLog("Navigating to the appointment page...");
      await page.goto(rescheduleAppointmentUrl);
      consoleLog("Current url is:", page.url());
    }
    if (page.url() === signInUrl) {
      consoleLog("Url is still the sign in page.");
      await signIn(page);
      if (page.url() != rescheduleAppointmentUrl) {
        consoleLog("Signing in failed. Retrying...");
        return await goToAppointmentUrl(page);
      }
    }
    const csrfToken = await page.$eval('meta[name="csrf-token"]', (element) =>
      element.getAttribute("content")
    );
    if (!csrfToken) {
      consoleLog("CSRF token is not found. Retrying after delay...");
      await randomDelayAfterError();
      return await goToAppointmentUrl(page);
    }
    consoleLog("CSRF token is:" + csrfToken);

    const cookies = await page.cookies();
    const cookiesString = cookies
      .map((cookie) => `${cookie.name}=${cookie.value}`)
      .join("; ");
    consoleLog("Cookies are:" + cookiesString);

    return { csrfToken, cookiesString };
  } catch (error) {
    consoleLog("GoToAppointmentUrl error:", error);
    consoleLog("Retrying after delay...");
    await randomDelayAfterError();
    return await goToAppointmentUrl(page);
  }
}
