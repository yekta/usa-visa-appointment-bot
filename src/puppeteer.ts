import puppeteer from "puppeteer-extra";
import StealthPlugin from "puppeteer-extra-plugin-stealth";
import { consoleLog } from "@/utils";

puppeteer.use(StealthPlugin());

const puppeteerTimeout = 60000;

export async function setupPuppeteer() {
  consoleLog("Setting up puppeteer...");
  let options: Record<string, any> = {
    headless: true,
    timeout: puppeteerTimeout,
    defaultViewport: {
      width: 1920,
      height: 1080,
    },
  };
  if (process.env.NODE_ENV === "production") {
    options.args = ["--no-sandbox", "--disable-setuid-sandbox"];
  }
  const browser = await puppeteer.launch();
  const page = await browser.newPage();
  page.setDefaultTimeout(puppeteerTimeout);
  consoleLog("Puppeteer is set up.");
  return page;
}
