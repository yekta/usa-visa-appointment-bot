import {
  email,
  host,
  hostUrl,
  longDelay,
  password,
  sharedHeaders,
  signInUrl,
} from "@/constants";
import { consoleLog, randomDelay } from "@/utils";
import { load } from "cheerio";
import { Page } from "puppeteer";

export async function getSession() {
  consoleLog("getSession function called");
  try {
    const res = await fetch(signInUrl, {
      headers: {
        Host: host,
        Referer: hostUrl,
        ...sharedHeaders,
      },
    });
    const resText = await res.text();
    const resHeaders = res.headers;

    const $ = load(resText);
    const initialCsrfToken = $('meta[name="csrf-token"]').attr("content");
    if (initialCsrfToken === undefined) {
      throw new Error("CSRF token not found");
    }

    const initialCookiesObj = parseCookies(resHeaders.get("set-cookie"));
    const initialCookiesString = initialCookiesObj
      .map((cookie) => `${cookie.name}=${cookie.value}`)
      .join("; ");
    consoleLog("Initial CSRF token is:" + initialCsrfToken);
    consoleLog("Initial Cookie string:" + initialCookiesString);

    return { csrfToken: "", cookiesString: "" };
  } catch (error) {
    consoleLog("getSession error:", error);
    consoleLog(
      `Risky error detected! Retrying after ${Math.round(
        longDelay / 1000 / 60
      )} minutes...`
    );
    await randomDelay(longDelay, longDelay + 1000);
    return await getSession();
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
    await randomDelay();
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
  await randomDelay();

  consoleLog("Clicking the sign in button and waiting for the  navigation");
  const [] = await Promise.all([
    page.waitForNavigation(),
    page.click(signInButtonSelector),
  ]);

  consoleLog("✅ Signed in successfully.");
  consoleLog("Url after sign in is: " + page.url());
}

type TCookie = { name: string; value: string };

const parseCookies = (rawCookies: string | null): TCookie[] => {
  if (!rawCookies) {
    return [];
  }
  const cookies: { name: string; value: string }[] = [];
  const cookiePairs = rawCookies.split(",").map((cookie) => cookie.trim());
  cookiePairs.forEach((header) => {
    const parts = header.split(";")[0].split("=");
    const name = parts[0].trim();
    const value = parts[1].trim();
    cookies.push({ name, value });
  });
  return cookies;
};
