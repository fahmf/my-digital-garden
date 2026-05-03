# CLAUDE.md — Dashboard Evaluasi Pengajar I'dad Lughawi STDIIS

Dokumen ini adalah memori konteks untuk sesi Claude Code. Berisi arsitektur proyek, keputusan teknis, bug yang sudah diperbaiki, dan panduan pengembangan lanjutan.

---

## Gambaran Proyek

Dashboard evaluasi kinerja pengajar untuk **Divisi I'dad Lughawi STDIIS**. Data diambil dari Google Forms → Google Sheets, diproses oleh Google Apps Script, lalu ditampilkan sebagai dashboard web statis.

**URL Live (Netlify):** deploy manual via drag-and-drop di netlify.com  
**Halaman utama:** `Dashboard.html` (admin) — `Raport.html` (pengajar individual)

---

## Struktur File

```
Dashboard/
├── index.html          # Redirect ke Dashboard.html (diperlukan Netlify)
├── Dashboard.html      # Shell HTML — load semua JSX via <script type="text/babel">
├── Raport.html         # Halaman raport individual pengajar (self-contained)
├── styles.css          # Semua style dashboard utama
├── config.js           # APPS_SCRIPT_URL, GEMINI_API_KEY, MODE
├── data.js             # Mock data fallback (saat offline / demo)
├── data-loader.js      # DataLoader.load() — fetch live atau fallback mock
├── components.jsx      # Icon, Avatar, RadarChart, LineChart, BarChart, ProgressRing, dll
├── app.jsx             # App shell: routing tab, topbar, sidebar, mobile drawer
├── tab-overview.jsx    # Tab Overview + OverviewTab component
├── tab-pengajar.jsx    # Tab Per Pengajar (list + detail panel)
├── tab-others.jsx      # Tab Dimensi, Per Gender, Per Jenjang
├── tab-ai.jsx          # Tab AI Insight & Saran (Gemini API)
├── tweaks-panel.jsx    # Panel kustomisasi tampilan (density, warna, dark mode)
└── kode-apps-script.js # Kode Google Apps Script (deploy terpisah ke GAS)
```

---

## Stack Teknis

| Lapisan | Teknologi |
|---|---|
| Frontend | React 18 UMD + Babel Standalone (JSX transpilasi di browser) |
| Style | CSS custom properties (oklch), tidak pakai framework CSS |
| Backend | Google Apps Script Web App |
| CORS | JSONP pattern (`?callback=xxx`) — Apps Script mengembalikan `xxx({...})` |
| Hosting | Netlify (static, drag-and-drop deploy) |
| AI | Google Gemini API (gemini-2.0-flash, gemini-1.5-flash, dll) |

**Tidak ada build step / bundler.** Semua file langsung di-serve as-is.

---

## Alur Data

```
Google Forms
    ↓
Google Sheets (raw responses)
    ↓
Google Apps Script (kode-apps-script.js)
    ↓ JSONP via fetch (data-loader.js)
DataLoader.load() → Promise<data>
    ↓
React state → tabs → components
```

### Format data dari Apps Script

```js
{
  responses: [{ pengajar, kelas, matkul, avg, scores, saran, positive, dimTexts, jenjang, gender, periode }],
  dimensions: [{ key, label, col, textColIndex }],
  periodes:   [{ id, label, current }]
}
```

### Format internal setelah `transformAppsScriptData()`

```js
data = {
  PENGAJAR:   [{ name, gender, initials }],          // sorted by name
  DIMENSIONS: [{ key, label, short, col, hasTextFeedback }],
  PERIODES:   [{ id, label, current, expected }],
  responses:  [{ ...enriched, jenjang, gender, dimTexts }]
}
```

---

## Sistem PIN Raport

PIN pengajar dihitung **client-side**, tidak ada request jaringan untuk verifikasi:

```js
// Index pengajar di PENGAJAR (sorted by name)
const expected = String(10001 + sortedIndex).slice(1);
// → "0001", "0002", ..., "0027"
```

Pengajar pilih nama → masuk PIN → jika cocok → tampilkan RaportScreen.

---

## Konfigurasi Kunci (`config.js`)

```js
window.DASHBOARD_CONFIG = {
  APPS_SCRIPT_URL: "https://script.google.com/macros/s/...",
  GEMINI_API_KEY:  "AIzaSy...",
  REFRESH_INTERVAL: 60,   // detik, 0 = off
  MODE: "live",           // "live" | "demo"
};
```

---

## Apps Script (`kode-apps-script.js`)

### `CONFIG.DIM_TEXT_LINKAGE`

Array yang memetakan kolom teks form ke label dimensi skor. **Urutan penting** — first-match-wins untuk dimensi yang keyword-nya overlap:

```js
DIM_TEXT_LINKAGE: [
  { inDimLabel: "membantu",    inTextCol: "membantu" },   // "Tugas Membantu" → kolom teks "membantu"
  { inDimLabel: "profesional", inTextCol: "profesional" },
  { inDimLabel: "koreksi",     inTextCol: "koreksi" },
  { inDimLabel: "tugas",       inTextCol: "tugas" },      // "Tugas" biasa → setelah "membantu"
  // dst
]
```

### Deteksi Jenjang

Nama kelas bisa mengandung karakter aneh seperti apostrophe (`I'LP`). Gunakan:

```js
kelas.replace(/[^a-zA-Z0-9]/g, "").toUpperCase().includes("ILP")
```

### Skip header "Skor X" saat build `textColByKeyword`

Header seperti `"Skor Tugas Membantu"` berisi keyword "tugas" tapi isinya angka, bukan teks feedback. Wajib skip:

```js
headers.forEach((h, i) => {
  if (h.startsWith("Skor ") || h === "Avg Skor") return; // PENTING
  // ... build textColByKeyword
});
```

---

## Komponen Kunci (`components.jsx`)

### RadarChart
```jsx
<svg width="100%" viewBox={`0 0 ${size} ${size}`} style={{maxWidth: size, display: "block"}}>
```
Sudah responsif — gunakan `width="100%"` dengan `viewBox`, bukan `width={size}` fixed.

### LineChart
```jsx
<svg width="100%" height={h} viewBox={`0 0 ${w} ${h}`}>
```
Sudah responsif. Prop `width` hanya dipakai untuk kalkulasi `viewBox`.

### ProgressRing
Masih menggunakan `width={size}` fixed — di dalam detail pengajar dirender `size={120}` yang tidak terlalu masalah di mobile.

---

## Mobile Responsiveness

### Breakpoint: `@media (max-width: 768px)` di `styles.css`

Yang sudah diimplementasi:
- `html, body { overflow-x: hidden; max-width: 100vw; }`
- Sidebar disembunyikan (`display: none`)
- **Hamburger button** muncul di topbar → buka mobile drawer
- **Mobile drawer** (slide-in dari kiri) berisi semua nav item
- Spacer di topbar disembunyikan agar search bar mengisi lebar
- Segmented buttons (filter jenjang/gender) scrollable horizontal
- Filter bar item masing-masing full width
- Grid layout berubah ke 1 kolom
- RadarChart sudah responsif (lihat di atas)

### Mobile Drawer (app.jsx)
```jsx
const [mobileNavOpen, setMobileNavOpen] = useState(false);
// Hamburger di topbar → setMobileNavOpen(true)
// Backdrop + drawer overlay di akhir return App
```

### Raport.html Mobile (`@media (max-width: 640px)`)
- Header raport berubah ke flex-column (title di atas, tombol di bawah)
- KPI row: 2 kolom
- Profile card: flex-column
- Padding halaman dikurangi (28px → 14px)

---

## Tab Pengajar — Fitur Per Matkul & Kelas

Di `tab-pengajar.jsx`, setelah memilih pengajar:

```
[Detail card] [Radar + Detail Skor side-by-side] [Tren antar periode] [Per Matkul & Kelas]
```

- `matkulBreakdown` — group selResponses by matkul → byKelas
- `displayedKelas` — filtered by `selectedMatkul` atau semua kelas
- Dimensi di "Detail Skor" bisa di-expand untuk lihat quotes harapan mahasiswa (`dimTexts`)

Fitur yang sama juga ada di `Raport.html` (untuk pengajar melihat raport sendiri).

---

## Fitur AI (`tab-ai.jsx`)

Menggunakan Gemini API langsung dari browser (bukan via Apps Script).

### Model yang valid (per Agustus 2025):
```js
const GEMINI_MODELS = [
  "gemini-2.0-flash",
  "gemini-2.0-flash-lite",
  "gemini-1.5-flash",
  "gemini-1.5-flash-8b",
];
```

Error handling: skip jika 404 (model tidak ada) atau 429 (quota habis), coba model berikutnya.

---

## Filter Feedback Teks

Helper `isValidText()` dipakai di Raport.html dan Apps Script untuk filter input yang tidak bermakna:

```js
function isValidText(t) {
  if (!t) return false;
  const s = t.trim();
  return s.length >= 3 &&
         !/^[-.\s,_|/\\]+$/.test(s) &&
         s.toLowerCase() !== "tidak ada" &&
         s.toLowerCase() !== "tidak ada.";
}
```

---

## Deployment ke Netlify

1. Buka [netlify.com](https://netlify.com) → Sites → drag-and-drop folder `Dashboard/`
2. Netlify membutuhkan `index.html` sebagai entry point → sudah dibuat sebagai redirect ke `Dashboard.html`
3. `Raport.html` bisa diakses langsung di `[site-url]/Raport.html`

**Saat update:** cukup drag-and-drop ulang folder yang sama — Netlify otomatis deploy ulang.

---

## Hal yang Perlu Diingat

- **Jangan ubah urutan `DIM_TEXT_LINKAGE`** tanpa memahami first-match-wins logic
- **Setiap perubahan `kode-apps-script.js`** harus di-deploy ulang di Google Apps Script (buka GAS editor → Deploy → New deployment / Manage deployments)
- **PIN tidak disimpan di server** — murni kalkulasi dari posisi nama di array `PENGAJAR` (sorted)
- **`data.js`** adalah mock data — tidak perlu sinkron dengan Google Sheets, hanya untuk demo/offline
- **`components.jsx`** mengekspos semua komponen ke `window` agar bisa dipakai file JSX lain tanpa import

---

## Bug yang Sudah Diperbaiki

| Bug | Penyebab | Fix |
|---|---|---|
| Raport PIN login tidak jalan | Akses `window.MOCK_DATA` sinkron sebelum async load | Pindahkan ke `useEffect` + `DataLoader.load()` |
| Gemini 404 | Model ID tidak valid (`gemini-3.1-flash-lite`, dll) | Ganti ke model ID yang valid |
| Segmen ILP kosong | `"I'LP".includes("ILP")` = false | Strip non-alphanumeric sebelum compare |
| Dimensi feedback tampil angka "100" | `textColByKeyword` diisi dari kolom "Skor X" (berisi angka, bukan teks) | Skip header `h.startsWith("Skor ")` |
| RadarChart terlalu lebar di mobile | `<svg width={size}>` fixed pixel | Ganti ke `width="100%"` + `viewBox` |
| Tidak bisa navigasi di mobile | Sidebar disembunyikan, tidak ada alternatif | Tambah hamburger + mobile drawer |
