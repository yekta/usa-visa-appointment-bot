import puppeteer from "puppeteer-extra";
import type { Page } from "puppeteer";
import StealthPlugin from "puppeteer-extra-plugin-stealth";
import * as moment from "moment-timezone";
import { randomDelay } from "@/utils.ts";
import {
  isProduction,
  localeOptions,
  timeLocale,
  timeZone,
  usvisaEmail,
  usvisaPassword,
  usvisaSignInUrl,
} from "@/constants";
import fs from "fs";
import { sendDiscordNotification } from "@/discord";
import { backOff, type IBackOffOptions } from "exponential-backoff";

puppeteer.use(StealthPlugin());

const puppeteerTimeout = 60000;
const calenderIconSelector = "span.fa-calendar-minus";
const dateOfAppointmentSelector = "#appointments_consulate_appointment_date";
const timeOfAppointmentSelector = "#appointments_consulate_appointment_time";
const screenshotsDir = "screenshots";
if (!fs.existsSync(screenshotsDir)) {
  fs.mkdirSync(screenshotsDir);
}
const resultScreenshotPath = `${screenshotsDir}/result.png`;
const backOffOptions: Partial<IBackOffOptions> = {
  startingDelay: 2000,
  numOfAttempts: 3,
};

export async function checkAppointmentDate() {
  try {
    await _checkAppointmentDate();
  } catch (error) {
    console.error("❌ An error occurred with checkAppointmentDate:", error);
  }
}

async function _checkAppointmentDate() {
  const startTime = new Date();
  console.log("⏳ Process started...");

  let currentAppointmentDate: Date | null = null;
  let earliestAppointmentDate: Date | null = null;

  let extraArgs = isProduction
    ? { ignoreHTTPSErrors: true, dumpio: false }
    : {};
  const browser = await puppeteer.launch({
    headless: true,
    timeout: puppeteerTimeout,
    args: isProduction ? ["--no-sandbox", "--disable-setuid-sandbox"] : [],
    defaultViewport: {
      width: 1920,
      height: 1080,
    },
    ...extraArgs,
  });
  const page = await browser.newPage();
  page.setDefaultTimeout(puppeteerTimeout);

  // Main process
  try {
    const {
      currentAppointmentDate: current,
      earliestAppointmentDate: earliest,
    } = await backOff(() => mainProcess(page), backOffOptions);
    currentAppointmentDate = current;
    earliestAppointmentDate = earliest;
  } catch (error) {
    console.log("❌ An error occurred:", error);
  }
  // Main process end

  const screenshotBuffer = await page.screenshot({
    path: resultScreenshotPath,
  });
  await browser.close();

  const endTime = new Date();

  await sendDiscordNotification({
    screenshotBuffer,
    currentAppointmentDate,
    earliestAppointmentDate,
    processStartDate: startTime,
    processEndDate: endTime,
  });

  console.log(`✅ All done!`);
  return;
}

async function mainProcess(page: Page) {
  let currentAppointmentDate: Date | null = null;
  let earliestAppointmentDate: Date | null = null;

  await signIn(page);
  currentAppointmentDate = await getCurrentAppointmentDate(page);

  await goToDashboard(page);
  await goToReschedulePage(page);

  earliestAppointmentDate = await getEarliestAppointmentDate(page);
  const foundEarlierDate = earliestAppointmentDate <= currentAppointmentDate;

  if (foundEarlierDate) {
    console.log(
      "🟢 Found an earlier appointment date.",
      earliestAppointmentDate,
      currentAppointmentDate
    );
  } else {
    console.log(
      "🔵 No earlier appointment date.",
      earliestAppointmentDate,
      currentAppointmentDate
    );
  }

  return { currentAppointmentDate, earliestAppointmentDate };
}

async function signIn(page: Page) {
  console.log("⏳ Signing in...");

  const emailSelector = "#user_email";
  const passwordSelector = "#user_password";
  const acceptPolicySelector = "#policy_confirmed";
  const signInButtonSelector = 'input[name="commit"]';

  console.log("Visiting the sign in page");
  await page.goto(usvisaSignInUrl);

  console.log(
    "Waiting for the email, password and accept policy inputs to load..."
  );
  const [] = await Promise.all([
    page.waitForSelector(emailSelector),
    page.waitForSelector(passwordSelector),
    page.waitForSelector(acceptPolicySelector),
  ]);

  console.log("Typing the email and password");
  await page.type(emailSelector, usvisaEmail);
  await page.type(passwordSelector, usvisaPassword);

  console.log("Clicking the accept policy button");
  const [] = await Promise.all([page.click(acceptPolicySelector)]);

  console.log("Waiting for delay before clicking sign in button");
  await randomDelay(3000, 4000);

  console.log("Clicking the sign in button and waiting for the  navigation");
  const [] = await Promise.all([
    page.waitForNavigation(),
    page.click(signInButtonSelector),
  ]);

  console.log("✅ Signed in successfully.");
}

async function getCurrentAppointmentDate(page: Page) {
  console.log("⏳ Getting current appointment date...");

  const paragraphSelector = "p.consular-appt";

  const rawAppointmentDate = await page.$eval(
    paragraphSelector,
    (el) => el.textContent
  );
  if (!rawAppointmentDate) {
    throw new Error("Appointment date not found.");
  }
  const parsedDate = rawAppointmentDate.split(" ").slice(0, 5).join(" ");
  const date = moment.tz(parsedDate, "D MMMM, YYYY, HH:mm", timeZone);
  const dateJS = date.toDate();
  const dateStr = dateJS.toLocaleString(timeLocale, localeOptions);

  console.log("✅ Got the current appointment date:", dateStr);
  return dateJS;
}

async function goToDashboard(page: Page) {
  console.log("⏳ Continuing to dashboard...");

  const continueButtonSelector = "a.primary";

  const [] = await Promise.all([
    page.waitForNavigation(),
    page.click(continueButtonSelector),
  ]);

  await page.waitForSelector(calenderIconSelector);

  console.log("✅ Continued to dashboard successfully.");
}

async function goToReschedulePage(page: Page) {
  console.log("⏳ Going to reschedule page...");

  const href = await page.evaluate(() => {
    const anchors = Array.from(document.querySelectorAll("a"));
    const rescheduleAnchor = anchors.find(
      (anchor) =>
        anchor.textContent?.includes("Reschedule") &&
        anchor.href.includes("appointment")
    );
    return rescheduleAnchor?.href;
  });

  if (!href) {
    throw new Error("Reschedule href not found.");
  }

  await page.goto(href);
  await randomDelay(15000, 16000);
  console.log("✅ Went to reschedule page successfully.");
}

async function getEarliestAppointmentDate(page: Page) {
  const earliestAppointmentDateString =
    await getAndSelectEarliestAppointmentDateOnly(page);
  const earliestAppointmentTimeString =
    await getAndSelectEarliestAppointmentTimeOnly(page);
  const earliestAppointmentDateTime = `${earliestAppointmentDateString} ${earliestAppointmentTimeString}`;
  const earliestDateMoment = moment.tz(
    earliestAppointmentDateTime,
    "D MMMM YYYY HH:mm",
    timeZone
  );
  return earliestDateMoment.toDate();
}

async function getAndSelectEarliestAppointmentDateOnly(page: Page) {
  console.log("⏳ Finding and selecting the earliest appointment date...");

  console.log("Waiting for delay before clicking the date input...");
  await randomDelay(2000, 3000);

  console.log("Clicking the date of appointment input");
  const [] = await Promise.all([page.click(dateOfAppointmentSelector)]);

  console.log("Waiting for delay before running the recursive function...");
  await randomDelay(2000, 3000);

  let earliestDate = await recursivelyFindAndClickEarliestDateOnly(page);
  console.log(
    "✅ Found and selected the earliest appointment date:",
    earliestDate
  );

  return earliestDate;
}

async function recursivelyFindAndClickEarliestDateOnly(page: Page, i = 0) {
  const nextButtonSelector = "a.ui-datepicker-next";
  const cellSelector = "tbody td";
  let firstAvailableDateString: string | null = null;
  const dateCells = await page.$$(cellSelector);
  for (let i = 0; i < dateCells.length; i++) {
    const dateCell = dateCells[i];
    const isAvailable = await page.evaluate(
      (el) => el.getAttribute("data-event") === "click",
      dateCell
    );
    if (isAvailable) {
      // get the table containing the date
      const header = await dateCell.evaluate((el) => {
        const datePickerGroup = el.closest("div.ui-datepicker-group");
        if (!datePickerGroup) {
          throw new Error("Could not find the date picker group");
        }
        const header = datePickerGroup.querySelector(".ui-datepicker-title");
        if (!header) {
          throw new Error("Could not find the header of the date picker group");
        }
        return header.textContent;
      }, dateCell);
      const cellText = await dateCell.evaluate((el) => el.textContent);
      const rawDate = `${cellText} ${header}`;
      firstAvailableDateString = rawDate.replace(/\s/g, " ");
      console.log("First available date:", rawDate);
      const [] = await Promise.all([dateCell.click()]);
      await randomDelay(5000, 6000);
      break;
    }
  }
  if (firstAvailableDateString) {
    return firstAvailableDateString;
  }
  const [] = await Promise.all([page.click(nextButtonSelector)]);

  await randomDelay(500, 1000);
  return recursivelyFindAndClickEarliestDateOnly(page, i + 1);
}

async function getAndSelectEarliestAppointmentTimeOnly(page: Page) {
  console.log("⏳ Finding and selecting the earliest appointment time...");
  const consularSectionSelector =
    "#appointments_consulate_appointment_facility_id";

  console.log("Waiting delay for consular section...");
  await randomDelay(2000, 3000);
  console.log("Clicking the consular section");
  await page.click(consularSectionSelector);
  await page.click(consularSectionSelector);

  console.log("Waiting for the time select element to load...");
  await randomDelay(5000, 6000);

  console.log("Finding the earliest time string...");
  const earliestTime = await page.evaluate((selector) => {
    const select = document.querySelector(selector);
    if (!select) {
      throw new Error("Could not find the time select element");
    }
    const earliestOption = Array.from(select.children).find(
      (option) => option.textContent !== ""
    );
    if (!earliestOption) {
      throw new Error("Couldn't find the earliest option");
    }
    return earliestOption.textContent;
  }, timeOfAppointmentSelector);

  if (!earliestTime) {
    throw new Error("Could not find the earliest appointment time.");
  }

  console.log("Selecting the earliest time...");
  await page.select(timeOfAppointmentSelector, earliestTime);

  console.log("Waiting for delay");
  await randomDelay(1000, 1500);

  const earliestTimeFormatted = earliestTime.replace(/\s/g, " ");
  console.log(
    "✅ Found and selected the earliest appointment time: ",
    earliestTimeFormatted
  );

  return earliestTimeFormatted;
}
