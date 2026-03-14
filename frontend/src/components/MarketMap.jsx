import { useEffect, useState } from "react";
import { useAuth } from "@clerk/clerk-react";

const STAGE_COLORS = {
  "pre-seed": "#8b5cf6",
  "seed": "#6366f1",
  "series-a": "#818cf8",
  "series-b": "#a78bfa",
  "unknown": "#3b3b5c",
};

const STAGE_LABELS = {
  "pre-seed": "Pre-Seed",
  "seed": "Seed",
  "series-a": "Series A",
  "series-b": "Series B",
  "unknown": "Unknown",
};

const FIT_CONFIG = {
  "Score 1": { label: "No Fit", color: "#3b3b5c" },
  "Score 2": { label: "Weak", color: "#6b5b8b" },
  "Score 3": { label: "Possible", color: "#f59e0b" },
  "Score 4": { label: "Strong", color: "#6366f1" },
  "Score 5": { label: "Top Match", color: "#22c55e" },
};

function fitToColor(avgFit) {
  if (!avgFit) return { bg: "#1a1a2e", border: "#2a2a4a", text: "#6b6b8a" };
  const t = (avgFit - 1) / 4;
  if (t < 0.25) return { bg: "#1a1a2e", border: "#2a2a4a", text: "#6b6b8a" };
  if (t < 0.5)  return { bg: "#1e1a3e", border: "#2e2a5e", text: "#8888aa" };
  if (t < 0.75) return { bg: "#1e1a5e", border: "#3030a0", text: "#a5b4fc" };
  return { bg: "#1e2060", border: "#4040c0", text: "#c7d2fe" };
}

function StatTile({ label, value, accent }) {
  return (
    <div style={{ background: "#13131f", border: "1px solid #1e1e30", borderRadius: 12, padding: "20px 24px", flex: 1 }}>
      <div style={{ fontSize: 32, fontWeight: 700, color: accent || "#fff", letterSpacing: "-1px", lineHeight: 1, marginBottom: 6 }}>{value}</div>
      <div style={{ fontSize: 11, color: "#6b6b8a", textTransform: "uppercase", letterSpacing: "0.1em" }}>{label}</div>
    </div>
  );
}

function SectionLabel({ children }) {
  return (
    <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.12em", color: "#6366f1", textTransform: "uppercase", marginBottom: 16 }}>
      {children}
    </div>
  );
}

function Card({ children, style = {} }) {
  return (
    <div style={{ background: "#13131f", border: "1px solid #1e1e30", borderRadius: 14, padding: "22px 24px", ...style }}>
      {children}
    </div>
  );
}

function SectorTile({ name, value, avgFit }) {
  const colors = fitToColor(avgFit);
  const [hovered, setHovered] = useState(false);
  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        background: hovered ? "#1e1e3f" : colors.bg,
        border: `1px solid ${hovered ? "#4040a0" : colors.border}`,
        borderRadius: 10, padding: "14px 16px",
        cursor: "default", transition: "all 0.15s", position: "relative",
      }}
    >
      <div style={{ fontSize: 22, fontWeight: 700, color: colors.text, lineHeight: 1, marginBottom: 6 }}>{value}</div>
      <div style={{ fontSize: 12, color: "#c4c4d4", fontWeight: 500, marginBottom: 4 }}>{name}</div>
      {avgFit && <div style={{ fontSize: 11, color: colors.text }}>{avgFit} avg fit</div>}
      <div style={{
        position: "absolute", bottom: 0, left: 0, right: 0, height: 3,
        borderRadius: "0 0 10px 10px",
        background: `linear-gradient(90deg, #6366f1 ${((avgFit || 0) / 5) * 100}%, transparent ${((avgFit || 0) / 5) * 100}%)`,
        opacity: 0.6,
      }} />
    </div>
  );
}

function MandateCard({ name, value, avgFit, maxValue }) {
  const pct = maxValue > 0 ? (value / maxValue) * 100 : 0;
  const fitColor = avgFit >= 4.5 ? "#22c55e" : avgFit >= 3.5 ? "#6366f1" : avgFit >= 2.5 ? "#f59e0b" : "#6b6b8a";
  return (
    <div style={{ background: "#0d0d18", border: "1px solid #1e1e30", borderRadius: 10, padding: "16px 18px", display: "flex", alignItems: "center", gap: 16 }}>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 13, color: "#c4c4d4", fontWeight: 600, marginBottom: 8 }}>{name}</div>
        <div style={{ background: "#1a1a2e", borderRadius: 4, height: 5, overflow: "hidden" }}>
          <div style={{ width: `${pct}%`, height: "100%", background: "#8b5cf6", borderRadius: 4, transition: "width 0.6s ease" }} />
        </div>
      </div>
      <div style={{ textAlign: "right", flexShrink: 0 }}>
        <div style={{ fontSize: 22, fontWeight: 700, color: fitColor, lineHeight: 1 }}>
          {avgFit ? avgFit.toFixed(1) : "—"}
        </div>
        <div style={{ fontSize: 11, color: "#6b6b8a", marginTop: 2 }}>{value} co.</div>
      </div>
    </div>
  );
}

function FitBar({ value, maxValue, color, label }) {
  const pct = maxValue > 0 ? (value / maxValue) * 100 : 0;
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8, flex: 1 }}>
      <div style={{ fontSize: 13, fontWeight: 700, color: "#c4c4d4" }}>{value}</div>
      <div style={{ width: "100%", background: "#1a1a2e", borderRadius: "6px 6px 0 0", height: 80, display: "flex", alignItems: "flex-end", overflow: "hidden" }}>
        <div style={{ width: "100%", height: `${pct}%`, minHeight: value > 0 ? 4 : 0, background: color, borderRadius: "4px 4px 0 0", transition: "height 0.6s ease" }} />
      </div>
      <div style={{ fontSize: 11, color: "#6b6b8a", textAlign: "center" }}>{label}</div>
    </div>
  );
}

export default function MarketMap({ API }) {
  const { getToken } = useAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const load = async () => {
      const token = await getToken().catch(() => null);
      const headers = token ? { Authorization: `Bearer ${token}` } : {};
      fetch(`${API}/market-map/`, { headers })
        .then(r => r.json())
        .then(d => { setData(d); setLoading(false); })
        .catch(e => { setError(e.message); setLoading(false); });
    };
    load();
  }, [getToken]);

  if (loading) return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "60vh" }}>
      <div style={{ color: "#6b6b8a", fontSize: 14 }}>Loading market data…</div>
    </div>
  );

  if (error) return (
    <div style={{ padding: 32, color: "#ef4444", fontSize: 14 }}>Failed to load: {error}</div>
  );

  const sectors = data.sector_breakdown || [];
  const stages = data.stage_breakdown || [];
  const fits = data.fit_distribution || [];
  const mandates = data.mandate_breakdown || [];
  const hasMandate = mandates.length > 0;

  const maxMandate = Math.max(...mandates.map(m => m.value), 1);
  const maxStage = Math.max(...stages.map(s => s.value), 1);
  const maxFit = Math.max(...fits.map(f => f.value), 1);

  const stageWithPct = stages.map(s => ({
    ...s,
    pct: Math.round((s.value / data.total_companies) * 100),
    color: STAGE_COLORS[s.name] || "#5555aa",
    label: STAGE_LABELS[s.name] || s.name,
  }));

  return (
    <div style={{ padding: "28px 32px", background: "#0d0d18", minHeight: "100vh", fontFamily: "'Inter', 'SF Pro Display', -apple-system, sans-serif" }}>

      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 20, fontWeight: 700, color: "#fff", margin: 0, marginBottom: 4 }}>Market Map</h1>
        <p style={{ fontSize: 13, color: "#6b6b8a", margin: 0 }}>{data.total_companies} companies in database</p>
      </div>

      {/* Stat Tiles */}
      <div style={{ display: "flex", gap: 12, marginBottom: 24 }}>
        <StatTile label="Total Companies" value={data.total_companies} />
        <StatTile label="Added This Week" value={data.this_week} accent="#6366f1" />
        <StatTile label="Top Match Rate" value={`${data.top_match_rate}%`} accent="#22c55e" />
        <StatTile label="Avg Fit Score" value={data.avg_fit_score || "—"} accent="#f59e0b" />
      </div>

      {/* Sector Heatmap */}
      <Card style={{ marginBottom: 16 }}>
        <SectionLabel>Sector heatmap — tile brightness reflects avg thesis fit</SectionLabel>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))", gap: 10 }}>
          {sectors.map(s => (
            <SectorTile key={s.name} name={s.name} value={s.value} avgFit={s.avg_fit} />
          ))}
        </div>
      </Card>

      {/* Mandate + Stage */}
      <div style={{ display: "grid", gridTemplateColumns: hasMandate ? "1fr 1fr" : "1fr", gap: 16, marginBottom: 16 }}>

        {hasMandate && (
          <Card>
            <SectionLabel>Mandate breakdown</SectionLabel>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {mandates.map(m => (
                <MandateCard key={m.name} name={m.name} value={m.value} avgFit={m.avg_fit} maxValue={maxMandate} />
              ))}
            </div>
            <p style={{ fontSize: 11, color: "#4b4b6b", marginTop: 14, borderTop: "1px solid #1e1e30", paddingTop: 12, lineHeight: 1.5 }}>
              Avg fit score by mandate bucket — higher = stronger thesis alignment.
            </p>
          </Card>
        )}

        <Card>
          <SectionLabel>Stage distribution</SectionLabel>
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            {stageWithPct.map(s => (
              <div key={s.name}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                  <span style={{ fontSize: 13, color: "#c4c4d4", fontWeight: 500 }}>{s.label}</span>
                  <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                    <span style={{ fontSize: 12, color: s.color, fontWeight: 700 }}>{s.pct}%</span>
                    <span style={{ fontSize: 12, color: "#6b6b8a" }}>{s.value}</span>
                  </div>
                </div>
                <div style={{ background: "#1a1a2e", borderRadius: 4, height: 8, overflow: "hidden" }}>
                  <div style={{ width: `${(s.value / maxStage) * 100}%`, height: "100%", background: s.color, borderRadius: 4, transition: "width 0.6s ease" }} />
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* Fit Score Histogram */}
      <Card>
        <SectionLabel>Fit score distribution</SectionLabel>
        <div style={{ display: "flex", gap: 8, alignItems: "flex-end", padding: "8px 0" }}>
          {fits.map(f => {
            const cfg = FIT_CONFIG[f.name] || { label: f.name, color: "#6366f1" };
            return <FitBar key={f.name} value={f.value} maxValue={maxFit} color={cfg.color} label={cfg.label} />;
          })}
        </div>
      </Card>

    </div>
  );
}
