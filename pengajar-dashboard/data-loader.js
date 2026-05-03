/**
 * data-loader.js
 * Mengambil data dari Google Apps Script atau fallback ke mock data.
 * Expose: window.DataLoader.load() → Promise<data>
 *         window.DataLoader.verifyPin(name, pin) → Promise<{ok, data}>
 */
(function() {

  // ── Score helpers (sama dengan mock) ──
  function inferJenjang(kelas) {
    // Strip non-alphanumeric so "I'LP" → "ILP" matches correctly
    const s = (kelas || "").replace(/[^a-zA-Z0-9]/g, "").toUpperCase();
    return s.includes("ILP") ? "ILP" : "ILL";
  }
  function inferGender(kelas, jk) {
    if (kelas) {
      const k = kelas.toLowerCase();
      // Cegah false positive: "kompilasi" mengandung "pi", "pagi" mengandung "pa"
      // Gunakan word-boundary: "pi" atau "pa" harus diawali/diakhiri karakter non-huruf
      if (/(?:^|[-_\s/])pi(?:[-_\s/]|$)/.test(k)) return "pi";
      if (/(?:^|[-_\s/])pa(?:[-_\s/]|$)/.test(k)) return "pa";
    }
    if (jk) return /perempuan|wanita|putri/i.test(jk) ? "pi" : "pa";
    return "pa";
  }

  // ── Transform data dari Apps Script ke format dashboard ──
  function transformAppsScriptData(raw) {
    const { responses, dimensions, periodes } = raw;

    // Build PENGAJAR list dari responses
    const pengajarMap = {};
    responses.forEach(r => {
      if (r.pengajar && !pengajarMap[r.pengajar]) {
        const inits = r.pengajar.split(" ").filter(Boolean).map(s => s[0]).join("").slice(0, 2).toUpperCase();
        pengajarMap[r.pengajar] = {
          name: r.pengajar,
          gender: r.gender === "pi" ? "P" : "L",
          initials: inits,
        };
      }
    });
    const PENGAJAR = Object.values(pengajarMap).sort((a, b) => a.name.localeCompare(b.name));

    // Build DIMENSIONS dari dimensions array
    const DIMENSIONS = dimensions.map(d => ({
      key: d.key,
      label: d.label,
      short: d.label.length > 12 ? d.label.slice(0, 12) + "…" : d.label,
      col: d.col,
      hasTextFeedback: (d.textColIndex ?? -1) >= 0,
    }));

    // Enrich responses
    const enriched = responses.map(r => ({
      ...r,
      jenjang: r.jenjang || inferJenjang(r.kelas),
      gender: r.gender || inferGender(r.kelas, r.jk),
      avg: r.avg || 0,
      positive: r.positive || "",
      saran: r.saran || "",
      dimTexts: r.dimTexts || {},
    }));

    // Build KELAS lists
    const KELAS_PUTRA = [...new Set(enriched.map(r => r.kelasPutra).filter(Boolean))].sort();
    const KELAS_PUTRI = [...new Set(enriched.map(r => r.kelasPutri).filter(Boolean))].sort();
    const MATKUL = [...new Set(enriched.map(r => r.matkul).filter(Boolean))].sort();

    // Mark periods — expected diambil dari config agar bisa disesuaikan
    const expectedResponses = (window.DASHBOARD_CONFIG || {}).EXPECTED_RESPONSES || 620;
    const PERIODES = periodes.map((p, i) => ({
      ...p,
      current: !!p.current || i === periodes.length - 1,
      expected: expectedResponses,
    }));

    return {
      PENGAJAR,
      DIMENSIONS,
      PERIODES,
      KELAS_PUTRA,
      KELAS_PUTRI,
      MATKUL,
      responses: enriched,
      _source: "live",
      _syncedAt: raw.syncedAt,
    };
  }

  // ── Fetch via JSONP (lebih andal untuk Apps Script dari browser) ──
  function fetchViaJsonp(url, action, extraParams) {
    return new Promise((resolve, reject) => {
      const cbName = "_dashCb_" + Date.now() + "_" + Math.floor(Math.random() * 9999);
      const script = document.createElement("script");
      const timer = setTimeout(() => {
        cleanup();
        reject(new Error("Timeout (15s) — cek koneksi dan pastikan Apps Script sudah di-deploy"));
      }, 15000);

      function cleanup() {
        clearTimeout(timer);
        delete window[cbName];
        if (script.parentNode) script.parentNode.removeChild(script);
      }

      window[cbName] = function(data) {
        cleanup();
        if (data && data.error) reject(new Error(data.error));
        else resolve(data);
      };

      let src = url + "?action=" + action + "&callback=" + cbName;
      if (extraParams) src += "&" + extraParams;
      script.src = src;
      script.onerror = () => { cleanup(); reject(new Error("Gagal memuat script — periksa URL Apps Script")); };
      document.head.appendChild(script);
    });
  }

  // ── Fetch dari Apps Script ──
  async function fetchFromAppsScript(url) {
    return fetchViaJsonp(url, "getData");
  }

  // ── Fallback ke mock data ──
  function getMockData() {
    if (!window.MOCK_DATA) throw new Error("Mock data tidak tersedia");
    return { ...window.MOCK_DATA, _source: "mock" };
  }

  // ── Cache dengan TTL ──
  const CACHE_KEY = "dashboard_data_cache";
  const CACHE_TTL = 55 * 1000; // 55 detik

  function saveCache(data) {
    try {
      sessionStorage.setItem(CACHE_KEY, JSON.stringify({ data, ts: Date.now() }));
    } catch (e) {}
  }

  function loadCache() {
    try {
      const raw = sessionStorage.getItem(CACHE_KEY);
      if (!raw) return null;
      const { data, ts } = JSON.parse(raw);
      if (Date.now() - ts > CACHE_TTL) return null;
      return data;
    } catch (e) { return null; }
  }

  // ── Public API ──
  const DataLoader = {

    async load(forceRefresh = false) {
      const cfg = window.DASHBOARD_CONFIG || {};
      const url = cfg.APPS_SCRIPT_URL;
      const mode = cfg.MODE || "demo";

      // Mode demo: langsung pakai mock
      if (mode === "demo" || !url) {
        return getMockData();
      }

      // Cek cache
      if (!forceRefresh) {
        const cached = loadCache();
        if (cached) {
          return { ...cached, _fromCache: true };
        }
      }

      // Fetch live
      try {
        const raw = await fetchFromAppsScript(url);
        const data = transformAppsScriptData(raw);
        saveCache(data);
        window.MOCK_DATA = data; // agar raport.html juga bisa pakai
        return data;
      } catch (err) {
        console.warn("[DataLoader] Gagal fetch live data, fallback ke mock:", err.message);
        return { ...getMockData(), _error: err.message };
      }
    },

    async verifyPin(name, pin) {
      const cfg = window.DASHBOARD_CONFIG || {};
      const url = cfg.APPS_SCRIPT_URL;

      if (!url || cfg.MODE === "demo") {
        // Demo mode: PIN = urutan index alfabet (hanya untuk demo, tidak aman)
        const idx = (window.MOCK_DATA?.PENGAJAR || []).findIndex(p => p.name === name);
        const expected = String(10001 + idx).slice(1);
        if (pin === expected) {
          return { ok: true, data: null };
        }
        return { ok: false, error: "PIN salah (demo: PIN = nomor urut, mis. 0001, 0002...)" };
      }

      // Live mode: verifikasi via JSONP GET (PIN tersimpan di sheet)
      try {
        const params = "name=" + encodeURIComponent(name) + "&pin=" + encodeURIComponent(pin);
        const result = await fetchViaJsonp(url, "verifyPin", params);
        return result;
      } catch (err) {
        return { ok: false, error: "Koneksi gagal: " + err.message };
      }
    },

    // Muat semua PIN dari server (untuk halaman admin Distribusi Raport)
    async loadPins() {
      const cfg = window.DASHBOARD_CONFIG || {};
      const url = cfg.APPS_SCRIPT_URL;

      if (!url || cfg.MODE === "demo") {
        // Demo mode: kembalikan PIN sequential (bukan acak, hanya untuk demo)
        const result = {};
        (window.MOCK_DATA?.PENGAJAR || []).forEach((p, i) => {
          result[p.name] = String(10001 + i).slice(1);
        });
        return result;
      }

      try {
        const raw = await fetchViaJsonp(url, "getPins");
        if (raw.error) throw new Error(raw.error);
        return raw.pins || {};
      } catch (err) {
        throw new Error("Gagal memuat PIN dari server: " + err.message);
      }
    },

    // Mulai auto-refresh
    // onRefresh(data) — dipanggil setelah data baru diterima
    // onStart()       — dipanggil sesaat sebelum fetch dimulai
    startAutoRefresh(onRefresh, onStart) {
      const cfg = window.DASHBOARD_CONFIG || {};
      const interval = (cfg.REFRESH_INTERVAL || 0) * 1000;
      if (!interval || cfg.MODE === "demo") return null;

      const id = setInterval(async () => {
        if (onStart) onStart();
        try {
          const data = await DataLoader.load(true);
          if (onRefresh) onRefresh(data);
        } catch (e) {}
      }, interval);

      return id; // simpan untuk clearInterval nanti
    },
  };

  window.DataLoader = DataLoader;
})();
