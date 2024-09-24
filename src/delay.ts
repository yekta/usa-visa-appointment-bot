import { delayRangeAfterErrorMs, delayRangeMs } from "@/constants";

export async function randomDelay(
  minMs: number = delayRangeMs[0],
  maxMs: number = delayRangeMs[1]
) {
  const delay = Math.floor(Math.random() * (maxMs - minMs + 1) + minMs);
  return new Promise((resolve) => setTimeout(resolve, delay));
}

export async function randomDelayAfterError() {
  return randomDelay(delayRangeAfterErrorMs[0], delayRangeAfterErrorMs[1]);
}

export async function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
