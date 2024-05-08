import type { Page } from "puppeteer";
import { consoleLog } from "@/utils.ts";
import fs from "fs";
import { setupPuppeteer } from "@/puppeteer";
import { book } from "@/book";
import { getSession } from "@/session";
import { continuouslyGetEarliestDate } from "@/earliestDate";
import { continuouslyGetEarliestTime } from "@/earliestTime";
import { sendDiscordNotification } from "@/discord";

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
  consoleLog(
    "Current Appointment Date:",
    currentDate,
    " /// ",
    "Minimum Appointment Date:",
    minDate
  );
  try {
    const processStartDate = new Date();
    const page = await setupPuppeteer(currentPage);
    const { csrfToken, cookiesString } = await getSession({ page });

    const { firstAvailableDate, firstAvailableDateStr } =
      await continuouslyGetEarliestDate({
        page,
        cookiesString,
        csrfToken,
        currentDate: currentDate,
      });

    sendDiscordNotification({
      currentAppointmentDate: currentDate,
      earliestAppointmentDate: firstAvailableDate,
      processEndDate: new Date(),
      processStartDate: processStartDate,
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
    } else if (firstAvailableDate < minDate) {
      consoleLog(
        "🟡 The first available date is earlier than the min appointment date.",
        firstAvailableDate,
        minDate
      );
    } else {
      consoleLog(
        "🟡 The first available date is not earlier than the current appointment date.",
        firstAvailableDate,
        currentDate
      );
    }
  } catch (error) {
    consoleLog("bookEarlierDate error:", error);
  }
  return;
}
