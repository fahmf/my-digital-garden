// Main app shell - assembles the dashboard
const { useState, useEffect, useMemo } = React;

class ErrorBoundary extends React.Component {
  constructor(props) { super(props); this.state = { error: null }; }
  static getDerivedStateFromError(error) { return { error }; }
  componentDidCatch(err, info) { console.error("[ErrorBoundary]", err, info.componentStack); }
  render() {
    if (this.state.error) return (
      <div style={{ padding: 40, textAlign: "center" }}>
        <div style={{ fontSize: 28, marginBottom: 12 }}>⚠</div>
        <div style={{ fontWeight: 700, fontSize: 16, marginBottom: 8 }}>Tab ini mengalami error</div>
        <div style={{ color: "var(--fg-muted)", fontSize: 13, marginBottom: 16, maxWidth: 400, margin: "0 auto 16px" }}>{this.state.error.message}</div>
        <button
          onClick={() => this.setState({ error: null })}
          style={{ background: "var(--accent)", color: "white", border: "none", padding: "9px 18px", borderRadius: 9, fontWeight: 600, cursor: "pointer" }}
        >Reset Tab</button>
      </div>
    );
    return this.props.children;
  }
}

const TWEAK_DEFAULTS = /*EDITMODE-BEGIN*/{
  "density": "comfortable",
  "accent": "teal",
  "darkMode": false,
  "layout": "sidebar",
  "cardStyle": "elevated"
}/*EDITMODE-END*/;

const ACCENT_PRESETS = {
  teal: { h: 165, c: 0.09, l: 0.45, label: "Teal" },
  emerald: { h: 150, c: 0.12, l: 0.45, label: "Emerald" },
  indigo: { h: 265, c: 0.13, l: 0.5, label: "Indigo" },
  rose: { h: 12, c: 0.13, l: 0.55, label: "Rose" },
  amber: { h: 65, c: 0.14, l: 0.55, label: "Amber" },
  slate: { h: 240, c: 0.03, l: 0.4, label: "Slate" },
};

function PINTab({ data }) {
  const [search, setSearch]   = useState("");
  const [page, setPage]       = useState(1);
  const [copied, setCopied]   = useState(null); // nama pengajar yang baru disalin

  const PAGE_SIZE   = 25;
  const activePeriode = data.PERIODES.find(p => p.current);

  // Base URL Raport.html — sama folder dengan Dashboard
  const raportBase = window.location.origin +
    window.location.pathname.replace(/[^/]*$/, "") + "Raport.html";
  const getLink = (name) => raportBase + "?name=" + encodeURIComponent(name);

  const copyLink = (name) => {
    navigator.clipboard.writeText(getLink(name)).then(() => {
      setCopied(name);
      setTimeout(() => setCopied(null), 2000);
    });
  };

  const list = data.PENGAJAR.filter(p =>
    !search || p.name.toLowerCase().includes(search.toLowerCase())
  );
  useEffect(() => { setPage(1); }, [search]);

  const totalPages = Math.ceil(list.length / PAGE_SIZE);
  const pagedList  = list.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  return (
    <div>
      <div style={{ background: "oklch(0.97 0.04 75)", border: "1.5px solid oklch(0.88 0.08 75)", borderRadius: 14, padding: "14px 18px", marginBottom: 18, display: "flex", gap: 12 }}>
        <Icon name="warning" size={18} style={{ flexShrink: 0, color: "oklch(0.55 0.15 75)", marginTop: 1 }}/>
        <div>
          <div style={{ fontWeight: 600, fontSize: 13.5, color: "oklch(0.45 0.13 75)" }}>Halaman Rahasia — Hanya untuk Koordinator Divisi</div>
          <div style={{ fontSize: 12.5, color: "oklch(0.5 0.12 75)", marginTop: 3 }}>
            Kirimkan link raport ke masing-masing pengajar secara pribadi (WhatsApp/tatap muka). Link langsung membuka raport miliknya tanpa perlu login.
          </div>
        </div>
      </div>

      <div className="card" style={{ marginBottom: 14 }}>
        <div className="card-head">
          <div>
            <div className="card-title">Cara Distribusi Raport</div>
            <div className="card-sub">Langkah-langkah membagikan raport ke pengajar</div>
          </div>
          <a href="Raport.html" target="_blank" style={{ background: "var(--accent)", color: "white", border: "none", padding: "8px 14px", borderRadius: 10, fontWeight: 600, fontSize: 13, textDecoration: "none", display: "inline-flex", gap: 6, alignItems: "center" }}>
            <Icon name="eye" size={13}/> Buka Halaman Raport
          </a>
        </div>
        <div className="pin-steps-grid" style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 12 }}>
          {[
            { n: "1", title: "Buka tab ini",       desc: "Link unik per pengajar sudah otomatis digenerate di bawah" },
            { n: "2", title: "Salin link",          desc: "Klik tombol \"Salin\" di baris pengajar yang ingin dibagikan" },
            { n: "3", title: "Kirim via WA",        desc: "Kirimkan link langsung ke pengajar bersangkutan secara pribadi" },
            { n: "4", title: "Pengajar buka link",  desc: "Link langsung membuka raport miliknya — tidak perlu pilih nama atau PIN" },
          ].map(s => (
            <div key={s.n} style={{ background: "var(--surface-2)", borderRadius: 12, padding: "14px 16px" }}>
              <div style={{ width: 28, height: 28, borderRadius: 8, background: "var(--accent)", color: "white", display: "grid", placeItems: "center", fontWeight: 700, fontSize: 13, marginBottom: 10 }}>{s.n}</div>
              <div style={{ fontWeight: 600, fontSize: 13.5, marginBottom: 4 }}>{s.title}</div>
              <div style={{ fontSize: 12.5, color: "var(--fg-muted)", lineHeight: 1.4 }}>{s.desc}</div>
            </div>
          ))}
        </div>
      </div>

      <div className="card">
        <div className="card-head">
          <div>
            <div className="card-title">Link Raport per Pengajar — {activePeriode?.label}</div>
            <div className="card-sub">{data.PENGAJAR.length} pengajar · klik "Salin" lalu kirim via WA</div>
          </div>
          <div className="search-box" style={{ width: 220 }}>
            <Icon name="search" size={13}/>
            <input placeholder="Cari nama…" value={search} onChange={e => setSearch(e.target.value)}/>
          </div>
        </div>
        <div style={{ overflowX: "auto" }}>
          <table className="table" style={{ minWidth: 580 }}>
            <thead>
              <tr>
                <th style={{ width: 40 }}>#</th>
                <th>Nama Pengajar</th>
                <th style={{ width: 90 }}>Gender</th>
                <th>Link Raport</th>
                <th style={{ width: 80 }}>Respons</th>
                <th style={{ width: 90 }}>Avg Skor</th>
              </tr>
            </thead>
            <tbody>
              {pagedList.map((p) => {
                const rs  = data.responses.filter(r => r.pengajar === p.name && r.periode === activePeriode?.id);
                const avg = rs.length ? rs.reduce((s, r) => s + r.avg, 0) / rs.length : null;
                const isCopied = copied === p.name;
                return (
                  <tr key={p.name}>
                    <td className="num muted">{data.PENGAJAR.indexOf(p) + 1}</td>
                    <td>
                      <div className="row" style={{ gap: 10 }}>
                        <div style={{ width: 28, height: 28, borderRadius: 999, background: "linear-gradient(135deg, oklch(0.7 0.12 165), oklch(0.5 0.13 165))", color: "white", display: "grid", placeItems: "center", fontSize: 10, fontWeight: 700, flexShrink: 0 }}>
                          {p.initials}
                        </div>
                        <span style={{ fontWeight: 500 }}>{p.name}</span>
                      </div>
                    </td>
                    <td><span className="chip">{p.gender === "L" ? "Putra" : "Putri"}</span></td>
                    <td>
                      <div className="row" style={{ gap: 8 }}>
                        <span style={{ fontFamily: "var(--font-mono)", fontSize: 11.5, color: "var(--fg-muted)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: 260 }}>
                          {getLink(p.name)}
                        </span>
                        <button
                          onClick={() => copyLink(p.name)}
                          style={{
                            flexShrink: 0,
                            background: isCopied ? "oklch(0.45 0.15 150)" : "var(--accent)",
                            color: "white", border: "none", padding: "4px 10px", borderRadius: 7,
                            fontSize: 11.5, fontWeight: 600, cursor: "pointer", transition: "background 0.2s",
                            display: "inline-flex", alignItems: "center", gap: 4,
                          }}
                        >
                          <Icon name={isCopied ? "check" : "copy"} size={11}/>
                          {isCopied ? "Tersalin!" : "Salin"}
                        </button>
                      </div>
                    </td>
                    <td className="num">{rs.length || "—"}</td>
                    <td className="num">
                      {avg != null ? <span className={"score-pill " + (avg>=95?"s100":avg>=80?"s80":avg>=65?"s60":"s40")}>{avg.toFixed(1)}</span> : <span className="muted">—</span>}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {totalPages > 1 && (
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 14, fontSize: 12.5 }}>
            <span style={{ color: "var(--fg-muted)" }}>
              Menampilkan {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, list.length)} dari {list.length} pengajar
            </span>
            <div style={{ display: "flex", gap: 4, alignItems: "center" }}>
              <button disabled={page === 1} onClick={() => setPage(1)}
                style={{ background: "var(--surface-2)", border: "1px solid var(--border)", borderRadius: 7, padding: "4px 9px", fontSize: 12, cursor: page === 1 ? "default" : "pointer", opacity: page === 1 ? 0.4 : 1 }}>«</button>
              <button disabled={page === 1} onClick={() => setPage(p => p - 1)}
                style={{ background: "var(--surface-2)", border: "1px solid var(--border)", borderRadius: 7, padding: "4px 9px", fontSize: 12, cursor: page === 1 ? "default" : "pointer", opacity: page === 1 ? 0.4 : 1 }}>‹</button>
              {Array.from({ length: totalPages }, (_, i) => i + 1)
                .filter(p => p === 1 || p === totalPages || Math.abs(p - page) <= 1)
                .reduce((acc, p, idx, arr) => {
                  if (idx > 0 && p - arr[idx - 1] > 1) acc.push("…");
                  acc.push(p);
                  return acc;
                }, [])
                .map((p, i) => p === "…" ? (
                  <span key={"e" + i} style={{ padding: "4px 6px", fontSize: 12, color: "var(--fg-muted)" }}>…</span>
                ) : (
                  <button key={p} onClick={() => setPage(p)} style={{
                    background: p === page ? "var(--accent)" : "var(--surface-2)",
                    color: p === page ? "white" : "var(--fg)",
                    border: "1px solid " + (p === page ? "var(--accent)" : "var(--border)"),
                    borderRadius: 7, padding: "4px 9px", fontSize: 12, fontWeight: p === page ? 700 : 400, cursor: "pointer",
                  }}>{p}</button>
                ))
              }
              <button disabled={page === totalPages} onClick={() => setPage(p => p + 1)}
                style={{ background: "var(--surface-2)", border: "1px solid var(--border)", borderRadius: 7, padding: "4px 9px", fontSize: 12, cursor: page === totalPages ? "default" : "pointer", opacity: page === totalPages ? 0.4 : 1 }}>›</button>
              <button disabled={page === totalPages} onClick={() => setPage(totalPages)}
                style={{ background: "var(--surface-2)", border: "1px solid var(--border)", borderRadius: 7, padding: "4px 9px", fontSize: 12, cursor: page === totalPages ? "default" : "pointer", opacity: page === totalPages ? 0.4 : 1 }}>»</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function App() {
  const [tweaks, setTweak] = useTweaks(TWEAK_DEFAULTS);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);
  const [lastSync, setLastSync] = useState(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [tab, setTab] = useState("overview");
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  // Lazy mount: hanya render tab yang pernah dikunjungi; tab aktif tampil, lainnya hidden
  const [mountedTabs, setMountedTabs] = useState(() => new Set(["overview"]));
  const switchTab = (newTab) => {
    setMountedTabs(prev => { const s = new Set(prev); s.add(newTab); return s; });
    setTab(newTab);
  };

  // Load data on mount + auto-refresh
  useEffect(() => {
    let refreshId = null;
    async function load(force) {
      try {
        setLoadError(null);
        const d = await window.DataLoader.load(force);
        setData(d);
        setLastSync(new Date());
      } catch(e) {
        setLoadError(e.message);
      } finally {
        setLoading(false);
      }
    }
    load(false);
    refreshId = window.DataLoader.startAutoRefresh(
      (d) => { setData(d); setLastSync(new Date()); setIsRefreshing(false); },
      ()  => setIsRefreshing(true)
    );
    return () => { if (refreshId) clearInterval(refreshId); };
  }, []);

  const [periode, setPeriode] = useState(null);
  const [seg, setSeg] = useState("all");
  const [search, setSearch] = useState("");

  // Set default periode when data loads
  useEffect(() => {
    if (data && !periode) {
      const cur = data.PERIODES.find(p => p.current) || data.PERIODES[data.PERIODES.length - 1];
      if (cur) setPeriode(cur.id);
    }
  }, [data]);

  // Apply theme attrs to root
  useEffect(() => {
    const root = document.documentElement;
    const acc = ACCENT_PRESETS[tweaks.accent] || ACCENT_PRESETS.teal;
    root.style.setProperty("--accent-h", acc.h);
    root.style.setProperty("--accent-c", acc.c);
    root.style.setProperty("--accent-l", acc.l);
    root.dataset.theme = tweaks.darkMode ? "dark" : "light";
    root.dataset.density = tweaks.density;
    root.dataset.card = tweaks.cardStyle;
  }, [tweaks]);

  // Filter responses
  const filtered = useMemo(() => {
    if (!data || !periode || !data.responses) return [];
    let r = data.responses.filter(x => x.periode === periode);
    if (seg === "ILL") r = r.filter(x => x.jenjang === "ILL");
    if (seg === "ILP") r = r.filter(x => x.jenjang === "ILP");
    if (seg === "pa") r = r.filter(x => x.gender === "pa");
    if (seg === "pi") r = r.filter(x => x.gender === "pi");
    if (search) r = r.filter(x => x.pengajar.toLowerCase().includes(search.toLowerCase()) || x.kelas.toLowerCase().includes(search.toLowerCase()));
    return r;
  }, [data, periode, seg, search]);

  // --- All hooks above; safe to early-return below ---
  if (loading) return (
    <div style={{ minHeight: "100vh", display: "grid", placeItems: "center", background: "var(--bg)" }}>
      <div style={{ textAlign: "center" }}>
        <div style={{ width: 52, height: 52, borderRadius: 14, background: "var(--accent)", color: "white", display: "grid", placeItems: "center", fontSize: 22, fontWeight: 700, margin: "0 auto 16px" }}>إل</div>
        <div style={{ fontWeight: 700, fontSize: 17, marginBottom: 6 }}>Memuat data…</div>
        <div style={{ color: "var(--fg-muted)", fontSize: 13 }}>Menghubungkan ke sumber data</div>
        <div style={{ marginTop: 18, width: 200, height: 4, background: "var(--border)", borderRadius: 999, overflow: "hidden", margin: "18px auto 0" }}>
          <div style={{ height: "100%", width: "60%", background: "var(--accent)", borderRadius: 999, animation: "loadbar 1.4s ease-in-out infinite" }}/>
        </div>
        <style>{`@keyframes loadbar{0%{transform:translateX(-100%)}100%{transform:translateX(280%)}}`}</style>
      </div>
    </div>
  );

  if (loadError && !data) return (
    <div style={{ minHeight: "100vh", display: "grid", placeItems: "center", background: "var(--bg)" }}>
      <div style={{ textAlign: "center", maxWidth: 400, padding: 24 }}>
        <div style={{ fontSize: 32, marginBottom: 12 }}>⚠️</div>
        <div style={{ fontWeight: 700, fontSize: 17, marginBottom: 8 }}>Gagal memuat data</div>
        <div style={{ color: "var(--fg-muted)", fontSize: 13, marginBottom: 16 }}>{loadError}</div>
        <button onClick={() => { setLoading(true); window.DataLoader.load(true).then(d=>{setData(d);setLastSync(new Date());}).catch(e=>setLoadError(e.message)).finally(()=>setLoading(false)); }}
          style={{ background: "var(--accent)", color: "white", border: "none", padding: "10px 20px", borderRadius: 10, fontWeight: 600, cursor: "pointer" }}>
          Coba Lagi
        </button>
      </div>
    </div>
  );

  if (!data || !periode) return null;

  const tabs = [
    { id: "overview", label: "Overview", icon: "home" },
    { id: "pengajar", label: "Per Pengajar", icon: "users", count: data.PENGAJAR.length },
    { id: "dimensi", label: "Dimensi", icon: "layers", count: data.DIMENSIONS.length },
    { id: "ai", label: "AI Insight & Saran", icon: "sparkles", featured: true },
    { id: "gender", label: "Per Gender", icon: "venus" },
    { id: "jenjang", label: "Per Jenjang", icon: "book" },
    { id: "pin", label: "Distribusi Raport", icon: "eye" },
  ];

  const navItems = [
    { id: "overview",  label: "Overview",          icon: "home",      tab: "overview" },
    { id: "responses", label: "Responses",          icon: "file_text", tab: "overview",  badge: filtered.length },
    { id: "pengajar",  label: "Per Pengajar",       icon: "users",     tab: "pengajar" },
    { id: "dimensi",   label: "Dimensi",            icon: "layers",    tab: "dimensi" },
    { id: "ai",        label: "AI Insight & Saran", icon: "sparkles",  tab: "ai" },
    { id: "gender",    label: "Per Gender",         icon: "venus",     tab: "gender" },
    { id: "jenjang",   label: "Per Jenjang",        icon: "book",      tab: "jenjang" },
    { id: "pin",       label: "Distribusi Raport",  icon: "eye",       tab: "pin" },
  ];

  const activePeriode = data.PERIODES.find(p => p.id === periode);

  return (
    <div className="app" data-layout={tweaks.layout}>
      {tweaks.layout === "sidebar" && (
        <aside className="sidebar">
          <div className="brand">
            <div className="brand-mark">إل</div>
            <div className="brand-text">
              <div className="title">I'dad Lughawi</div>
              <div className="sub">STDIIS · Evaluasi</div>
            </div>
          </div>
          <div className="nav-section-label">Menu</div>
          {navItems.map(n => (
            <button key={n.id} className={"nav-item " + (tab === n.tab ? "active" : "")} onClick={() => switchTab(n.tab)}>
              <Icon name={n.icon} size={17}/>
              <span>{n.label}</span>
              {n.badge != null && <span className="badge">{fmtInt(n.badge)}</span>}
            </button>
          ))}
          <div className="nav-section-label">Tools</div>
          <button className="nav-item" onClick={() => window.print()}><Icon name="download" size={17}/>Export / Print</button>
          <button className="nav-item" onClick={() => switchTab("pin")}><Icon name="settings" size={17}/>Distribusi PIN</button>
          <div className="spacer" style={{ flex: 1 }}/>
          <div style={{ padding: 12, background: data._error ? "oklch(0.97 0.03 25)" : "var(--surface-2)", border: data._error ? "1px solid oklch(0.88 0.07 25)" : "none", borderRadius: 12, fontSize: 11.5, marginTop: 14 }}>
            <div className="row" style={{ gap: 6, marginBottom: 4, fontWeight: 600 }}>
              <Icon name="sheet" size={12}/> {data._source === "live" ? "Connected" : data._error ? "⚠ Gagal fetch" : "Demo Mode"}
            </div>
            <div className="muted" style={{ fontSize: 11, lineHeight: 1.4 }}>
              {data._source === "live"
                ? "Google Sheet terhubung — auto-sync aktif."
                : data._error
                  ? <span style={{ color: "oklch(0.5 0.15 25)" }}>{data._error}</span>
                  : "Pakai mock data. Isi APPS_SCRIPT_URL di config.js untuk koneksi live."}
            </div>
            <div className="row" style={{ gap: 6, marginTop: 6, color: data._error ? "oklch(0.5 0.15 25)" : "oklch(0.4 0.13 150)", fontSize: 11 }}>
              <span className="live-dot" style={{ background: isRefreshing ? "oklch(0.65 0.14 75)" : data._error ? "oklch(0.6 0.17 25)" : undefined }}/>
              {isRefreshing
                ? "Memperbarui…"
                : data._source === "live"
                  ? `Sync ${lastSync ? lastSync.toLocaleTimeString("id-ID") : "…"}`
                  : data._error ? "Fallback ke mock" : "Mode Demo"}
            </div>
          </div>
        </aside>
      )}

      {tweaks.layout === "topnav" && (
        <header className="topnav-bar">
          <div className="row" style={{ gap: 10 }}>
            <div className="brand-mark" style={{ width: 32, height: 32, borderRadius: 8, background: "var(--accent)", color: "white", display: "grid", placeItems: "center", fontWeight: 700, fontSize: 12 }}>إل</div>
            <div>
              <div style={{ fontWeight: 700, fontSize: 14 }}>I'dad Lughawi STDIIS</div>
              <div style={{ fontSize: 11, color: "var(--fg-muted)" }}>Evaluation Dashboard</div>
            </div>
          </div>
          <div className="nav-items">
            {navItems.map(n => (
              <button key={n.id} className={"nav-item " + (tab === n.tab ? "active" : "")} onClick={() => switchTab(n.tab)}>
                <Icon name={n.icon} size={16}/>{n.label}
                {n.badge != null && <span className="badge">{fmtInt(n.badge)}</span>}
              </button>
            ))}
          </div>
          <div className="spacer"/>
          <TopRightActions switchTab={switchTab}/>
        </header>
      )}

      <main>
        {tweaks.layout === "sidebar" && (
          <div className="topbar">
            <button className="hamburger-btn" onClick={() => setMobileNavOpen(true)} title="Menu">
              <Icon name="filter" size={18}/>
            </button>
            <div className="breadcrumb">
              <span>Dashboard</span>
              <Icon name="chev_right" size={12}/>
              <span>Evaluasi Pengajar</span>
              <Icon name="chev_right" size={12}/>
              <span className="crumb-current">{activePeriode?.label}</span>
            </div>
            <div className="spacer"/>
            <div className="search-box">
              <Icon name="search" size={14}/>
              <input placeholder="Cari pengajar, kelas…" value={search} onChange={e=>setSearch(e.target.value)}/>
              <span className="kbd">⌘K</span>
            </div>
            <TopRightActions switchTab={switchTab}/>
          </div>
        )}

        <div className="content">
          {/* Banner */}
          <div className="banner">
            <div className="banner-actions">
              <button className="btn" onClick={() => window.print()}><Icon name="download" size={13}/>Export PDF</button>
              <button className="btn" onClick={() => { setIsRefreshing(true); window.DataLoader.load(true).then(d=>{setData(d);setLastSync(new Date());}).catch(e=>setLoadError(e.message)).finally(()=>setIsRefreshing(false)); }}>
                <Icon name="refresh" size={13}/>{isRefreshing ? "Menyinkron…" : "Sync"}
              </button>
            </div>
            <div>
              <div className="banner-eyebrow">
                <span className="live-dot"/> Live · Periode {activePeriode?.label}
              </div>
              <h1 className="banner-title">
                Dashboard Evaluasi <span className="accent">Pengajar I'dad Lughawi</span>
              </h1>
              <div className="banner-meta">
                <div className="pill"><Icon name="users" size={12}/> {data.PENGAJAR.length} pengajar aktif</div>
                <div className="pill"><Icon name="file_text" size={12}/> {fmtInt(filtered.length)} respons terkumpul</div>
                <div className="pill"><Icon name="layers" size={12}/> {data.DIMENSIONS.length} dimensi penilaian</div>
                <div className="pill"><Icon name="sheet" size={12}/> Auto-sync Google Sheet</div>
              </div>
            </div>
          </div>

          {/* Filter bar */}
          <div className="filter-bar">
            <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
              <label style={{ fontSize: 11, color: "var(--fg-muted)", fontWeight: 600, textTransform: "uppercase", letterSpacing: 0.5 }}>Periode</label>
              <select className="select" value={periode} onChange={e => setPeriode(e.target.value)}>
                {data.PERIODES.map(p => <option key={p.id} value={p.id}>{p.label}{p.current ? " (aktif)" : ""}</option>)}
              </select>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
              <label style={{ fontSize: 11, color: "var(--fg-muted)", fontWeight: 600, textTransform: "uppercase", letterSpacing: 0.5 }}>Segmen</label>
              <div className="segmented">
                <button className={seg === "all" ? "active" : ""} onClick={() => setSeg("all")}>Semua</button>
                <button className={seg === "ILL" ? "active" : ""} onClick={() => setSeg("ILL")}>ILL</button>
                <button className={seg === "ILP" ? "active" : ""} onClick={() => setSeg("ILP")}>ILP</button>
                <button className={seg === "pa" ? "active" : ""} onClick={() => setSeg("pa")}>Putra</button>
                <button className={seg === "pi" ? "active" : ""} onClick={() => setSeg("pi")}>Putri</button>
              </div>
            </div>
            <div className="spacer"/>
            <div style={{ fontSize: 12, color: "var(--fg-muted)" }}>
              Auto-detected dari kolom <code style={{ background: "var(--surface-2)", padding: "1px 5px", borderRadius: 4, fontFamily: "var(--font-mono)" }}>Skor*</code> · {data.DIMENSIONS.length} dimensi · {fmtInt(filtered.length)} respons
            </div>
          </div>

          {/* Tabs */}
          <div className="tabs">
            {tabs.map(t => (
              <button key={t.id} className={"tab " + (tab === t.id ? "active" : "")} onClick={() => switchTab(t.id)}>
                <Icon name={t.icon} size={15}/>
                {t.label}
                {t.featured && <span style={{ background: "var(--accent)", color: "white", fontSize: 9, padding: "1px 5px", borderRadius: 999, fontWeight: 700, letterSpacing: 0.4 }}>AI</span>}
                {t.count != null && <span className="count">{t.count}</span>}
              </button>
            ))}
          </div>

          {/* Tab content — lazy mount: hanya render saat pertama dikunjungi, lalu hidden saat tidak aktif */}
          {[
            { id: "overview",  el: <OverviewTab data={data} filtered={filtered}/> },
            { id: "pengajar",  el: <PerPengajarTab data={data} filtered={filtered}/> },
            { id: "dimensi",   el: <DimensiTab data={data} filtered={filtered}/> },
            { id: "ai",        el: <AIInsightTab data={data} filtered={filtered}/> },
            { id: "gender",    el: <PerGenderTab data={data} filtered={filtered}/> },
            { id: "jenjang",   el: <PerJenjangTab data={data} filtered={filtered}/> },
            { id: "pin",       el: <PINTab data={data}/> },
          ].map(({ id, el }) =>
            mountedTabs.has(id) ? (
              <div key={id} style={{ display: tab === id ? "contents" : "none" }}>
                <ErrorBoundary key={id}>{el}</ErrorBoundary>
              </div>
            ) : null
          )}
        </div>
      </main>

      {/* Mobile nav drawer */}
      {mobileNavOpen && (
        <>
          <div className="mobile-backdrop" onClick={() => setMobileNavOpen(false)}/>
          <nav className="mobile-drawer">
            <div className="mobile-drawer-header">
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <div style={{ width: 32, height: 32, borderRadius: 9, background: "var(--accent)", color: "white", display: "grid", placeItems: "center", fontWeight: 700, fontSize: 13 }}>إل</div>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 14 }}>I'dad Lughawi</div>
                  <div style={{ fontSize: 11, color: "var(--fg-muted)" }}>STDIIS · Evaluasi</div>
                </div>
              </div>
              <button className="mobile-drawer-close" onClick={() => setMobileNavOpen(false)}>
                <Icon name="x" size={16}/>
              </button>
            </div>
            {navItems.map(n => (
              <button key={n.id} className={"mobile-nav-item " + (tab === n.tab ? "active" : "")}
                onClick={() => { switchTab(n.tab); setMobileNavOpen(false); }}>
                <Icon name={n.icon} size={18}/>
                <span style={{ flex: 1 }}>{n.label}</span>
                {n.badge != null && <span className="badge">{fmtInt(n.badge)}</span>}
              </button>
            ))}
            <div style={{ padding: "14px 20px", marginTop: "auto", borderTop: "1px solid var(--border)", fontSize: 12, color: "var(--fg-muted)" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 6, fontWeight: 600 }}>
                <span className="live-dot" style={{ background: data._error ? "oklch(0.6 0.17 25)" : undefined }}/>
                {data._source === "live" ? "Data Live" : data._error ? "⚠ Gagal fetch" : "Mode Demo"}
              </div>
              {lastSync && <div style={{ marginTop: 3 }}>Sync {lastSync.toLocaleTimeString("id-ID")}</div>}
            </div>
          </nav>
        </>
      )}

      <TweaksPanel title="Tweaks">
        <TweakSection title="Tampilan">
          <TweakRadio label="Density" value={tweaks.density} onChange={v => setTweak("density", v)} options={[{value:"comfortable",label:"Comfortable"},{value:"compact",label:"Compact"}]}/>
          <TweakRadio label="Layout" value={tweaks.layout} onChange={v => setTweak("layout", v)} options={[{value:"sidebar",label:"Sidebar"},{value:"topnav",label:"Top Nav"}]}/>
          <TweakSelect label="Card Style" value={tweaks.cardStyle} onChange={v => setTweak("cardStyle", v)} options={[{value:"flat",label:"Flat"},{value:"bordered",label:"Bordered"},{value:"elevated",label:"Elevated"}]}/>
          <TweakToggle label="Dark Mode" value={tweaks.darkMode} onChange={v => setTweak("darkMode", v)}/>
        </TweakSection>
        <TweakSection title="Aksen Warna">
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 8 }}>
            {Object.entries(ACCENT_PRESETS).map(([k, v]) => (
              <button key={k} onClick={() => setTweak("accent", k)} style={{
                padding: "10px 8px", borderRadius: 10, border: tweaks.accent === k ? "2px solid oklch(" + v.l + " " + v.c + " " + v.h + ")" : "1px solid var(--border)",
                background: "var(--surface)", display: "flex", flexDirection: "column", gap: 6, alignItems: "center", cursor: "pointer", fontSize: 11.5, color: "var(--fg)"
              }}>
                <div style={{ width: 24, height: 24, borderRadius: 999, background: `oklch(${v.l} ${v.c} ${v.h})` }}/>
                {v.label}
              </button>
            ))}
          </div>
        </TweakSection>
      </TweaksPanel>
    </div>
  );
}

function TopRightActions({ switchTab }) {
  return (
    <div className="row" style={{ gap: 10 }}>
      <button
        className="icon-btn"
        title="Lihat respons terbaru"
        onClick={() => switchTab("overview")}
      >
        <Icon name="bell" size={16}/>
        <span className="dot"/>
      </button>
      <button
        className="icon-btn"
        title="Buka panel Tweaks (tampilan)"
        onClick={() => window.postMessage({ type: "__activate_edit_mode" }, "*")}
      >
        <Icon name="settings" size={16}/>
      </button>
      <div
        className="user-chip"
        style={{ cursor: "pointer" }}
        title="Distribusi Raport & PIN"
        onClick={() => switchTab("pin")}
      >
        <div className="av">{((window.DASHBOARD_CONFIG||{}).ADMIN_NAME||"Admin").split(" ").map(s=>s[0]).slice(0,2).join("")}</div>
        <div>
          <div className="name">{(window.DASHBOARD_CONFIG||{}).ADMIN_NAME||"Admin"}</div>
          <div className="role">Koordinator Divisi</div>
        </div>
      </div>
    </div>
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(<App/>);
