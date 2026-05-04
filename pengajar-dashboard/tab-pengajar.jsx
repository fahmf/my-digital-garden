// Per Pengajar tab - hybrid list + detail panel
const PerPengajarTab = ({ data, filtered }) => {
  const { DIMENSIONS, PENGAJAR, PERIODES, responses } = data;
  const byPengajar = React.useMemo(() => {
    return aggByPengajarLocal(filtered, PENGAJAR, DIMENSIONS).filter(p => p.count > 0);
  }, [filtered]);

  const [selected, setSelected] = React.useState(null);
  const [search, setSearch] = React.useState("");
  const [sortBy, setSortBy] = React.useState("avg-desc");
  const [genderF, setGenderF] = React.useState("all");
  const [selectedMatkul, setSelectedMatkul] = React.useState(null);
  const [expandedDims, setExpandedDims] = React.useState(new Set());

  const toggleDim = (key) => setExpandedDims(prev => {
    const s = new Set(prev);
    s.has(key) ? s.delete(key) : s.add(key);
    return s;
  });

  React.useEffect(() => {
    if (!selected && byPengajar[0]) setSelected(byPengajar[0].name);
  }, [byPengajar, selected]);

  // Reset filters when teacher changes
  React.useEffect(() => { setSelectedMatkul(null); setExpandedDims(new Set()); }, [selected]);

  const list = React.useMemo(() => {
    let l = [...byPengajar];
    if (search) l = l.filter(p => p.name.toLowerCase().includes(search.toLowerCase()));
    if (genderF !== "all") l = l.filter(p => p.gender === genderF);
    if (sortBy === "avg-desc") l.sort((a,b) => b.avg - a.avg);
    if (sortBy === "avg-asc") l.sort((a,b) => a.avg - b.avg);
    if (sortBy === "name") l.sort((a,b) => a.name.localeCompare(b.name));
    if (sortBy === "count") l.sort((a,b) => b.count - a.count);
    return l;
  }, [byPengajar, search, sortBy, genderF]);

  const [compareMode, setCompareMode] = React.useState(false);

  const sel = list.find(p => p.name === selected) || byPengajar.find(p => p.name === selected);
  const selResponses = sel ? filtered.filter(r => r.pengajar === sel.name) : [];

  // Skor periode sebelumnya untuk mode perbandingan radar
  const prevPeriodDimAvgs = React.useMemo(() => {
    if (!sel || !compareMode) return null;
    const curIdx = PERIODES.findIndex(p => p.current);
    if (curIdx <= 0) return null;
    const prevId = PERIODES[curIdx - 1].id;
    const prevRs = responses.filter(r => r.pengajar === sel.name && r.periode === prevId);
    if (!prevRs.length) return null;
    const avgs = {};
    DIMENSIONS.forEach(d => {
      avgs[d.key] = prevRs.reduce((s, r) => s + r.scores[d.col], 0) / prevRs.length;
    });
    return avgs;
  }, [sel, compareMode, PERIODES, DIMENSIONS, responses]);

  // Trend across periods for selected pengajar
  const trend = sel ? PERIODES.map(per => {
    const rs = responses.filter(r => r.pengajar === sel.name && r.periode === per.id);
    return { label: per.label, value: rs.length ? rs.reduce((s,r)=>s+r.avg,0)/rs.length : null };
  }).filter(t => t.value != null) : [];

  // Breakdown by matkul, then by kelas within each matkul
  const matkulBreakdown = React.useMemo(() => {
    if (!selResponses.length) return [];
    const map = {};
    selResponses.forEach(r => {
      const m = r.matkul || "(Tanpa Matkul)";
      if (!map[m]) map[m] = [];
      map[m].push(r);
    });
    return Object.entries(map).map(([matkul, rs]) => {
      const avg = rs.reduce((s, r) => s + r.avg, 0) / rs.length;
      const dimAvgs = {};
      DIMENSIONS.forEach(d => {
        dimAvgs[d.key] = rs.reduce((s, r) => s + (r.scores[d.col] || 0), 0) / rs.length;
      });
      // Per-kelas breakdown within this matkul
      const kelasMap = {};
      rs.forEach(r => {
        const k = r.kelas || "(Tanpa Kelas)";
        if (!kelasMap[k]) kelasMap[k] = [];
        kelasMap[k].push(r);
      });
      const byKelas = Object.entries(kelasMap).map(([kelas, krs]) => {
        const kAvg = krs.reduce((s, r) => s + r.avg, 0) / krs.length;
        const kDimAvgs = {};
        DIMENSIONS.forEach(d => {
          kDimAvgs[d.key] = krs.reduce((s, r) => s + (r.scores[d.col] || 0), 0) / krs.length;
        });
        return { kelas, count: krs.length, avg: kAvg, dimAvgs: kDimAvgs };
      }).sort((a, b) => b.avg - a.avg);
      return { matkul, count: rs.length, avg, dimAvgs, byKelas };
    }).sort((a, b) => b.avg - a.avg);
  }, [selResponses, DIMENSIONS]);

  // Kelas rows to display (filtered by selectedMatkul, or all kelas if null)
  const displayedKelas = React.useMemo(() => {
    if (selectedMatkul !== null) {
      const found = matkulBreakdown.find(m => m.matkul === selectedMatkul);
      return found ? found.byKelas : [];
    }
    // All kelas, merged across matkul
    const map = {};
    selResponses.forEach(r => {
      const k = r.kelas || "(Tanpa Kelas)";
      if (!map[k]) map[k] = [];
      map[k].push(r);
    });
    return Object.entries(map).map(([kelas, rs]) => {
      const avg = rs.reduce((s, r) => s + r.avg, 0) / rs.length;
      const dimAvgs = {};
      DIMENSIONS.forEach(d => {
        dimAvgs[d.key] = rs.reduce((s, r) => s + (r.scores[d.col] || 0), 0) / rs.length;
      });
      return { kelas, count: rs.length, avg, dimAvgs };
    }).sort((a, b) => b.avg - a.avg);
  }, [selectedMatkul, matkulBreakdown, selResponses, DIMENSIONS]);

  return (
    <div className="pengajar-layout">
      <div className="pengajar-list">
        <div className="pengajar-list-head" style={{ flexDirection: "column", alignItems: "stretch", gap: 10 }}>
          <div className="row" style={{ width: "100%" }}>
            <div className="search-box" style={{ width: "100%" }}>
              <Icon name="search" size={14}/>
              <input placeholder="Cari pengajar…" value={search} onChange={e => setSearch(e.target.value)}/>
            </div>
          </div>
          <div className="row" style={{ gap: 8, fontSize: 12 }}>
            <div className="segmented">
              <button className={genderF === "all" ? "active" : ""} onClick={() => setGenderF("all")}>Semua</button>
              <button className={genderF === "L" ? "active" : ""} onClick={() => setGenderF("L")}>Putra</button>
              <button className={genderF === "P" ? "active" : ""} onClick={() => setGenderF("P")}>Putri</button>
            </div>
            <div className="spacer"/>
            <select className="select" value={sortBy} onChange={e => setSortBy(e.target.value)} style={{ minWidth: 0, padding: "4px 8px" }}>
              <option value="avg-desc">Skor ↓</option>
              <option value="avg-asc">Skor ↑</option>
              <option value="name">Nama A–Z</option>
              <option value="count">Respons ↓</option>
            </select>
          </div>
        </div>
        <div className="pengajar-list-body">
          {list.map(p => (
            <div key={p.name} className={"pengajar-row " + (selected === p.name ? "active" : "")} onClick={() => setSelected(p.name)}>
              <Avatar name={p.name} initials={p.initials} size="md"/>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div className="name" style={{ whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{p.name}</div>
                <div className="meta">{p.gender === "L" ? "Putra" : "Putri"} · {p.count} respons</div>
              </div>
              <span className={"score-pill " + scoreClass(p.avg)}>{fmtScore(p.avg)}</span>
            </div>
          ))}
          {list.length === 0 && <div style={{ padding: 24, textAlign: "center", color: "var(--fg-muted)" }}>Tidak ada pengajar yang cocok.</div>}
        </div>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        {sel ? (
          <>
            <div className="card">
              <div className="pengajar-profile-row" style={{ display: "flex", gap: 18, alignItems: "flex-start" }}>
                <Avatar name={sel.name} initials={sel.initials} size="xl"/>
                <div style={{ flex: 1 }}>
                  <div style={{ fontFamily: "var(--font-display)", fontSize: 22, fontWeight: 700, letterSpacing: "-0.015em" }}>{sel.name}</div>
                  <div style={{ fontSize: 13, color: "var(--fg-muted)", marginTop: 4 }}>
                    {sel.gender === "L" ? "Pengajar Putra" : "Pengajar Putri"} · {sel.count} respons periode aktif
                  </div>
                  <div style={{ display: "flex", gap: 8, marginTop: 10, flexWrap: "wrap" }}>
                    {Array.from(new Set(selResponses.map(r => r.kelas))).map(k => (
                      <span key={k} className="chip">{k}</span>
                    ))}
                  </div>
                </div>
                <div className="progress-ring-wrap" style={{ textAlign: "center" }}>
                  <ProgressRing value={sel.avg} size={120} stroke={10}/>
                  <div style={{ fontSize: 11, color: "var(--fg-muted)", marginTop: 4 }}>Avg Skor</div>
                </div>
              </div>
            </div>

            <div className="grid-2-eq">
              <div className="card">
                <div className="card-head">
                  <div>
                    <div className="card-title">Skor per Dimensi</div>
                    <div className="card-sub">Profil {DIMENSIONS.length} dimensi penilaian</div>
                  </div>
                  {PERIODES.findIndex(p => p.current) > 0 && (
                    <button onClick={() => setCompareMode(c => !c)} style={{
                      background: compareMode ? "var(--accent)" : "var(--surface-2)",
                      color: compareMode ? "white" : "var(--fg)",
                      border: "1px solid " + (compareMode ? "var(--accent)" : "var(--border)"),
                      borderRadius: 8, padding: "5px 11px", fontSize: 12, fontWeight: 600, cursor: "pointer",
                    }}>
                      {compareMode ? "✓ Bandingkan" : "Bandingkan periode"}
                    </button>
                  )}
                </div>
                <div style={{ display: "grid", placeItems: "center" }}>
                  <RadarChart
                    values={DIMENSIONS.map(d => sel.dimAvgs[d.key])}
                    labels={DIMENSIONS.map(d => d.short)}
                    size={300}
                    compare={compareMode && prevPeriodDimAvgs ? DIMENSIONS.map(d => prevPeriodDimAvgs[d.key]) : null}
                  />
                </div>
                {compareMode && (
                  <div style={{ display: "flex", gap: 14, fontSize: 11.5, color: "var(--fg-muted)", justifyContent: "center", marginTop: 6 }}>
                    <div className="row" style={{ gap: 6 }}><span style={{ width: 10, height: 10, background: "var(--accent)", borderRadius: 2 }}/>Periode aktif</div>
                    {prevPeriodDimAvgs
                      ? <div className="row" style={{ gap: 6 }}><span style={{ width: 10, height: 10, background: "var(--fg-subtle)", borderRadius: 2 }}/>{PERIODES[PERIODES.findIndex(p=>p.current)-1]?.label}</div>
                      : <div style={{ color: "oklch(0.65 0.13 75)" }}>Tidak ada data periode sebelumnya untuk pengajar ini</div>
                    }
                  </div>
                )}
              </div>

              <div className="card">
                <div className="card-head">
                  <div>
                    <div className="card-title">Detail Skor</div>
                    <div className="card-sub">Klik dimensi untuk lihat harapan mahasiswa</div>
                  </div>
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                  {DIMENSIONS.map(d => {
                    const v = sel.dimAvgs[d.key];
                    const allAvg = filtered.reduce((s,r) => s + r.scores[d.col], 0) / Math.max(1, filtered.length);
                    const diff = v - allAvg;
                    const quotes = selResponses
                      .filter(r => r.dimTexts && r.dimTexts[d.key])
                      .map(r => ({ text: r.dimTexts[d.key], kelas: r.kelas, matkul: r.matkul }));
                    const isOpen = expandedDims.has(d.key);
                    return (
                      <div key={d.key} style={{ marginBottom: 6 }}>
                        <div style={{ display: "grid", gridTemplateColumns: "1fr 80px 50px", gap: 10, alignItems: "center", cursor: quotes.length ? "pointer" : "default" }}
                          onClick={() => quotes.length && toggleDim(d.key)}>
                          <div>
                            <div style={{ fontSize: 13, fontWeight: 500, display: "flex", alignItems: "center", gap: 6 }}>
                              {d.label}
                              {quotes.length > 0 && (
                                <span style={{
                                  fontSize: 10, fontWeight: 600, padding: "1px 6px", borderRadius: 999,
                                  background: isOpen ? "var(--accent-soft)" : "var(--surface-2)",
                                  color: isOpen ? "var(--accent-strong)" : "var(--fg-subtle)",
                                  border: "1px solid var(--border)",
                                }}>
                                  {quotes.length} {isOpen ? "▲" : "▼"}
                                </span>
                              )}
                            </div>
                            <div className="bar-bg" style={{ height: 6, marginTop: 4, background: "var(--surface-2)", borderRadius: 999 }}>
                              <div style={{ height: "100%", width: v + "%", background: scoreColor(v), borderRadius: 999, transition: "width 0.5s" }}/>
                            </div>
                          </div>
                          <span className={"score-pill " + scoreClass(v)} style={{ textAlign: "center" }}>{fmtScore(v)}</span>
                          <span style={{ fontSize: 11, color: diff >= 0 ? "oklch(0.45 0.13 150)" : "oklch(0.55 0.16 25)", fontFamily: "var(--font-mono)", textAlign: "right" }}>
                            {diff >= 0 ? "+" : ""}{diff.toFixed(1)}
                          </span>
                        </div>
                        {isOpen && quotes.length > 0 && (
                          <div style={{
                            margin: "6px 0 4px 0", padding: "10px 12px",
                            background: "var(--accent-softer)", borderRadius: 10,
                            borderLeft: "3px solid var(--accent)",
                            maxHeight: 220, overflowY: "auto",
                          }}>
                            <div style={{ fontSize: 10, fontWeight: 700, color: "var(--accent)", marginBottom: 7, textTransform: "uppercase", letterSpacing: 0.5 }}>
                              Harapan Mahasiswa · {d.label}
                            </div>
                            {quotes.slice(0, 15).map((q, i) => (
                              <div key={i} style={{ fontSize: 12.5, lineHeight: 1.55, marginBottom: 7, paddingBottom: 7, borderBottom: i < quotes.length - 1 ? "1px solid var(--border)" : "none" }}>
                                <span className="muted" style={{ fontSize: 11 }}>{q.kelas}{q.matkul ? " · " + q.matkul : ""}</span><br/>
                                <span style={{ color: "var(--fg)", fontStyle: "italic" }}>"{q.text}"</span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {trend.length > 1 && (
              <div className="card">
                <div className="card-head">
                  <div>
                    <div className="card-title">Tren Antar-Periode</div>
                    <div className="card-sub">Perkembangan skor pengajar ini</div>
                  </div>
                </div>
                <LineChart series={[{ color: "var(--accent)", fill: true, points: trend }]} height={200} width={680} yMin={60} yMax={100}/>
              </div>
            )}

            {/* ── Breakdown per Mata Pelajaran & Kelas ── */}
            {matkulBreakdown.length > 0 && (
              <div className="card">
                <div className="card-head" style={{ marginBottom: 14 }}>
                  <div>
                    <div className="card-title">Per Mata Pelajaran & Kelas</div>
                    <div className="card-sub">
                      {selectedMatkul
                        ? `Menampilkan kelas untuk: ${selectedMatkul}`
                        : "Pilih mata pelajaran untuk detail per kelas"}
                    </div>
                  </div>
                </div>

                {/* Matkul selector pills */}
                {matkulBreakdown.length > 1 && (
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 16 }}>
                    <button
                      onClick={() => setSelectedMatkul(null)}
                      style={{
                        padding: "5px 12px", borderRadius: 8, fontSize: 12, fontWeight: 600,
                        cursor: "pointer", border: "1.5px solid",
                        borderColor: selectedMatkul === null ? "var(--accent)" : "var(--border)",
                        background: selectedMatkul === null ? "var(--accent-soft)" : "var(--surface)",
                        color: selectedMatkul === null ? "var(--accent-strong)" : "var(--fg-muted)",
                      }}
                    >
                      Semua Kelas
                    </button>
                    {matkulBreakdown.map(m => (
                      <button
                        key={m.matkul}
                        onClick={() => setSelectedMatkul(selectedMatkul === m.matkul ? null : m.matkul)}
                        style={{
                          padding: "5px 10px", borderRadius: 8, fontSize: 12, fontWeight: 500,
                          cursor: "pointer", border: "1.5px solid",
                          display: "flex", alignItems: "center", gap: 7,
                          borderColor: selectedMatkul === m.matkul ? "var(--accent)" : "var(--border)",
                          background: selectedMatkul === m.matkul ? "var(--accent-soft)" : "var(--surface)",
                          color: selectedMatkul === m.matkul ? "var(--accent-strong)" : "var(--fg)",
                        }}
                      >
                        <span>{m.matkul}</span>
                        <span className={"score-pill " + scoreClass(m.avg)} style={{ fontSize: 11, padding: "1px 7px" }}>{fmtScore(m.avg)}</span>
                        <span style={{ color: "var(--fg-subtle)", fontSize: 11 }}>{m.count}×</span>
                      </button>
                    ))}
                  </div>
                )}

                {/* Kelas cards */}
                <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                  {displayedKelas.map(k => {
                    const dimsOrdered = [...DIMENSIONS].sort((a, b) => (k.dimAvgs[b.key] || 0) - (k.dimAvgs[a.key] || 0));
                    const strongest = dimsOrdered[0];
                    const weakest = dimsOrdered[dimsOrdered.length - 1];
                    return (
                      <div key={k.kelas} style={{
                        border: "1px solid var(--border)", borderRadius: 12,
                        padding: "14px 16px", background: "var(--surface-2)",
                      }}>
                        {/* Kelas header */}
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 }}>
                          <div>
                            <div style={{ fontWeight: 700, fontSize: 14 }}>{k.kelas}</div>
                            <div style={{ fontSize: 12, color: "var(--fg-muted)", marginTop: 2 }}>
                              {k.count} responden
                              {strongest && (
                                <span> · <span style={{ color: "oklch(0.4 0.13 150)" }}>Kuat: {strongest.label}</span></span>
                              )}
                              {weakest && weakest.key !== strongest?.key && (
                                <span> · <span style={{ color: "oklch(0.52 0.15 50)" }}>Fokus: {weakest.label}</span></span>
                              )}
                            </div>
                          </div>
                          <span className={"score-pill " + scoreClass(k.avg)} style={{ fontSize: 15, padding: "4px 13px", fontWeight: 700 }}>
                            {fmtScore(k.avg)}
                          </span>
                        </div>
                        {/* Dimension mini-bars */}
                        <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
                          {DIMENSIONS.map(d => {
                            const v = k.dimAvgs[d.key] || 0;
                            const globalAvg = filtered.reduce((s, r) => s + (r.scores[d.col] || 0), 0) / Math.max(1, filtered.length);
                            const diff = v - globalAvg;
                            return (
                              <div key={d.key} className="kelas-dim-row" style={{ display: "grid", gridTemplateColumns: "130px 1fr 44px 36px", gap: 8, alignItems: "center" }}>
                                <div style={{ fontSize: 12, color: "var(--fg-muted)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                                  {d.label}
                                </div>
                                <div style={{ height: 6, background: "var(--border)", borderRadius: 999 }}>
                                  <div style={{ height: "100%", width: v + "%", background: scoreColor(v), borderRadius: 999, transition: "width 0.5s" }}/>
                                </div>
                                <span style={{ fontSize: 11, fontFamily: "var(--font-mono)", textAlign: "right", color: "var(--fg-muted)" }}>
                                  {v.toFixed(1)}
                                </span>
                                <span style={{ fontSize: 10, fontFamily: "var(--font-mono)", textAlign: "right", color: diff >= 0 ? "oklch(0.45 0.13 150)" : "oklch(0.55 0.16 25)" }}>
                                  {diff >= 0 ? "+" : ""}{diff.toFixed(1)}
                                </span>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                  {displayedKelas.length === 0 && (
                    <div style={{ textAlign: "center", padding: 24, color: "var(--fg-muted)", fontSize: 13 }}>
                      Tidak ada data kelas untuk mata pelajaran ini.
                    </div>
                  )}
                </div>
              </div>
            )}

            <div className="card" style={{ background: "var(--accent-softer)", border: "1.5px solid oklch(0.88 0.06 165)" }}>
              <div className="row" style={{ gap: 12 }}>
                <div style={{ flex: 1 }}>
                  <div className="card-title" style={{ fontSize: 13 }}>Raport Personal Pengajar</div>
                  <div style={{ fontSize: 12, color: "var(--fg-muted)", marginTop: 2 }}>
                    Pengajar ini bisa login di halaman Raport dengan PIN mereka dan hanya melihat data evaluasi miliknya.
                  </div>
                </div>
                <a href="Raport.html" target="_blank" style={{
                  background: "var(--accent)", color: "white", border: "none", padding: "9px 16px",
                  borderRadius: 10, fontWeight: 600, fontSize: 13, textDecoration: "none",
                  display: "inline-flex", gap: 6, alignItems: "center", whiteSpace: "nowrap"
                }}>
                  <Icon name="eye" size={14}/> Buka Halaman Raport
                </a>
              </div>
            </div>

            <div className="card">
              <div className="card-head">
                <div>
                  <div className="card-title">Saran & Komentar Mahasiswa</div>
                  <div className="card-sub">{selResponses.filter(r => r.saran || r.positive).length} dari {selResponses.length} respons memberikan tulisan</div>
                </div>
              </div>
              <div className="saran-grid" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
                <div>
                  <div style={{ fontSize: 12, fontWeight: 600, color: "oklch(0.4 0.13 150)", marginBottom: 8, textTransform: "uppercase", letterSpacing: 0.5 }}>
                    <Icon name="check" size={12}/> Hal Terbaik
                  </div>
                  <div style={{ maxHeight: 320, overflowY: "auto" }}>
                    {selResponses.filter(r => r.positive).slice(0, 10).map((r, i) => (
                      <div key={i} className="saran-card">
                        <div className="head"><span className="chip">{r.kelas}</span> <span>{r.matkul}</span></div>
                        <div className="body">"{r.positive}"</div>
                      </div>
                    ))}
                    {selResponses.filter(r => r.positive).length === 0 && <div className="muted" style={{ fontSize: 12, padding: 8 }}>Belum ada komentar positif tertulis.</div>}
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: 12, fontWeight: 600, color: "oklch(0.5 0.14 75)", marginBottom: 8, textTransform: "uppercase", letterSpacing: 0.5 }}>
                    <Icon name="info" size={12}/> Saran
                  </div>
                  <div style={{ maxHeight: 320, overflowY: "auto" }}>
                    {selResponses.filter(r => r.saran).slice(0, 10).map((r, i) => (
                      <div key={i} className="saran-card">
                        <div className="head"><span className="chip">{r.kelas}</span> <span>{r.matkul}</span></div>
                        <div className="body">"{r.saran}"</div>
                      </div>
                    ))}
                    {selResponses.filter(r => r.saran).length === 0 && <div className="muted" style={{ fontSize: 12, padding: 8 }}>Belum ada saran tertulis.</div>}
                  </div>
                </div>
              </div>
            </div>
          </>
        ) : (
          <div className="card" style={{ textAlign: "center", padding: 60, color: "var(--fg-muted)" }}>Pilih pengajar dari daftar.</div>
        )}
      </div>
    </div>
  );
};

function aggByPengajarLocal(responses, pengajar, dimensions) {
  return pengajar.map(p => {
    const rs = responses.filter(r => r.pengajar === p.name);
    if (!rs.length) return { ...p, count: 0, avg: 0, dimAvgs: {} };
    const dimAvgs = {};
    dimensions.forEach(d => {
      dimAvgs[d.key] = rs.reduce((s, r) => s + r.scores[d.col], 0) / rs.length;
    });
    const avg = rs.reduce((s,r) => s + r.avg, 0) / rs.length;
    return { ...p, count: rs.length, avg, dimAvgs };
  });
}

window.PerPengajarTab = PerPengajarTab;
