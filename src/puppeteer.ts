import puppeteer from "puppeteer-extra";
import StealthPlugin from "puppeteer-extra-plugin-stealth";
import type { Page } from "puppeteer";

puppeteer.use(StealthPlugin());

const puppeteerTimeout = 60000;

export async function setupPuppeteer(page: Page | undefined) {
  console.log("Setting up puppeteer...");
  if (page) {
    console.log("Puppeteer is already set up.");
    return page;
  }
  const browser = await puppeteer.launch({
    headless: true,
    timeout: puppeteerTimeout,
    defaultViewport: {
      width: 1920,
      height: 1080,
    },
  });
  const _page = await browser.newPage();
  _page.setDefaultTimeout(puppeteerTimeout);
  page = _page;
  console.log("Puppeteer is set up.");
  return page;
}
