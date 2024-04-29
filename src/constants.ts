import dotenv from "dotenv";

dotenv.config();

export const timeZone = "Europe/Istanbul";
export const timeLocale = "en-GB";
export const localeOptions: Intl.DateTimeFormatOptions = {
  timeZone: timeZone,
  month: "long",
  day: "numeric",
  year: "numeric",
  hour: "numeric",
  minute: "numeric",
};

export const discordSuccessfulWebhookUrl =
  process.env.DISCORD_SUCCESSFUL_WEBHOOK_URL || "";
export const discordUnsuccessfulWebhookUrl =
  process.env.DISCORD_UNSUCCESSFUL_WEBHOOK_URL || "";
export const discordUserId = process.env.DISCORD_USER_ID || "";

export const usvisaEmail = process.env.USVISA_EMAIL || "";
export const usvisaPassword = process.env.USVISA_PASSWORD || "";
export const usvisaSignInUrl = process.env.USVISA_SIGN_IN_URL || "";
export const usvisaRescheduleAppointmentUrl =
  process.env.USVISA_RESCHEDULE_APPOINTMENT_URL || "";

export const isProduction = process.env.IS_PROD === "true";
