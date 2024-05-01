import {
  facilitiyId,
  host,
  rescheduleAppointmentUrl,
  userAgent,
} from "@/constants";
import { consoleLog } from "@/utils";

interface TRescheduleProps {
  csrfToken: string;
  dateStr: string;
  timeStr: string;
  cookiesString: string;
}

export async function book(props: TRescheduleProps) {
  let headers = {
    Host: host,
    "User-Agent": userAgent,
    Cookie: props.cookiesString,
    Referer: rescheduleAppointmentUrl,
    "Content-Type": "application/x-www-form-urlencoded",
    "X-CSRF-Token": props.csrfToken,
  };

  const body = new URLSearchParams({
    confirmed_by_limit_message: "1",
    use_consulate_appointment_capacity: "true",
    authenticity_token: props.csrfToken,
    "appointments[consulate_appointment][facility_id]": facilitiyId,
    "appointments[consulate_appointment][date]": props.dateStr,
    "appointments[consulate_appointment][time]": props.timeStr,
  });

  const res = await fetch(rescheduleAppointmentUrl, {
    method: "POST",
    headers,
    body,
  });

  consoleLog(res.status, res.statusText);
  if (!res.ok) {
    consoleLog("Error rescheduling appointment");
  }

  const resText = await res.text();
  consoleLog(resText);
  return resText;
}
