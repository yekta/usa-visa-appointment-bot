import { minio, minioBucketName, minioRegion } from "@/constants";
import { delay } from "@/delay";
import { consoleLog, fileName, filePath } from "@/utils";
import fs from "fs/promises";

const logInterval = 1000 * 60 * 2;

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
        await minio.makeBucket(minioBucketName, minioRegion);
        consoleLog(`🟪🟢 Bucket created in "${minioRegion}":`, minioBucketName);
      }
      const metaData = {
        "Content-Type": "text/plain",
      };
      await minio.fPutObject(minioBucketName, fileName, filePath, metaData);
      consoleLog("🟪🟢 Logs saved to MinIO :", fileName);
    }
    await delay(logInterval);
    return await continuouslySaveLogsToMinio();
  } catch (error) {
    consoleLog("🟪🔴 MinIO error:", error);
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
