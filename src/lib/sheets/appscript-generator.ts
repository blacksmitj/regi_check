export interface AppScriptGeneratorOptions {
  apiUrl: string;
  apiKey: string;
  sheetName: string;
  lockSheet: boolean;
}

/**
 * Menghasilkan kode Google Apps Script siap pakai untuk ditarik dan ditempelkan ke spreadsheet pengguna.
 */
export function generateAppScriptCode(options: AppScriptGeneratorOptions): string {
  const { apiUrl, apiKey, sheetName, lockSheet } = options;

  return `/**
 * =========================================================================
 * REGICHECK WORKSPACE SYNC SCRIPT (AUTO-GENERATED)
 * =========================================================================
 * Skrip ini mengambil data peserta & status verifikasi dari RegiCheck
 * dan memasukkannya ke Google Sheet ini secara otomatis.
 *
 * CARA PAKAI:
 * 1. Buka spreadsheet target.
 * 2. Klik menu: Ekstensi > Apps Script (Extensions > Apps Script).
 * 3. Hapus semua kode default dan tempel kode ini seluruhnya.
 * 4. Simpan (Ctrl + S) lalu tutup editor Apps Script atau refresh Spreadsheet.
 * 5. Akan muncul menu kustom baru di atas: "⚡ RegiCheck Sync".
 * 6. Klik "⚡ RegiCheck Sync > Tarik Data Sekarang" untuk sinkronisasi pertama kali.
 * =========================================================================
 */

// KONFIGURASI UTAMA
var CONFIG = {
  API_URL: "${apiUrl}",
  API_KEY: "${apiKey}",
  TARGET_SHEET_NAME: "${sheetName.replace(/"/g, '\\"')}",
  LOCK_SHEET: ${lockSheet ? "true" : "false"}, // Proteksi sheet agar tidak bisa diedit sembarangan
  HEADER_BG_COLOR: "#0f172a", // Warna header elegan (Dark Slate)
  HEADER_TEXT_COLOR: "#ffffff"
};

/**
 * Otomatis menambahkan Menu Kustom di Google Spreadsheet saat file dibuka
 */
function onOpen() {
  var ui = SpreadsheetApp.getUi();
  ui.createMenu("⚡ RegiCheck Sync")
    .addItem("🔄 Tarik Data Sekarang", "syncFromRegiCheck")
    .addSeparator()
    .addItem("⏱️ Pasang Auto-Sync (Tiap 15 Menit)", "setupAutoSyncTrigger")
    .addItem("⏹️ Hentikan Auto-Sync Berkala", "removeAutoSyncTriggers")
    .addToUi();
}

/**
 * Fungsi Utama: Menarik data dari server RegiCheck dan memperbarui Sheet
 */
function syncFromRegiCheck() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  
  // Kirim indikator awal (Toast jika dijalankan lewat UI Spreadsheet)
  try {
    ss.toast("Sedang menghubungkan ke RegiCheck...", "Sinkronisasi", 5);
  } catch (e) {}

  var endpoint = CONFIG.API_URL + "?apiKey=" + encodeURIComponent(CONFIG.API_KEY) + "&sheetName=" + encodeURIComponent(CONFIG.TARGET_SHEET_NAME);
  
  var options = {
    method: "get",
    headers: {
      "X-API-Key": CONFIG.API_KEY,
      "User-Agent": "Google-Apps-Script-RegiCheck-Sync"
    },
    muteHttpExceptions: true
  };

  try {
    var response = UrlFetchApp.fetch(endpoint, options);
    var responseCode = response.getResponseCode();
    var responseText = response.getContentText();

    if (responseCode !== 200) {
      var errMsg = "Gagal mengambil data (HTTP " + responseCode + "): " + responseText;
      Logger.log(errMsg);
      try {
        SpreadsheetApp.getUi().alert("Error Sinkronisasi", errMsg, SpreadsheetApp.getUi().ButtonSet.OK);
      } catch (e) {}
      return;
    }

    var payload = JSON.parse(responseText);
    var headers = payload.headers || [];
    var rows = payload.rows || [];

    if (headers.length === 0) {
      Logger.log("Tidak ada header data yang diterima.");
      return;
    }

    // Cari atau buat Sheet target
    var sheet = ss.getSheetByName(CONFIG.TARGET_SHEET_NAME);
    if (!sheet) {
      sheet = ss.insertSheet(CONFIG.TARGET_SHEET_NAME);
    }

    // Jika sheet sebelumnya terproteksi, buka proteksi sementara agar bisa menulis data baru
    var protections = sheet.getProtections(SpreadsheetApp.ProtectionType.SHEET);
    for (var i = 0; i < protections.length; i++) {
      if (protections[i].canEdit()) {
        protections[i].remove();
      }
    }

    // Bersihkan isi sheet sebelumnya
    sheet.clearContents();
    sheet.clearFormats();

    // 1. Tulis Header
    var headerRange = sheet.getRange(1, 1, 1, headers.length);
    headerRange.setValues([headers]);
    headerRange.setFontWeight("bold");
    headerRange.setBackground(CONFIG.HEADER_BG_COLOR);
    headerRange.setFontColor(CONFIG.HEADER_TEXT_COLOR);
    headerRange.setHorizontalAlignment("center");
    headerRange.setVerticalAlignment("middle");
    sheet.setRowHeight(1, 38);

    // 2. Tulis Rows Data
    if (rows.length > 0) {
      // Pastikan semua format baris string/aman
      var cleanRows = rows.map(function(row) {
        return row.map(function(val) {
          return val === null || val === undefined ? "-" : String(val);
        });
      });

      var dataRange = sheet.getRange(2, 1, cleanRows.length, headers.length);
      dataRange.setNumberFormat("@"); // Paksa semua sel sebagai teks agar angka 0 di awal & angka panjang tidak berubah jadi scientific notation
      dataRange.setValues(cleanRows);
      dataRange.setVerticalAlignment("middle");

      // Beri warna zebra striping tipis untuk kenyamanan membaca
      for (var r = 2; r <= cleanRows.length + 1; r++) {
        if (r % 2 === 0) {
          sheet.getRange(r, 1, 1, headers.length).setBackground("#f8fafc");
        }
      }
    }

    // 3. Bekukan (Freeze) baris Header agar tetap terlihat saat scroll
    sheet.setFrozenRows(1);

    // 4. Auto-resize kolom agar pas rapi (maksimal 30 kolom pertama)
    var maxColsToResize = Math.min(headers.length, 30);
    for (var c = 1; c <= maxColsToResize; c++) {
      sheet.autoResizeColumn(c);
      var currentWidth = sheet.getColumnWidth(c);
      if (currentWidth < 90) sheet.setColumnWidth(c, 90);
      if (currentWidth > 380) sheet.setColumnWidth(c, 380);
    }

    // 5. Fitur LOCK SHEET (Jika diaktifkan)
    if (CONFIG.LOCK_SHEET) {
      var protection = sheet.protect().setDescription("Dikunci oleh RegiCheck AppScript Sync");
      // Hanya pemilik spreadsheet yang boleh mengedit
      var me = Session.getEffectiveUser();
      protection.removeEditors(protection.getEditors());
      protection.addEditor(me);
      if (protection.canDomainEdit()) {
        protection.setDomainEdit(false);
      }
    }

    var successMessage = "Sukses! " + rows.length + " peserta disinkronkan ke sheet '" + CONFIG.TARGET_SHEET_NAME + "'.";
    Logger.log(successMessage);
    try {
      ss.toast(successMessage, "RegiCheck Sync", 5);
    } catch (e) {}

  } catch (err) {
    var errorDetails = "Terjadi kesalahan: " + (err.message || err.toString());
    Logger.log(errorDetails);
    try {
      SpreadsheetApp.getUi().alert("Error", errorDetails, SpreadsheetApp.getUi().ButtonSet.OK);
    } catch (e) {}
  }
}

/**
 * Pasang trigger otomatis berkala setiap 15 menit
 */
function setupAutoSyncTrigger() {
  removeAutoSyncTriggers();
  ScriptApp.newTrigger("syncFromRegiCheck")
    .timeBased()
    .everyMinutes(15)
    .create();

  try {
    SpreadsheetApp.getUi().alert("Auto-Sync Aktif", "Trigger otomatis telah dipasang setiap 15 menit.", SpreadsheetApp.getUi().ButtonSet.OK);
  } catch (e) {}
}

/**
 * Menghapus trigger otomatis
 */
function removeAutoSyncTriggers() {
  var allTriggers = ScriptApp.getProjectTriggers();
  for (var i = 0; i < allTriggers.length; i++) {
    if (allTriggers[i].getHandlerFunction() === "syncFromRegiCheck") {
      ScriptApp.deleteTrigger(allTriggers[i]);
    }
  }
}
`;
}
