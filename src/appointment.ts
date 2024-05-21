import { consoleLog } from "@/utils.ts";
import fs from "fs";
import { setupPuppeteer } from "@/puppeteer";
import { book } from "@/book";
import { getSession } from "@/session";
import { continuouslyGetEarliestDate } from "@/earliestDate";
import { getEarliestTimeWithRetry } from "@/earliestTime";
import {
  sendAppointmentBookedDiscordNotification,
  sendDiscordNotification,
} from "@/discord";
import { facilityId, longDelay, shortDelay, timeZone } from "@/constants";
import moment from "moment-timezone";
import { randomDelay } from "@/delay";

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

    const {
      firstAvailableDate,
      firstAvailableDateStr,
      csrfToken: csrfToken2,
      cookiesString: cookiesString2,
    } = await continuouslyGetEarliestDate({
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
      const {
        firstAvailableTimeStr,
        csrfToken: csrfToken3,
        cookiesString: cookiesString3,
      } = await getEarliestTimeWithRetry({
        page,
        cookiesString: cookiesString2,
        csrfToken: csrfToken2,
        dateStr: firstAvailableDateStr,
      });

      if (!firstAvailableTimeStr) {
        consoleLog(
          "No available time slots coming from continuoslyGetEarliestTime. Retrying after shortDelay..."
        );
        await randomDelay(shortDelay, shortDelay + 10000);
        await bookEarlierAppointment({ currentDate, maxDate, minDate });
        return;
      }

      const res = await book({
        csrfToken: csrfToken3,
        cookiesString: cookiesString3,
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
      consoleLog("Not bookable, checking the availability after shortDelay...");
      await randomDelay(shortDelay, shortDelay + 10000);
      await bookEarlierAppointment({ currentDate, maxDate, minDate });
      return;
    }
  } catch (error) {
    consoleLog("bookEarlierDate error:", error);
    consoleLog("Dangerous error occured. Retrying after longDelay.");
    await randomDelay(longDelay, longDelay + 10000);
    await bookEarlierAppointment({ currentDate, maxDate, minDate });
    return;
  }
  return;
}
