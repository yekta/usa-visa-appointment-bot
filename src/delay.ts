export async function randomDelay(
  minMs: number = 10000,
  maxMs: number = 11000
) {
  const delay = Math.floor(Math.random() * (maxMs - minMs + 1) + minMs);
  return new Promise((resolve) => setTimeout(resolve, delay));
}

export async function randomDelayAfterError() {
  return randomDelay(30000, 31000);
}

export async function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
