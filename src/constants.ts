import dotenv from "dotenv";
import moment from "moment-timezone";

dotenv.config();

export const timeZone = process.env.TIME_ZONE || "";
export const timeLocale = process.env.TIME_LOCALE || "";
const currentAppointmentDateRaw = process.env.CURRENT_APPOINTMENT_DATE || "";
const minAppointmentDateRaw = process.env.MIN_APPOINTMENT_DATE || "";
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
export const minAppointmentDate = moment
  .tz(minAppointmentDateRaw, "D MMMM, YYYY, HH:mm", timeZone)
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
