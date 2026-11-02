import * as XLSX from "xlsx";

export interface ParsedGoogleSheetResult {
  spreadsheetId: string;
  sheetGid: string;
  exportUrl: string;
  headers: string[];
  rows: Record<string, unknown>[];
}

/**
 * Extracts spreadsheetId and gid from various Google Sheets URL formats.
 * e.g.:
 * - https://docs.google.com/spreadsheets/d/1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms/edit?usp=sharing
 * - https://docs.google.com/spreadsheets/d/1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms/edit#gid=123456789
 * - https://docs.google.com/spreadsheets/d/e/2PACX-1v.../pubhtml
 */
export function parseGoogleSheetUrl(rawUrl: string): {
  spreadsheetId: string;
  sheetGid: string;
  exportUrl: string;
} {
  const trimmed = rawUrl.trim();
  if (!trimmed) {
    throw new Error("URL Google Spreadsheet tidak boleh kosong.");
  }

  // Check if published web link (pub?output=csv)
  if (trimmed.includes("/pub") && (trimmed.includes("output=csv") || trimmed.includes("output=tsv"))) {
    return {
      spreadsheetId: "published",
      sheetGid: "0",
      exportUrl: trimmed,
    };
  }

  // Extract ID between /d/ and /
  const matchId = trimmed.match(/\/d\/([a-zA-Z0-9-_]+)/);
  if (!matchId || !matchId[1]) {
    throw new Error(
      "Format link Google Spreadsheet tidak valid. Pastikan link memiliki format: https://docs.google.com/spreadsheets/d/{ID}/edit"
    );
  }

  const spreadsheetId = matchId[1];

  // Extract gid (from #gid=1234 or ?gid=1234)
  let sheetGid = "0";
  const matchGid = trimmed.match(/[#?&]gid=([0-9]+)/);
  if (matchGid && matchGid[1]) {
    sheetGid = matchGid[1];
  }

  const exportUrl = `https://docs.google.com/spreadsheets/d/${spreadsheetId}/export?format=csv&gid=${sheetGid}`;

  return {
    spreadsheetId,
    sheetGid,
    exportUrl,
  };
}

/**
 * Fetches Google Sheet CSV content from public URL and parses rows and headers using XLSX
 */
export async function fetchAndParseGoogleSheet(rawUrl: string): Promise<ParsedGoogleSheetResult> {
  const { spreadsheetId, sheetGid, exportUrl } = parseGoogleSheetUrl(rawUrl);

  const response = await fetch(exportUrl, {
    method: "GET",
    headers: {
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
    },
    redirect: "follow",
    cache: "no-store",
  });

  if (!response.ok) {
    if (response.status === 404) {
      throw new Error("Dokumen Google Spreadsheet tidak ditemukan (404).");
    }
    if (response.status === 403 || response.status === 401) {
      throw new Error(
        "Akses ditolak. Pastikan akses Google Spreadsheet diatur ke 'Siapa saja yang memiliki link dapat melihat' (Anyone with the link can view)."
      );
    }
    throw new Error(`Gagal mengambil data dari Google Sheets (HTTP ${response.status}).`);
  }

  const finalUrl = response.url || "";
  // If redirected to google accounts login page, the spreadsheet is private
  if (finalUrl.includes("accounts.google.com") || finalUrl.includes("ServiceLogin")) {
    throw new Error(
      "Spreadsheet ini bersifat Privat. Ubah hak akses di Google Sheets menjadi: Bagikan -> Siapa saja yang memiliki link -> Pengakses lihat-saja."
    );
  }

  const csvText = await response.text();

  if (!csvText || !csvText.trim()) {
    return {
      spreadsheetId,
      sheetGid,
      exportUrl,
      headers: [],
      rows: [],
    };
  }

  // Parse CSV text via XLSX
  const workbook = XLSX.read(csvText, { type: "string" });
  const firstSheetName = workbook.SheetNames[0];
  if (!firstSheetName) {
    return {
      spreadsheetId,
      sheetGid,
      exportUrl,
      headers: [],
      rows: [],
    };
  }

  const sheet = workbook.Sheets[firstSheetName];
  const rows: Record<string, unknown>[] = XLSX.utils.sheet_to_json(sheet, { defval: "" });

  // Extract headers from first row keys or sheet range
  let headers: string[] = [];
  if (rows.length > 0) {
    headers = Object.keys(rows[0]);
  }

  return {
    spreadsheetId,
    sheetGid,
    exportUrl,
    headers,
    rows,
  };
}
