import {
  appointmentDatesUrl,
  appointmentUrl,
  host,
  localeOptions,
  timeLocale,
  timeZone,
  userAgent,
} from "@/constants";
import { getSession } from "@/session";
import { consoleLog, randomDelay, randomDelayAfterError } from "@/utils";
import moment from "moment-timezone";
import { Page } from "puppeteer";

export async function continuouslyGetEarliestDate({
  page,
  cookiesString,
  csrfToken,
  currentDate,
}: {
  page: Page;
  cookiesString: string;
  csrfToken: string;
  currentDate: Date;
}) {
  try {
    consoleLog("Fetching the first available date...");
    const res = await fetch(appointmentDatesUrl, {
      method: "GET",
      headers: {
        Host: host,
        Referer: appointmentUrl,
        "Accept-Encoding": "gzip, deflate, br",
        Connection: "keep-alive",
        "Content-Type": "*/*",
        "X-Csrf-Token": csrfToken,
        "X-Requested-With": "XMLHttpRequest",
        Cookie: cookiesString,
        "User-Agent": userAgent,
      },
    });
    consoleLog(res.status, res.statusText);

    if (res.status >= 500 && res.status < 600) {
      consoleLog(`${res.status} status code. Waiting delay and retrying...`);
      await randomDelayAfterError();
      return continuouslyGetEarliestDate({
        page,
        cookiesString,
        csrfToken,
        currentDate,
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
      return continuouslyGetEarliestDate({
        page,
        cookiesString: coStr,
        csrfToken: csStr,
        currentDate,
      });
    }

    const resJson = await res.json();

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

    if (firstAvailableDate >= currentDate) {
      consoleLog("Checking the availability after delay...");
      await randomDelay();
      return continuouslyGetEarliestDate({
        page,
        cookiesString,
        csrfToken,
        currentDate,
      });
    }

    consoleLog("🟢 Found an earlier date:", firstAvailableDate);
    return { firstAvailableDateStr: firstAvailableDateRaw, firstAvailableDate };
  } catch (error) {
    consoleLog("GetDate error:", error);
    await randomDelayAfterError();
    return continuouslyGetEarliestDate({
      page,
      cookiesString,
      csrfToken,
      currentDate,
    });
  }
}
