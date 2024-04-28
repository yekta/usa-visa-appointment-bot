import {
  discordSuccessfulWebhookUrl,
  discordUnsuccessfulWebhookUrl,
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

  const resJson = await res.json();
  console.log("✅ Discord notification sent successfully.", resJson);
}
