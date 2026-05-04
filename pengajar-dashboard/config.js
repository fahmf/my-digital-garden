/**
 * config.js — Konfigurasi koneksi dashboard
 *
 * CARA ISI:
 * 1. Deploy Google Apps Script Anda (lihat kode-apps-script.js)
 * 2. Copy URL deployment-nya
 * 3. Paste di APPS_SCRIPT_URL di bawah ini
 * 4. Simpan dan refresh dashboard
 */

window.DASHBOARD_CONFIG = {

  // ── Google Apps Script URL ──────────────────────────────
  // Contoh: "https://script.google.com/macros/s/AKfycbzzXRx_vAWN75NRVwLzpqCs76uIYWhBf4lJCRdYgrcLdTTNE9wcrIlEIrObJclEYNII/exec",
  APPS_SCRIPT_URL: "https://script.google.com/macros/s/AKfycbxn1oGjcxjVerrV_QH0Kgq_7UCXT6ZCUQt30glclqv7Ep5Od32e6v4o8SoOdPXYGzPI/exec",
  // ── ID Google Spreadsheet (opsional, untuk info saja) ───
  // Temukan di URL sheet: docs.google.com/spreadsheets/d/[INI_ID_NYA]/edit
  SPREADSHEET_ID: "",

  // ── Auto-refresh interval (detik) ───────────────────────
  // Set 0 untuk matikan auto-refresh
  REFRESH_INTERVAL: 60,

  // ── Mode ────────────────────────────────────────────────
  // "demo"  → pakai mock data (tidak perlu internet)
  // "live"  → ambil dari Google Sheets via Apps Script
  MODE: "live",

  // ── Gemini API Key ────────────────────────────────────
  // DIREKOMENDASIKAN: Simpan key di Apps Script Script Properties (lebih aman).
  // Lihat kode-apps-script.js → bagian doPost → instruksi "Cara set GEMINI_API_KEY".
  //
  // ALTERNATIF (jika tidak pakai Apps Script proxy):
  // Uncomment baris di bawah dan isi key dari aistudio.google.com
  // PERINGATAN: key akan terlihat di DevTools — gunakan hanya untuk testing lokal.
  // GEMINI_API_KEY: "AIzaSy...",

  // ── Jumlah respons yang diharapkan per periode ─────────
  // Dipakai untuk menghitung Response Rate di tab Overview
  EXPECTED_RESPONSES: 620,

  // ── Nama Admin (ditampilkan di pojok kanan atas) ───────
  ADMIN_NAME: "Kepala I'dad",

  // ── Alias label dimensi ────────────────────────────────
  // Ganti label yang datang dari header Google Sheet dengan teks yang lebih sesuai.
  // Key = label asli dari sheet, Value = label yang ditampilkan di dashboard.
  LABEL_ALIASES: {
    "Penguasaan Materi": "Penjelasan Mudah",
  },

};
