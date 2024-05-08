import type { Page } from "puppeteer";
import { consoleLog } from "@/utils.ts";
import fs from "fs";
import { setupPuppeteer } from "@/puppeteer";
import { book } from "@/book";
import { getSession } from "@/session";
import { continuouslyGetEarliestDate } from "@/earliestDate";
import { continuouslyGetEarliestTime } from "@/earliestTime";

const screenshotsDir = "screenshots";
if (!fs.existsSync(screenshotsDir)) {
  fs.mkdirSync(screenshotsDir);
}

let currentPage: Page | undefined = undefined;

export async function bookEarlierAppointment({
  currentDate,
  minDate,
}: {
  currentDate: Date;
  minDate: Date;
}) {
  try {
    const page = await setupPuppeteer(currentPage);
    const { csrfToken, cookiesString } = await getSession({ page });

    const { firstAvailableDate, firstAvailableDateStr } =
      await continuouslyGetEarliestDate({
        page,
        cookiesString,
        csrfToken,
        currentDate: currentDate,
      });

    if (firstAvailableDate >= minDate && firstAvailableDate < currentDate) {
      consoleLog("Can book this appointment date:", firstAvailableDateStr);
      const { firstAvailableTimeStr } = await continuouslyGetEarliestTime({
        page,
        cookiesString,
        csrfToken,
        dateStr: firstAvailableDateStr,
      });
      const res = await book({
        csrfToken,
        cookiesString,
        dateStr: firstAvailableDateStr,
        timeStr: firstAvailableTimeStr,
      });
      consoleLog("🟢 Booking is completed:", res);
      consoleLog(res);
    }
  } catch (error) {
    consoleLog("bookEarlierDate error:", error);
  }
  return;
}
