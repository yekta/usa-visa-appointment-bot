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
  const form = new FormData();
  form.append("utf8", props.utf8);
  form.append("authenticity_token", props.authenticityToken);
  form.append("confirmed_by_limit_message", props.confirmedByLimitMessage);
  form.append(
    "use_consulate_appointment_capacity",
    props.useConsulateAppointmentCapacity
  );
  form.append(
    "appointments[consulate_appointment][facility_id]",
    props.facilityId
  );
  form.append("appointments[consulate_appointment][date]", props.dateStr);
  form.append("appointments[consulate_appointment][time]", props.timeStr);

  const headers = {
    "User-Agent": userAgent,
    Cookie: props.cookiesString,
    Referer: rescheduleAppointmentUrl,
  };

  const res = await fetch(rescheduleAppointmentUrl, {
    method: "POST",
    headers,
    body: form,
  });
  console.log(res.status, res.statusText);
  if (!res.ok) {
    console.log("Error rescheduling appointment");
  }
  const resText = await res.text();
  console.log(resText);
}
