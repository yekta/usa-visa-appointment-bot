import { facilitiyId, host, appointmentUrl, userAgent } from "@/constants";
import { consoleLog } from "@/utils";

interface TRescheduleProps {
  csrfToken: string;
  dateStr: string;
  timeStr: string;
  cookiesString: string;
}

export async function book(props: TRescheduleProps) {
  consoleLog(`Booking appointment for: ${props.dateStr} ${props.timeStr}...`);
  let headers = {
    Host: host,
    "User-Agent": userAgent,
    Cookie: props.cookiesString,
    Referer: appointmentUrl,
    "Referrer-Policy": "strict-origin-when-cross-origin",
    "Content-Type": "application/x-www-form-urlencoded",
    "X-CSRF-Token": props.csrfToken,
    "Cache-Control": "no-store",
    Connection: "keep-alive",
  };

  const body = new URLSearchParams({
    utf8: "✓",
    confirmed_limit_message: "1",
    use_consulate_appointment_capacity: "true",
    authenticity_token: props.csrfToken,
    "appointments[consulate_appointment][facility_id]": facilitiyId,
    "appointments[consulate_appointment][date]": props.dateStr,
    "appointments[consulate_appointment][time]": props.timeStr,
  });

  consoleLog("Request Body:", body);
  consoleLog("Request Headers:", headers);

  const res = await fetch(appointmentUrl, {
    method: "POST",
    redirect: "follow",
    headers,
    body,
  });

  consoleLog(res.status, res.statusText, res);
  if (!res.ok) {
    consoleLog("Error booking appointment");
    throw new Error("Error booking appointment");
  }

  const resText = await res.text();
  consoleLog("🎉🎉🎉 Booked appointment:", resText);
  return resText;
}
