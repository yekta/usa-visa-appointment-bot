import { minio, minioBucketName } from "@/constants";
import { randomDelay } from "@/delay";
import { consoleLog, fileName, filePath } from "@/utils";
import fs from "fs/promises";

const region = "us-east-1";

export async function continuouslySaveLogsToMinio() {
  if (!minio) {
    consoleLog("🟪🟡 MinIO is not enabled, not saving logs.");
    return;
  }
  try {
    const fileExists = await doesFileExist(filePath);
    if (fileExists) {
      const exists = await minio.bucketExists(minioBucketName);
      if (!exists) {
        await minio.makeBucket(minioBucketName, region);
        consoleLog(`🟪🟢 Bucket created in "${region}":`, minioBucketName);
      }
      const metaData = {
        "Content-Type": "text/plain",
      };
      await minio.fPutObject(minioBucketName, fileName, filePath, metaData);
      consoleLog("🟪🟢 Logs saved to MinIO successfully:", fileName);
    }
    await randomDelay(1000 * 60, 1000 * 61);
    return await continuouslySaveLogsToMinio();
  } catch (error) {
    consoleLog("🟪🔴 Error while creating the bucket:", error);
  }
}

async function doesFileExist(filePath: string) {
  try {
    await fs.access(filePath);
    return true;
  } catch (error) {
    return false;
  }
}
