import type { Page } from "puppeteer";
import { consoleLog, randomDelay } from "@/utils.ts";
import fs from "fs";
import { setupPuppeteer } from "@/puppeteer";
import { book } from "@/book";
import { getSession } from "@/session";
import { continuouslyGetEarliestDate } from "@/earliestDate";
import { continuouslyGetEarliestTime } from "@/earliestTime";
import {
  sendAppointmentBookedDiscordNotification,
  sendDiscordNotification,
} from "@/discord";
import { facilityId, longDelay, timeZone } from "@/constants";
import moment from "moment-timezone";

const screenshotsDir = "screenshots";
if (!fs.existsSync(screenshotsDir)) {
  fs.mkdirSync(screenshotsDir);
}

export async function bookEarlierAppointment({
  currentDate,
  maxDate,
  minDate,
}: {
  currentDate: Date;
  maxDate: Date;
  minDate: Date;
}) {
  consoleLog(
    "Current Appointment Date:",
    currentDate,
    " /// ",
    "Maxiumum Appointment Date:",
    maxDate,
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
      facilityId,
    });

    if (
      firstAvailableDate < currentDate &&
      firstAvailableDate >= minDate &&
      firstAvailableDate <= maxDate
    ) {
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

      const newDateTz = moment.tz(
        firstAvailableDateStr + " " + firstAvailableTimeStr,
        "YYYY-MM-DD HH:mm",
        timeZone
      );
      const newDateStr = newDateTz.format("D MMMM, YYYY, HH:mm");

      if (res.includes(newDateStr)) {
        consoleLog("🟢🎉🟢 Booking confirmed! 🟢🎉🟢");
        const newDate = newDateTz.toDate();
        await sendAppointmentBookedDiscordNotification({
          oldAppointmentDate: currentDate,
          newAppointmentDate: newDate,
          facilityId,
        });
      }
    } else {
      if (firstAvailableDate < minDate) {
        consoleLog(
          "🟡 The first available date is earlier than the min appointment date.",
          firstAvailableDate,
          minDate
        );
      }
      if (firstAvailableDate >= currentDate) {
        consoleLog(
          "🟡 The first available date is not earlier than the current appointment date.",
          firstAvailableDate,
          currentDate
        );
      }
      if (firstAvailableDate > maxDate) {
        consoleLog(
          "🟡 The first available date is later than the max appointment date.",
          firstAvailableDate,
          maxDate
        );
      }
      consoleLog("Not bookable, checking the availability after delay...");
      await randomDelay();
      await bookEarlierAppointment({ currentDate, maxDate, minDate });
      return;
    }
  } catch (error) {
    consoleLog("bookEarlierDate error:", error);
    consoleLog("Dangerous error occured. Retrying after long delay.");
    await randomDelay(longDelay, longDelay + 10000);
    await bookEarlierAppointment({ currentDate, maxDate, minDate });
    return;
  }
  return;
}
