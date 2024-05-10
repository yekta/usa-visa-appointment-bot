import puppeteer from "puppeteer-extra";
import StealthPlugin from "puppeteer-extra-plugin-stealth";
import { consoleLog } from "@/utils";

puppeteer.use(StealthPlugin());

const puppeteerTimeout = 60000;

export async function setupPuppeteer() {
  consoleLog("Setting up puppeteer...");
  const browser = await puppeteer.launch({
    headless: true,
    timeout: puppeteerTimeout,
    defaultViewport: {
      width: 1920,
      height: 1080,
    },
  });
  const page = await browser.newPage();
  page.setDefaultTimeout(puppeteerTimeout);
  consoleLog("Puppeteer is set up.");
  return page;
}
