import puppeteer from "puppeteer-extra";
import StealthPlugin from "puppeteer-extra-plugin-stealth";
import { consoleLog } from "@/utils";
import { PuppeteerLaunchOptions } from "puppeteer";

puppeteer.use(StealthPlugin());

const puppeteerTimeout = 60000;

export async function setupPuppeteer() {
  consoleLog("Setting up puppeteer...");
  let options: PuppeteerLaunchOptions = {
    headless: true,
    timeout: puppeteerTimeout,
    defaultViewport: {
      width: 1920,
      height: 1080,
    },
  };
  if (process.env.IS_PROD) {
    console.log("IS_PROD is set to true. Disabling sandbox.");
    options.args = ["--no-sandbox", "--disable-setuid-sandbox"];
  }
  const browser = await puppeteer.launch(options);
  const page = await browser.newPage();
  page.setDefaultTimeout(puppeteerTimeout);
  consoleLog("Puppeteer is set up.");
  return page;
}
