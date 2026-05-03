// ─── AI cache helpers ────────────────────────────────────
function buildAiCacheKey(level, pengajar, filtered) {
  const ids = filtered.map(r => r.pengajar + r.kelas + r.periode).join("|");
  const hash = ids.split("").reduce((a, c) => ((a << 5) - a + c.charCodeAt(0)) | 0, 0);
  return "ai_" + level + "_" + (pengajar || "divisi") + "_" + hash;
}
function loadAiCache(key) {
  try {
    const raw = sessionStorage.getItem(key);
    if (!raw) return null;
    const { result, ts } = JSON.parse(raw);
    if (Date.now() - ts > 3600000) return null; // TTL 1 jam
    return result;
  } catch(e) { return null; }
}
function saveAiCache(key, result) {
  try { sessionStorage.setItem(key, JSON.stringify({ result, ts: Date.now() })); } catch(e) {}
}

// ─── Sentiment analysis sederhana (tanpa AI, berbasis kamus) ────────────────
// Mengembalikan "positif" | "negatif" | "netral" untuk satu teks komentar.
function analyzeSentiment(text) {
  if (!text || text.trim().length < 3) return "netral";
  const t = text.toLowerCase();

  const posTerms = [
    "bagus","baik","sangat baik","luar biasa","mantap","hebat","keren","sempurna",
    "jelas","mudah dipahami","sistematis","sabar","ramah","peduli","membantu",
    "membimbing","menarik","seru","antusias","semangat","profesional","disiplin",
    "tepat waktu","konsisten","bervariasi","inovatif","kreatif","terima kasih",
    "syukran","jazakallah","alhamdulillah","suka","puas","senang","enjoy",
  ];
  const negTerms = [
    "kurang","tidak","belum","susah","sulit","bingung","monoton","membosankan",
    "kaku","cepat","terlalu cepat","lambat","terlalu lambat","terlambat","lupa",
    "sering","kadang","jarang","harap","semoga","lebih baik jika","mohon",
    "tolong","sebaiknya","seharusnya","masih","perlu diperbaiki","perlu ditingkatkan",
  ];

  let pos = posTerms.reduce((s, w) => s + (t.includes(w) ? 1 : 0), 0);
  let neg = negTerms.reduce((s, w) => s + (t.includes(w) ? 1 : 0), 0);

  if (pos > neg) return "positif";
  if (neg > pos) return "negatif";
  return "netral";
}

// Hitung distribusi sentimen dari array teks
function sentimentDistribution(texts) {
  const dist = { positif: 0, negatif: 0, netral: 0 };
  texts.forEach(t => dist[analyzeSentiment(t)]++);
  return dist;
}

// ─── Theme extraction (satu definisi) ───────────────────
function extractThemes(positives, sarans) {
  const text = (positives.join(" ") + " " + sarans.join(" ")).toLowerCase();
  const checks = [
    { kw: ["pelan", "tempo", "cepat", "lambat"],        theme: "Tempo bicara",         sent: "neg"  },
    { kw: ["tugas", "hafalan", "pr "],                  theme: "Beban tugas",           sent: "neg"  },
    { kw: ["koreksi", "dikembalikan", "feedback"],      theme: "Koreksi tugas",         sent: "neg"  },
    { kw: ["praktik", "berbicara", "percakapan"],       theme: "Praktik berbicara",     sent: "wish" },
    { kw: ["slide", "materi dibagikan", "modul"],       theme: "Materi/slide",          sent: "wish" },
    { kw: ["sabar", "membantu", "membimbing"],          theme: "Kesabaran & bimbingan", sent: "pos"  },
    { kw: ["jelas", "sistematis", "mudah dipahami"],    theme: "Penjelasan jelas",      sent: "pos"  },
    { kw: ["bahasa arab", "arab", "konsisten"],         theme: "Penggunaan B. Arab",    sent: "pos"  },
    { kw: ["tepat waktu", "terlambat", "profesional"],  theme: "Disiplin waktu",        sent: "pos"  },
    { kw: ["variasi", "menarik", "metode", "inovatif"], theme: "Variasi metode",        sent: "pos"  },
  ];
  return checks
    .map(c => ({ ...c, count: c.kw.reduce((s, k) => s + (text.split(k).length - 1), 0) }))
    .filter(t => t.count > 0)
    .sort((a, b) => b.count - a.count);
}

// AI Insight tab — Gemini Flash integration + computed from real data
const AIInsightTab = ({ data, filtered }) => {
  const { DIMENSIONS, PENGAJAR } = data;
  const [level, setLevel] = React.useState("divisi");
  const [selectedPengajar, setSelectedPengajar] = React.useState(null);
  const [generating, setGenerating] = React.useState(false);
  const [aiResult, setAiResult] = React.useState(null);
  const abortRef = React.useRef(null);

  React.useEffect(() => {
    return () => { if (abortRef.current) abortRef.current.abort(); };
  }, []);

  // Aggregate real data for the whole division
  const computed = React.useMemo(() => {
    if (!filtered.length) return null;
    const dimAvgs = {};
    DIMENSIONS.forEach(d => {
      dimAvgs[d.key] = filtered.reduce((s, r) => s + r.scores[d.col], 0) / filtered.length;
    });
    const sortedDims = [...DIMENSIONS].map(d => ({ ...d, val: dimAvgs[d.key] })).sort((a, b) => b.val - a.val);
    const allSaran   = filtered.filter(r => r.saran   && r.saran.trim().length   > 8).map(r => r.saran);
    const allPositif = filtered.filter(r => r.positive && r.positive.trim().length > 8).map(r => r.positive);
    const avgScore   = filtered.reduce((s, r) => s + r.avg, 0) / filtered.length;
    const byPengajar = PENGAJAR.map(p => {
      const rs = filtered.filter(r => r.pengajar === p.name);
      if (!rs.length) return null;
      return { ...p, avg: rs.reduce((s, r) => s + r.avg, 0) / rs.length, count: rs.length };
    }).filter(Boolean).sort((a, b) => b.avg - a.avg);

    return { dimAvgs, sortedDims, allSaran, allPositif, avgScore, byPengajar,
      strongest: sortedDims[0], weakest: sortedDims[sortedDims.length - 1] };
  }, [filtered, DIMENSIONS, PENGAJAR]);

  const pengajarList = PENGAJAR.filter(p => filtered.some(r => r.pengajar === p.name));

  // Panggil Gemini — via Apps Script proxy (aman) atau langsung (fallback)
  const callGemini = async (prompt, signal) => {
    const cfg = window.DASHBOARD_CONFIG || {};

    // ── Opsi 1: proxy via Apps Script (key tidak ke client) ──
    if (cfg.APPS_SCRIPT_URL) {
      try {
        const res = await fetch(cfg.APPS_SCRIPT_URL, {
          method: "POST",
          // text/plain → simple CORS request, tidak perlu preflight
          headers: { "Content-Type": "text/plain" },
          body: JSON.stringify({ action: "gemini", prompt }),
          signal,
        });
        if (!res.ok) throw new Error("HTTP " + res.status);
        const json = await res.json();
        if (json.error) throw new Error(json.error);
        return json.text;
      } catch (e) {
        if (e.name === "AbortError") throw e;
        // Fallback ke direct jika proxy gagal dan key ada
        if (!cfg.GEMINI_API_KEY) throw new Error("Proxy Apps Script gagal: " + e.message);
        console.warn("[AI] Proxy gagal, coba direct API:", e.message);
      }
    }

    // ── Opsi 2: panggilan langsung (key harus ada di config.js) ──
    const key = cfg.GEMINI_API_KEY;
    if (!key) throw new Error("GEMINI_API_KEY belum diisi di config.js — lihat petunjuk di bawah");

    const MODELS = ["gemini-2.5-flash", "gemini-2.0-flash", "gemini-2.0-flash-lite"];
    let lastError = null;
    for (const model of MODELS) {
      try {
        const res = await fetch(
          "https://generativelanguage.googleapis.com/v1beta/models/" + model + ":generateContent?key=" + key,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              contents: [{ parts: [{ text: prompt }] }],
              generationConfig: { temperature: 0.7, maxOutputTokens: 6000, thinkingConfig: { thinkingBudget: 0 } },
            }),
            signal,
          }
        );
        const json = await res.json();
        if (json.error) {
          const code = json.error.code;
          const msg = json.error.message || "";
          if (code === 404 || code === 429 || msg.includes("quota") || msg.includes("not found") || msg.includes("not supported")) {
            lastError = new Error(model + ": " + msg);
            continue;
          }
          throw new Error(msg);
        }
        return json.candidates[0].content.parts[0].text;
      } catch (e) {
        if (e.name === "AbortError") throw e;
        lastError = e;
        if (e.message && (e.message.includes("quota") || e.message.includes("not found") || e.message.includes("404"))) continue;
        throw e;
      }
    }
    throw lastError || new Error("Semua model Gemini gagal. Cek API key Anda.");
  };

  const buildPrompt = (target, rs) => {
    const sarans   = rs.filter(r => r.saran    && r.saran.trim().length   > 8).map(r => r.saran);
    const positifs = rs.filter(r => r.positive && r.positive.trim().length > 8).map(r => r.positive);
    const avg      = rs.length ? (rs.reduce((s, r) => s + r.avg, 0) / rs.length).toFixed(1) : "0";

    const dimRows = DIMENSIONS.map(d => {
      const v = rs.length ? rs.reduce((s, r) => s + r.scores[d.col], 0) / rs.length : 0;
      return `  ${d.label}: ${v.toFixed(1)}/100`;
    }).join("\n");

    if (level === "divisi") {
      // Ranking pengajar untuk konteks koordinator
      const byPengajar = PENGAJAR.map(p => {
        const pr = rs.filter(r => r.pengajar === p.name);
        if (!pr.length) return null;
        const pavg = (pr.reduce((s, r) => s + r.avg, 0) / pr.length).toFixed(1);
        return `  ${p.name}: ${pavg}/100 (${pr.length} responden)`;
      }).filter(Boolean).sort((a, b) => {
        const va = parseFloat(a.match(/(\d+\.\d+)/)[0]);
        const vb = parseFloat(b.match(/(\d+\.\d+)/)[0]);
        return vb - va;
      });

      const saranSample   = sarans.slice(0, 40).map(t => `- ${t}`).join("\n");
      const positifSample = positifs.slice(0, 25).map(t => `- ${t}`).join("\n");

      return `Kamu adalah konsultan senior pengembangan dosen di pesantren tinggi Islam yang spesialis pengajaran Bahasa Arab.
Divisi I'dad Lughawi STDIIS bertugas mengajar Bahasa Arab intensif kepada mahasiswa pesantren.
Skor menggunakan skala 0–100. Skor ≥90 = sangat baik, 80–89 = baik, 70–79 = cukup, <70 = perlu perhatian.

===== DATA EVALUASI DIVISI =====
Periode evaluasi: ${target}
Total responden: ${rs.length} mahasiswa
Rata-rata skor keseluruhan: ${avg}/100

Skor per dimensi (rata-rata seluruh divisi):
${dimRows}

Peringkat pengajar (tertinggi ke terendah):
${byPengajar.join("\n")}

Komentar positif mahasiswa (${positifs.length} total, ditampilkan ${Math.min(positifs.length, 25)}):
${positifSample || "(tidak ada)"}

Saran & harapan mahasiswa (${sarans.length} total, ditampilkan ${Math.min(sarans.length, 40)}):
${saranSample || "(tidak ada)"}
================================

Tulis analisis mendalam dalam Bahasa Indonesia dengan format PERSIS ini:

RINGKASAN EKSEKUTIF:
[4-5 kalimat. Gambarkan kondisi divisi secara keseluruhan, sebutkan angka rata-rata, dimensi terkuat & terlemah, dan pola utama yang muncul dari komentar mahasiswa.]

KEKUATAN DIVISI:
• [Judul kekuatan 1]: [2-3 kalimat. Jelaskan dengan referensi ke skor spesifik dan kutip 1 komentar mahasiswa yang relevan.]
• [Judul kekuatan 2]: [2-3 kalimat dengan kutipan komentar.]
• [Judul kekuatan 3 jika ada]: [penjelasan.]

AREA YANG PERLU DITINGKATKAN:
• [Judul area 1]: [2-3 kalimat penjelasan konkret. Sebutkan berapa banyak mahasiswa menyebut ini. Kutip saran paling representatif.]
• [Judul area 2]: [2-3 kalimat dengan kutipan saran.]
• [Judul area 3 jika ada]: [penjelasan.]

PENGAJAR YANG PERLU PENDAMPINGAN:
[Sebutkan 2-3 pengajar dengan skor paling rendah. Untuk masing-masing: nama, skor, dan 1-2 kalimat tentang apa yang kemungkinan perlu dibantu berdasarkan data divisi.]

REKOMENDASI PROGRAM:
1. [Aksi konkret untuk koordinator — bisa dilakukan minggu ini]
2. [Program untuk bulan ini — misalnya coaching, peer observation, dsb]
3. [Kebijakan atau standar yang bisa ditetapkan divisi]
4. [Usulan jangka menengah 1-3 bulan ke depan]`;
    }

    // ── PER PENGAJAR ──
    const divisiAvg   = filtered.length ? (filtered.reduce((s, r) => s + r.avg, 0) / filtered.length).toFixed(1) : "0";
    const kelasSet    = [...new Set(rs.map(r => r.kelas).filter(Boolean))].join(", ");
    const matkulSet   = [...new Set(rs.map(r => r.matkul).filter(Boolean))].join(", ");
    const saranSample = sarans.map(t => `- ${t}`).join("\n");
    const positifSample = positifs.map(t => `- ${t}`).join("\n");

    const dimCompare = DIMENSIONS.map(d => {
      const pv = rs.reduce((s, r) => s + r.scores[d.col], 0) / rs.length;
      const dv = filtered.length ? filtered.reduce((s, r) => s + r.scores[d.col], 0) / filtered.length : pv;
      const diff = pv - dv;
      const mark = diff > 2 ? "▲" : diff < -2 ? "▼" : "≈";
      return `  ${d.label}: ${pv.toFixed(1)} ${mark} (divisi: ${dv.toFixed(1)})`;
    }).join("\n");

    return `Kamu adalah konsultan pengembangan dosen di pesantren tinggi Islam, spesialis Bahasa Arab.
Divisi I'dad Lughawi STDIIS mengajar Bahasa Arab intensif. Skor skala 0–100 (≥90 sangat baik, 80–89 baik, 70–79 cukup, <70 perlu perhatian).

===== DATA EVALUASI PENGAJAR =====
Nama: ${target}
Kelas yang diajar: ${kelasSet || "tidak terdeteksi"}
Mata kuliah: ${matkulSet || "tidak terdeteksi"}
Total responden: ${rs.length} mahasiswa
Rata-rata skor: ${avg}/100  |  Rata-rata divisi: ${divisiAvg}/100

Skor per dimensi (▲ = di atas rata-rata divisi, ▼ = di bawah, ≈ = setara):
${dimCompare}

Komentar positif dari mahasiswa (${positifs.length} total):
${positifSample || "(tidak ada komentar positif tertulis)"}

Saran & harapan mahasiswa (${sarans.length} total):
${saranSample || "(tidak ada saran tertulis)"}
===================================

Tulis analisis personal dan membangun dalam Bahasa Indonesia, format PERSIS ini:

RINGKASAN PERFORMA:
[3-4 kalimat. Gambaran jujur dan konstruktif tentang performa pengajar ini. Bandingkan dengan rata-rata divisi. Sebutkan angka-angkanya.]

KEKUATAN YANG PERLU DIPERTAHANKAN:
• [Judul kekuatan 1]: [2-3 kalimat. Jelaskan mengapa ini kekuatan, referensikan skor dan kutip komentar mahasiswa.]
• [Judul kekuatan 2]: [2-3 kalimat dengan kutipan.]

PRIORITAS PERBAIKAN:
• [Judul masalah 1 — dimensi dengan skor terendah atau keluhan terbanyak]: [2-3 kalimat sangat konkret. Apa tepatnya yang perlu diubah? Kutip saran mahasiswa yang paling spesifik.]
• [Judul masalah 2]: [2-3 kalimat dengan kutipan saran.]

RENCANA AKSI PERSONAL:
1. [Hal konkret yang bisa dilakukan di pertemuan/kelas berikutnya]
2. [Kebiasaan baru yang perlu dibangun — mingguan]
3. [Keterampilan atau pengetahuan yang perlu dikembangkan — bulanan]

CATATAN UNTUK KOORDINATOR:
[1-2 kalimat: apakah pengajar ini perlu pendampingan khusus, atau sudah mandiri? Bentuk dukungan apa yang paling efektif?]`;
  };

  const handleGenerate = async (force = false) => {
    if (abortRef.current) abortRef.current.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    const target  = level === "divisi" ? "Seluruh divisi I'dad Lughawi" : selectedPengajar;
    const rs      = level === "divisi" ? filtered : filtered.filter(r => r.pengajar === selectedPengajar);
    const cacheKey = buildAiCacheKey(level, selectedPengajar, rs);

    if (force) {
      try { sessionStorage.removeItem(cacheKey); } catch(e) {}
    } else {
      const cached = loadAiCache(cacheKey);
      if (cached) { setAiResult(cached); return; }
    }

    setGenerating(true);
    setAiResult(null);
    try {
      const text = await callGemini(buildPrompt(target, rs), controller.signal);
      const result = { ts: new Date().toISOString(), target, raw: text };
      setAiResult(result);
      saveAiCache(cacheKey, result);
    } catch (e) {
      if (e.name === "AbortError") return;
      setAiResult({ ts: new Date().toISOString(), target: "", raw: e.message, error: true });
    } finally {
      setGenerating(false);
      abortRef.current = null;
    }
  };

  // Per-pengajar insight computed from real data
  const pengajarInsight = (name) => {
    const rs = filtered.filter(r => r.pengajar === name);
    if (!rs.length) return null;
    const dimAvgs = {};
    DIMENSIONS.forEach(d => { dimAvgs[d.key] = rs.reduce((s, r) => s + r.scores[d.col], 0) / rs.length; });
    const sorted   = DIMENSIONS.map(d => ({ ...d, val: dimAvgs[d.key] })).sort((a, b) => b.val - a.val);
    const strong   = sorted[0];
    const weak     = sorted[sorted.length - 1];
    const positives = rs.filter(r => r.positive && r.positive.trim().length > 8).map(r => r.positive);
    const sarans    = rs.filter(r => r.saran   && r.saran.trim().length   > 8).map(r => r.saran);
    const avg       = rs.reduce((s, r) => s + r.avg, 0) / rs.length;
    const themes    = extractThemes(positives, sarans);
    return { strong, weak, avg, count: rs.length, themes, positives: positives.slice(0, 4), sarans: sarans.slice(0, 4), sorted };
  };

  const cfg = window.DASHBOARD_CONFIG || {};
  const hasApiKey = !!(cfg.GEMINI_API_KEY || cfg.APPS_SCRIPT_URL);
  const insight   = level === "pengajar" && selectedPengajar ? pengajarInsight(selectedPengajar) : null;

  return (
    <div>
      {/* Header card */}
      <div className="card" style={{ marginBottom: 14, background: "linear-gradient(135deg, var(--accent-softer), var(--surface))" }}>
        <div className="row" style={{ gap: 14, alignItems: "flex-start" }}>
          <div style={{ width: 44, height: 44, borderRadius: 12, background: "var(--accent)", color: "white", display: "grid", placeItems: "center", flexShrink: 0 }}>
            <Icon name="sparkles" size={22}/>
          </div>
          <div style={{ flex: 1 }}>
            <div className="card-title" style={{ fontSize: 16 }}>AI Insight Saran Mahasiswa</div>
            <div className="card-sub" style={{ marginBottom: 10 }}>Analisis tematik & rekomendasi berbasis teks saran bebas · Didukung Gemini 2.0 Flash</div>
            <div className="row" style={{ gap: 10, flexWrap: "wrap" }}>
              <div className="segmented">
                <button className={level === "divisi"   ? "active" : ""} onClick={() => { setLevel("divisi"); setSelectedPengajar(null); setAiResult(null); }}>Insight Divisi</button>
                <button className={level === "pengajar" ? "active" : ""} onClick={() => { setLevel("pengajar"); setAiResult(null); }}>Per Pengajar</button>
              </div>
              {level === "pengajar" && (
                <select className="select" value={selectedPengajar || ""} onChange={e => { setSelectedPengajar(e.target.value); setAiResult(null); }}>
                  <option value="">— Pilih pengajar —</option>
                  {pengajarList.map(p => <option key={p.name} value={p.name}>{p.name}</option>)}
                </select>
              )}
              <div className="spacer"/>
              <button onClick={() => handleGenerate(!!aiResult)}
                disabled={generating || (level === "pengajar" && !selectedPengajar) || !hasApiKey}
                title={!hasApiKey ? "Isi GEMINI_API_KEY di config.js dahulu" : ""}
                style={{
                  background: "var(--accent)", color: "white", border: "none", padding: "8px 16px",
                  borderRadius: 10, fontWeight: 600, fontSize: 13, display: "inline-flex", gap: 6, alignItems: "center",
                  opacity: (generating || (level === "pengajar" && !selectedPengajar) || !hasApiKey) ? 0.5 : 1,
                  cursor: (generating || !hasApiKey) ? "not-allowed" : "pointer",
                }}>
                {generating
                  ? <><span className="live-dot"/>Menganalisis dengan AI…</>
                  : <><Icon name="sparkles" size={13}/>{aiResult ? "↺ Re-generate" : "Generate Insight AI"}</>}
              </button>
            </div>
            {computed && (
              <div style={{ fontSize: 11.5, color: "var(--fg-muted)", marginTop: 8 }}>
                <Icon name="info" size={11}/> {computed.allSaran.length + computed.allPositif.length} teks komentar tersedia untuk dianalisis
                {aiResult && !aiResult.error && <> · Terakhir di-generate: {relTime(aiResult.ts)}</>}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* API Key setup guide */}
      {!hasApiKey && (
        <div style={{ background: "oklch(0.97 0.04 75)", border: "1.5px solid oklch(0.88 0.08 75)", borderRadius: 14, padding: "16px 20px", marginBottom: 14 }}>
          <div style={{ fontWeight: 700, fontSize: 14, color: "oklch(0.45 0.13 75)", marginBottom: 8 }}>⚙ Setup Gemini API Key (gratis)</div>
          <ol style={{ margin: 0, paddingLeft: 20, fontSize: 13, color: "oklch(0.4 0.12 75)", lineHeight: 2 }}>
            <li>Buka <strong>aistudio.google.com</strong> (bukan Google Cloud Console)</li>
            <li>Klik <strong>Get API key</strong> → <strong>Create API key</strong> → pilih proyek baru atau yang ada</li>
            <li>Copy API key yang muncul (format: <code style={{ background: "rgba(0,0,0,0.07)", padding: "1px 4px", borderRadius: 3 }}>AIzaSy...</code>)</li>
            <li>Buka file <code style={{ background: "rgba(0,0,0,0.07)", padding: "1px 5px", borderRadius: 4 }}>config.js</code> dan isi:</li>
          </ol>
          <pre style={{ background: "rgba(0,0,0,0.06)", borderRadius: 8, padding: "10px 14px", fontSize: 12.5, margin: "10px 0 0", fontFamily: "var(--font-mono)", overflowX: "auto" }}>{`window.DASHBOARD_CONFIG = {
  APPS_SCRIPT_URL: "...",  // sudah ada
  MODE: "live",            // sudah ada
  REFRESH_INTERVAL: 60,    // sudah ada
  GEMINI_API_KEY: "AIza...",  // ← tambahkan baris ini
};`}</pre>
          <div style={{ fontSize: 12, color: "oklch(0.5 0.12 75)", marginTop: 8 }}>Setelah disimpan, refresh halaman dan tombol Generate akan aktif.</div>
        </div>
      )}

      {/* AI Generated Result */}
      {aiResult && !aiResult.error && (
        <div className="card" style={{ marginBottom: 14, border: "1.5px solid var(--accent)", background: "var(--accent-softer)" }}>
          <div className="card-head">
            <div className="row" style={{ gap: 8 }}>
              <div style={{ width: 28, height: 28, borderRadius: 8, background: "var(--accent)", color: "white", display: "grid", placeItems: "center" }}>
                <Icon name="sparkles" size={14}/>
              </div>
              <div>
                <div className="card-title">Hasil Analisis AI — {aiResult.target}</div>
                <div className="card-sub">Dihasilkan {relTime(aiResult.ts)} · Gemini 2.0 Flash</div>
              </div>
            </div>
            <button onClick={() => setAiResult(null)} style={{ background: "none", border: "none", color: "var(--fg-muted)", fontSize: 13, cursor: "pointer", padding: "4px 8px" }}>✕ Tutup</button>
          </div>
          <AIRawResult raw={aiResult.raw}/>
        </div>
      )}
      {aiResult && aiResult.error && (
        <div style={{ background: "oklch(0.97 0.03 25)", border: "1px solid oklch(0.88 0.07 25)", borderRadius: 12, padding: "14px 16px", marginBottom: 14 }}>
          <div style={{ fontWeight: 600, fontSize: 13, color: "oklch(0.5 0.16 25)", marginBottom: 4 }}>⚠ Gagal generate</div>
          <div style={{ fontSize: 13, color: "oklch(0.5 0.15 25)", marginBottom: 10 }}>{aiResult.raw}</div>
          <button onClick={handleGenerate} style={{ background: "oklch(0.5 0.16 25)", color: "white", border: "none", padding: "7px 14px", borderRadius: 8, fontWeight: 600, fontSize: 12.5, cursor: "pointer" }}>
            ↺ Coba Lagi
          </button>
        </div>
      )}

      {/* ── Sentiment Distribution (tampil di kedua level) ── */}
      {computed && <SentimentSection allPositif={computed.allPositif} allSaran={computed.allSaran}/>}

      {/* DIVISI LEVEL */}
      {level === "divisi" && computed && (
        <>
          {/* Stats overview */}
          <div className="kpi-grid" style={{ gridTemplateColumns: "repeat(4,1fr)", marginBottom: 14 }}>
            <div className="kpi">
              <div className="kpi-label"><div className="kpi-icon"><Icon name="star" size={14}/></div>Avg Skor Divisi</div>
              <div className="kpi-value">{computed.avgScore.toFixed(1)}<span className="unit">/100</span></div>
            </div>
            <div className="kpi">
              <div className="kpi-label"><div className="kpi-icon"><Icon name="trend_up" size={14}/></div>Dimensi Terkuat</div>
              <div style={{ fontWeight: 700, fontSize: 15, marginTop: 8, fontFamily: "var(--font-display)" }}>{computed.strongest?.label}</div>
              <div style={{ fontFamily: "var(--font-mono)", fontSize: 13, color: "oklch(0.45 0.13 150)", marginTop: 2 }}>{computed.strongest?.val.toFixed(1)}</div>
            </div>
            <div className="kpi">
              <div className="kpi-label"><div className="kpi-icon"><Icon name="warning" size={14}/></div>Dimensi Terlemah</div>
              <div style={{ fontWeight: 700, fontSize: 15, marginTop: 8, fontFamily: "var(--font-display)" }}>{computed.weakest?.label}</div>
              <div style={{ fontFamily: "var(--font-mono)", fontSize: 13, color: "oklch(0.55 0.16 30)", marginTop: 2 }}>{computed.weakest?.val.toFixed(1)}</div>
            </div>
            <div className="kpi">
              <div className="kpi-label"><div className="kpi-icon"><Icon name="quote" size={14}/></div>Total Komentar</div>
              <div className="kpi-value">{fmtInt(computed.allSaran.length + computed.allPositif.length)}</div>
              <div className="kpi-foot">{fmtInt(computed.allPositif.length)} positif · {fmtInt(computed.allSaran.length)} saran</div>
            </div>
          </div>

          <div className="grid-2-eq" style={{ marginBottom: 14 }}>
            {/* Dimension breakdown */}
            <div className="card">
              <div className="card-head">
                <div>
                  <div className="card-title">Skor Per Dimensi — Divisi</div>
                  <div className="card-sub">Rata-rata dari {fmtInt(filtered.length)} respons</div>
                </div>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {computed.sortedDims.map(d => (
                  <div key={d.key} style={{ display: "grid", gridTemplateColumns: "1fr 100px 56px", gap: 10, alignItems: "center" }}>
                    <div style={{ fontSize: 13, fontWeight: 500 }}>{d.label}</div>
                    <div className="bar-bg" style={{ height: 8 }}>
                      <div style={{ height: "100%", width: d.val + "%", background: scoreColor(d.val), borderRadius: 999, transition: "width 0.5s" }}/>
                    </div>
                    <span className={"score-pill " + scoreClass(d.val)} style={{ textAlign: "center" }}>{d.val.toFixed(1)}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Themes from real texts */}
            <div className="card">
              <div className="card-head">
                <div>
                  <div className="card-title">Tema Yang Sering Muncul</div>
                  <div className="card-sub">Diekstraksi dari {fmtInt(computed.allSaran.length + computed.allPositif.length)} komentar tertulis</div>
                </div>
              </div>
              {(() => {
                const themes = extractThemes(computed.allPositif, computed.allSaran);
                if (!themes.length) return <div className="muted" style={{ fontSize: 13 }}>Belum cukup teks untuk analisis tematik.</div>;
                const max = Math.max(...themes.map(t => t.count));
                return (
                  <div style={{ display: "flex", flexDirection: "column", gap: 9 }}>
                    {themes.map((t, i) => {
                      const color = t.sent === "pos" ? "oklch(0.55 0.14 150)" : t.sent === "neg" ? "oklch(0.58 0.17 30)" : "oklch(0.6 0.13 240)";
                      return (
                        <div key={i} style={{ display: "grid", gridTemplateColumns: "180px 1fr 36px", gap: 10, alignItems: "center", fontSize: 12.5 }}>
                          <div className="row" style={{ gap: 6 }}>
                            <span style={{ width: 7, height: 7, borderRadius: 999, background: color, flexShrink: 0 }}/>
                            {t.theme}
                          </div>
                          <div className="bar-bg" style={{ height: 14 }}>
                            <div style={{ width: (t.count/max*100)+"%", height: "100%", background: color, borderRadius: 4 }}/>
                          </div>
                          <div style={{ fontFamily: "var(--font-mono)", fontWeight: 700, textAlign: "right", fontSize: 12 }}>{t.count}</div>
                        </div>
                      );
                    })}
                  </div>
                );
              })()}
            </div>
          </div>

          {/* Sample quotes */}
          <div className="grid-2-eq">
            <div className="card">
              <div className="card-title" style={{ color: "oklch(0.4 0.13 150)", marginBottom: 12 }}>✓ Sampel Komentar Positif</div>
              {computed.allPositif.length
                ? computed.allPositif.slice(0, 5).map((t, i) => (
                    <div key={i} className="saran-card"><div className="body">"{t}"</div></div>
                  ))
                : <div className="muted" style={{ fontSize: 13 }}>Belum ada komentar positif tertulis.</div>}
            </div>
            <div className="card">
              <div className="card-title" style={{ color: "oklch(0.5 0.15 75)", marginBottom: 12 }}>💬 Sampel Saran Mahasiswa</div>
              {computed.allSaran.length
                ? computed.allSaran.slice(0, 5).map((t, i) => (
                    <div key={i} className="saran-card"><div className="body">"{t}"</div></div>
                  ))
                : <div className="muted" style={{ fontSize: 13 }}>Belum ada saran tertulis.</div>}
            </div>
          </div>
        </>
      )}

      {/* PENGAJAR LEVEL */}
      {level === "pengajar" && !selectedPengajar && (
        <div className="card" style={{ textAlign: "center", padding: 60, color: "var(--fg-muted)" }}>
          <Icon name="user" size={32}/>
          <div style={{ marginTop: 10 }}>Pilih pengajar untuk melihat insight berbasis data personal.</div>
        </div>
      )}

      {level === "pengajar" && selectedPengajar && insight && (
        <>
          <div className="card" style={{ marginBottom: 14 }}>
            <div className="row" style={{ gap: 16 }}>
              <Avatar name={selectedPengajar} initials={selectedPengajar.split(" ").map(s=>s[0]).slice(0,2).join("")} size="xl"/>
              <div style={{ flex: 1 }}>
                <div style={{ fontFamily: "var(--font-display)", fontSize: 20, fontWeight: 700 }}>{selectedPengajar}</div>
                <div style={{ fontSize: 13, color: "var(--fg-muted)", marginTop: 4 }}>
                  {insight.count} responden · Avg skor <span style={{ fontWeight: 700, fontFamily: "var(--font-mono)", color: scoreColor(insight.avg) }}>{insight.avg.toFixed(1)}</span>
                </div>
                <div className="row" style={{ gap: 8, marginTop: 10, flexWrap: "wrap" }}>
                  <span className="chip good"><Icon name="trend_up" size={11}/> Kuat: {insight.strong.label} ({insight.strong.val.toFixed(1)})</span>
                  <span className="chip warn"><Icon name="warning" size={11}/> Fokus: {insight.weak.label} ({insight.weak.val.toFixed(1)})</span>
                </div>
              </div>
              <ProgressRing value={insight.avg} size={110} stroke={10}/>
            </div>
          </div>

          <div className="grid-2-eq" style={{ marginBottom: 14 }}>
            <div className="card">
              <div className="card-title" style={{ marginBottom: 14 }}>Skor Per Dimensi</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 9 }}>
                {insight.sorted.map(d => (
                  <div key={d.key} style={{ display: "grid", gridTemplateColumns: "1fr 100px 56px", gap: 10, alignItems: "center" }}>
                    <div style={{ fontSize: 13, fontWeight: 500 }}>{d.label}</div>
                    <div className="bar-bg" style={{ height: 8 }}>
                      <div style={{ height: "100%", width: d.val + "%", background: scoreColor(d.val), borderRadius: 999, transition: "width 0.5s" }}/>
                    </div>
                    <span className={"score-pill " + scoreClass(d.val)} style={{ textAlign: "center" }}>{d.val.toFixed(1)}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="card">
              <div className="card-title" style={{ marginBottom: 12 }}>Tema dalam Komentar</div>
              {insight.themes.length ? (
                <div className="row" style={{ flexWrap: "wrap", gap: 8 }}>
                  {insight.themes.map((t, i) => {
                    const cls = t.sent === "pos" ? "good" : t.sent === "neg" ? "bad" : "";
                    return <span key={i} className={"chip " + cls}>{t.theme} <span style={{ marginLeft: 4, fontFamily: "var(--font-mono)", opacity: 0.7 }}>×{t.count}</span></span>;
                  })}
                </div>
              ) : <div className="muted" style={{ fontSize: 13 }}>Belum cukup teks untuk analisis tematik.</div>}

              <div className="divider"/>
              <div style={{ fontSize: 12, fontWeight: 600, color: "var(--fg-muted)", marginBottom: 8 }}>Komentar positif</div>
              {insight.positives.length
                ? insight.positives.map((t, i) => <div key={i} className="saran-card"><div className="body" style={{ fontSize: 12.5 }}>"{t}"</div></div>)
                : <div className="muted" style={{ fontSize: 12.5 }}>Belum ada komentar positif tertulis.</div>}
            </div>
          </div>

          <div className="card">
            <div className="card-title" style={{ color: "oklch(0.5 0.15 75)", marginBottom: 12 }}>Saran Mahasiswa ({insight.sarans.length})</div>
            {insight.sarans.length
              ? insight.sarans.map((t, i) => <div key={i} className="saran-card"><div className="body">"{t}"</div></div>)
              : <div className="muted" style={{ fontSize: 13 }}>Belum ada saran tertulis dari mahasiswa periode ini.</div>}
          </div>
        </>
      )}
    </div>
  );

};

function AIRawResult({ raw }) {
  const labels = ["RINGKASAN", "KEKUATAN", "AREA PERBAIKAN", "REKOMENDASI"];
  const styles = {
    RINGKASAN:       { bg: "var(--surface-2)",       color: "var(--fg-muted)",           border: "var(--border)" },
    KEKUATAN:        { bg: "oklch(0.97 0.04 150)",   color: "oklch(0.4 0.13 150)",       border: "oklch(0.88 0.07 150)" },
    "AREA PERBAIKAN":{ bg: "oklch(0.97 0.04 30)",    color: "oklch(0.5 0.16 30)",        border: "oklch(0.88 0.07 30)" },
    REKOMENDASI:     { bg: "var(--accent-softer)",   color: "var(--accent-strong)",      border: "var(--border)" },
  };

  const sections = [];
  let remaining = raw;
  labels.forEach(label => {
    const idx = remaining.toUpperCase().indexOf(label + ":");
    if (idx === -1) return;
    const nextIdxs = labels.filter(l => l !== label).map(l => {
      const i = remaining.toUpperCase().indexOf(l + ":", idx + 1);
      return i === -1 ? Infinity : i;
    });
    const end     = Math.min(...nextIdxs.filter(n => n > idx));
    const content = remaining.slice(idx + label.length + 1, end === Infinity ? undefined : end).trim();
    sections.push({ label, content });
  });

  if (!sections.length) return <p style={{ fontSize: 14, lineHeight: 1.7, margin: 0, whiteSpace: "pre-line" }}>{raw}</p>;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      {sections.map((s, i) => {
        const st = styles[s.label] || {};
        return (
          <div key={i} style={{ background: st.bg, borderRadius: 10, padding: "12px 16px", border: "1px solid " + st.border }}>
            <div style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: 0.7, textTransform: "uppercase", color: st.color, marginBottom: 8 }}>{s.label}</div>
            <div style={{ fontSize: 13.5, lineHeight: 1.7, whiteSpace: "pre-line" }}>{s.content}</div>
          </div>
        );
      })}
    </div>
  );
}

// ─── Sentiment Section Component ────────────────────────────────────────────
function SentimentSection({ allPositif, allSaran }) {
  const allTexts = [...allPositif, ...allSaran];
  if (allTexts.length < 3) return null;

  const dist  = sentimentDistribution(allTexts);
  const total = allTexts.length;
  const items = [
    { key: "positif", label: "Positif",  color: "oklch(0.55 0.14 150)", bg: "oklch(0.97 0.04 150)", icon: "trend_up" },
    { key: "netral",  label: "Netral",   color: "oklch(0.6 0.05 200)",  bg: "oklch(0.97 0.02 200)", icon: "arrow_right" },
    { key: "negatif", label: "Negatif",  color: "oklch(0.58 0.17 30)",  bg: "oklch(0.97 0.04 25)",  icon: "warning" },
  ];

  return (
    <div className="card" style={{ marginBottom: 14 }}>
      <div className="card-head">
        <div>
          <div className="card-title">Distribusi Sentimen Komentar</div>
          <div className="card-sub">Analisis otomatis berbasis kamus · {total} komentar tertulis</div>
        </div>
        <div style={{ fontSize: 11.5, color: "var(--fg-muted)", display: "flex", alignItems: "center", gap: 6 }}>
          <Icon name="info" size={13}/>
          <span>Keyword-based — tidak 100% akurat</span>
        </div>
      </div>

      {/* KPI strip */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 10, marginBottom: 14 }}>
        {items.map(it => {
          const count = dist[it.key];
          const pct   = total ? Math.round((count / total) * 100) : 0;
          return (
            <div key={it.key} style={{ background: it.bg, border: `1px solid ${it.color}30`, borderRadius: 12, padding: "12px 14px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 6 }}>
                <Icon name={it.icon} size={14} style={{ color: it.color }}/>
                <span style={{ fontSize: 12.5, fontWeight: 600, color: it.color }}>{it.label}</span>
              </div>
              <div style={{ fontFamily: "var(--font-mono)", fontSize: 22, fontWeight: 700, color: it.color }}>{count}</div>
              <div style={{ fontSize: 11.5, color: it.color, opacity: 0.8 }}>{pct}% komentar</div>
            </div>
          );
        })}
      </div>

      {/* Bar visual */}
      {total > 0 && (
        <div>
          <div style={{ display: "flex", height: 12, borderRadius: 999, overflow: "hidden", gap: 2, marginBottom: 8 }}>
            {items.map(it => {
              const w = (dist[it.key] / total) * 100;
              return w > 0 ? <div key={it.key} style={{ width: w + "%", background: it.color, transition: "width 0.5s", minWidth: 4 }}/> : null;
            })}
          </div>
          <div style={{ display: "flex", gap: 14, fontSize: 11.5, color: "var(--fg-muted)", flexWrap: "wrap" }}>
            {items.map(it => (
              <div key={it.key} className="row" style={{ gap: 5 }}>
                <span style={{ width: 8, height: 8, borderRadius: 999, background: it.color, flexShrink: 0 }}/>
                {it.label}: {dist[it.key]} ({total ? Math.round((dist[it.key]/total)*100) : 0}%)
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Contoh komentar negatif (untuk aksi) */}
      {dist.negatif > 0 && (
        <details style={{ marginTop: 12 }}>
          <summary style={{ fontSize: 12.5, fontWeight: 600, color: "oklch(0.5 0.15 30)", cursor: "pointer", padding: "6px 0" }}>
            Lihat {Math.min(dist.negatif, 5)} contoh komentar negatif/perlu perbaikan
          </summary>
          <div style={{ display: "flex", flexDirection: "column", gap: 6, marginTop: 8 }}>
            {allTexts
              .filter(t => analyzeSentiment(t) === "negatif")
              .slice(0, 5)
              .map((t, i) => (
                <div key={i} className="saran-card" style={{ borderLeft: "3px solid oklch(0.6 0.17 30)" }}>
                  <div className="body">"{t}"</div>
                </div>
              ))
            }
          </div>
        </details>
      )}
    </div>
  );
}

window.AIInsightTab = AIInsightTab;
