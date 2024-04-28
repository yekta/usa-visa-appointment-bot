import puppeteer from "puppeteer-extra";
import type { Browser, Page } from "puppeteer";
import StealthPlugin from "puppeteer-extra-plugin-stealth";
import dotenv from "dotenv";
import * as moment from "moment-timezone";

dotenv.config();

puppeteer.use(StealthPlugin());

const usvisaEmail = process.env.USVISA_EMAIL || "";
const usvisaPassword = process.env.USVISA_PASSWORD || "";
const usvisaSignInUrl = process.env.USVISA_SIGN_IN_URL || "";
const timeZone = "Europe/Istanbul";
const timeLocale = "en-GB";
const puppeteerTimeout = 60000;

export async function checkAppointmentDate() {
  try {
    console.log("⏳ Process started...");
    const browser = await puppeteer.launch({
      headless: true,
      timeout: puppeteerTimeout,
    });
    const page = await browser.newPage();
    page.setDefaultTimeout(puppeteerTimeout);

    await signIn(page);
    const currentAppointmentDate = await getCurrentAppointmentDate(page);

    await page.screenshot({ path: "result.png", fullPage: true });
    await browser.close();
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

  await page.goto(usvisaSignInUrl);
  await page.waitForSelector(emailSelector);
  await page.waitForSelector(passwordSelector);
  await page.type(emailSelector, usvisaEmail);
  await page.type(passwordSelector, usvisaPassword);
  await page.click(acceptPolicySelector);
  await page.click(signInButtonSelector);
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
  const date = moment.tz(parsedDate, "DD MMMM, YYYY, HH:mm", timeZone);
  const dateJS = date.toDate();
  const dateStr = dateJS.toLocaleString(timeLocale, {
    timeZone: timeZone,
    month: "long",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "numeric",
  });

  console.log("✅ Got the current appointment date:", dateStr);
  return {
    date: dateJS,
    dateStr: dateStr,
  };
}
