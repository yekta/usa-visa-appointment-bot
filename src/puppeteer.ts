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
  if (process.env.IS_PROD || process.env.NODE_ENV === "production") {
    consoleLog("Production is set to true. Disabling sandbox.");
    options.args = [
      "--no-sandbox",
      "--disable-setuid-sandbox",
      "--disable-infobars",
      "--window-position=0,0",
      "--ignore-certifcate-errors",
      "--ignore-certifcate-errors-spki-list",
      "--disable-features=IsolateOrigins,site-per-process",
      "--disable-blink-features=AutomationControlled",
    ];
  }
  const browser = await puppeteer.launch(options);
  const page = await browser.newPage();
  const version = await browser.version();
  consoleLog(`Puppeteer version: ${version}`);
  page.setDefaultTimeout(puppeteerTimeout);
  consoleLog("Puppeteer is set up.");
  return page;
}
