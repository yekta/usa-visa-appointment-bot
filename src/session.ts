import {
  appointmentUrl,
  email,
  longDelay,
  password,
  shortDelay,
  signInUrl,
} from "@/constants";
import { randomDelay, randomDelayAfterError } from "@/delay";
import { consoleLog } from "@/utils";
import { Page } from "puppeteer";

const navigationDelays = [15000, 16000];

export async function getSession({
  page,
  reload = false,
}: {
  page: Page;
  reload?: boolean;
}) {
  consoleLog("getSession function called");
  try {
    if (reload) {
      await page.reload();
    }
    if (page.url() !== appointmentUrl) {
      consoleLog("Navigating to the appointment page...");
      await page.goto(appointmentUrl);
      consoleLog("Current url is:", page.url());
    }
    if (page.url() === signInUrl) {
      consoleLog("Url is still the sign in page.");
      await signIn(page);
      if (page.url() != appointmentUrl) {
        consoleLog("Signing in failed. Retrying...");
        return await getSession({ page: page });
      }
    }

    consoleLog(
      "Waiting for randomDelay before extracting CSRF token and cookies..."
    );
    await randomDelay(...navigationDelays);

    let csrfToken: string | null = null;

    try {
      csrfToken = await page.$eval('meta[name="csrf-token"]', (element) =>
        element.getAttribute("content")
      );
    } catch (error) {
      consoleLog(
        "Error while extracting CSRF token. Retrying with reload after short delay. Error is:",
        error
      );
      await randomDelay(shortDelay, shortDelay + 1000);
      return await getSession({ page, reload: true });
    }

    if (!csrfToken) {
      consoleLog("CSRF token is not found. Retrying after delay...");
      await randomDelayAfterError();
      return await getSession({ page });
    }
    consoleLog("CSRF token is:" + csrfToken);

    const cookies = await page.cookies();
    const cookiesString = cookies
      .map((cookie) => `${cookie.name}=${cookie.value}`)
      .join("; ");
    consoleLog("Cookies are:" + cookiesString);

    return { csrfToken, cookiesString };
  } catch (error) {
    consoleLog("getSession error:", error);
    consoleLog(
      `🔴🔴🔴 Risky error detected! Retrying after ${Math.round(
        longDelay / 1000 / 60
      )} minutes... 🔴🔴🔴`
    );
    await randomDelay(longDelay, longDelay + 1000);
    return await getSession({ page });
  }
}

export async function signIn(page: Page) {
  consoleLog("⏳ Signing in...");

  const emailSelector = "#user_email";
  const passwordSelector = "#user_password";
  const acceptPolicySelector = "#policy_confirmed";
  const signInButtonSelector = 'input[name="commit"]';

  const modalSelector = "div.infoPopUp";
  const modalCloseButtonSelector = 'button[title="Close"]';

  // check if there is a modal
  const modal = await page.$(modalSelector);
  if (modal) {
    consoleLog("Closing the modal");
    await page.click(modalCloseButtonSelector);
    consoleLog("Waiting for the modal to close with a delay...");
    await randomDelay(...navigationDelays);
  }

  consoleLog(
    "Waiting for the email, password and accept policy inputs to load..."
  );
  const [] = await Promise.all([
    page.waitForSelector(emailSelector),
    page.waitForSelector(passwordSelector),
    page.waitForSelector(acceptPolicySelector),
  ]);

  consoleLog("Typing the email and password");
  await page.type(emailSelector, email);
  await page.type(passwordSelector, password);

  consoleLog("Clicking the accept policy button");
  const [] = await Promise.all([page.click(acceptPolicySelector)]);

  consoleLog("Waiting for delay before clicking sign in button");
  await randomDelay(...navigationDelays);

  consoleLog("Clicking the sign in button and waiting for the  navigation");
  const [] = await Promise.all([
    page.waitForNavigation(),
    page.click(signInButtonSelector),
  ]);

  consoleLog("✅ Signed in successfully.");
  consoleLog("Url after sign in is: " + page.url());
}
