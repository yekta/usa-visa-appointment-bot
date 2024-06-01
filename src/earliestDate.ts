import {
  appointmentDatesUrl,
  appointmentUrl,
  facilityId,
  visaHost,
  localeOptions,
  longDelay,
  sharedHeaders,
  timeLocale,
  timeZone,
} from "@/constants";
import { randomDelay, randomDelayAfterError } from "@/delay";
import { sendDiscordNotification } from "@/discord";
import { getSession } from "@/session";
import { consoleLog } from "@/utils";
import moment from "moment-timezone";
import { Page } from "puppeteer";

const earliestDatePullDelays = [5000, 6000];

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
}): Promise<{
  firstAvailableDateStr: string;
  firstAvailableDate: Date;
  csrfToken: string;
  cookiesString: string;
}> {
  try {
    const processStartDate = new Date();
    consoleLog("------------------------------------");
    consoleLog("Fetching the first available date...");

    const headers = {
      Host: visaHost,
      Referer: appointmentUrl,
      Accept: "application/json, text/javascript, */*; q=0.01",
      "Accept-Encoding": "gzip, deflate, br",
      "X-Requested-With": "XMLHttpRequest",
      "X-CSRF-Token": csrfToken,
      Cookie: cookiesString,
      ...sharedHeaders,
    };

    const res = await fetch(appointmentDatesUrl, {
      method: "GET",
      headers,
    });
    consoleLog(res.status, res.statusText);

    if (res.redirected) {
      consoleLog("Redirected to:", res.url);
    }

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
      consoleLog(
        "🔐 Doesn't seem to be signed in, getting session after delay..."
      );
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
      await randomDelay(...earliestDatePullDelays);
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
      await randomDelay(...earliestDatePullDelays);
      return await continuouslyGetEarliestDate({
        page,
        cookiesString,
        csrfToken,
        currentDate,
        minDate,
      });
    }

    consoleLog(
      "🟢 Found an earlier date:",
      firstAvailableDate.toLocaleString(timeLocale, localeOptions)
    );
    return {
      firstAvailableDateStr: firstAvailableDateRaw,
      firstAvailableDate,
      csrfToken,
      cookiesString,
    };
  } catch (error) {
    consoleLog("GetDate error:", error);
    consoleLog(
      `🔴🔴🔴 Risky error detected! Retrying after ${Math.round(
        longDelay / 1000 / 60
      )} minutes... 🔴🔴🔴`
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
