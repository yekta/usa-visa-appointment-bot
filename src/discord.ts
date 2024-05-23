import {
  discordSuccessfulWebhookUrl,
  discordUnsuccessfulWebhookUrl,
  discordUserId,
  localeOptions,
  timeLocale,
} from "@/constants";
import { consoleLog } from "@/utils";
import { FormData } from "formdata-node";

export async function sendDiscordNotification({
  currentAppointmentDate,
  earliestAppointmentDate,
  processStartDate,
  processEndDate,
  facilityId,
  file,
}: {
  currentAppointmentDate: Date | null;
  earliestAppointmentDate: Date | null;
  processStartDate: Date;
  processEndDate: Date;
  facilityId: string;
  file?: Buffer;
}): Promise<void> {
  try {
    consoleLog("⏳ Sending Discord notification...");

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

    const processDurationInSeconds = Math.round(
      (processEndDate.getTime() - processStartDate.getTime()) / 1000
    );

    const embed = {
      title: hasError
        ? "🔴 Something went wrong!"
        : foundEarlierAppointment
          ? "🟢 Found earlier appointment!"
          : "🔵 No earlier appointment.",
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
          name: "Facility ID",
          value: facilityId,
          inline: false,
        },
        {
          name: "Process Start",
          value: processStartDate.toLocaleString(timeLocale, localeOptions),
          inline: false,
        },
        {
          name: "Process Duration (s)",
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

    if (file) {
      const blob = new Blob([file]);
      formData.append("file", blob, "upload.png"); // Append file if provided
    }

    const res = await fetch(webhookUrl, {
      method: "POST",
      // @ts-ignore
      body: formData,
    });

    if (!res.ok) {
      consoleLog(res.status, res.statusText);
      throw new Error("❌ Failed to send Discord notification.");
    }

    consoleLog("✅ Discord notification sent successfully.");
  } catch (error) {
    consoleLog("❌ Error sending Discord notification:", error);
  }
}

export async function sendAppointmentBookedDiscordNotification({
  newAppointmentDate,
  oldAppointmentDate,
  facilityId,
  file,
}: {
  newAppointmentDate: Date;
  oldAppointmentDate: Date;
  facilityId: string;
  file?: File;
}) {
  try {
    consoleLog("⏳ Sending Discord notification for booked appointment...");
    const color = 0x2ecc71;
    const webhookUrl = discordSuccessfulWebhookUrl;

    const embed = {
      title: "🟢🎉 Booked earlier appointment! 🎉🟢",
      color,
      fields: [
        {
          name: "New Appointment",
          value: newAppointmentDate.toLocaleString(timeLocale, localeOptions),
          inline: false,
        },
        {
          name: "Old Appointment",
          value: oldAppointmentDate.toLocaleString(timeLocale, localeOptions),
          inline: false,
        },
        {
          name: "Facility ID",
          value: facilityId,
          inline: false,
        },
        {
          name: "Current Time",
          value: new Date().toLocaleString(timeLocale, localeOptions),
          inline: false,
        },
      ],
    };

    const formData = new FormData();
    const content = `Booked earlier appointment! <@${discordUserId}>`;
    formData.append(
      "payload_json",
      JSON.stringify({
        content: content,
        embeds: [embed],
      })
    );

    if (file) {
      formData.append("file", file, file.name); // Append file if provided
    }

    const res = await fetch(webhookUrl, {
      method: "POST",
      // @ts-ignore
      body: formData,
    });

    if (!res.ok) {
      consoleLog(res.status, res.statusText);
      throw new Error(
        "❌ Failed to send Discord notification for booked appointment."
      );
    }

    consoleLog(
      "✅ Discord notification for booked appointment sent successfully."
    );
  } catch (error) {
    consoleLog(
      "❌ Error sending Discord notification for appoinment booked:",
      error
    );
  }
}
