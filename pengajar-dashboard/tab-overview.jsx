// Tab content renderers - each tab gets its own component
const { useState: uS, useMemo: uM, useEffect: uE, useRef: uR } = React;

// ---- Aggregations ----
function computeAgg(responses, dimensions) {
  if (!responses.length) return null;
  const dims = {};
  dimensions.forEach(d => { dims[d.key] = []; });
  responses.forEach(r => {
    dimensions.forEach(d => { dims[d.key].push(r.scores[d.col]); });
  });
  const dimAvgs = {};
  dimensions.forEach(d => {
    const arr = dims[d.key];
    dimAvgs[d.key] = arr.length ? arr.reduce((s,v)=>s+v,0) / arr.length : 0;
  });
  const avg = responses.reduce((s,r) => s + r.avg, 0) / responses.length;
  return { dimAvgs, avg, count: responses.length };
}

function aggByPengajar(responses, pengajar, dimensions) {
  return pengajar.map(p => {
    const rs = responses.filter(r => r.pengajar === p.name);
    const agg = computeAgg(rs, dimensions);
    return { ...p, ...agg, responses: rs };
  });
}

function distribution(responses) {
  const buckets = { s100: 0, s80: 0, s60: 0, s40: 0, s20: 0 };
  responses.forEach(r => {
    if (r.avg >= 95) buckets.s100++;
    else if (r.avg >= 80) buckets.s80++;
    else if (r.avg >= 65) buckets.s60++;
    else if (r.avg >= 50) buckets.s40++;
    else buckets.s20++;
  });
  return buckets;
}

// ============= OVERVIEW TAB =============
function OverviewTab({ data, filtered, periodComparison }) {
  const { DIMENSIONS, PENGAJAR, PERIODES, responses } = data;
  const agg = uM(() => computeAgg(filtered, DIMENSIONS), [filtered]);
  const byPengajar = uM(() => aggByPengajar(filtered, PENGAJAR, DIMENSIONS).filter(p => p.count > 0), [filtered]);
  const sorted = [...byPengajar].sort((a,b) => b.avg - a.avg);
  const top3 = sorted.slice(0, 3);
  const bottom3 = sorted.slice(-3).reverse();
  const dist = distribution(filtered);
  const totalSaran = filtered.filter(r => (r.saran && r.saran.trim()) || (r.positive && r.positive.trim())).length;
  const expected = PERIODES.find(p => p.current)?.expected || 620;
  const responseRate = (filtered.length / expected) * 100;

  // Trend across periods
  const trendByPeriode = PERIODES.map(p => {
    const rs = responses.filter(r => r.periode === p.id);
    const a = computeAgg(rs, DIMENSIONS);
    return { label: p.label, value: a ? a.avg : null };
  }).filter(x => x.value != null);

  const sparkVals = trendByPeriode.map(t => t.value);

  // Distribution data for the bar
  const distOrder = [
    { key: "s100", label: "95–100", color: "oklch(0.55 0.14 150)" },
    { key: "s80",  label: "80–94",  color: "oklch(0.7 0.13 130)" },
    { key: "s60",  label: "65–79",  color: "oklch(0.75 0.14 90)" },
    { key: "s40",  label: "50–64",  color: "oklch(0.7 0.16 50)" },
    { key: "s20",  label: "<50",    color: "oklch(0.62 0.18 25)" },
  ];

  const prevAgg = uM(() => {
    const prevId = PERIODES.findIndex(p => p.current) - 1;
    if (prevId < 0) return null;
    const prev = PERIODES[prevId];
    return computeAgg(responses.filter(r => r.periode === prev.id), DIMENSIONS);
  }, [responses]);
  const trendAvg = prevAgg ? agg.avg - prevAgg.avg : 0;
  const trendCount = prevAgg ? filtered.length - responses.filter(r => r.periode === PERIODES[PERIODES.findIndex(p => p.current) - 1]?.id).length : 0;

  return (
    <div>
      {/* KPI Row */}
      <div className="kpi-grid">
        <KPI label="Avg Skor Divisi" icon="star" value={agg ? agg.avg : 0} unit="" trend={trendAvg} trendUnit=" pt" foot={`Skala 0–100 · 7 dimensi`} sparkVals={sparkVals}/>
        <KPI label="Total Responden" icon="users" value={filtered.length} integer foot={`dari ~${expected} ekspektasi`} trend={trendCount} trendUnit=""/>
        <KPI label="Response Rate" icon="trend_up" value={responseRate} unit="%" foot={`${expected - filtered.length} belum mengisi`} progress={responseRate}/>
        <KPI label="Saran Tertulis" icon="quote" value={totalSaran} integer foot={`${((totalSaran/filtered.length)*100).toFixed(0)}% dari respons`} />
      </div>

      <div className="grid-2" style={{ marginBottom: 14 }}>
        <div className="card">
          <div className="card-head">
            <div>
              <div className="card-title">Tren Skor Antar-Periode</div>
              <div className="card-sub">Avg skor divisi pada {trendByPeriode.length} periode</div>
            </div>
            <div className="chip accent"><Icon name="trend_up" size={12}/> +{trendAvg > 0 ? trendAvg.toFixed(1) : "0.0"} pt vs prev</div>
          </div>
          <LineChart series={[{
            color: "var(--accent)",
            fill: true,
            points: trendByPeriode.map(t => ({ label: t.label, value: t.value }))
          }]} height={220} width={680} yMin={70} yMax={100}/>
        </div>

        <div className="card">
          <div className="card-head">
            <div>
              <div className="card-title">Distribusi Avg Skor</div>
              <div className="card-sub">{filtered.length} respons</div>
            </div>
          </div>
          <div className="distribution">
            {distOrder.map(b => {
              const v = dist[b.key] || 0;
              const pct = filtered.length ? (v / filtered.length * 100) : 0;
              return (
                <div className="dist-row" key={b.key}>
                  <div style={{ fontFamily: "var(--font-mono)", color: "var(--fg-muted)" }}>{b.label}</div>
                  <div className="bar-bg">
                    <div className="bar-fill" style={{ width: pct + "%", background: b.color }}/>
                  </div>
                  <div style={{ textAlign: "right", fontFamily: "var(--font-mono)" }}>
                    <span style={{ color: "var(--fg)", fontWeight: 600 }}>{v}</span>
                    <span style={{ color: "var(--fg-muted)", marginLeft: 4 }}>{pct.toFixed(0)}%</span>
                  </div>
                </div>
              );
            })}
          </div>
          <div className="divider"/>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, fontSize: 12 }}>
            <div>
              <div style={{ color: "var(--fg-muted)" }}>Median</div>
              <div style={{ fontWeight: 700, fontSize: 18, fontFamily: "var(--font-display)" }}>
                {(() => {
                  const sorted = [...filtered].sort((a,b)=>a.avg-b.avg);
                  const m = sorted.length ? sorted[Math.floor(sorted.length/2)].avg : 0;
                  return m.toFixed(1);
                })()}
              </div>
            </div>
            <div>
              <div style={{ color: "var(--fg-muted)" }}>Std Dev</div>
              <div style={{ fontWeight: 700, fontSize: 18, fontFamily: "var(--font-display)" }}>
                {(() => {
                  if (!filtered.length) return "—";
                  const m = agg.avg;
                  const v = filtered.reduce((s,r)=>s + (r.avg - m)**2, 0) / filtered.length;
                  return Math.sqrt(v).toFixed(1);
                })()}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="grid-2" style={{ marginBottom: 14 }}>
        <div className="card">
          <div className="card-head">
            <div>
              <div className="card-title">Top 3 Pengajar</div>
              <div className="card-sub">Avg skor tertinggi periode aktif</div>
            </div>
            <span className="chip good"><Icon name="trend_up" size={12}/> Terbaik</span>
          </div>
          <PengajarRanking list={top3} kind="top"/>
        </div>
        <div className="card">
          <div className="card-head">
            <div>
              <div className="card-title">Bottom 3 Pengajar</div>
              <div className="card-sub">Perlu perhatian & coaching</div>
            </div>
            <span className="chip warn"><Icon name="warning" size={12}/> Fokus</span>
          </div>
          <PengajarRanking list={bottom3} kind="bottom"/>
        </div>
      </div>

      <div className="grid-2-eq">
        <div className="card">
          <div className="card-head">
            <div>
              <div className="card-title">Skor per Dimensi (Divisi)</div>
              <div className="card-sub">Rata-rata 7 dimensi penilaian</div>
            </div>
          </div>
          {agg && <div style={{ display: "grid", placeItems: "center" }}>
            <RadarChart values={DIMENSIONS.map(d => agg.dimAvgs[d.key])} labels={DIMENSIONS.map(d => d.short)} size={310}
              compare={prevAgg ? DIMENSIONS.map(d => prevAgg.dimAvgs[d.key]) : null}/>
            <div style={{ display: "flex", gap: 14, fontSize: 11.5, color: "var(--fg-muted)", marginTop: 6 }}>
              <div className="row" style={{ gap: 6 }}><span style={{ width: 10, height: 10, background: "var(--accent)", borderRadius: 2 }}/>Periode aktif</div>
              {prevAgg && <div className="row" style={{ gap: 6 }}><span style={{ width: 10, height: 10, background: "var(--fg-subtle)", borderRadius: 2 }}/>Periode sebelumnya</div>}
            </div>
          </div>}
        </div>
        <div className="card">
          <div className="card-head">
            <div>
              <div className="card-title">Live Response Monitor</div>
              <div className="card-sub">Update otomatis dari Google Sheet</div>
            </div>
            <span className="chip" style={{ color: "oklch(0.4 0.13 145)", background: "oklch(0.95 0.06 145)", borderColor: "transparent" }}><span className="live-dot"/>Live</span>
          </div>
          <LiveFeed responses={filtered}/>
        </div>
      </div>
    </div>
  );
}

function KPI({ label, icon, value, unit, trend, trendUnit, foot, integer, sparkVals, progress }) {
  const showTrend = trend !== undefined && trend !== null;
  const trendCls = trend > 0 ? "up" : trend < 0 ? "down" : "flat";
  return (
    <div className="kpi">
      <div className="kpi-label">
        <div className="kpi-icon"><Icon name={icon} size={14}/></div>
        {label}
      </div>
      <div className="kpi-value">
        {integer ? fmtInt(value) : (typeof value === "number" ? value.toFixed(unit === "%" ? 1 : 1) : value)}
        {unit && <span className="unit">{unit}</span>}
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
        {showTrend && (
          <span className={"kpi-trend " + trendCls}>
            <Icon name={trend > 0 ? "trend_up" : trend < 0 ? "trend_down" : "arrow_right"} size={11}/>
            {trend > 0 ? "+" : ""}{integer ? fmtInt(trend) : trend.toFixed(1)}{trendUnit || ""}
          </span>
        )}
        {foot && <span className="kpi-foot">{foot}</span>}
      </div>
      {progress !== undefined && (
        <div style={{ marginTop: 12, height: 4, background: "var(--surface-2)", borderRadius: 999, overflow: "hidden" }}>
          <div style={{ height: "100%", width: Math.min(100, progress) + "%", background: "var(--accent)", borderRadius: 999, transition: "width 0.5s" }}/>
        </div>
      )}
      {sparkVals && sparkVals.length >= 2 && (
        <div className="kpi-spark">
          <Sparkline values={sparkVals} color="var(--accent)" fill={true} width={110} height={50}/>
        </div>
      )}
    </div>
  );
}

function PengajarRanking({ list, kind }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      {list.map((p, i) => (
        <div key={p.name} style={{ display: "flex", gap: 12, alignItems: "center", padding: "8px 0", borderBottom: i === list.length - 1 ? "none" : "1px solid var(--border)" }}>
          <div style={{
            width: 22, height: 22, borderRadius: 6, fontSize: 11, fontWeight: 700,
            display: "grid", placeItems: "center", fontFamily: "var(--font-mono)",
            background: kind === "top" ? "oklch(0.95 0.05 150)" : "oklch(0.96 0.05 30)",
            color: kind === "top" ? "oklch(0.4 0.13 150)" : "oklch(0.5 0.16 30)"
          }}>{i + 1}</div>
          <Avatar name={p.name} initials={p.initials} size="sm"/>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontWeight: 600, fontSize: 13, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{p.name}</div>
            <div style={{ fontSize: 11.5, color: "var(--fg-muted)" }}>{p.count} respons · {p.gender === "L" ? "Putra" : "Putri"}</div>
          </div>
          <span className={"score-pill " + scoreClass(p.avg)}>{fmtScore(p.avg)}</span>
        </div>
      ))}
    </div>
  );
}

const FEED_PAGE = 10;

function LiveFeed({ responses }) {
  const [page, uS2] = uS(1);
  const sorted = uM(() =>
    [...responses].sort((a,b) => b.timestamp.localeCompare(a.timestamp))
  , [responses]);

  // Reset halaman jika data berubah
  uE(() => { uS2(1); }, [responses]);

  const total = sorted.length;
  const items = sorted.slice(0, page * FEED_PAGE);
  const hasMore = items.length < total;

  return (
    <div>
      <div className="live-feed">
        {items.map((r, i) => {
          const fresh = (Date.now() - new Date(r.timestamp).getTime()) < 60 * 60 * 1000;
          return (
            <div key={i} className={"live-item " + (fresh ? "fresh" : "")}>
              <div className="when">{relTime(r.timestamp)}</div>
              <Avatar name={r.pengajar} initials={r.pengajar.split(" ").map(s=>s[0]).slice(0,2).join("")} size="sm"/>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 600, fontSize: 12.5, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{r.pengajar}</div>
                <div style={{ fontSize: 11, color: "var(--fg-muted)" }}>{r.kelas} · {r.matkul}</div>
              </div>
              <span className={"score-pill " + scoreClass(r.avg)}>{r.avg.toFixed(0)}</span>
            </div>
          );
        })}
      </div>
      {(hasMore || page > 1) && (
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 0 2px", fontSize: 12, color: "var(--fg-muted)" }}>
          <span>{items.length} / {total} respons</span>
          <div style={{ display: "flex", gap: 6 }}>
            {page > 1 && (
              <button onClick={() => uS2(p => p - 1)} style={{ background: "var(--surface-2)", border: "1px solid var(--border)", borderRadius: 7, padding: "4px 10px", fontSize: 12, fontWeight: 600, cursor: "pointer", color: "var(--fg)" }}>
                ‹ Kurang
              </button>
            )}
            {hasMore && (
              <button onClick={() => uS2(p => p + 1)} style={{ background: "var(--accent)", color: "white", border: "none", borderRadius: 7, padding: "4px 10px", fontSize: 12, fontWeight: 600, cursor: "pointer" }}>
                Muat {Math.min(FEED_PAGE, total - items.length)} lagi ›
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

window.OverviewTab = OverviewTab;
