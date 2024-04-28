import fetch from "node-fetch";
import FormData from "form-data";
import {
  discordSuccessfulWebhookUrl,
  discordUnsuccessfulWebhookUrl,
  localeOptions,
  timeLocale,
} from "@/constants";

type SendMessageOptions = {
  screenshotBuffer: Buffer;
  currentAppointmentDate: Date | null;
  earliestAppointmentDate: Date | null;
  processStartDate: Date;
  processEndDate: Date;
};

export async function sendDiscordNotification(
  options: SendMessageOptions
): Promise<void> {
  const {
    screenshotBuffer,
    currentAppointmentDate,
    earliestAppointmentDate,
    processStartDate,
    processEndDate,
  } = options;

  const foundEarlierDate =
    currentAppointmentDate &&
    earliestAppointmentDate &&
    earliestAppointmentDate <= currentAppointmentDate;
  const webhookUrl = foundEarlierDate
    ? discordSuccessfulWebhookUrl
    : discordUnsuccessfulWebhookUrl;

  const filename = "screenshot-" + Date.now() + ".png";

  const processDurationInSeconds = Math.round(
    (processEndDate.getTime() - processStartDate.getTime()) / 1000
  );

  const embed = {
    title: foundEarlierDate
      ? "🎉 Found earlier appointment date"
      : "😭 Couldn't find an earlier appointment date.",
    color: 0x3498db,
    fields: [
      {
        name: "Earliest Appointment Date",
        value: earliestAppointmentDate
          ? earliestAppointmentDate.toLocaleString(timeLocale, localeOptions)
          : "Unknown 🧐",
        inline: false,
      },
      {
        name: "Current Appointment Date",
        value: currentAppointmentDate
          ? currentAppointmentDate.toLocaleString(timeLocale, localeOptions)
          : "Unknown 🧐",
        inline: false,
      },
      {
        name: "Process Start Date",
        value: processStartDate.toLocaleString(timeLocale, localeOptions),
        inline: false,
      },
      {
        name: "Process End Date",
        value: processEndDate.toLocaleString(timeLocale, localeOptions),
        inline: false,
      },
      {
        name: "Process Duration (Seconds)",
        value: processDurationInSeconds,
        inline: false,
      },
    ],
  };

  const formData = new FormData();
  formData.append(
    "payload_json",
    JSON.stringify({
      embeds: [embed],
    })
  );
  formData.append("file", screenshotBuffer, filename);

  await fetch(webhookUrl, {
    method: "POST",
    body: formData,
  });
}
