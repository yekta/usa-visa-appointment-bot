import type { Page } from "puppeteer";
import { consoleLog, randomDelay } from "@/utils.ts";
import fs from "fs";
import { setupPuppeteer } from "@/puppeteer";
import { book } from "@/book";
import { getSession } from "@/session";
import { continuouslyGetEarliestDate } from "@/earliestDate";
import { continuouslyGetEarliestTime } from "@/earliestTime";
import { sendDiscordNotification } from "@/discord";
import { longDelay } from "@/constants";

const screenshotsDir = "screenshots";
if (!fs.existsSync(screenshotsDir)) {
  fs.mkdirSync(screenshotsDir);
}

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
    const page = await setupPuppeteer();
    const { csrfToken, cookiesString } = await getSession({ page });

    const { firstAvailableDate, firstAvailableDateStr } =
      await continuouslyGetEarliestDate({
        page,
        cookiesString,
        csrfToken,
        currentDate,
        minDate,
      });

    sendDiscordNotification({
      currentAppointmentDate: currentDate,
      earliestAppointmentDate: firstAvailableDate,
      processEndDate: new Date(),
      processStartDate: processStartDate,
    });

    if (firstAvailableDate < currentDate && firstAvailableDate >= minDate) {
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
    consoleLog("Dangerous error occured. Retrying after long delay.");
    await randomDelay(longDelay, longDelay + 10000);
    await bookEarlierAppointment({ currentDate, minDate });
    return;
  }
  return;
}
