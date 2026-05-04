// Dimensi tab + Per Gender + Per Jenjang + AI Insight tabs

const DimensiTab = ({ data, filtered }) => {
  const { DIMENSIONS, PENGAJAR } = data;
  const agg = React.useMemo(() => {
    const dims = {};
    DIMENSIONS.forEach(d => dims[d.key] = []);
    filtered.forEach(r => DIMENSIONS.forEach(d => dims[d.key].push(r.scores[d.col])));
    const dimAvgs = {};
    DIMENSIONS.forEach(d => dimAvgs[d.key] = dims[d.key].length ? dims[d.key].reduce((s,v)=>s+v,0)/dims[d.key].length : 0);
    return { dims, dimAvgs };
  }, [filtered, DIMENSIONS]);

  const dimSorted = [...DIMENSIONS].sort((a,b) => agg.dimAvgs[b.key] - agg.dimAvgs[a.key]);
  const strongest = dimSorted[0];
  const weakest = dimSorted[dimSorted.length - 1];

  // Per dimensi: top 3 + bottom 3 pengajar
  const perDimRanking = (dim) => {
    const list = PENGAJAR.map(p => {
      const rs = filtered.filter(r => r.pengajar === p.name);
      if (!rs.length) return null;
      const v = rs.reduce((s,r) => s + r.scores[dim.col], 0) / rs.length;
      return { ...p, val: v, count: rs.length };
    }).filter(Boolean).sort((a,b) => b.val - a.val);
    return list;
  };

  const [activeDim, setActiveDim] = React.useState(DIMENSIONS[0].key);
  const dim = DIMENSIONS.find(d => d.key === activeDim);
  const ranking = perDimRanking(dim);

  return (
    <div>
      <div className="kpi-grid" style={{ gridTemplateColumns: "repeat(3, 1fr)" }}>
        <div className="kpi" style={{ background: "linear-gradient(135deg, oklch(0.97 0.04 150), var(--surface))" }}>
          <div className="kpi-label"><div className="kpi-icon" style={{ background: "oklch(0.93 0.07 150)", color: "oklch(0.4 0.13 150)" }}><Icon name="star" size={14}/></div>Dimensi Terkuat</div>
          <div style={{ fontSize: 18, fontWeight: 700, marginTop: 8, fontFamily: "var(--font-display)" }}>{strongest.label}</div>
          <div className="row" style={{ marginTop: 6 }}>
            <span className={"score-pill " + scoreClass(agg.dimAvgs[strongest.key])}>{fmtScore(agg.dimAvgs[strongest.key])}</span>
            <span className="muted" style={{ fontSize: 12 }}>dari 100</span>
          </div>
        </div>
        <div className="kpi" style={{ background: "linear-gradient(135deg, oklch(0.97 0.04 75), var(--surface))" }}>
          <div className="kpi-label"><div className="kpi-icon" style={{ background: "oklch(0.93 0.08 75)", color: "oklch(0.45 0.14 75)" }}><Icon name="warning" size={14}/></div>Dimensi Terlemah</div>
          <div style={{ fontSize: 18, fontWeight: 700, marginTop: 8, fontFamily: "var(--font-display)" }}>{weakest.label}</div>
          <div className="row" style={{ marginTop: 6 }}>
            <span className={"score-pill " + scoreClass(agg.dimAvgs[weakest.key])}>{fmtScore(agg.dimAvgs[weakest.key])}</span>
            <span className="muted" style={{ fontSize: 12 }}>perlu fokus pelatihan</span>
          </div>
        </div>
        <div className="kpi">
          <div className="kpi-label"><div className="kpi-icon"><Icon name="layers" size={14}/></div>Selisih Range</div>
          <div className="kpi-value">{(agg.dimAvgs[strongest.key] - agg.dimAvgs[weakest.key]).toFixed(1)}<span className="unit">pt</span></div>
          <div className="kpi-foot">Spread antar dimensi</div>
        </div>
      </div>

      <div className="card" style={{ marginBottom: 14 }}>
        <div className="card-head">
          <div>
            <div className="card-title">Skor Rata-Rata 7 Dimensi (Divisi)</div>
            <div className="card-sub">Urutkan untuk identifikasi area pelatihan</div>
          </div>
        </div>
        <div style={{ overflowX: "auto", WebkitOverflowScrolling: "touch" }}>
          <div style={{ minWidth: 380 }}>
            <BarChart
              data={dimSorted.map(d => ({ label: d.short, value: agg.dimAvgs[d.key] }))}
              height={240}
              format={v => v.toFixed(1)}
            />
          </div>
        </div>
      </div>

      <div className="card">
        <div className="card-head">
          <div>
            <div className="card-title">Drill-down per Dimensi</div>
            <div className="card-sub">Pilih dimensi untuk lihat ranking pengajar</div>
          </div>
        </div>
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 16 }}>
          {DIMENSIONS.map(d => (
            <button key={d.key} className={"chip" + (activeDim === d.key ? " accent" : "")} style={{ cursor: "pointer", border: "none" }} onClick={() => setActiveDim(d.key)}>
              {d.label} <span style={{ opacity: 0.7, marginLeft: 4, fontFamily: "var(--font-mono)" }}>{agg.dimAvgs[d.key].toFixed(1)}</span>
            </button>
          ))}
        </div>
        <div className="dim-drilldown" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
          <div>
            <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 10, color: "oklch(0.4 0.13 150)", textTransform: "uppercase", letterSpacing: 0.5 }}>Top 5 — {dim.label}</div>
            {ranking.slice(0, 5).map((p, i) => <RankRow key={p.name} idx={i+1} p={p} kind="top"/>)}
          </div>
          <div>
            <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 10, color: "oklch(0.5 0.16 25)", textTransform: "uppercase", letterSpacing: 0.5 }}>Bottom 5 — {dim.label}</div>
            {ranking.slice(-5).reverse().map((p, i) => <RankRow key={p.name} idx={i+1} p={p} kind="bottom"/>)}
          </div>
        </div>
      </div>
    </div>
  );
};

const RankRow = ({ idx, p, kind }) => (
  <div style={{ display: "flex", gap: 10, alignItems: "center", padding: "8px 0", borderBottom: "1px solid var(--border)" }}>
    <div style={{ width: 22, height: 22, borderRadius: 6, fontSize: 11, fontWeight: 700, display: "grid", placeItems: "center", fontFamily: "var(--font-mono)",
      background: kind === "top" ? "oklch(0.95 0.05 150)" : "oklch(0.96 0.05 30)", color: kind === "top" ? "oklch(0.4 0.13 150)" : "oklch(0.5 0.16 30)" }}>{idx}</div>
    <Avatar name={p.name} initials={p.initials} size="sm"/>
    <div style={{ flex: 1, minWidth: 0 }}>
      <div style={{ fontWeight: 600, fontSize: 13, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{p.name}</div>
      <div className="muted" style={{ fontSize: 11 }}>{p.count} respons</div>
    </div>
    <span className={"score-pill " + scoreClass(p.val)}>{fmtScore(p.val)}</span>
  </div>
);

// =============== Per Gender ===============
const PerGenderTab = ({ data, filtered }) => {
  const { DIMENSIONS, PENGAJAR } = data;
  const segments = [
    { key: "pa", label: "Putra", icon: "mars", color: "oklch(0.55 0.13 220)" },
    { key: "pi", label: "Putri", icon: "venus", color: "oklch(0.6 0.14 340)" },
  ];

  const aggSeg = (key) => {
    const rs = filtered.filter(r => r.gender === key);
    if (!rs.length) return null;
    const dimAvgs = {};
    DIMENSIONS.forEach(d => dimAvgs[d.key] = rs.reduce((s,r)=>s+r.scores[d.col],0) / rs.length);
    const avg = rs.reduce((s,r) => s+r.avg, 0) / rs.length;
    return { count: rs.length, avg, dimAvgs };
  };

  return (
    <div>
      <div className="grid-2-eq" style={{ marginBottom: 14 }}>
        {segments.map(seg => {
          const a = aggSeg(seg.key);
          if (!a) return null;
          return (
            <div className="card" key={seg.key}>
              <div className="card-head">
                <div className="row">
                  <div style={{ width: 38, height: 38, borderRadius: 10, background: "color-mix(in oklch, " + seg.color + " 18%, transparent)", color: seg.color, display: "grid", placeItems: "center" }}>
                    <Icon name={seg.icon} size={20}/>
                  </div>
                  <div>
                    <div className="card-title" style={{ fontSize: 16 }}>Mahasiswa {seg.label}</div>
                    <div className="card-sub">{a.count} respons</div>
                  </div>
                </div>
                <span className={"score-pill " + scoreClass(a.avg)}>{fmtScore(a.avg)}</span>
              </div>
              <div style={{ display: "grid", placeItems: "center" }}>
                <RadarChart values={DIMENSIONS.map(d => a.dimAvgs[d.key])} labels={DIMENSIONS.map(d => d.short)} size={280}/>
              </div>
            </div>
          );
        })}
      </div>

      <div className="card">
        <div className="card-head">
          <div>
            <div className="card-title">Perbandingan Skor Per Dimensi: Putra vs Putri</div>
            <div className="card-sub">Lihat di mana penilaian berbeda paling tajam</div>
          </div>
        </div>
        <div className="gender-compare-wrap" style={{ overflowX: "auto" }}>
        <div className="gender-compare-inner" style={{ display: "flex", flexDirection: "column", gap: 10, minWidth: 440 }}>
          {DIMENSIONS.map(d => {
            const pa = aggSeg("pa");
            const pi = aggSeg("pi");
            if (!pa || !pi) return null;
            const va = pa.dimAvgs[d.key];
            const vi = pi.dimAvgs[d.key];
            const max = 100;
            return (
              <div key={d.key} style={{ display: "grid", gridTemplateColumns: "130px 1fr 55px 1fr 55px", gap: 10, alignItems: "center", fontSize: 12.5 }}>
                <div style={{ fontWeight: 500 }}>{d.label}</div>
                <div className="bar-bg" style={{ height: 14, position: "relative" }}>
                  <div style={{ position: "absolute", right: 0, height: "100%", width: (va/max*100) + "%", background: "oklch(0.55 0.13 220)", borderRadius: 4 }}/>
                </div>
                <div style={{ fontFamily: "var(--font-mono)", fontWeight: 600, textAlign: "center" }}>{va.toFixed(1)}</div>
                <div className="bar-bg" style={{ height: 14, position: "relative" }}>
                  <div style={{ position: "absolute", left: 0, height: "100%", width: (vi/max*100) + "%", background: "oklch(0.6 0.14 340)", borderRadius: 4 }}/>
                </div>
                <div style={{ fontFamily: "var(--font-mono)", fontWeight: 600 }}>{vi.toFixed(1)}</div>
              </div>
            );
          })}
        </div>
        </div>
        <div className="row" style={{ marginTop: 14, gap: 18, fontSize: 12, color: "var(--fg-muted)", justifyContent: "center" }}>
          <div className="row" style={{ gap: 6 }}><span style={{ width: 12, height: 12, background: "oklch(0.55 0.13 220)", borderRadius: 3 }}/>Putra</div>
          <div className="row" style={{ gap: 6 }}><span style={{ width: 12, height: 12, background: "oklch(0.6 0.14 340)", borderRadius: 3 }}/>Putri</div>
        </div>
      </div>
    </div>
  );
};

// =============== Per Jenjang (ILL / ILP) ===============
const PerJenjangTab = ({ data, filtered }) => {
  const { DIMENSIONS, PENGAJAR } = data;
  const segments = [
    { key: "ILL", label: "I'dad Lughawi Lanjutan", short: "ILL", color: "oklch(0.55 0.13 165)", desc: "Tingkat lanjutan" },
    { key: "ILP", label: "I'dad Lughawi Pemula", short: "ILP", color: "oklch(0.65 0.13 60)", desc: "Tingkat pemula" },
  ];

  const aggSeg = (key) => {
    const rs = filtered.filter(r => r.jenjang === key);
    if (!rs.length) return null;
    const dimAvgs = {};
    DIMENSIONS.forEach(d => dimAvgs[d.key] = rs.reduce((s,r)=>s+r.scores[d.col],0) / rs.length);
    const avg = rs.reduce((s,r) => s+r.avg, 0) / rs.length;
    return { count: rs.length, avg, dimAvgs };
  };

  return (
    <div>
      <div className="grid-2-eq" style={{ marginBottom: 14 }}>
        {segments.map(seg => {
          const a = aggSeg(seg.key);
          if (!a) return null;
          return (
            <div className="card" key={seg.key}>
              <div className="card-head">
                <div className="row">
                  <div style={{ width: 44, height: 44, borderRadius: 12, background: "color-mix(in oklch, " + seg.color + " 18%, transparent)", color: seg.color, display: "grid", placeItems: "center", fontWeight: 700, fontSize: 14, fontFamily: "var(--font-display)" }}>
                    {seg.short}
                  </div>
                  <div>
                    <div className="card-title" style={{ fontSize: 16 }}>{seg.label}</div>
                    <div className="card-sub">{seg.desc} · {a.count} respons</div>
                  </div>
                </div>
                <span className={"score-pill " + scoreClass(a.avg)}>{fmtScore(a.avg)}</span>
              </div>
              <div style={{ marginTop: 6 }}>
                {DIMENSIONS.map(d => {
                  const v = a.dimAvgs[d.key];
                  return (
                    <div key={d.key} style={{ display: "grid", gridTemplateColumns: "1fr 60px", gap: 10, alignItems: "center", padding: "5px 0" }}>
                      <div>
                        <div style={{ fontSize: 12, fontWeight: 500 }}>{d.label}</div>
                        <div className="bar-bg" style={{ height: 5, marginTop: 3, background: "var(--surface-2)", borderRadius: 999 }}>
                          <div style={{ height: "100%", width: v + "%", background: seg.color, borderRadius: 999 }}/>
                        </div>
                      </div>
                      <span style={{ fontFamily: "var(--font-mono)", fontWeight: 600, textAlign: "right", fontSize: 12.5 }}>{v.toFixed(1)}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      <div className="card">
        <div className="card-head">
          <div>
            <div className="card-title">Perbandingan ILL vs ILP per Dimensi</div>
            <div className="card-sub">Identifikasi gap antara tingkat lanjutan dan pemula</div>
          </div>
        </div>
        <div style={{ overflowX: "auto", padding: 10 }}>
          {(() => {
            const all = aggSeg("ILL");
            const beg = aggSeg("ILP");
            if (!all || !beg) return null;
            return (
              <svg width="100%" height="320" viewBox="0 0 600 320" style={{ minWidth: 420, display: "block" }}>
                {/* Grid */}
                {[60, 70, 80, 90, 100].map((t, i) => {
                  const y = 280 - ((t-60)/40)*240;
                  return <g key={t}>
                    <line x1="60" x2="580" y1={y} y2={y} stroke="var(--border)" strokeDasharray={i % 2 ? "3 3" : "0"}/>
                    <text x="50" y={y+4} fontSize="10.5" fill="var(--fg-subtle)" textAnchor="end" fontFamily="var(--font-mono)">{t}</text>
                  </g>;
                })}
                {DIMENSIONS.map((d, i) => {
                  const x = 60 + (i + 0.5) * (520/DIMENSIONS.length);
                  const yA = 280 - ((all.dimAvgs[d.key]-60)/40)*240;
                  const yB = 280 - ((beg.dimAvgs[d.key]-60)/40)*240;
                  return <g key={d.key}>
                    <text x={x} y={305} fontSize="10.5" fill="var(--fg-muted)" textAnchor="middle">{d.short}</text>
                  </g>;
                })}
                {(() => {
                  const lineA = DIMENSIONS.map((d,i) => {
                    const x = 60 + (i + 0.5) * (520/DIMENSIONS.length);
                    const y = 280 - ((all.dimAvgs[d.key]-60)/40)*240;
                    return [x, y];
                  });
                  const lineB = DIMENSIONS.map((d,i) => {
                    const x = 60 + (i + 0.5) * (520/DIMENSIONS.length);
                    const y = 280 - ((beg.dimAvgs[d.key]-60)/40)*240;
                    return [x, y];
                  });
                  const dA = lineA.map((p,i) => (i?"L":"M") + p[0]+" "+p[1]).join(" ");
                  const dB = lineB.map((p,i) => (i?"L":"M") + p[0]+" "+p[1]).join(" ");
                  return <g>
                    <path d={dA} stroke="oklch(0.55 0.13 165)" strokeWidth="2.4" fill="none"/>
                    <path d={dB} stroke="oklch(0.65 0.13 60)" strokeWidth="2.4" fill="none"/>
                    {lineA.map((p, i) => <circle key={"a"+i} cx={p[0]} cy={p[1]} r="4" fill="white" stroke="oklch(0.55 0.13 165)" strokeWidth="2"/>)}
                    {lineB.map((p, i) => <circle key={"b"+i} cx={p[0]} cy={p[1]} r="4" fill="white" stroke="oklch(0.65 0.13 60)" strokeWidth="2"/>)}
                  </g>;
                })()}
              </svg>
            );
          })()}
        </div>
        <div className="row" style={{ gap: 18, fontSize: 12, color: "var(--fg-muted)", justifyContent: "center" }}>
          <div className="row" style={{ gap: 6 }}><span style={{ width: 12, height: 3, background: "oklch(0.55 0.13 165)" }}/>ILL — Lanjutan</div>
          <div className="row" style={{ gap: 6 }}><span style={{ width: 12, height: 3, background: "oklch(0.65 0.13 60)" }}/>ILP — Pemula</div>
        </div>
      </div>
    </div>
  );
};

window.DimensiTab = DimensiTab;
window.PerGenderTab = PerGenderTab;
window.PerJenjangTab = PerJenjangTab;
