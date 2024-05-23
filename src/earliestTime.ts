import {
  appointmentUrl,
  getAppointmentTimesUrl,
  visaHost,
  sharedHeaders,
  userAgent,
} from "@/constants";
import { randomDelay, randomDelayAfterError } from "@/delay";
import { getSession } from "@/session";
import { consoleLog } from "@/utils.ts";
import type { Page } from "puppeteer";

const getEarliestTimeRetryLimit = 3;

export async function getEarliestTimeWithRetry({
  page,
  cookiesString,
  csrfToken,
  dateStr,
  retryRound = 0,
}: {
  page: Page;
  cookiesString: string;
  csrfToken: string;
  dateStr: string;
  retryRound?: number;
}): Promise<{
  firstAvailableTimeStr: string | null;
  csrfToken: string;
  cookiesString: string;
}> {
  if (retryRound >= getEarliestTimeRetryLimit) {
    return { firstAvailableTimeStr: null, csrfToken, cookiesString };
  }
  try {
    consoleLog("Fetching the first available time for:", dateStr);
    const res = await fetch(getAppointmentTimesUrl(dateStr), {
      method: "GET",
      headers: {
        Host: visaHost,
        Referer: appointmentUrl,
        Accept: "application/json, text/javascript, */*; q=0.01",
        "Accept-Encoding": "gzip, deflate, br",
        "X-Requested-With": "XMLHttpRequest",
        "X-CSRF-Token": csrfToken,
        Cookie: cookiesString,
        ...sharedHeaders,
      },
    });
    let firstAvailableTimeStr = "";
    consoleLog(res.status, res.statusText);

    if (res.status >= 400 && res.status < 500) {
      consoleLog(`${res.status} status code.`);
      consoleLog(
        "🔐 Doesn't seem to be signed in, getting session after delay..."
      );
      await randomDelay(3000, 4000);
      const { cookiesString: coStr, csrfToken: csStr } = await getSession({
        page,
        reload: true,
      });
      return await getEarliestTimeWithRetry({
        page,
        cookiesString: coStr,
        csrfToken: csStr,
        dateStr,
        retryRound: retryRound + 1,
      });
    }

    if (res.status >= 500 && res.status < 600) {
      consoleLog(`${res.status} status code. Waiting delay and retrying...`);
      await randomDelay(3000, 4000);
      return await getEarliestTimeWithRetry({
        page,
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
      return await getEarliestTimeWithRetry({
        page,
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

    return { firstAvailableTimeStr, csrfToken, cookiesString };
  } catch (error) {
    consoleLog("GetTime error:", error);
    await randomDelayAfterError();
    return await getEarliestTimeWithRetry({
      page,
      cookiesString,
      csrfToken,
      dateStr,
      retryRound: retryRound + 1,
    });
  }
}
