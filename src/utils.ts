import { processStartDate, timeZone } from "@/constants";
import fs from "fs";
import util from "util";
import moment from "moment-timezone";

const logsFolder = "logs";
export const fileName = formatDate(processStartDate, {
  fileNameSafe: true,
});
export const filePath = `${logsFolder}/${fileName}.txt`;

export function consoleLog(...args: any[]): void {
  const currentDate = formatDate(new Date());
  const message = args
    .map((arg) =>
      typeof arg === "object" ? util.inspect(arg, { depth: null }) : arg
    )
    .join(" ");
  const timestampedMessage = `${currentDate} | ${message}`;
  console.log(timestampedMessage);
  fs.mkdirSync(logsFolder, { recursive: true });
  fs.appendFileSync(filePath, timestampedMessage + "\n");
}

function formatDate(date: Date, options?: { fileNameSafe: boolean }): string {
  const newDateTz = moment(date).tz(timeZone);
  let output = newDateTz.format("YYYY-MM-DD HH:mm:ss.S (Z)");
  if (options?.fileNameSafe) {
    output = output
      .replaceAll(" ", "_")
      .replaceAll(":", "-")
      .replaceAll(".", "-");
  }
  return output;
}
