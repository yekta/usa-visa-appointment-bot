import moment from "moment-timezone";

export const longDelay = 15 * 60 * 1000;
const nowMs = new Date().getTime();

export const timeZone = process.env.TIME_ZONE || "";
export const timeLocale = process.env.TIME_LOCALE || "";
const currentAppointmentDateRaw = "2027 November, 2024, 10:00" || "";
const minAppointmentDateThresholdInDays = Number(
  process.env.MIN_APPOINTMENT_DATE_THRESHOLD_IN_DAYS || ""
);

export const localeOptions: Intl.DateTimeFormatOptions = {
  timeZone: timeZone,
  month: "long",
  day: "numeric",
  year: "numeric",
  hour: "numeric",
  minute: "numeric",
};
export const currentAppointmentDate = moment
  .tz(currentAppointmentDateRaw, "D MMMM, YYYY, HH:mm", timeZone)
  .toDate();
export const minAppointmentDate = new Date(
  nowMs + 1000 * 60 * 60 * 24 * minAppointmentDateThresholdInDays
);

export const discordSuccessfulWebhookUrl =
  process.env.DISCORD_SUCCESSFUL_WEBHOOK_URL || "";
export const discordUnsuccessfulWebhookUrl =
  process.env.DISCORD_UNSUCCESSFUL_WEBHOOK_URL || "";
export const discordUserId = process.env.DISCORD_USER_ID || "";

export const email = process.env.EMAIL || "";
export const password = process.env.PASSWORD || "";
export const scheduleId = process.env.SCHEDULE_ID || "";
export const facilitiyId = process.env.FACILITY_ID || "";
export const countryCode = process.env.COUNTRY_CODE || "";

if (!email || !password || !scheduleId || !facilitiyId || !countryCode) {
  throw new Error(
    "Please provide all the required environment variables: EMAIL, PASSWORD, SCHEDULE_ID, FACILITY_ID, COUNTRY_CODE"
  );
}

export const host = "ais.usvisa-info.com";
const baseUrl = `https://${host}/${countryCode}/niv`;
export const signInUrl = `${baseUrl}/users/sign_in`;
export const appointmentUrl = `${baseUrl}/schedule/${scheduleId}/appointment`;
export const appointmentDatesUrl =
  appointmentUrl + `/days/${facilitiyId}.json?appointments[expedite]=false`;
export const getAppointmentTimesUrl = (date: string) =>
  appointmentUrl +
  `/times/${facilitiyId}.json?date=${date}&appointments[expedite]=false`;

export const userAgent =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36";

export const processStartDate = new Date();
