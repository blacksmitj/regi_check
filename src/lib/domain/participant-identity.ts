/**
 * Helper modular untuk mencocokkan identitas unik peserta.
 * Menggabungkan kolom kunci unik (misal: NIK/Nomor Peserta) dan kolom Nama.
 * 
 * Aturan:
 * - Kunci utama harus terisi (tidak boleh kosong/whitespace).
 * - Huruf besar/kecil diabaikan (case-insensitive) & spasi di tepi dibersihkan (trimmed).
 * - Jika kolom nama ada, kedua nilai digabungkan menjadi composite key: `${idKey}:::${nameKey}`.
 */

export interface ParticipantKeyOptions {
  uniqueKeyColumn: string;
  nameColumn?: string | null;
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

  const rawKey = data[options.uniqueKeyColumn];
  const idKey = rawKey !== undefined && rawKey !== null ? String(rawKey).trim().toLowerCase() : "";
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
    const compositeKey = getParticipantCompositeKey(row, options);
    if (!compositeKey) {
      emptyKeyDiscarded++;
      return;
    }

    if (lastOccurrenceByKey.has(compositeKey)) {
      internalDuplicatesDiscarded++;
    }
    lastOccurrenceByKey.set(compositeKey, rowIdx);
  });

  const keptIndices = new Set(lastOccurrenceByKey.values());
  const filteredRows = rows.filter((_, idx) => keptIndices.has(idx));

  return {
    filteredRows,
    internalDuplicatesDiscarded,
    emptyKeyDiscarded,
  };
}
