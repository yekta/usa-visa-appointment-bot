import { email, password } from "@/constants";
import { randomDelay } from "@/utils";
import { Page } from "puppeteer";

export async function signIn(page: Page) {
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
