import {
  facilitiyId,
  host,
  rescheduleAppointmentUrl,
  userAgent,
} from "@/constants";

interface TRescheduleProps {
  csrfToken: string;
  dateStr: string;
  timeStr: string;
  cookiesString: string;
}

export async function book(props: TRescheduleProps) {
  const headers = {
    Host: host,
    "User-Agent": userAgent,
    Cookie: props.cookiesString,
    Referer: rescheduleAppointmentUrl,
    "Content-Type": "application/x-www-form-urlencoded",
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

  console.log(res.status, res.statusText);
  if (!res.ok) {
    console.log("Error rescheduling appointment");
  }

  const resText = await res.text();
  console.log(resText);
  return resText;
}
