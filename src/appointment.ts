import { book } from "@/book";
import { facilityId, longDelay, shortDelay, timeZone } from "@/constants";
import {
  sendAppointmentBookedDiscordNotification,
  sendDiscordNotification,
} from "@/discord";
import { continuouslyGetEarliestDate } from "@/earliestDate";
import { continuouslyGetEarliestTime } from "@/earliestTime";
import { getSession } from "@/session";
import { consoleLog, randomDelay } from "@/utils.ts";
import fs from "fs";
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
    const { csrfToken, cookiesString } = await getSession();

    consoleLog("CsrfToken:", csrfToken);
    consoleLog("CookiesString:", cookiesString);

    const { firstAvailableDate, firstAvailableDateStr } =
      await continuouslyGetEarliestDate({
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
