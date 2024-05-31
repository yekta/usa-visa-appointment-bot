import { minio, minioBucketName } from "@/constants";
import { randomDelay } from "@/delay";
import { fileName, filePath } from "@/utils";

export async function continuouslySaveLogsToMinio() {
  if (!minio) return null;
  try {
    const exists = await minio.bucketExists(minioBucketName);
    if (exists) {
      console.log("Bucket " + minioBucketName + " exists.");
    } else {
      await minio.makeBucket(minioBucketName, "us-east-1");
      console.log("Bucket " + minioBucketName + ' created in "us-east-1".');
    }
    const metaData = {
      "Content-Type": "text/plain",
    };
    await minio.fPutObject(minioBucketName, fileName, filePath, metaData);
    console.log("🟪 Logs saved to Minio successfully:", fileName);
    await randomDelay(1000 * 60, 1000 * 61);
    return await continuouslySaveLogsToMinio();
  } catch (error) {
    console.error("Error while creating the bucket:", error);
  }
}
