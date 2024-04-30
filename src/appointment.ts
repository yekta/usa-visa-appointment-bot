import puppeteer from "puppeteer-extra";
import type { Page } from "puppeteer";
import StealthPlugin from "puppeteer-extra-plugin-stealth";
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
  email,
  password,
  userAgent,
} from "@/constants";
import fs from "fs";
import { IBackOffOptions, backOff } from "exponential-backoff";
import { sendDiscordNotification } from "@/discord";
import moment from "moment-timezone";

puppeteer.use(StealthPlugin());

const puppeteerTimeout = 60000;
const screenshotsDir = "screenshots";
if (!fs.existsSync(screenshotsDir)) {
  fs.mkdirSync(screenshotsDir);
}

const backOffOptions: Partial<IBackOffOptions> = {
  startingDelay: 1000,
  timeMultiple: 2,
  numOfAttempts: 10,
  retry: async (e, attemptNumber) => {
    console.log(`🔴 Attempt number ${attemptNumber} failed. Retrying...`);
    return true;
  },
};

let page: Page | undefined = undefined;

async function setupPuppeteer() {
  console.log("Setting up puppeteer...");
  if (page) {
    console.log("Puppeteer is already set up.");
    return page;
  }
  const browser = await puppeteer.launch({
    headless: true,
    timeout: puppeteerTimeout,
    defaultViewport: {
      width: 1920,
      height: 1080,
    },
  });
  const _page = await browser.newPage();
  _page.setDefaultTimeout(puppeteerTimeout);
  page = _page;
  console.log("Puppeteer is set up.");
  return page;
}

export async function checkAppointmentDate() {
  const page = await setupPuppeteer();
  const { csrfToken, cookiesString } = await goToAppointmentUrl(page);
  const res = await getFormData(page);
  console.log(res);

  const { firstAvailableDateStr } = await continuouslyLookForEarliestDate({
    page,
    cookiesString,
    csrfToken,
    currentDate: currentAppointmentDate,
  });

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

async function signIn(page: Page) {
  console.log("⏳ Signing in...");

  const emailSelector = "#user_email";
  const passwordSelector = "#user_password";
  const acceptPolicySelector = "#policy_confirmed";
  const signInButtonSelector = 'input[name="commit"]';

  const modalSelector = "div.infoPopUp";
  const modalCloseButtonSelector = 'button[title="Close"]';

  // check if there is a modal
  const modal = await page.$(modalSelector);
  if (modal) {
    console.log("Closing the modal");
    await page.click(modalCloseButtonSelector);
    console.log("Waiting for the modal to close with a delay...");
    await randomDelay();
  }

  console.log(
    "Waiting for the email, password and accept policy inputs to load..."
  );
  const [] = await Promise.all([
    page.waitForSelector(emailSelector),
    page.waitForSelector(passwordSelector),
    page.waitForSelector(acceptPolicySelector),
  ]);

  console.log("Typing the email and password");
  await page.type(emailSelector, email);
  await page.type(passwordSelector, password);

  console.log("Clicking the accept policy button");
  const [] = await Promise.all([page.click(acceptPolicySelector)]);

  console.log("Waiting for delay before clicking sign in button");
  await randomDelay();

  console.log("Clicking the sign in button and waiting for the  navigation");
  const [] = await Promise.all([
    page.waitForNavigation(),
    page.click(signInButtonSelector),
  ]);

  console.log("✅ Signed in successfully.");
  console.log("Url after sign in is: " + page.url());
}
