import { useAuth } from "@clerk/clerk-react";
import { useQuery } from "@tanstack/react-query";

const API = (import.meta.env.VITE_API_URL || 'http://localhost:8000') + '/api'

const STATUS_COLORS = {
  active: { bg: "#1a2e1a", color: "#22c55e", label: "Active" },
  acquired: { bg: "#1a1a2e", color: "#6366f1", label: "Acquired" },
  exited: { bg: "#2e2a1a", color: "#f59e0b", label: "Exited" },
  dead: { bg: "#2e1a1a", color: "#ef4444", label: "Dead" },
  unknown: { bg: "#1a1a2e", color: "#6b6b8a", label: "Active" },
};

const STAGE_LABELS = {
  "pre-seed": "Pre-Seed",
  "seed": "Seed",
  "series-a": "Series A",
  "series-b": "Series B",
  "unknown": "—",
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

function PortfolioCard({ company }) {
  const status = STATUS_COLORS[company.portfolio_status || "unknown"];
  const stage = STAGE_LABELS[company.funding_stage] || company.funding_stage || "—";
  const coInvestors = company.co_investors || [];
  const checkSize = company.check_size_usd
    ? `$${(company.check_size_usd / 1000).toFixed(0)}K`
    : null;
  const investmentDate = company.investment_date
    ? new Date(company.investment_date).toLocaleDateString("en-US", { month: "short", year: "numeric" })
    : null;

  return (
    <div style={{
      background: "#13131f",
      border: "1px solid #1e1e30",
      borderRadius: 14,
      padding: "20px 22px",
      display: "flex",
      flexDirection: "column",
      gap: 12,
      transition: "border-color 0.15s",
    }}
      onMouseEnter={e => e.currentTarget.style.borderColor = "#2e2e50"}
      onMouseLeave={e => e.currentTarget.style.borderColor = "#1e1e30"}
    >
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div>
          <div style={{ fontWeight: 700, fontSize: 15, color: "#f0f0ff", marginBottom: 4 }}>
            {company.name}
          </div>
          <div style={{ fontSize: 12, color: "#6b6b8a", lineHeight: 1.4 }}>
            {company.one_liner || "—"}
          </div>
        </div>
        <div style={{
          padding: "3px 10px",
          borderRadius: 20,
          fontSize: 11,
          fontWeight: 600,
          background: status.bg,
          color: status.color,
          whiteSpace: "nowrap",
          marginLeft: 12,
        }}>
          {status.label}
        </div>
      </div>

      {/* Meta row */}
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        {stage && stage !== "—" && (
          <span style={{
            padding: "3px 10px", borderRadius: 20, fontSize: 11,
            background: "#1a1a2e", color: "#8888aa", border: "1px solid #2a2a4a"
          }}>
            {stage}
          </span>
        )}
        {checkSize && (
          <span style={{
            padding: "3px 10px", borderRadius: 20, fontSize: 11,
            background: "#1a2e1a", color: "#22c55e", border: "1px solid #1e3e1e"
          }}>
            {checkSize}
          </span>
        )}
        {investmentDate && (
          <span style={{
            padding: "3px 10px", borderRadius: 20, fontSize: 11,
            background: "#1a1a2e", color: "#6b6b8a", border: "1px solid #2a2a4a"
          }}>
            {investmentDate}
          </span>
        )}
        {company.sector && (
          <span style={{
            padding: "3px 10px", borderRadius: 20, fontSize: 11,
            background: "#1e1a2e", color: "#a78bfa", border: "1px solid #2e2a4a"
          }}>
            {company.sector}
          </span>
        )}
      </div>

      {/* Co-investors */}
      {coInvestors.length > 0 && (
        <div style={{ borderTop: "1px solid #1e1e30", paddingTop: 10 }}>
          <div style={{ fontSize: 11, color: "#4b4b6b", marginBottom: 5, textTransform: "uppercase", letterSpacing: "0.08em" }}>
            Co-investors
          </div>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            {coInvestors.map((inv, i) => (
              <span key={i} style={{
                fontSize: 11, color: "#8888aa",
                padding: "2px 8px", background: "#1a1a2e",
                borderRadius: 4, border: "1px solid #2a2a4a"
              }}>
                {inv}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Website */}
      {company.website && (
        <a
          href={company.website.startsWith("http") ? company.website : `https://${company.website}`}
          target="_blank"
          rel="noopener noreferrer"
          style={{ fontSize: 11, color: "#6366f1", textDecoration: "none" }}
        >
          {company.website.replace(/https?:\/\//, "")} ↗
        </a>
      )}
    </div>
  );
}

export default function Portfolio() {
  const { getToken } = useAuth();
  const { data: companies = [], isLoading: loading, error } = useQuery({
    queryKey: ["portfolio"],
    queryFn: async () => {
      const token = await getToken().catch(() => null);
      const headers = token ? { Authorization: `Bearer ${token}` } : {};
      const res = await fetch(`${API}/startups/portfolio`, { headers });
      if (!res.ok) throw new Error("Failed to load portfolio");
      return res.json();
    },
    staleTime: 1000 * 60 * 10,
  });

  if (loading) return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "60vh" }}>
      <div style={{ color: "#6b6b8a", fontSize: 14 }}>Loading portfolio…</div>
    </div>
  );

  if (error) return (
    <div style={{ padding: 32, color: "#ef4444", fontSize: 14 }}>Failed to load: {error?.message}</div>
  );

  // Stats
  const total = companies.length;
  const active = companies.filter(c => !c.portfolio_status || c.portfolio_status === "active" || c.portfolio_status === "unknown").length;
  const exited = companies.filter(c => ["acquired", "exited"].includes(c.portfolio_status)).length;
  const totalDeployed = companies.reduce((sum, c) => sum + (c.check_size_usd || 0), 0);
  const deployedLabel = totalDeployed > 0
    ? totalDeployed >= 1_000_000
      ? `$${(totalDeployed / 1_000_000).toFixed(1)}M`
      : `$${(totalDeployed / 1000).toFixed(0)}K`
    : "—";

  // Co-investor frequency
  const coInvestorMap = {};
  companies.forEach(c => {
    (c.co_investors || []).forEach(inv => {
      coInvestorMap[inv] = (coInvestorMap[inv] || 0) + 1;
    });
  });
  const topCoInvestors = Object.entries(coInvestorMap)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);

  if (total === 0) return (
    <div style={{
      padding: "28px 32px",
      background: "#0d0d18",
      minHeight: "100vh",
      fontFamily: "'Inter', 'SF Pro Display', -apple-system, sans-serif",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
    }}>
      <div style={{ textAlign: "center" }}>
        <div style={{ fontSize: 32, marginBottom: 12 }}>🏆</div>
        <div style={{ fontSize: 16, fontWeight: 600, color: "#f0f0ff", marginBottom: 8 }}>No portfolio companies yet</div>
        <div style={{ fontSize: 13, color: "#6b6b8a" }}>Import your portfolio in Firm Settings to get started.</div>
      </div>
    </div>
  );

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
          Portfolio
        </h1>
        <p style={{ fontSize: 13, color: "#6b6b8a", margin: 0 }}>
          {total} companies backed
        </p>
      </div>

      {/* Stat Tiles */}
      <div style={{ display: "flex", gap: 12, marginBottom: 24 }}>
        <StatTile label="Total Backed" value={total} />
        <StatTile label="Active" value={active} accent="#22c55e" />
        <StatTile label="Exited" value={exited} accent="#6366f1" />
        <StatTile label="Capital Deployed" value={deployedLabel} accent="#f59e0b" />
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 280px", gap: 20 }}>

        {/* Company Grid */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", gap: 14, alignContent: "start" }}>
          {companies.map(c => (
            <PortfolioCard key={c.id} company={c} />
          ))}
        </div>

        {/* Sidebar: Co-investor map */}
        {topCoInvestors.length > 0 && (
          <div style={{
            background: "#13131f",
            border: "1px solid #1e1e30",
            borderRadius: 14,
            padding: "20px 22px",
            alignSelf: "start",
          }}>
            <div style={{
              fontSize: 11, fontWeight: 700, letterSpacing: "0.12em",
              color: "#6366f1", textTransform: "uppercase", marginBottom: 16,
            }}>
              Top Co-Investors
            </div>
            {topCoInvestors.map(([name, count]) => (
              <div key={name} style={{
                display: "flex", justifyContent: "space-between",
                alignItems: "center", marginBottom: 12,
              }}>
                <span style={{ fontSize: 13, color: "#c4c4d4" }}>{name}</span>
                <span style={{
                  fontSize: 11, fontWeight: 700,
                  color: "#6366f1", background: "#1a1a3e",
                  padding: "2px 8px", borderRadius: 20,
                }}>
                  {count} deal{count > 1 ? "s" : ""}
                </span>
              </div>
            ))}
            <p style={{ fontSize: 11, color: "#4b4b6b", marginTop: 16, lineHeight: 1.5, borderTop: "1px solid #1e1e30", paddingTop: 12 }}>
              Use these relationships for warm intros on new deals.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
