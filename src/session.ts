import {
  email,
  host,
  hostUrl,
  longDelay,
  password,
  sharedHeaders,
  signInCommitButtonText,
  signInUrl,
} from "@/constants";
import { consoleLog, randomDelay } from "@/utils";
import { load } from "cheerio";
import { Page } from "puppeteer";

export async function getSession() {
  consoleLog("getSession function called");
  try {
    const initialRes = await fetch(signInUrl, {
      headers: {
        Host: host,
        Referer: hostUrl,
        ...sharedHeaders,
      },
    });
    const initialResText = await initialRes.text();
    const initialSetCookieHeader = initialRes.headers.get("set-cookie");

    const csrfToken = parseCsrfToken(initialResText);
    const initialCookiesString = parseCookies(initialSetCookieHeader);

    if (!csrfToken) {
      consoleLog(
        "No csrfToken after anonymous call. Midly risky error detected! Retrying after 1 minute..."
      );
      await randomDelay(60000, 61000);
      return await getSession();
    }

    if (!initialCookiesString) {
      consoleLog(
        "No initialCookiesString after anonymous call. Midly risky error detected! Retrying after 1 minute..."
      );
      await randomDelay(60000, 61000);
      return await getSession();
    }

    const res = await fetch(signInUrl, {
      headers: {
        Host: host,
        Referer: signInUrl,
        Cookie: initialCookiesString,
        "X-Csrf-Token": csrfToken,
        "Content-Type": "application/x-www-form-urlencoded",
        ...sharedHeaders,
      },
      method: "POST",
      body: new URLSearchParams({
        utf8: "✓",
        "user[email]": email,
        "user[password]": password,
        policy_confirmed: "1",
        commit: signInCommitButtonText,
      }),
    });

    const resHeaders = res.headers.get("set-cookie");
    const cookiesString = parseCookies(resHeaders);

    if (!cookiesString) {
      consoleLog(
        "No cookiesString after trying to sign in. Midly risky error detected! Retrying after 1 minute..."
      );
      await randomDelay(60000, 61000);
      return await getSession();
    }

    return { csrfToken, cookiesString };
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

const parseCookies = (rawCookies: string | null): string | null => {
  if (!rawCookies) {
    return null;
  }
  const cookies: { name: string; value: string }[] = [];
  const cookiePairs = rawCookies.split(",").map((cookie) => cookie.trim());
  cookiePairs.forEach((header) => {
    const parts = header.split(";")[0].split("=");
    const name = parts[0].trim();
    const value = parts[1].trim();
    cookies.push({ name, value });
  });
  const cookiesString = cookies
    .map((cookie) => `${cookie.name}=${cookie.value}`)
    .join("; ");
  return cookiesString;
};

const parseCsrfToken = (html: string): string | null => {
  const $ = load(html);
  const csrf = $('meta[name="csrf-token"]').attr("content");
  return csrf ? csrf : null;
};
