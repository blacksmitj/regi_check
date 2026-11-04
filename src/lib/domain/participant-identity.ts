/**
 * Helper modular untuk mencocokkan identitas unik peserta.
 * 
 * Aturan Pencocokan Kunci Identitas:
 * 1. Prioritas Utama: NIK (jika ada, baik dikonfigurasi eksplisit maupun terdeteksi otomatis seperti "NIK", "No KTP").
 *    Jika NIK sama persis, peserta dianggap duplikat.
 * 2. Pilihan Kedua (Fallback): Gabungan ID Unik + Nama (`${idKey}:::${nameKey}`).
 *    Jika NIK tidak ditemukan, maka keunikan ditentukan oleh gabungan ID Unik dan Nama.
 */

export interface ParticipantKeyOptions {
  uniqueKeyColumn: string;
  nameColumn?: string | null;
  nikColumn?: string | null;
}

/**
 * Mencari kolom NIK secara otomatis jika tidak didefinisikan secara eksplisit.
 */
export function detectNikColumn(
  dataOrHeaders: Record<string, unknown> | string[] | null | undefined
): string | null {
  if (!dataOrHeaders) return null;
  const keys = Array.isArray(dataOrHeaders) ? dataOrHeaders : Object.keys(dataOrHeaders);

  const nikRegex = /^(nik|no\.?\s*ktp|nomor\s*ktp|nomor\s*induk\s*kependudukan)$/i;
  for (const k of keys) {
    if (nikRegex.test(k.trim())) return k;
  }
  // Toleransi jika mengandung kata NIK tersendiri
  for (const k of keys) {
    if (/\bnik\b/i.test(k.trim())) return k;
  }
  return null;
}

/**
 * Mengambil nilai NIK murni dari baris peserta.
 */
export function getParticipantNik(
  data: Record<string, unknown> | null | undefined,
  nikColumn?: string | null
): string {
  if (!data) return "";
  const actualCol = nikColumn || detectNikColumn(data);
  if (!actualCol) return "";

  const raw = data[actualCol];
  return raw !== undefined && raw !== null ? String(raw).trim().toLowerCase() : "";
}

/**
 * Mengambil nilai kunci unik murni (misal NIK / ID Peserta).
 */
export function getParticipantUniqueKey(
  data: Record<string, unknown> | null | undefined,
  uniqueKeyColumn: string
): string {
  if (!data || !uniqueKeyColumn) return "";
  const rawKey = data[uniqueKeyColumn];
  return rawKey !== undefined && rawKey !== null ? String(rawKey).trim().toLowerCase() : "";
}

/**
 * Menghasilkan kunci komposit identitas peserta dari data object: `${idKey}:::${nameKey}`.
 */
export function getParticipantCompositeKey(
  data: Record<string, unknown> | null | undefined,
  options: ParticipantKeyOptions
): string {
  if (!data || !options.uniqueKeyColumn) return "";

  const idKey = getParticipantUniqueKey(data, options.uniqueKeyColumn);
  if (!idKey) return "";

  let nameKey = "";
  if (options.nameColumn) {
    const rawName = data[options.nameColumn];
    nameKey = rawName !== undefined && rawName !== null ? String(rawName).trim().toLowerCase() : "";
  }

  return `${idKey}:::${nameKey}`;
}

/**
 * Memeriksa apakah baris peserta baru cocok / duplikat dengan existing keys.
 * Menghasilkan status duplikat dan alasan kecocokan: 'nik' atau 'composite'
 */
export function checkParticipantDuplicate(
  data: Record<string, unknown>,
  options: ParticipantKeyOptions,
  existingIndex: {
    nikMap: Map<string, string>; // nik -> participantId
    compositeMap: Map<string, string>; // compositeKey -> participantId
  }
): { isDuplicate: boolean; matchType?: "nik" | "composite"; matchedParticipantId?: string } {
  // 1. Cek NIK (Prioritas Pertama)
  const nikVal = getParticipantNik(data, options.nikColumn);
  if (nikVal && existingIndex.nikMap.has(nikVal)) {
    return {
      isDuplicate: true,
      matchType: "nik",
      matchedParticipantId: existingIndex.nikMap.get(nikVal),
    };
  }

  // 2. Cek Gabungan (ID Unik + Nama) (Prioritas Kedua)
  const compositeKey = getParticipantCompositeKey(data, options);
  if (compositeKey && existingIndex.compositeMap.has(compositeKey)) {
    return {
      isDuplicate: true,
      matchType: "composite",
      matchedParticipantId: existingIndex.compositeMap.get(compositeKey),
    };
  }

  return { isDuplicate: false };
}

/**
 * Mengambil nilai representasi (ID & Nama asli) dari data baris peserta.
 */
export function getParticipantIdentityDisplay(
  data: Record<string, unknown> | null | undefined,
  options: ParticipantKeyOptions
): { keyValue: string; nameValue: string; nikValue?: string } {
  if (!data) return { keyValue: "", nameValue: "" };
  const rawKey = options.uniqueKeyColumn ? data[options.uniqueKeyColumn] : "";
  const rawName = options.nameColumn ? data[options.nameColumn] : "";
  const nikCol = options.nikColumn || detectNikColumn(data);
  const rawNik = nikCol ? data[nikCol] : "";

  return {
    keyValue: rawKey !== undefined && rawKey !== null ? String(rawKey).trim() : "",
    nameValue: rawName !== undefined && rawName !== null ? String(rawName).trim() : "",
    nikValue: rawNik !== undefined && rawNik !== null ? String(rawNik).trim() : undefined,
  };
}

/**
 * Memfilter baris sheet/excel internal agar jika ada duplikat di dalam berkas yang sama,
 * hanya kemunculan baris TERAKHIR (terbaru) yang dipertahankan.
 * 
 * Aturan Duplikasi:
 * 1. NIK sama persis -> duplikat
 * 2. ID Unik + Nama sama persis -> duplikat
 */
export function deduplicateRowsPreservingLatest<T extends Record<string, unknown>>(
  rows: T[],
  options: ParticipantKeyOptions
): {
  filteredRows: T[];
  internalDuplicatesDiscarded: number;
  emptyKeyDiscarded: number;
} {
  const nikMap = new Map<string, number>(); // nik -> rowIdx
  const compositeMap = new Map<string, number>(); // compositeKey -> rowIdx
  const discardIndices = new Set<number>();
  let emptyKeyDiscarded = 0;

  rows.forEach((row, rowIdx) => {
    const nikVal = getParticipantNik(row, options.nikColumn);
    const compositeKey = getParticipantCompositeKey(row, options);

    if (!compositeKey && !nikVal) {
      emptyKeyDiscarded++;
      discardIndices.add(rowIdx);
      return;
    }

    // Jika ada NIK dan NIK ini sudah pernah muncul sebelumnya, buang baris sebelumnya
    if (nikVal) {
      if (nikMap.has(nikVal)) {
        discardIndices.add(nikMap.get(nikVal)!);
      }
      nikMap.set(nikVal, rowIdx);
    }

    // Jika composite key sudah pernah muncul sebelumnya, buang baris sebelumnya
    if (compositeKey) {
      if (compositeMap.has(compositeKey)) {
        discardIndices.add(compositeMap.get(compositeKey)!);
      }
      compositeMap.set(compositeKey, rowIdx);
    }
  });

  const filteredRows = rows.filter((_, idx) => !discardIndices.has(idx));
  const internalDuplicatesDiscarded = rows.length - emptyKeyDiscarded - filteredRows.length;

  return {
    filteredRows,
    internalDuplicatesDiscarded,
    emptyKeyDiscarded,
  };
}
