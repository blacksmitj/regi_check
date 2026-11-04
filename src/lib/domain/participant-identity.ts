/**
 * Helper modular untuk mencocokkan identitas unik peserta.
 * 
 * Aturan Pencocokan Kunci Identitas:
 * - Kunci utama (NIK / Nomor Peserta) adalah identitas utama.
 * - Sesuai aturan:
 *   1. Jika Kunci Unik (NIK/ID) sama, peserta dianggap duplikat (mencegah ID yang sama masuk 2 kali).
 *   2. getParticipantUniqueKey() mengembalikan kunci murni berbasis NIK/ID unik (case-insensitive & trimmed).
 *   3. getParticipantCompositeKey() mengembalikan kunci kombinasi (ID + Nama).
 */

export interface ParticipantKeyOptions {
  uniqueKeyColumn: string;
  nameColumn?: string | null;
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
 * Menghasilkan kunci komposit identitas peserta dari data object.
 * Mengembalikan string kosong jika kolom kunci unik tidak ada atau nilainya kosong.
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
 * Mengambil nilai representasi (ID & Nama asli) dari data baris peserta.
 */
export function getParticipantIdentityDisplay(
  data: Record<string, unknown> | null | undefined,
  options: ParticipantKeyOptions
): { keyValue: string; nameValue: string } {
  if (!data) return { keyValue: "", nameValue: "" };
  const rawKey = options.uniqueKeyColumn ? data[options.uniqueKeyColumn] : "";
  const rawName = options.nameColumn ? data[options.nameColumn] : "";

  return {
    keyValue: rawKey !== undefined && rawKey !== null ? String(rawKey).trim() : "",
    nameValue: rawName !== undefined && rawName !== null ? String(rawName).trim() : "",
  };
}

/**
 * Memfilter baris sheet/excel internal agar jika ada duplikat di dalam berkas yang sama,
 * hanya kemunculan baris TERAKHIR (terbaru) yang dipertahankan.
 * 
 * Pencocokan diutamakan pada kunci unik (NIK/ID) agar ID yang sama tidak muncul dobel di sheet yang sama.
 */
export function deduplicateRowsPreservingLatest<T extends Record<string, unknown>>(
  rows: T[],
  options: ParticipantKeyOptions
): {
  filteredRows: T[];
  internalDuplicatesDiscarded: number;
  emptyKeyDiscarded: number;
} {
  const lastOccurrenceByKey = new Map<string, number>();
  let emptyKeyDiscarded = 0;
  let internalDuplicatesDiscarded = 0;

  rows.forEach((row, rowIdx) => {
    // Kunci utama berbasis ID Unik (NIK)
    const primaryKey = getParticipantUniqueKey(row, options.uniqueKeyColumn);
    if (!primaryKey) {
      emptyKeyDiscarded++;
      return;
    }

    if (lastOccurrenceByKey.has(primaryKey)) {
      internalDuplicatesDiscarded++;
    }
    lastOccurrenceByKey.set(primaryKey, rowIdx);
  });

  const keptIndices = new Set(lastOccurrenceByKey.values());
  const filteredRows = rows.filter((_, idx) => keptIndices.has(idx));

  return {
    filteredRows,
    internalDuplicatesDiscarded,
    emptyKeyDiscarded,
  };
}
