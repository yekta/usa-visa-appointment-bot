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

puppeteer.use(StealthPlugin());

const puppeteerTimeout = 30000;
const calenderIconSelector = "span.fa-calendar-minus";
const dateOfAppointmentSelector = "#appointments_consulate_appointment_date";
const timeOfAppointmentSelector = "#appointments_consulate_appointment_time";
const screenshotsDir = "screenshots";
if (!fs.existsSync(screenshotsDir)) {
  fs.mkdirSync(screenshotsDir);
}
const resultScreenshotPath = `${screenshotsDir}/result.png`;

export async function checkAppointmentDate() {
  const startTime = new Date();
  let currentAppointmentDate: Date | null = null;
  let earliestAppointmentDate: Date | null = null;
  try {
    console.log("⏳ Process started...");
    let extraArgs = isProduction
      ? { ignoreHTTPSErrors: true, dumpio: false }
      : {};
    const browser = await puppeteer.launch({
      headless: true,
      timeout: puppeteerTimeout,
      args: isProduction ? ["--no-sandbox", "--disable-setuid-sandbox"] : [],
      ...extraArgs,
    });
    const page = await browser.newPage();
    page.setDefaultTimeout(puppeteerTimeout);

    // Main process
    try {
      await signIn(page);
      currentAppointmentDate = await getCurrentAppointmentDate(page);

      await goToDashboard(page);
      await goToReschedulePage(page);

      const earliestAppointmentDateString =
        await findEarliestAppointmentDate(page);
      const earliestAppointmentTimeString =
        await findAndSelectEarliestTime(page);
      const earliestAppointmentDateTime = `${earliestAppointmentDateString} ${earliestAppointmentTimeString}`;
      const earliestDateMoment = moment.tz(
        earliestAppointmentDateTime,
        "D MMMM YYYY HH:mm",
        timeZone
      );
      earliestAppointmentDate = earliestDateMoment.toDate();
      const foundEarlierDate =
        earliestAppointmentDate <= currentAppointmentDate;

      if (foundEarlierDate) {
        console.log(
          "✅🎉 Found an earlier appointment date.",
          earliestAppointmentDate,
          currentAppointmentDate
        );
      } else {
        console.log(
          "✅😭 Couldn't find an earlier appointment date.",
          earliestAppointmentDate,
          currentAppointmentDate
        );
      }
    } catch (error) {
      console.log("❌ An error occurred:", error);
    }
    // Main process end

    const screenshotBuffer = await page.screenshot({
      path: resultScreenshotPath,
      fullPage: true,
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
  } catch (error) {
    console.log(error);
  }
  return;
}

async function signIn(page: Page) {
  console.log("⏳ Signing in...");

  const emailSelector = "#user_email";
  const passwordSelector = "#user_password";
  const acceptPolicySelector = 'label[for="policy_confirmed"]';
  const signInButtonSelector = 'input[name="commit"]';

  console.log("Visiting the sign in page");
  await page.goto(usvisaSignInUrl, { waitUntil: "domcontentloaded" });
  await page.type(emailSelector, usvisaEmail);
  await page.type(passwordSelector, usvisaPassword);
  console.log("Clicking the accept policy button");
  await page.click(acceptPolicySelector);
  console.log("Clicking the sign in button");
  await page.click(signInButtonSelector);
  console.log("Waiting for navigation");
  await page.waitForNavigation();

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

  await page.click(continueButtonSelector);
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
  await randomDelay(10000, 11000);
  console.log("✅ Went to reschedule page successfully.");
}

async function findEarliestAppointmentDate(page: Page) {
  console.log("⏳ Finding and selecting the earliest appointment date...");

  await page.click(dateOfAppointmentSelector);
  await randomDelay(2000, 3000);

  let earliestDate = await recursivelyFindAndClickEarliestDate(page);
  console.log(
    "✅ Found and selected the earliest appointment date:",
    earliestDate
  );

  return earliestDate;
}

async function recursivelyFindAndClickEarliestDate(page: Page, i = 0) {
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
      await dateCell.click();
      await randomDelay(10000, 11000);
      break;
    }
  }
  if (firstAvailableDateString) {
    return firstAvailableDateString;
  }
  await page.click(nextButtonSelector);
  await randomDelay(500, 1000);
  return recursivelyFindAndClickEarliestDate(page, i + 1);
}

async function findAndSelectEarliestTime(page: Page) {
  console.log("⏳ Finding and selecting the earliest appointment time...");

  await page.waitForFunction(
    (selector) => {
      const select = document.querySelector(selector);
      return select && select.children.length > 1;
    },
    {},
    timeOfAppointmentSelector
  );

  const earliestTime = await page.evaluate((selector) => {
    const select = document.querySelector(selector);
    if (!select) {
      throw new Error("Could not find the time select element");
    }
    const earliestOption = Array.from(select.children).find(
      (option) => option.textContent !== ""
    );
    if (!earliestOption) {
      throw new Error("Could not find the earliest option");
    }
    return earliestOption.textContent;
  }, timeOfAppointmentSelector);

  if (!earliestTime) {
    throw new Error("Could not find the earliest appointment time.");
  }

  await page.select(timeOfAppointmentSelector, earliestTime);

  await randomDelay(1000, 1500);

  const earliestTimeFormatted = earliestTime.replace(/\s/g, " ");
  console.log(
    "✅ Found and selected the earliest appointment time: ",
    earliestTimeFormatted
  );

  return earliestTimeFormatted;
}
