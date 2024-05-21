import {
  appointmentUrl,
  getAppointmentTimesUrl,
  host,
  sharedHeaders,
  userAgent,
} from "@/constants";
import { getSession } from "@/session";
import { consoleLog, randomDelay, randomDelayAfterError } from "@/utils.ts";
import type { Page } from "puppeteer";

const getEarliestTimeRetryLimit = 3;

export async function continuouslyGetEarliestTime({
  cookiesString,
  csrfToken,
  dateStr,
  retryRound = 0,
}: {
  cookiesString: string;
  csrfToken: string;
  dateStr: string;
  retryRound?: number;
}) {
  if (retryRound >= getEarliestTimeRetryLimit) {
    throw new Error("Reached retry limit. Exiting...");
  }
  try {
    consoleLog("Fetching the first available time for:", dateStr);
    const res = await fetch(getAppointmentTimesUrl(dateStr), {
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
    let firstAvailableTimeStr = "";
    consoleLog(res.status, res.statusText);

    if (res.status >= 400 && res.status < 500) {
      consoleLog(`${res.status} status code. Waiting delay and retrying...`);
      await randomDelay(3000, 4000);
      consoleLog("Doesn't seem to be signed in, getting session...");
      const { cookiesString: coStr, csrfToken: csStr } = await getSession();
      return await continuouslyGetEarliestTime({
        cookiesString: coStr,
        csrfToken: csStr,
        dateStr,
        retryRound: retryRound + 1,
      });
    }

    if (res.status >= 500 && res.status < 600) {
      consoleLog(`${res.status} status code. Waiting delay and retrying...`);
      await randomDelay(3000, 4000);
      return await continuouslyGetEarliestTime({
        cookiesString,
        csrfToken,
        dateStr,
        retryRound: retryRound + 1,
      });
    }

    const resJson: { available_times?: string[]; business_times?: string[] } =
      await res.json();

    const combinedSet = new Set([
      ...(resJson.available_times ?? []),
      ...(resJson.business_times ?? []),
    ]);

    const combinedArray = Array.from(combinedSet);

    if (combinedArray.length === 0) {
      consoleLog("No available time slots found. Retrying...");
      await randomDelay(3000, 4000);
      return await continuouslyGetEarliestTime({
        cookiesString,
        csrfToken,
        dateStr,
        retryRound: retryRound + 1,
      });
    }

    firstAvailableTimeStr = combinedArray[combinedArray.length - 1];

    consoleLog(
      "🟢 Successfully fetched the first available time: ",
      firstAvailableTimeStr,
      " for date: ",
      dateStr
    );

    return { firstAvailableTimeStr };
  } catch (error) {
    consoleLog("GetTime error:", error);
    await randomDelayAfterError();
    return await continuouslyGetEarliestTime({
      cookiesString,
      csrfToken,
      dateStr,
      retryRound: retryRound + 1,
    });
  }
}
