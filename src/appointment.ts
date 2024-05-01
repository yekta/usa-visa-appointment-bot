import type { Page } from "puppeteer";
import { consoleLog, randomDelay, randomDelayAfterError } from "@/utils.ts";
import {
  timeZone,
  timeLocale,
  localeOptions,
  appointmentDatesUrl,
  appointmentUrl,
  host,
  userAgent,
  getAppointmentTimesUrl,
} from "@/constants";
import fs from "fs";
import { sendDiscordNotification } from "@/discord";
import moment from "moment-timezone";
import { setupPuppeteer } from "@/puppeteer";
import { book } from "@/book";
import { getSession } from "@/session";

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
    const { csrfToken, cookiesString } = await getSession({ page });

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
    consoleLog("bookEarlierDate error:", error);
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
        Referer: appointmentUrl,
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
      consoleLog("Doesn't seem to be signed in, getting session...");
      const { cookiesString: coStr, csrfToken: csStr } = await getSession({
        page,
        reload: true,
      });
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
        Referer: appointmentUrl,
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
