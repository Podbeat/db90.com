"use client";

import { useEffect, useState } from "react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

function StatCard({ label, value }) {
  return (
    <div className="filter-panel" style={{ minWidth: 160 }}>
      <div style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>{label}</div>
      <div className="display-font" style={{ fontSize: "1.6rem", marginTop: "0.3rem" }}>{value}</div>
    </div>
  );
}

export default function AdminStatsPage() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/admin/stats")
      .then((r) => {
        if (!r.ok) throw new Error("failed");
        return r.json();
      })
      .then(setStats)
      .catch(() => setError("Impossible de charger les statistiques."))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="empty-state">Chargement…</div>;
  if (error || !stats) return <div className="empty-state">{error || "Aucune donnée."}</div>;

  return (
    <div>
      <h1 className="display-font" style={{ fontSize: "1.3rem", marginBottom: "0.4rem" }}>Statistiques du site</h1>
      <p style={{ fontSize: "0.78rem", color: "var(--text-muted)", marginBottom: "1.5rem" }}>
        Données anonymes uniquement : aucune adresse IP n'est enregistrée, seulement des vues de page,
        un pays approximatif et un identifiant aléatoire non lié à une identité.
      </p>

      <div style={{ display: "flex", gap: "1rem", flexWrap: "wrap", marginBottom: "2rem" }}>
        <StatCard label="Pages vues (total)" value={stats.totals.pageViews} />
        <StatCard label="Pages vues (7 derniers jours)" value={stats.last7Days.pageViews} />
        <StatCard label="Pages vues (30 derniers jours)" value={stats.last30Days.pageViews} />
        <StatCard label="Visiteurs uniques (30 jours)" value={stats.last30Days.uniqueVisitors} />
        <StatCard label="Visiteurs uniques (total)" value={stats.totals.uniqueVisitorsAllTime} />
        <StatCard label="Téléchargements HD (total)" value={stats.totals.hdDownloads} />
      </div>

      <div className="filter-panel" style={{ marginBottom: "2rem" }}>
        <div style={{ fontSize: "0.85rem", marginBottom: "1rem" }}>Évolution des pages vues — 30 derniers jours</div>
        <div style={{ width: "100%", height: 260 }}>
          <ResponsiveContainer>
            <LineChart data={stats.daily}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--line)" />
              <XAxis dataKey="date" tick={{ fontSize: 10, fill: "var(--text-muted)" }} tickFormatter={(d) => d.slice(5)} />
              <YAxis allowDecimals={false} tick={{ fontSize: 10, fill: "var(--text-muted)" }} />
              <Tooltip
                contentStyle={{ background: "var(--surface-raised)", border: "1px solid var(--line)", fontSize: "0.8rem" }}
                labelStyle={{ color: "var(--text)" }}
              />
              <Line type="monotone" dataKey="views" stroke="var(--accent)" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div style={{ display: "flex", gap: "1.5rem", flexWrap: "wrap" }}>
        <div className="filter-panel" style={{ flex: 1, minWidth: 260 }}>
          <div style={{ fontSize: "0.85rem", marginBottom: "0.8rem" }}>Pays d'origine des visiteurs (30 jours)</div>
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
          <div style={{ fontSize: "0.85rem", marginBottom: "0.8rem" }}>Pages les plus consultées (30 jours)</div>
          {stats.topPages.length === 0 ? (
            <div style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>Pas encore de données.</div>
          ) : (
            <table className="admin-table">
              <tbody>
                {stats.topPages.map((p) => (
                  <tr key={p.path}>
                    <td style={{ fontFamily: "monospace", fontSize: "0.78rem" }}>{p.path}</td>
                    <td style={{ textAlign: "right" }}>{p.count}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
