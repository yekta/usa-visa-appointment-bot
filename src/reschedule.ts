import { rescheduleAppointmentUrl, userAgent } from "@/constants";
import { FormData } from "formdata-node";

interface TRescheduleProps {
  utf8: string;
  authenticityToken: string;
  confirmedByLimitMessage: string;
  useConsulateAppointmentCapacity: string;
  facilityId: string;
  dateStr: string;
  timeStr: string;
  cookiesString: string;
}

export async function reschedule(props: TRescheduleProps) {
  const headers = {
    "User-Agent": userAgent,
    Cookie: props.cookiesString,
    Referer: rescheduleAppointmentUrl,
  };

  const body = new URLSearchParams({
    utf8: "✓",
    authenticity_token: props.authenticityToken,
    confirmed_by_limit_message: props.confirmedByLimitMessage,
    use_consulate_appointment_capacity: props.useConsulateAppointmentCapacity,
    "appointments[consulate_appointment][facility_id]": props.facilityId,
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
}
