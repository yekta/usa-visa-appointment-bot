import { processStartDate, timeZone } from "@/constants";
import fs from "fs";
import util from "util";
import moment from "moment-timezone";

const logsFolder = "logs";
const fileName = formatDate(processStartDate, {
  fileNameSafe: true,
});

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
  fs.appendFileSync(`${logsFolder}/${fileName}.txt`, timestampedMessage + "\n");
}

function formatDate(date: Date, options?: { fileNameSafe: boolean }): string {
  const newDateTz = moment(date).tz(timeZone);
  let output = newDateTz.format("YYYY-MM-DD_HH:mm:ssZ");
  if (options?.fileNameSafe) {
    output = output.replaceAll(":", "-").replaceAll(".", "-");
  }
  return output;
}
