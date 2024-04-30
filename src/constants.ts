import dotenv from "dotenv";
import moment from "moment-timezone";

dotenv.config();

export const timeZone = process.env.TIME_ZONE || "";
export const timeLocale = process.env.TIME_LOCALE || "";
const currentAppointmentDateRaw = process.env.CURRENT_APPOINTMENT_DATE || "";
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
export const signInUrl = `https://ais.usvisa-info.com/${countryCode}/niv/users/sign_in`;
export const appointmentDatesUrl = `https://ais.usvisa-info.com/${countryCode}/niv/schedule/${scheduleId}/appointment/days/${facilitiyId}.json?appointments[expedite]=false`;
export const getAppointmentTimesUrl = (date: string) =>
  `https://ais.usvisa-info.com/${countryCode}/niv/schedule/${scheduleId}/appointment/times/${facilitiyId}.json?date=${date}&appointments[expedite]=false`;
export const host = "ais.usvisa-info.com";
export const rescheduleAppointmentUrl = `https://ais.usvisa-info.com/${countryCode}/niv/schedule/${scheduleId}/appointment`;

export const userAgent =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36";
