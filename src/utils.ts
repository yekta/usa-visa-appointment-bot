import { processStartDate } from "@/constants";
import fs from "fs";
import util from "util";

export async function randomDelay(
  minMs: number = 15000,
  maxMs: number = 16000
) {
  const delay = Math.floor(Math.random() * (maxMs - minMs + 1) + minMs);
  return new Promise((resolve) => setTimeout(resolve, delay));
}

export async function randomDelayAfterError() {
  return randomDelay(30000, 31000);
}

const logsFolder = "logs";
const fileName = processStartDate
  .toISOString()
  .replaceAll(":", "-")
  .replace(".", "-");

export function consoleLog(...args: any[]): void {
  const currentDateISO = new Date().toISOString();
  const message = args
    .map((arg) =>
      typeof arg === "object" ? util.inspect(arg, { depth: null }) : arg
    )
    .join(" ");
  const timestampedMessage = `${currentDateISO} | ${message}`;
  console.log(timestampedMessage);
  fs.mkdir(logsFolder, { recursive: true }, (err) => {
    if (err) {
      console.error("Failed to create logs folder:", err);
    }
  });
  fs.appendFile(
    `${logsFolder}/${fileName}.txt`,
    timestampedMessage + "\n",
    (err) => {
      if (err) {
        console.error("Failed to write to file:", err);
      }
    }
  );
}
