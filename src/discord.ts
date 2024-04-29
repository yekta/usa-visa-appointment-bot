import {
  discordSuccessfulWebhookUrl,
  discordUnsuccessfulWebhookUrl,
  discordUserId,
  localeOptions,
  timeLocale,
} from "@/constants";
import { FormData } from "formdata-node";

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
  console.log("⏳ Sending Discord notification...");
  const {
    screenshotBuffer,
    currentAppointmentDate,
    earliestAppointmentDate,
    processStartDate,
    processEndDate,
  } = options;

  const hasError = !currentAppointmentDate || !earliestAppointmentDate;

  const foundEarlierAppointment =
    !hasError && earliestAppointmentDate <= currentAppointmentDate;

  const color = hasError
    ? 0xe74c3c
    : foundEarlierAppointment
      ? 0x2ecc71
      : 0x3498db;

  const webhookUrl = foundEarlierAppointment
    ? discordSuccessfulWebhookUrl
    : discordUnsuccessfulWebhookUrl;

  const filename = "screenshot-" + Date.now() + ".png";

  const processDurationInSeconds = Math.round(
    (processEndDate.getTime() - processStartDate.getTime()) / 1000
  );

  const embed = {
    title: hasError
      ? "🔴 Something went wrong!"
      : foundEarlierAppointment
        ? "🟢 Found earlier appointment!"
        : "🔵 Couldn't find an earlier appointment.",
    color,
    fields: [
      {
        name: "Earliest Appointment",
        value: earliestAppointmentDate
          ? earliestAppointmentDate.toLocaleString(timeLocale, localeOptions)
          : "Unknown",
        inline: false,
      },
      {
        name: "Current Appointment",
        value: currentAppointmentDate
          ? currentAppointmentDate.toLocaleString(timeLocale, localeOptions)
          : "Unknown",
        inline: false,
      },
      {
        name: "Process Start",
        value: processStartDate.toLocaleString(timeLocale, localeOptions),
        inline: false,
      },
      {
        name: "Process End",
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
  const content = hasError
    ? `There is an error! <@${discordUserId}>`
    : foundEarlierAppointment
      ? `Found an earlier appointment! <@${discordUserId}>`
      : "Nothing interesting.";
  formData.append(
    "payload_json",
    JSON.stringify({
      content: content,
      embeds: [embed],
    })
  );
  const blob = new Blob([screenshotBuffer], { type: "image/png" });
  formData.append("file", blob, filename);

  const res = await fetch(webhookUrl, {
    method: "POST",
    // @ts-ignore
    body: formData,
  });

  if (!res.ok) {
    console.log(res.status, res.statusText);
    throw new Error("❌ Failed to send Discord notification.");
  }

  console.log("✅ Discord notification sent successfully.");
}
