// Shared utilities and components for the dashboard
// Exposes helpers to window so other JSX scripts can use them.

const { useState, useMemo, useEffect, useRef, useCallback } = React;

// ---- Icons (inline SVG, simple line style) ----
const Icon = ({ name, size = 16, stroke = 1.6 }) => {
  const paths = {
    home: <><path d="M3 11.5 12 4l9 7.5"/><path d="M5 10v10h14V10"/></>,
    users: <><circle cx="9" cy="8" r="3.2"/><path d="M3 20c.7-3.5 3-5.2 6-5.2s5.3 1.7 6 5.2"/><circle cx="17" cy="9" r="2.4"/><path d="M15 14.5c2.5-.3 4.5.8 5.2 3.5"/></>,
    layers: <><path d="M12 3 3 8l9 5 9-5-9-5Z"/><path d="m3 13 9 5 9-5"/><path d="m3 18 9 5 9-5"/></>,
    sparkles: <><path d="M12 4v3M12 17v3M4 12h3M17 12h3M6.5 6.5l2 2M15.5 15.5l2 2M6.5 17.5l2-2M15.5 8.5l2-2"/></>,
    male: <><circle cx="10" cy="14" r="5"/><path d="m14 10 6-6M14 4h6v6"/></>,
    book: <><path d="M4 5a2 2 0 0 1 2-2h13v15H6a2 2 0 0 0-2 2V5Z"/><path d="M4 18a2 2 0 0 0 2 2h13"/></>,
    search: <><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></>,
    bell: <><path d="M6 9a6 6 0 0 1 12 0c0 7 3 8 3 8H3s3-1 3-8"/><path d="M10 21h4"/></>,
    settings: <><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3h0a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5h0a1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8v0a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1Z"/></>,
    download: <><path d="M12 4v12M6 12l6 6 6-6M5 20h14"/></>,
    refresh: <><path d="M3 12a9 9 0 0 1 15-6.7L21 8"/><path d="M21 3v5h-5"/><path d="M21 12a9 9 0 0 1-15 6.7L3 16"/><path d="M3 21v-5h5"/></>,
    trend_up: <><path d="m4 17 6-6 4 4 7-7"/><path d="M14 8h7v7"/></>,
    trend_down: <><path d="m4 7 6 6 4-4 7 7"/><path d="M14 16h7v-7"/></>,
    arrow_right: <><path d="M5 12h14M13 5l7 7-7 7"/></>,
    chev_right: <><path d="m9 5 7 7-7 7"/></>,
    chev_down: <><path d="m5 9 7 7 7-7"/></>,
    star: <><path d="m12 3 2.7 6 6.3.5-4.8 4.2L17.5 20 12 16.7 6.5 20l1.3-6.3L3 9.5 9.3 9 12 3Z"/></>,
    info: <><circle cx="12" cy="12" r="9"/><path d="M12 8v.01M11 12h1v5h1"/></>,
    warning: <><path d="M12 3 2 21h20L12 3Z"/><path d="M12 10v5M12 18v.01"/></>,
    check: <><path d="m4 12 5 5L20 6"/></>,
    copy: <><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></>,
    link: <><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></>,
    x: <><path d="m6 6 12 12M18 6 6 18"/></>,
    quote: <><path d="M7 7h4v4H7c0 3 1 5 4 5"/><path d="M15 7h4v4h-4c0 3 1 5 4 5"/></>,
    filter: <><path d="M4 5h16M7 12h10M10 19h4"/></>,
    eye: <><path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/></>,
    file_text: <><path d="M14 3H6v18h12V7z"/><path d="M14 3v4h4M9 12h6M9 16h4"/></>,
    chart_bar: <><path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/></>,
    chart_line: <><path d="M4 20 10 12l4 4 6-10"/><path d="M22 20H2"/></>,
    pie: <><path d="M21 12a9 9 0 1 1-9-9v9h9Z"/></>,
    grid: <><path d="M4 4h7v7H4zM13 4h7v7h-7zM4 13h7v7H4zM13 13h7v7h-7z"/></>,
    user: <><circle cx="12" cy="8" r="3.5"/><path d="M5 20c.6-3.6 3.4-5.5 7-5.5s6.4 1.9 7 5.5"/></>,
    venus: <><circle cx="12" cy="9" r="5"/><path d="M12 14v8M9 19h6"/></>,
    mars: <><circle cx="10" cy="14" r="5"/><path d="m14 10 6-6M14 4h6v6"/></>,
    sheet: <><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18M3 15h18M9 3v18M15 3v18"/></>,
  };
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={stroke} strokeLinecap="round" strokeLinejoin="round" style={{display: "inline-block", flexShrink: 0}}>
      {paths[name] || null}
    </svg>
  );
};

// ---- Score helpers ----
function scoreClass(score) {
  if (score >= 95) return "s100";
  if (score >= 80) return "s80";
  if (score >= 65) return "s60";
  if (score >= 50) return "s40";
  return "s20";
}
function scoreColor(score) {
  if (score >= 95) return "oklch(0.55 0.14 150)";
  if (score >= 85) return "oklch(0.62 0.13 150)";
  if (score >= 75) return "oklch(0.7 0.13 110)";
  if (score >= 65) return "oklch(0.72 0.15 75)";
  if (score >= 55) return "oklch(0.7 0.16 50)";
  return "oklch(0.62 0.18 25)";
}
function fmtScore(s) { return s == null || isNaN(s) ? "—" : s.toFixed(1); }
function fmtInt(n) { return n == null ? "—" : Number(n).toLocaleString("id-ID"); }

// Avatar palette (deterministic from name)
function avatarColor(name) {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = (hash * 31 + name.charCodeAt(i)) | 0;
  const hues = [165, 200, 145, 240, 280, 330, 30, 60];
  const h = hues[Math.abs(hash) % hues.length];
  return `linear-gradient(135deg, oklch(0.7 0.12 ${h}), oklch(0.5 0.13 ${h}))`;
}
function Avatar({ name, initials, size = "md", style }) {
  const cls = "avatar" + (size !== "md" ? " " + size : "");
  return <div className={cls} style={{ background: avatarColor(name), ...(style||{}) }}>{initials}</div>;
}

// ---- Format relative time ----
function relTime(iso) {
  const d = new Date(iso);
  const diff = (Date.now() - d.getTime()) / 1000;
  if (diff < 60) return "baru saja";
  if (diff < 3600) return `${Math.floor(diff/60)}m lalu`;
  if (diff < 86400) return `${Math.floor(diff/3600)}j lalu`;
  return `${Math.floor(diff/86400)}h lalu`;
}

// ---- Sparkline mini chart ----
function Sparkline({ values, color = "currentColor", width = 110, height = 34, fill = false }) {
  if (!values || values.length < 2) return null;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;
  const pts = values.map((v, i) => {
    const x = (i / (values.length - 1)) * width;
    const y = height - ((v - min) / range) * (height - 4) - 2;
    return [x, y];
  });
  const d = pts.map((p, i) => (i === 0 ? "M" : "L") + p[0].toFixed(1) + " " + p[1].toFixed(1)).join(" ");
  const fillD = fill ? d + ` L${width} ${height} L0 ${height} Z` : null;
  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} style={{overflow: "visible"}}>
      {fill && <path d={fillD} fill={color} opacity="0.14"/>}
      <path d={d} fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
      <circle cx={pts[pts.length-1][0]} cy={pts[pts.length-1][1]} r="2.5" fill={color}/>
    </svg>
  );
}

// ---- Bar chart (simple) ----
function BarChart({ data, height = 200, format = (v) => v, color }) {
  const max = Math.max(...data.map(d => d.value), 1);
  const w = 100 / data.length;
  return (
    <div style={{display: "flex", alignItems: "flex-end", height, gap: 6, padding: "0 4px"}}>
      {data.map((d, i) => {
        const h = (d.value / max) * (height - 30);
        const c = color || scoreColor(d.value);
        return (
          <div key={i} style={{flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 6}} title={`${d.label}: ${format(d.value)}`}>
            <div style={{fontSize: 10.5, fontFamily: "var(--font-mono)", color: "var(--fg-muted)"}}>{format(d.value)}</div>
            <div style={{
              width: "100%",
              height: Math.max(2, h),
              background: c,
              borderRadius: "4px 4px 2px 2px",
              transition: "height 0.4s ease",
              minHeight: 4,
            }}/>
            <div style={{fontSize: 11, color: "var(--fg-muted)", textAlign: "center", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", maxWidth: "100%"}}>{d.label}</div>
          </div>
        );
      })}
    </div>
  );
}

// ---- Line chart for trend ----
function LineChart({ series, height = 240, width = 600, yMin = 60, yMax = 100 }) {
  const w = width;
  const h = height;
  const pad = { top: 14, right: 18, bottom: 28, left: 36 };
  const innerW = w - pad.left - pad.right;
  const innerH = h - pad.top - pad.bottom;
  const labels = series[0]?.points.map(p => p.label) || [];

  const yTicks = [yMin, yMin + (yMax-yMin)/4, yMin + (yMax-yMin)/2, yMin + 3*(yMax-yMin)/4, yMax];

  const xPos = (i) => pad.left + (labels.length === 1 ? innerW / 2 : (i / (labels.length - 1)) * innerW);
  const yPos = (v) => pad.top + innerH - ((v - yMin) / (yMax - yMin)) * innerH;

  return (
    <svg width="100%" height={h} viewBox={`0 0 ${w} ${h}`} style={{ display: "block" }}>
      {/* Grid */}
      {yTicks.map((t, i) => (
        <g key={i}>
          <line x1={pad.left} x2={w - pad.right} y1={yPos(t)} y2={yPos(t)} stroke="var(--border)" strokeWidth="1" strokeDasharray={i === 0 || i === yTicks.length - 1 ? "0" : "3 4"}/>
          <text x={pad.left - 8} y={yPos(t) + 4} fontSize="10.5" textAnchor="end" fill="var(--fg-subtle)" fontFamily="var(--font-mono)">{t.toFixed(0)}</text>
        </g>
      ))}
      {/* X labels */}
      {labels.map((l, i) => (
        <text key={i} x={xPos(i)} y={h - 8} fontSize="11" textAnchor="middle" fill="var(--fg-muted)">{l}</text>
      ))}
      {/* Series */}
      {series.map((s, si) => {
        const pathD = s.points.map((p, i) => (i === 0 ? "M" : "L") + xPos(i) + " " + yPos(p.value)).join(" ");
        const fillD = pathD + ` L${xPos(s.points.length-1)} ${pad.top + innerH} L${xPos(0)} ${pad.top + innerH} Z`;
        return (
          <g key={si}>
            {s.fill && <path d={fillD} fill={s.color} opacity="0.12"/>}
            <path d={pathD} fill="none" stroke={s.color} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/>
            {s.points.map((p, i) => (
              <g key={i}>
                <circle cx={xPos(i)} cy={yPos(p.value)} r="3.5" fill="white" stroke={s.color} strokeWidth="2"/>
                {p.value != null && <text x={xPos(i)} y={yPos(p.value) - 10} fontSize="10.5" fontFamily="var(--font-mono)" textAnchor="middle" fill={s.color} fontWeight="600">{p.value.toFixed(1)}</text>}
              </g>
            ))}
          </g>
        );
      })}
    </svg>
  );
}

// ---- Radar chart for dimensions ----
function RadarChart({ values, labels, max = 100, size = 280, compare = null }) {
  const lp = 62; // label padding — ruang ekstra untuk teks label di luar juring
  const cx = size / 2;
  const cy = size / 2;
  const r = size / 2 - 36;
  const n = values.length;
  function pt(i, v) {
    const a = (Math.PI * 2 * i) / n - Math.PI / 2;
    const rr = (v / max) * r;
    return [cx + Math.cos(a) * rr, cy + Math.sin(a) * rr];
  }
  function labelPt(i) {
    const a = (Math.PI * 2 * i) / n - Math.PI / 2;
    const rr = r + 20;
    return [cx + Math.cos(a) * rr, cy + Math.sin(a) * rr];
  }
  const polygonPoints = values.map((v, i) => pt(i, v).join(",")).join(" ");
  const compPoints = compare ? compare.map((v, i) => pt(i, v).join(",")).join(" ") : null;
  const grids = [0.25, 0.5, 0.75, 1].map(g => {
    const pts = Array.from({length: n}, (_, i) => pt(i, max * g).join(",")).join(" ");
    return <polygon key={g} points={pts} fill="none" stroke="var(--border)" strokeWidth="1" strokeDasharray={g === 1 ? "0" : "3 3"} />;
  });

  // viewBox diperluas dengan lp agar teks label tidak terpotong
  const vbX = -lp;
  const vbY = -lp / 2;
  const vbW = size + lp * 2;
  const vbH = size + lp;

  return (
    <svg width="100%" viewBox={`${vbX} ${vbY} ${vbW} ${vbH}`} style={{maxWidth: vbW, display: "block"}}>
      {grids}
      {Array.from({length: n}, (_, i) => {
        const [x, y] = pt(i, max);
        return <line key={i} x1={cx} y1={cy} x2={x} y2={y} stroke="var(--border)" strokeWidth="1"/>;
      })}
      {compPoints && (
        <polygon points={compPoints} fill="var(--fg-subtle)" fillOpacity="0.1" stroke="var(--fg-subtle)" strokeWidth="1.5" strokeDasharray="4 3"/>
      )}
      <polygon points={polygonPoints} fill="var(--accent)" fillOpacity="0.18" stroke="var(--accent)" strokeWidth="2"/>
      {values.map((v, i) => {
        const [x, y] = pt(i, v);
        return <circle key={i} cx={x} cy={y} r="3.5" fill="var(--surface)" stroke="var(--accent)" strokeWidth="2"/>;
      })}
      {labels.map((l, i) => {
        const [x, y] = labelPt(i);
        const a = (Math.PI * 2 * i) / n - Math.PI / 2;
        let anchor = "middle";
        if (Math.cos(a) > 0.3) anchor = "start";
        else if (Math.cos(a) < -0.3) anchor = "end";
        return (
          <g key={i}>
            <text x={x} y={y - 4} fontSize="11" fill="var(--fg-muted)" textAnchor={anchor} fontWeight="500">{l}</text>
            <text x={x} y={y + 9} fontSize="11.5" fill="var(--fg)" textAnchor={anchor} fontWeight="700" fontFamily="var(--font-mono)">{values[i].toFixed(1)}</text>
          </g>
        );
      })}
    </svg>
  );
}

// ---- Progress ring ----
function ProgressRing({ value, max = 100, size = 130, stroke = 10, color, label }) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const pct = Math.max(0, Math.min(1, value / max));
  const dash = c * pct;
  const col = color || scoreColor(value);
  return (
    <div style={{ position: "relative", width: size, height: size }}>
      <svg width={size} height={size} style={{ transform: "rotate(-90deg)" }}>
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="var(--surface-2)" strokeWidth={stroke}/>
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={col} strokeWidth={stroke}
                strokeDasharray={`${dash} ${c - dash}`} strokeLinecap="round"
                style={{ transition: "stroke-dasharray 0.6s ease" }}/>
      </svg>
      <div style={{
        position: "absolute", inset: 0, display: "grid", placeItems: "center",
        flexDirection: "column", textAlign: "center", lineHeight: 1.1
      }}>
        <div>
          <div style={{ fontSize: size * 0.22, fontWeight: 700, fontFamily: "var(--font-display)", letterSpacing: "-0.02em", fontFeatureSettings: '"tnum"' }}>{fmtScore(value)}</div>
          {label && <div style={{ fontSize: 11, color: "var(--fg-muted)" }}>{label}</div>}
        </div>
      </div>
    </div>
  );
}

Object.assign(window, { Icon, Avatar, Sparkline, BarChart, LineChart, RadarChart, ProgressRing,
  scoreClass, scoreColor, fmtScore, fmtInt, relTime, avatarColor });
