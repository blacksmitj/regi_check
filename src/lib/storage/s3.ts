import { S3Client } from "@aws-sdk/client-s3";

const endpoint = process.env.S3_ENDPOINT || "https://nnemuqmiygworptowfnc.supabase.co/storage/v1/s3";
const region = process.env.S3_REGION || "eu-north-1";
const accessKeyId = process.env.S3_ACCESS_KEY_ID || "";
const secretAccessKey = process.env.S3_SECRET_ACCESS_KEY || "";

export const s3Client = new S3Client({
  endpoint,
  region,
  credentials: {
    accessKeyId,
    secretAccessKey,
  },
  forcePathStyle: true, // Diperlukan untuk S3-compatible storage seperti Supabase/MinIO
});

export const S3_BUCKET = process.env.S3_BUCKET || "evidence";

