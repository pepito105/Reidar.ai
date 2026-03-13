import { useEffect, useState } from "react";
import { useAuth } from "@clerk/clerk-react";

const API = "http://localhost:8000/api";

const FIT_COLORS = {
  "Score 1": "#4b4b6b",
  "Score 2": "#6b5b8b",
  "Score 3": "#f59e0b",
  "Score 4": "#6366f1",
  "Score 5": "#22c55e",
};

const FIT_LABELS = {
  "Score 1": "No Fit",
  "Score 2": "Weak",
  "Score 3": "Possible",
  "Score 4": "Strong",
  "Score 5": "Top Match",
};

const STAGE_COLORS = {
  "pre-seed": "#8b5cf6",
  "seed": "#6366f1",
  "series-a": "#818cf8",
  "series-b": "#a78bfa",
  "unknown": "#3b3b5c",
};

function StatTile({ label, value, accent }) {
  return (
    <div style={{
      background: "#13131f",
      border: "1px solid #1e1e30",
      borderRadius: 12,
      padding: "20px 24px",
      flex: 1,
    }}>
      <div style={{
        fontSize: 28,
        fontWeight: 700,
        color: accent || "#fff",
        letterSpacing: "-0.5px",
        lineHeight: 1,
        marginBottom: 6,
      }}>{value}</div>
      <div style={{ fontSize: 12, color: "#6b6b8a", textTransform: "uppercase", letterSpacing: "0.08em" }}>
        {label}
      </div>
    </div>
  );
}

function HorizBar({ name, value, maxValue, color, suffix, rightLabel }) {
  const pct = maxValue > 0 ? (value / maxValue) * 100 : 0;
  return (
    <div style={{ marginBottom: 14 }}>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 5 }}>
        <span style={{ fontSize: 13, color: "#c4c4d4", fontWeight: 500 }}>{name}</span>
        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
          {rightLabel && (
            <span style={{ fontSize: 12, color: color || "#6366f1", fontWeight: 600 }}>{rightLabel}</span>
          )}
          <span style={{ fontSize: 13, color: "#9090b0" }}>{value}{suffix || ""}</span>
        </div>
      </div>
      <div style={{ background: "#1a1a2e", borderRadius: 4, height: 6, overflow: "hidden" }}>
        <div style={{
          width: `${pct}%`,
          height: "100%",
          background: color || "#6366f1",
          borderRadius: 4,
          transition: "width 0.6s ease",
        }} />
      </div>
    </div>
  );
}

function SectionHeader({ children }) {
  return (
    <div style={{
      fontSize: 11,
      fontWeight: 700,
      letterSpacing: "0.12em",
      color: "#6366f1",
      textTransform: "uppercase",
      marginBottom: 18,
    }}>{children}</div>
  );
}

function Card({ children, style = {} }) {
  return (
    <div style={{
      background: "#13131f",
      border: "1px solid #1e1e30",
      borderRadius: 14,
      padding: "22px 24px",
      ...style,
    }}>
      {children}
    </div>
  );
}

export default function MarketMap() {
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

  const maxSector = Math.max(...(data.sector_breakdown || []).map(s => s.value), 1);
  const maxStage = Math.max(...(data.stage_breakdown || []).map(s => s.value), 1);
  const maxFit = Math.max(...(data.fit_distribution || []).map(s => s.value), 1);
  const maxMandate = Math.max(...(data.mandate_breakdown || []).map(s => s.value), 1);

  const hasMandate = data.mandate_breakdown && data.mandate_breakdown.length > 0;

  // Compute stage percentages
  const stageWithPct = (data.stage_breakdown || []).map(s => ({
    ...s,
    pct: Math.round((s.value / data.total_companies) * 100),
    color: STAGE_COLORS[s.name] || "#5555aa",
  }));

  const stageLabels = {
    "pre-seed": "Pre-Seed",
    "seed": "Seed",
    "series-a": "Series A",
    "series-b": "Series B",
    "unknown": "Unknown",
  };

  return (
    <div style={{
      padding: "28px 32px",
      background: "#0d0d18",
      minHeight: "100vh",
      fontFamily: "'Inter', 'SF Pro Display', -apple-system, sans-serif",
    }}>

      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 20, fontWeight: 700, color: "#fff", margin: 0, marginBottom: 4 }}>
          Market Map
        </h1>
        <p style={{ fontSize: 13, color: "#6b6b8a", margin: 0 }}>
          {data.total_companies} companies in database
        </p>
      </div>

      {/* Stat Tiles */}
      <div style={{ display: "flex", gap: 12, marginBottom: 20 }}>
        <StatTile label="Total Companies" value={data.total_companies} />
        <StatTile label="Added This Week" value={data.this_week} accent="#6366f1" />
        <StatTile label="Top Match Rate" value={`${data.top_match_rate}%`} accent="#22c55e" />
        <StatTile label="Avg AI Score" value={data.avg_ai_score} accent="#f59e0b" />
      </div>

      {/* Row 1: Sectors + Mandate Breakdown */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 16 }}>

        {/* Top Sectors */}
        <Card>
          <SectionHeader>Top Sectors</SectionHeader>
          {(data.sector_breakdown || []).map(s => (
            <HorizBar
              key={s.name}
              name={s.name}
              value={s.value}
              maxValue={maxSector}
              color="#6366f1"
              rightLabel={s.avg_fit ? `${s.avg_fit} avg fit` : null}
            />
          ))}
        </Card>

        {/* Mandate Breakdown — only shown if firm has a thesis, otherwise Stage Distribution */}
        {hasMandate ? (
          <Card>
            <SectionHeader>Mandate Breakdown</SectionHeader>
            {(data.mandate_breakdown || []).map(m => (
              <HorizBar
                key={m.name}
                name={m.name}
                value={m.value}
                maxValue={maxMandate}
                color="#8b5cf6"
                rightLabel={m.avg_fit ? `${m.avg_fit} avg fit` : null}
              />
            ))}
            <p style={{
              fontSize: 12,
              color: "#4b4b6b",
              marginTop: 16,
              borderTop: "1px solid #1e1e30",
              paddingTop: 14,
              lineHeight: 1.5,
            }}>
              Mandate categories are derived from your firm's investment thesis and updated on each rescore.
            </p>
          </Card>
        ) : (
          <Card>
            <SectionHeader>Stage Distribution</SectionHeader>
            {stageWithPct.map(s => (
              <HorizBar
                key={s.name}
                name={stageLabels[s.name] || s.name}
                value={s.value}
                maxValue={maxStage}
                color={s.color}
                rightLabel={`${s.pct}%`}
              />
            ))}
          </Card>
        )}
      </div>

      {/* Row 2: Stage Distribution + Fit Score Distribution */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>

        {/* Stage Distribution — only shown in row 2 if mandate breakdown is present */}
        {hasMandate && (
          <Card>
            <SectionHeader>Stage Distribution</SectionHeader>
            {stageWithPct.map(s => (
              <HorizBar
                key={s.name}
                name={stageLabels[s.name] || s.name}
                value={s.value}
                maxValue={maxStage}
                color={s.color}
                rightLabel={`${s.pct}%`}
              />
            ))}
          </Card>
        )}

        {/* Fit Score Distribution */}
        <Card style={{ gridColumn: hasMandate ? "auto" : "1 / -1" }}>
          <SectionHeader>Fit Score Distribution</SectionHeader>
          {(data.fit_distribution || []).map(f => (
            <HorizBar
              key={f.name}
              name={FIT_LABELS[f.name] || f.name}
              value={f.value}
              maxValue={maxFit}
              color={FIT_COLORS[f.name] || "#6366f1"}
            />
          ))}
        </Card>
      </div>

    </div>
  );
}
