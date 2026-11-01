import { FormFieldType } from "@/types/domain";

/**
 * Extracts Google Drive file ID from various link patterns:
 * - https://drive.google.com/file/d/FILE_ID/view?usp=sharing
 * - https://drive.google.com/open?id=FILE_ID
 * - https://drive.google.com/uc?id=FILE_ID
 * - https://docs.google.com/document/d/FILE_ID/...
 */
export function extractGoogleDriveFileId(url: string): string | null {
  if (!url || typeof url !== "string") return null;

  const patterns = [
    /\/file\/d\/([a-zA-Z0-9_-]+)/,
    /\/document\/d\/([a-zA-Z0-9_-]+)/,
    /\/presentation\/d\/([a-zA-Z0-9_-]+)/,
    /\/spreadsheets\/d\/([a-zA-Z0-9_-]+)/,
    /[?&]id=([a-zA-Z0-9_-]+)/,
    /\/d\/([a-zA-Z0-9_-]+)/,
  ];

  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match && match[1]) {
      return match[1];
    }
  }

  return null;
}

export function isGoogleDriveUrl(url: string): boolean {
  if (!url || typeof url !== "string") return false;
  return /drive\.google\.com|docs\.google\.com/i.test(url);
}

/**
 * Converts Google Drive URL to a direct thumbnail/image preview URL.
 */
export function getGoogleDriveThumbnailUrl(url: string, width = 1000): string {
  const fileId = extractGoogleDriveFileId(url);
  if (!fileId) return url;
  return `https://drive.google.com/thumbnail?id=${fileId}&sz=w${width}`;
}

/**
 * Converts Google Drive URL to an embeddable preview URL (works great for PDFs, Docs, etc in iframe).
 */
export function getGoogleDrivePreviewUrl(url: string): string {
  const fileId = extractGoogleDriveFileId(url);
  if (!fileId) return url;
  return `https://drive.google.com/file/d/${fileId}/preview`;
}

/**
 * Checks whether a given string is likely an image link or file.
 */
export function isImageUrl(url: string): boolean {
  if (!url || typeof url !== "string") return false;
  if (/^data:image\//i.test(url)) return true;
  return /\.(jpg|jpeg|png|webp|gif|svg|bmp)(\?.*)?$/i.test(url);
}

/**
 * Checks whether a given string is likely a PDF file or link.
 */
export function isPdfUrl(url: string): boolean {
  if (!url || typeof url !== "string") return false;
  return /\.pdf(\?.*)?$/i.test(url);
}

/**
 * Detects the most appropriate FormFieldType based on header name and sample column values.
 */
export function detectFieldType(
  columnName: string,
  sampleValues: unknown[] = []
): FormFieldType {
  const name = columnName.toLowerCase();

  // Helper to test samples
  const stringSamples = sampleValues
    .map((v) => (v !== null && v !== undefined ? String(v).trim() : ""))
    .filter((v) => v.length > 0);

  const hasDriveLink = stringSamples.some((v) => isGoogleDriveUrl(v));
  const hasImageExt = stringSamples.some((v) => isImageUrl(v));
  const hasPdfExt = stringSamples.some((v) => isPdfUrl(v));

  // Check 1: Explicit image keywords in header
  const isImageKeyword = /foto|photo|gambar|image|avatar|ktp|selfie|pasfoto|pas_foto/i.test(name);
  if (isImageKeyword) {
    return "image";
  }

  // Check 2: Explicit document/pdf keywords in header
  const isDocKeyword = /pdf|dokumen|document|berkas|ijazah|sertifikat|cv|surat|lampiran|file/i.test(name);
  if (isDocKeyword) {
    return "file";
  }

  // Check 3: Link samples
  if (hasImageExt) {
    return "image";
  }

  if (hasPdfExt) {
    return "file";
  }

  // If it's a Drive link without obvious extension, check header context or default to file
  if (hasDriveLink) {
    if (/ktp|foto|profil|avatar|wajah/i.test(name)) {
      return "image";
    }
    return "file";
  }

  // Check 4: Other common types
  if (/email|e-mail/i.test(name)) return "email";
  if (/telp|telepon|hp|phone|wa|whatsapp|nomor_hp|kontak/i.test(name)) return "phone";
  if (/tanggal|tgl|date|birth|lahir/i.test(name)) return "date";
  if (/omset|gaji|nominal|jumlah|harga|total|nilai|angka|kuota|qty/i.test(name)) return "number";

  return "text";
}

