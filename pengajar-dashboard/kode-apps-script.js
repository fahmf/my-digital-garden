/**
 * ============================================================
 * KODE GOOGLE APPS SCRIPT — Dashboard Evaluasi Pengajar
 * Divisi I'dad Lughawi STDIIS
 * ============================================================
 *
 * CARA MEMASANG:
 * 1. Buka Google Sheet Anda → klik menu Extensions → Apps Script
 * 2. Hapus semua kode yang ada
 * 3. Copy-paste SELURUH kode ini
 * 4. Klik tombol Save (ikon floppy disk)
 * 5. Klik Deploy → New deployment
 *    - Type: Web app
 *    - Execute as: Me
 *    - Who has access: Anyone
 * 6. Klik Deploy → Copy URL yang muncul
 * 7. Paste URL itu ke file config.js di dashboard
 * ============================================================
 */

// ── KONFIGURASI: Ganti sesuai sheet Anda ──────────────────
const CONFIG = {
  SHEET_RESPONSES: "Form Responses 1",   // nama sheet respons form
  SHEET_PENGAJAR:  "Pengajar",           // nama sheet daftar pengajar
  SHEET_REKAP:     "Rekap",             // nama sheet rekap
  SHEET_PIN:       "PIN Pengajar",       // nama sheet PIN (akan dibuat otomatis)
  // Kolom-kolom di sheet Form Responses 1 (0-based index)
  COL_TIMESTAMP:   0,
  COL_JK:          1,
  COL_KELAS_PA:    2,
  COL_MATKUL_PA:   3,
  COL_KELAS_PI:    4,
  COL_MATKUL_PI:   5,
  COL_PENGAJAR:    22,  // kolom "Pengajar"
  // Kolom skor dimulai dari index berapa — akan dideteksi otomatis dari header "Skor*"

  // Pemetaan kolom teks saran/harapan per dimensi:
  // inTextCol  = kata kunci yang ADA di header kolom teks (form)
  // inDimLabel = kata kunci yang ADA di label dimensi (header "Skor X" di sheet)
  // Urutan penting — pencocokan berhenti di entri pertama yang cocok (first-match-wins)
  DIM_TEXT_LINKAGE: [
    { inTextCol: "menguasai",   inDimLabel: "penguasaan" },    // Skor Penguasaan Materi
    { inTextCol: "menarik",     inDimLabel: "mengajar" },      // Skor Cara Mengajar
    { inTextCol: "nyaman",      inDimLabel: "suasana" },       // Skor Suasana Kelas
    { inTextCol: "tugas",       inDimLabel: "tugas membantu" },// Skor Tugas Membantu Pemahaman (spesifik dulu)
    { inTextCol: "tugas",       inDimLabel: "membantu" },      // fallback jika label "membantu" saja
    { inTextCol: "koreksi",     inDimLabel: "koreksi" },       // Skor Koreksi (jika ada)
    { inTextCol: "koreksi",     inDimLabel: "tugas" },         // fallback: koreksi di bawah dimensi "Tugas"
    { inTextCol: "profesional", inDimLabel: "profesional" },   // Skor Profesionalitas
  ],
};
// ──────────────────────────────────────────────────────────

/**
 * Entry point GET
 * action=getData          → semua respons (untuk dashboard admin)
 * action=getMyData&name=X → hanya data pengajar X (untuk raport)
 * action=getPengajar      → daftar pengajar
 * action=getPeriodes      → daftar periode yang terdeteksi
 * action=getPin           → generate/get semua PIN (admin only, perlu secret)
 */
function doGet(e) {
  const action = (e.parameter.action || "").toString();
  const callback = (e.parameter.callback || "").toString();

  try {
    let result;
    if (action === "getData") {
      result = getData();
    } else if (action === "getMyData") {
      const name = e.parameter.name || "";
      result = getMyData(name);
    } else if (action === "getPengajar") {
      result = getPengajarList();
    } else if (action === "getPeriodes") {
      result = getPeriodes();
    } else if (action === "getPins") {
      result = getAllPins();
    } else if (action === "health") {
      result = { ok: true, ts: new Date().toISOString() };
    } else if (action === "verifyPin") {
      const name = e.parameter.name || "";
      const pin = (e.parameter.pin || "").toString();
      const ok = verifyPin(name, pin);
      result = { ok };
    } else {
      result = { error: "Unknown action: " + action };
    }
    // Support JSONP untuk bypass CORS dari browser
    if (callback) {
      return ContentService
        .createTextOutput(callback + "(" + JSON.stringify(result) + ")")
        .setMimeType(ContentService.MimeType.JAVASCRIPT);
    }
    return jsonResponse(result);
  } catch (err) {
    const errObj = { error: err.toString() };
    if (callback) {
      return ContentService
        .createTextOutput(callback + "(" + JSON.stringify(errObj) + ")")
        .setMimeType(ContentService.MimeType.JAVASCRIPT);
    }
    return jsonResponse(errObj);
  }
}

/**
 * Entry point POST
 * { action: "verifyPin", name: "...", pin: "..." }
 * { action: "gemini",    prompt: "..." }
 *
 * Cara set GEMINI_API_KEY:
 * Buka Apps Script Editor → Project Settings → Script Properties → Add property
 * Property name: GEMINI_API_KEY   Value: AIzaSy...
 */
function doPost(e) {
  try {
    const body = JSON.parse(e.postData.contents || "{}");
    const action = body.action || "";

    if (action === "verifyPin") {
      const ok = verifyPin(body.name, body.pin);
      if (ok) {
        const myData = getMyData(body.name);
        return jsonResponse({ ok: true, data: myData });
      } else {
        return jsonResponse({ ok: false, error: "PIN salah" });
      }
    }

    if (action === "gemini") {
      const prompt = body.prompt || "";
      if (!prompt) return jsonResponse({ error: "Prompt kosong" });
      return jsonResponse(callGeminiProxy(prompt));
    }

    return jsonResponse({ error: "Unknown POST action" });
  } catch (err) {
    return jsonResponse({ error: err.toString() });
  }
}

// ─── Proxy Gemini API via UrlFetchApp ───────────────────
// API key disimpan di Script Properties (tidak pernah di-expose ke client)
function callGeminiProxy(prompt) {
  const apiKey = PropertiesService.getScriptProperties().getProperty("GEMINI_API_KEY");
  if (!apiKey) {
    return { error: "GEMINI_API_KEY belum diset. Buka Apps Script → Project Settings → Script Properties → tambah GEMINI_API_KEY" };
  }

  var models = [
    "gemini-2.5-flash",
    "gemini-2.0-flash",
    "gemini-2.0-flash-lite",
  ];

  var lastError = "";
  for (var i = 0; i < models.length; i++) {
    var model = models[i];
    try {
      var response = UrlFetchApp.fetch(
        "https://generativelanguage.googleapis.com/v1/models/" + model + ":generateContent?key=" + apiKey,
        {
          method: "post",
          contentType: "application/json",
          payload: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: { temperature: 0.7, maxOutputTokens: 6000 },
          }),
          muteHttpExceptions: true,
        }
      );
      var json = JSON.parse(response.getContentText());
      if (json.error) {
        var code = json.error.code;
        var msg = (json.error.message || "").toLowerCase();
        lastError = "[" + model + "] " + json.error.message;
        if (code === 404 || code === 429 || msg.indexOf("quota") >= 0 || msg.indexOf("not found") >= 0 || msg.indexOf("not supported") >= 0) {
          continue;
        }
        // Error fatal (misal: invalid API key) — langsung return tanpa coba model lain
        return { error: lastError };
      }
      return { text: json.candidates[0].content.parts[0].text };
    } catch (e) {
      lastError = "[" + model + "] Exception: " + e.toString();
      continue;
    }
  }
  return { error: "Semua model gagal. Error terakhir: " + lastError };
}

// ─── Helper: JSON response dengan CORS ──────────────────
function jsonResponse(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

// Handle OPTIONS preflight (untuk CORS dari browser)
function doOptions(e) {
  return ContentService.createTextOutput("")
    .setMimeType(ContentService.MimeType.TEXT);
}

// ─── Baca semua respons ─────────────────────────────────
function getData() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(CONFIG.SHEET_RESPONSES);
  if (!sheet) return { error: "Sheet '" + CONFIG.SHEET_RESPONSES + "' tidak ditemukan" };

  const rows = sheet.getDataRange().getValues();
  if (rows.length < 2) return { responses: [], dimensions: [], periodes: [] };

  const headers = rows[0].map(h => h.toString().trim());
  const dimensions = detectDimensions(headers);
  const periodes = {};
  const responses = [];

  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    const r = parseRow(row, headers, dimensions);
    if (!r) continue;
    responses.push(r);

    // Kumpulkan periode dari timestamp
    if (r.periodeId && !periodes[r.periodeId]) {
      periodes[r.periodeId] = {
        id: r.periodeId,
        label: r.periodeLabel,
        start: r.timestamp,
        end: r.timestamp,
      };
    } else if (r.periodeId) {
      if (r.timestamp < periodes[r.periodeId].start) periodes[r.periodeId].start = r.timestamp;
      if (r.timestamp > periodes[r.periodeId].end) periodes[r.periodeId].end = r.timestamp;
    }
  }

  // Tandai periode terbaru sebagai current
  const sortedPeriodes = Object.values(periodes).sort((a,b) => a.id.localeCompare(b.id));
  if (sortedPeriodes.length > 0) sortedPeriodes[sortedPeriodes.length - 1].current = true;

  return {
    responses,
    dimensions,
    periodes: sortedPeriodes,
    totalRows: rows.length - 1,
    syncedAt: new Date().toISOString(),
  };
}

// ─── Data hanya untuk satu pengajar (untuk raport) ──────
function getMyData(name) {
  if (!name) return { error: "name required" };
  const full = getData();
  if (full.error) return full;
  return {
    ...full,
    responses: full.responses.filter(r => r.pengajar === name),
    forPengajar: name,
  };
}

// ─── Daftar pengajar dari sheet Pengajar ────────────────
function getPengajarList() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(CONFIG.SHEET_PENGAJAR);
  if (!sheet) {
    // Fallback: ekstrak dari responses
    const data = getData();
    const names = [...new Set(data.responses.map(r => r.pengajar))].filter(Boolean).sort();
    return { pengajar: names.map(n => ({ name: n })) };
  }
  const rows = sheet.getDataRange().getValues();
  const headers = rows[0].map(h => h.toString().toLowerCase().trim());
  const nameIdx = headers.findIndex(h => h.includes("nama") || h.includes("pengajar"));
  const pengajar = rows.slice(1).map(r => ({
    name: r[nameIdx >= 0 ? nameIdx : 0]?.toString().trim(),
  })).filter(p => p.name);
  return { pengajar };
}

// ─── Daftar periode ──────────────────────────────────────
function getPeriodes() {
  const data = getData();
  return { periodes: data.periodes };
}

// ─── Deteksi kolom Skor* + kolom teks saran per dimensi ─
function detectDimensions(headers) {
  // Kumpulkan semua kolom teks yang cocok dengan pola DIM_TEXT_LINKAGE.
  // PENTING: skip kolom "Skor X" dan "Avg Skor" agar kolom skor numerik
  // tidak menimpa index kolom teks (keduanya bisa mengandung keyword yang sama).
  const textColByKeyword = {}; // inTextCol keyword -> colIndex
  headers.forEach((h, i) => {
    if (h.startsWith("Skor ") || h === "Avg Skor") return;
    const hl = h.toLowerCase();
    CONFIG.DIM_TEXT_LINKAGE.forEach(link => {
      if (hl.includes(link.inTextCol)) textColByKeyword[link.inTextCol] = i;
    });
  });

  const dims = [];
  headers.forEach((h, i) => {
    if (h.startsWith("Skor ") && h !== "Skor") {
      const label = h.replace("Skor ", "").trim();
      const labelLower = label.toLowerCase();

      // Cari text col yang sesuai — first-match-wins sesuai urutan DIM_TEXT_LINKAGE
      let textColIndex = -1;
      for (const link of CONFIG.DIM_TEXT_LINKAGE) {
        if (labelLower.includes(link.inDimLabel) && textColByKeyword[link.inTextCol] !== undefined) {
          textColIndex = textColByKeyword[link.inTextCol];
          break;
        }
      }

      dims.push({
        key: labelLower.replace(/\s+/g, "_").replace(/[^a-z0-9_]/g, ""),
        label: label,
        col: h,
        colIndex: i,
        textColIndex: textColIndex, // -1 jika tidak ada kolom teks
      });
    }
  });
  return dims;
}

// ─── Parse satu baris menjadi objek respons ─────────────
function parseRow(row, headers, dimensions) {
  const ts = row[CONFIG.COL_TIMESTAMP];
  if (!ts) return null;

  // Parse timestamp (bisa Date object dari Sheets)
  let tsDate = ts instanceof Date ? ts : new Date(ts);
  if (isNaN(tsDate.getTime())) return null;
  const tsISO = tsDate.toISOString();

  // Deteksi periode dari semester (Jul-Dec = Gasal, Jan-Jun = Genap)
  const month = tsDate.getMonth() + 1; // 1-12
  const year = tsDate.getFullYear();
  let semesterId, semesterLabel;
  if (month >= 7 && month <= 12) {
    semesterId = year + "-1";
    semesterLabel = "Gasal " + year + "/" + (year + 1);
  } else {
    semesterId = year + "-2";
    semesterLabel = "Genap " + (year - 1) + "/" + year;
  }

  const jk = (row[CONFIG.COL_JK] || "").toString().trim();
  const kelasPa = (row[CONFIG.COL_KELAS_PA] || "").toString().trim();
  const matkulPa = (row[CONFIG.COL_MATKUL_PA] || "").toString().trim();
  const kelasPi = (row[CONFIG.COL_KELAS_PI] || "").toString().trim();
  const matkulPi = (row[CONFIG.COL_MATKUL_PI] || "").toString().trim();
  const pengajar = (row[CONFIG.COL_PENGAJAR] || "").toString().trim();
  if (!pengajar) return null;

  const kelas = kelasPa || kelasPi;
  const matkul = matkulPa || matkulPi;
  const gender = jk.toLowerCase().includes("pere") || jk.toLowerCase().includes("wanita") ? "pi" : "pa";
  const jenjang = kelas.replace(/[^a-zA-Z0-9]/g, "").toUpperCase().includes("ILP") ? "ILP" : "ILL";

  // Baca skor + teks saran per dimensi
  const scores = {};
  const dimTexts = {};
  let avgSum = 0;
  dimensions.forEach(d => {
    const raw = row[d.colIndex];
    const val = parseFloat(raw);
    scores[d.col] = isNaN(val) ? 0 : val;
    avgSum += scores[d.col];
    // Baca teks harapan/saran jika kolom tersedia
    if (d.textColIndex >= 0) {
      const txt = (row[d.textColIndex] || "").toString().trim();
      if (txt.length >= 3 && !/^[-.\s,_]+$/.test(txt)) dimTexts[d.key] = txt;
    }
  });

  // Cek apakah ada kolom Avg Skor tersendiri
  const avgIdx = headers.findIndex(h => h === "Avg Skor");
  let avg;
  if (avgIdx >= 0 && row[avgIdx]) {
    avg = parseFloat(row[avgIdx]);
    // Avg Skor kadang disimpan sebagai desimal (e.g. 0.9714) — cek
    if (!isNaN(avg) && avg < 10) avg = avg * 100;
    if (isNaN(avg)) avg = dimensions.length ? avgSum / dimensions.length : 0;
  } else {
    avg = dimensions.length ? avgSum / dimensions.length : 0;
  }

  // Teks saran — cari kolom yang mengandung "saran" atau "terbaik"
  let positive = "", saran = "";
  headers.forEach((h, i) => {
    const hl = h.toLowerCase();
    if (hl.includes("terbaik") || hl.includes("hal terbaik")) positive = (row[i] || "").toString().trim();
    if (hl.includes("saran") && hl.includes("lebih baik")) saran = (row[i] || "").toString().trim();
  });

  return {
    timestamp: tsISO,
    periodeId: semesterId,
    periodeLabel: semesterLabel,
    jk,
    kelasPutra: kelasPa,
    matkulPutra: matkulPa,
    kelasPutri: kelasPi,
    matkulPutri: matkulPi,
    pengajar,
    kelas,
    matkul,
    gender,
    jenjang,
    scores,
    dimTexts,
    avg,
    positive,
    saran,
    periode: semesterId,
  };
}

// ─── Manajemen PIN ───────────────────────────────────────
function getOrCreatePinSheet() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(CONFIG.SHEET_PIN);
  if (!sheet) {
    sheet = ss.insertSheet(CONFIG.SHEET_PIN);
    sheet.getRange("A1:C1").setValues([["Nama Pengajar", "PIN", "Dibuat"]]);
    sheet.getRange("A1:C1").setFontWeight("bold");
    // Generate PIN untuk semua pengajar yang ada
    generateAllPins(sheet);
  }
  return sheet;
}

function generateRandomPin() {
  // 4-digit random PIN: 1000–9999
  return String(Math.floor(1000 + Math.random() * 9000));
}

function getAllPins() {
  const sheet = getOrCreatePinSheet();
  const rows = sheet.getDataRange().getValues().slice(1);
  const pins = {};
  rows.forEach(function(row) {
    if (row[0] && row[1]) pins[row[0].toString().trim()] = row[1].toString().trim();
  });
  return { pins: pins };
}

function generateAllPins(sheet) {
  const data = getData();
  const names = [...new Set(data.responses.map(r => r.pengajar))].filter(Boolean).sort();
  const existing = sheet.getDataRange().getValues().slice(1).map(r => r[0]);
  const newRows = [];
  names.forEach(function(name) {
    if (!existing.includes(name)) {
      const pin = generateRandomPin();
      newRows.push([name, pin, new Date().toLocaleDateString("id-ID")]);
    }
  });
  if (newRows.length > 0) {
    const startRow = sheet.getLastRow() + 1;
    sheet.getRange(startRow, 1, newRows.length, 3).setValues(newRows);
    // Sembunyikan kolom PIN dari view biasa
    sheet.hideColumns(2);
  }
}

function verifyPin(name, pin) {
  if (!name || !pin) return false;
  const sheet = getOrCreatePinSheet();
  const rows = sheet.getDataRange().getValues().slice(1);
  for (const row of rows) {
    if (row[0].toString().trim() === name.toString().trim()) {
      return row[1].toString().trim() === pin.toString().trim();
    }
  }
  return false;
}

// ─── Utilitas: Jalankan sekali untuk setup ──────────────
function setup() {
  Logger.log("Setup dimulai...");
  const sheet = getOrCreatePinSheet();
  Logger.log("Sheet PIN sudah siap: " + sheet.getName());
  const data = getData();
  Logger.log("Total respons: " + data.totalRows);
  Logger.log("Dimensi terdeteksi: " + data.dimensions.map(d => d.col).join(", "));
  Logger.log("Periode: " + data.periodes.map(p => p.label).join(", "));
  Logger.log("Setup selesai! PIN sheet dibuat di: " + CONFIG.SHEET_PIN);
}
