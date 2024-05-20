import {
  appointmentDatesUrl,
  appointmentUrl,
  facilityId,
  host,
  localeOptions,
  longDelay,
  sharedHeaders,
  timeLocale,
  timeZone,
  userAgent,
} from "@/constants";
import { sendDiscordNotification } from "@/discord";
import { getSession } from "@/session";
import { consoleLog, randomDelay, randomDelayAfterError } from "@/utils";
import moment from "moment-timezone";
import { Page } from "puppeteer";

export async function continuouslyGetEarliestDate({
  page,
  cookiesString,
  csrfToken,
  currentDate,
  minDate,
}: {
  page: Page;
  cookiesString: string;
  csrfToken: string;
  currentDate: Date;
  minDate: Date;
}) {
  try {
    const processStartDate = new Date();
    consoleLog("Fetching the first available date...");
    const res = await fetch(appointmentDatesUrl, {
      method: "GET",
      headers: {
        Host: host,
        Referer: appointmentUrl,
        "Accept-Encoding": "gzip, deflate, br",
        Connection: "keep-alive",
        Accept: "*/*",
        "X-Csrf-Token": csrfToken,
        "X-Requested-With": "XMLHttpRequest",
        Cookie: cookiesString,
        "User-Agent": userAgent,
        ...sharedHeaders,
      },
    });
    consoleLog(res.status, res.statusText);

    if (res.status >= 500 && res.status < 600) {
      consoleLog(`${res.status} status code. Waiting delay and retrying...`);
      await randomDelayAfterError();
      return await continuouslyGetEarliestDate({
        page,
        cookiesString,
        csrfToken,
        currentDate,
        minDate,
      });
    }

    if (res.status >= 400 && res.status < 500) {
      consoleLog(`${res.status} status code.`);
      consoleLog("🔐 Doesn't seem to be signed in, signing in after delay...");
      await randomDelayAfterError();
      const { cookiesString: coStr, csrfToken: csStr } = await getSession({
        page,
        reload: true,
      });
      return await continuouslyGetEarliestDate({
        page,
        cookiesString: coStr,
        csrfToken: csStr,
        currentDate,
        minDate,
      });
    }

    const resJson = await res.json();

    if (resJson.length === 0) {
      consoleLog("No available dates found. Checking again after delay...");
      await randomDelay();
      return await continuouslyGetEarliestDate({
        page,
        cookiesString,
        csrfToken,
        currentDate,
        minDate,
      });
    }

    const dates: {
      date: Date;
      raw: string;
    }[] = resJson.map((i: { date: string }) => ({
      date: moment.tz(i.date, "YYYY-MM-DD", timeZone).toDate(),
      raw: i.date,
    }));
    let firstAvailableDateRaw = dates[0].raw;
    let firstAvailableDate = dates[0].date;
    for (let i = 0; i < dates.length; i++) {
      if (dates[i].date < firstAvailableDate) {
        firstAvailableDateRaw = dates[i].raw;
        firstAvailableDate = dates[i].date;
      }
    }
    consoleLog(
      "First available date is:",
      firstAvailableDate.toLocaleString(timeLocale, localeOptions),
      "///",
      firstAvailableDateRaw
    );

    if (firstAvailableDate >= currentDate || firstAvailableDate < minDate) {
      if (firstAvailableDate < minDate) {
        consoleLog(
          "🟡 Found available earlier date but it's earlier than min appointment date.",
          firstAvailableDate,
          minDate
        );
        sendDiscordNotification({
          currentAppointmentDate: currentDate,
          earliestAppointmentDate: firstAvailableDate,
          processEndDate: new Date(),
          processStartDate: processStartDate,
          facilityId,
        });
      }
      consoleLog("Checking the availability after delay...");
      await randomDelay();
      return await continuouslyGetEarliestDate({
        page,
        cookiesString,
        csrfToken,
        currentDate,
        minDate,
      });
    }

    consoleLog("🟢 Found an earlier date:", firstAvailableDate);
    return { firstAvailableDateStr: firstAvailableDateRaw, firstAvailableDate };
  } catch (error) {
    consoleLog("GetDate error:", error);
    consoleLog(
      `Risky error detected! Retrying after ${Math.round(
        longDelay / 1000 / 60
      )} minutes...`
    );
    await randomDelay(longDelay, longDelay + 1000);
    return await continuouslyGetEarliestDate({
      page,
      cookiesString,
      csrfToken,
      currentDate,
      minDate,
    });
  }
}
