"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

const PERIOD_OPTIONS = [
  { key: "30d", label: "Dernier mois" },
  { key: "90d", label: "Dernier trimestre" },
  { key: "365d", label: "Dernière année" },
];

const METRIC_OPTIONS = [
  { key: "views", label: "Pages vues", dataKey: "views" },
  { key: "uniqueVisitors", label: "Visiteurs uniques", dataKey: "uniqueVisitors" },
  { key: "signups", label: "Inscriptions", dataKey: "signups" },
];

function StatCard({ label, value }) {
  return (
    <div className="filter-panel" style={{ minWidth: 160 }}>
      <div style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>{label}</div>
      <div className="display-font" style={{ fontSize: "1.6rem", marginTop: "0.3rem" }}>{value}</div>
    </div>
  );
}

function formatBucketLabel(dateStr, bucket) {
  if (bucket === "day") return dateStr.slice(5); // MM-JJ
  if (bucket === "week") return dateStr.split("-S").join(" S"); // 2026 S37
  return dateStr; // YYYY-MM
}

export default function AdminStatsPage() {
  const [period, setPeriod] = useState("30d");
  const [metric, setMetric] = useState("views");
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    setLoading(true);
    setError("");
    fetch(`/api/admin/stats?period=${period}`)
      .then((r) => {
        if (!r.ok) throw new Error("failed");
        return r.json();
      })
      .then(setStats)
      .catch(() => setError("Impossible de charger les statistiques."))
      .finally(() => setLoading(false));
  }, [period]);

  return (
    <div>
      <h1 className="display-font" style={{ fontSize: "1.3rem", marginBottom: "0.4rem" }}>Statistiques du site</h1>
      <p style={{ fontSize: "0.78rem", color: "var(--text-muted)", marginBottom: "1rem" }}>
        Données anonymes uniquement : aucune adresse IP n'est enregistrée, seulement des vues de page,
        un pays approximatif et un identifiant aléatoire non lié à une identité.
      </p>

      <div style={{ display: "flex", gap: "0.5rem", marginBottom: "1.5rem" }}>
        {PERIOD_OPTIONS.map((opt) => (
          <button
            key={opt.key}
            onClick={() => setPeriod(opt.key)}
            className={period === opt.key ? "btn-primary" : "btn-ghost"}
            style={{ fontSize: "0.8rem", padding: "0.4rem 0.9rem" }}
          >
            {opt.label}
          </button>
        ))}
      </div>

      {loading || !stats ? (
        <div className="empty-state">{error || "Chargement…"}</div>
      ) : (
        <>
          <div style={{ display: "flex", gap: "1rem", flexWrap: "wrap", marginBottom: "2rem" }}>
            <StatCard label="Pages vues (total)" value={stats.totals.pageViews} />
            <StatCard label="Pages vues (7 derniers jours)" value={stats.last7Days.pageViews} />
            <StatCard label="Pages vues (30 derniers jours)" value={stats.last30Days.pageViews} />
            <StatCard label={`Pages vues (${stats.periodLabel})`} value={stats.periodStats.pageViews} />
            <StatCard label={`Visiteurs uniques (${stats.periodLabel})`} value={stats.periodStats.uniqueVisitors} />
            <StatCard label="Visiteurs uniques (total)" value={stats.totals.uniqueVisitorsAllTime} />
            <StatCard label="Téléchargements HD (total)" value={stats.totals.hdDownloads} />
            <StatCard label="Comptes utilisateurs (total)" value={stats.totals.users} />
            <StatCard label={`Inscriptions (${stats.periodLabel})`} value={stats.periodStats.signups} />
          </div>

          <div className="filter-panel" style={{ marginBottom: "2rem" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "0.6rem", marginBottom: "1rem" }}>
              <div style={{ fontSize: "0.85rem" }}>
                Évolution {METRIC_OPTIONS.find((o) => o.key === metric).label.toLowerCase()} — {stats.periodLabel}
              </div>
              <div style={{ display: "flex", gap: "0.4rem" }}>
                {METRIC_OPTIONS.map((opt) => (
                  <button
                    key={opt.key}
                    onClick={() => setMetric(opt.key)}
                    className={metric === opt.key ? "btn-primary" : "btn-ghost"}
                    style={{ fontSize: "0.75rem", padding: "0.3rem 0.7rem" }}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>
            <div style={{ width: "100%", height: 260 }}>
              <ResponsiveContainer>
                <LineChart data={stats.daily}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--line)" />
                  <XAxis
                    dataKey="date"
                    tick={{ fontSize: 10, fill: "var(--text-muted)" }}
                    tickFormatter={(d) => formatBucketLabel(d, stats.bucket)}
                  />
                  <YAxis allowDecimals={false} tick={{ fontSize: 10, fill: "var(--text-muted)" }} />
                  <Tooltip
                    contentStyle={{ background: "var(--surface-raised)", border: "1px solid var(--line)", fontSize: "0.8rem" }}
                    labelStyle={{ color: "var(--text)" }}
                    labelFormatter={(d) => formatBucketLabel(d, stats.bucket)}
                  />
                  <Line
                    type="monotone"
                    dataKey={METRIC_OPTIONS.find((o) => o.key === metric).dataKey}
                    stroke="var(--accent)"
                    strokeWidth={2}
                    dot={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div style={{ display: "flex", gap: "1.5rem", flexWrap: "wrap" }}>
            <div className="filter-panel" style={{ flex: 1, minWidth: 260 }}>
              <div style={{ fontSize: "0.85rem", marginBottom: "0.8rem" }}>Pays d'origine des visiteurs ({stats.periodLabel})</div>
              {stats.byCountry.length === 0 ? (
                <div style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>Pas encore de données.</div>
              ) : (
                <table className="admin-table">
                  <tbody>
                    {stats.byCountry.map((c) => (
                      <tr key={c.country}>
                        <td>{c.country}</td>
                        <td style={{ textAlign: "right" }}>{c.count}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>

            <div className="filter-panel" style={{ flex: 1, minWidth: 260 }}>
              <div style={{ fontSize: "0.85rem", marginBottom: "0.8rem" }}>Pages les plus consultées ({stats.periodLabel})</div>
              {stats.topPages.length === 0 ? (
                <div style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>Pas encore de données.</div>
              ) : (
                <table className="admin-table">
                  <tbody>
                    {stats.topPages.map((p) => (
                      <tr key={p.path}>
                        <td style={{ fontFamily: "monospace", fontSize: "0.78rem" }}>
                          <Link
                            href={p.path}
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{ color: "var(--accent)", textDecoration: "none" }}
                            title={`Ouvrir ${p.path} dans un nouvel onglet`}
                          >
                            {p.path}
                          </Link>
                        </td>
                        <td style={{ textAlign: "right" }}>{p.count}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
