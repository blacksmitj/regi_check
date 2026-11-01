import { NextRequest, NextResponse } from "next/server";
import { s3Client, S3_BUCKET } from "@/lib/storage/s3";
import { PutObjectCommand } from "@aws-sdk/client-s3";
import crypto from "crypto";

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const bucket = (formData.get("bucket") as string) || S3_BUCKET;

    if (!file) {
      return NextResponse.json(
        { error: "File tidak ditemukan dalam request" },
        { status: 400 }
      );
    }

    const fileExt = file.name.split(".").pop() || "bin";
    const fileName = `${Date.now()}-${crypto.randomUUID()}.${fileExt}`;
    const key = `uploads/${fileName}`;

    // Convert file to Buffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Upload via S3 Client
    const command = new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      Body: buffer,
      ContentType: file.type || "application/octet-stream",
    });

    try {
      await s3Client.send(command);

      // Resolve public URL: Supabase Storage public format
      const endpoint = process.env.S3_ENDPOINT || "https://nnemuqmiygworptowfnc.supabase.co/storage/v1/s3";
      // Convert S3 endpoint to public object URL format
      const supabaseBase = endpoint.replace("/storage/v1/s3", "");
      const publicUrl = `${supabaseBase}/storage/v1/object/public/${bucket}/${key}`;

      return NextResponse.json({
        id: `ev_${crypto.randomUUID()}`,
        name: file.name,
        size: file.size,
        type: file.type,
        url: publicUrl,
        path: key,
      });
    } catch (uploadError: unknown) {
      console.warn("S3 Upload error / fallback:", (uploadError as Error).message);

      // Fallback data URL if credentials not yet configured or bucket missing
      const fallbackUrl = `data:${file.type};base64,${buffer.toString("base64")}`;
      return NextResponse.json({
        id: `ev_${crypto.randomUUID()}`,
        name: file.name,
        size: file.size,
        type: file.type,
        url: fallbackUrl,
        path: key,
      });
    }
  } catch (error) {
    console.error("POST /api/storage/upload error:", error);
    return NextResponse.json(
      { error: "Gagal mengunggah file bukti" },
      { status: 500 }
    );
  }
}
