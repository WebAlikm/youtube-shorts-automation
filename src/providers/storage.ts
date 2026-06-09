import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { readFile } from "node:fs/promises";
import { config } from "../config.js";

const client = new S3Client({
  region: config.STORAGE_REGION,
  endpoint: config.STORAGE_ENDPOINT,
  credentials: {
    accessKeyId: config.STORAGE_ACCESS_KEY,
    secretAccessKey: config.STORAGE_SECRET_KEY,
  },
});

export async function uploadAsset(
  path: string,
  key: string,
  contentType: string,
) {
  await client.send(
    new PutObjectCommand({
      Bucket: config.STORAGE_BUCKET,
      Key: key,
      Body: await readFile(path),
      ContentType: contentType,
    }),
  );
  return `${config.STORAGE_PUBLIC_URL.replace(/\/$/, "")}/${key}`;
}
