import type { Page } from "puppeteer";
import { randomDelay } from "@/utils.ts";
import {
  currentAppointmentDate,
  timeZone,
  timeLocale,
  localeOptions,
  appointmentDatesUrl,
  rescheduleAppointmentUrl,
  host,
  signInUrl,
  userAgent,
} from "@/constants";
import fs from "fs";
import { sendDiscordNotification } from "@/discord";
import moment from "moment-timezone";
import { setupPuppeteer } from "@/puppeteer";
import { signIn } from "@/signIn";

const screenshotsDir = "screenshots";
if (!fs.existsSync(screenshotsDir)) {
  fs.mkdirSync(screenshotsDir);
}

let currentPage: Page | undefined = undefined;

export async function checkAppointmentDate() {
  try {
    const page = await setupPuppeteer(currentPage);
    const { csrfToken, cookiesString } = await goToAppointmentUrl(page);
    const res = await getFormData(page);
    console.log(res);

    const { firstAvailableDateStr } = await continuouslyLookForEarliestDate({
      page,
      cookiesString,
      csrfToken,
      currentDate: currentAppointmentDate,
    });
  } catch (error) {
    console.log("CheckAppointmentDate error:", error);
  }
  return;
}

async function continuouslyLookForEarliestDate({
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
    console.log("Fetching the first available date...");
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
    console.log(res.status, res.statusText);

    if (res.status >= 500 && res.status < 600) {
      console.log(`${res.status} status code. Waiting delay and retrying...`);
      await randomDelay();
      return continuouslyLookForEarliestDate({
        page,
        cookiesString,
        csrfToken,
        currentDate,
      });
    }

    if (res.status >= 400 && res.status < 500) {
      console.log(`${res.status} status code. Waiting delay and retrying...`);
      await randomDelay();
      console.log("Doesn't seem to be signed in, refreshing the page...");
      await page.reload();
      const { cookiesString: coStr, csrfToken: csStr } =
        await goToAppointmentUrl(page);
      return continuouslyLookForEarliestDate({
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
    console.log(
      "First available date is:",
      firstAvailableDate.toLocaleString(timeLocale, localeOptions),
      "///",
      firstAvailableDateRaw
    );

    if (firstAvailableDate >= currentDate) {
      console.log("Checking the availability after delay...");
      await randomDelay();
      return continuouslyLookForEarliestDate({
        page,
        cookiesString,
        csrfToken,
        currentDate,
      });
    }

    console.log("🟢 Found an earlier date: ", firstAvailableDate);

    await sendDiscordNotification({
      currentAppointmentDate,
      earliestAppointmentDate: firstAvailableDate,
      processEndDate: new Date(),
      processStartDate: processStartDate,
    });

    return { firstAvailableDateStr: firstAvailableDateRaw };
  } catch (error) {
    console.log("GetDate error:", error);
    await randomDelay();
    return continuouslyLookForEarliestDate({
      page,
      cookiesString,
      csrfToken,
      currentDate,
    });
  }
}

async function goToAppointmentUrl(page: Page) {
  console.log("goToAppointmentUrl function called");
  try {
    if (page.url() !== rescheduleAppointmentUrl) {
      console.log("Navigating to the appointment page...");
      await page.goto(rescheduleAppointmentUrl);
      console.log("Current url is:", page.url());
    }
    if (page.url() === signInUrl) {
      console.log("Url is still the sign in page.");
      await signIn(page);
      if (page.url() != rescheduleAppointmentUrl) {
        console.log("Signing in failed. Retrying...");
        return await goToAppointmentUrl(page);
      }
    }
    const csrfToken = await page.$eval('meta[name="csrf-token"]', (element) =>
      element.getAttribute("content")
    );
    if (!csrfToken) {
      console.log("CSRF token is not found. Retrying after delay...");
      await randomDelay();
      return await goToAppointmentUrl(page);
    }
    console.log("CSRF token is: " + csrfToken);

    const cookies = await page.cookies();
    const cookiesString = cookies
      .map((cookie) => `${cookie.name}=${cookie.value}`)
      .join("; ");
    console.log("Cookies are: " + cookiesString);

    return { csrfToken, cookiesString };
  } catch (error) {
    console.log("GoToAppointmentUrl error:", error);
    await randomDelay();
    return await goToAppointmentUrl(page);
  }
}

async function getFormData(page: Page) {
  const authenticityToken = await page.$eval(
    '[name="authenticity_token"]',
    (element) => element.getAttribute("value")
  );
  const useConsulateAppointmentCapacity = await page.$eval(
    '[name="use_consulate_appointment_capacity"]',
    (element) => element.getAttribute("value")
  );
  return {
    authenticityToken,
    useConsulateAppointmentCapacity,
  };
}
