"use client";

import { useEffect, useState } from "react";
import { TrendingUp } from "lucide-react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { useLanguage } from "@/components/LanguageProvider";

const CONDITIONS_ORDER = ["Satisfaisant", "Bon état", "Très bon état", "Neuve"];

export default function CardCoteChart({ cardId }) {
  const { t } = useLanguage();
  const [data, setData] = useState(null);

  useEffect(() => {
    fetch(`/api/cards/${cardId}/cote`)
      .then((r) => (r.ok ? r.json() : null))
      .then(setData)
      .catch(() => {});
  }, [cardId]);

  if (!data || data.coteNeuve == null) {
    return (
      <div className="filter-panel" style={{ marginTop: "1.5rem" }}>
        <div className="display-font" style={{ fontSize: "0.95rem", marginBottom: "0.4rem", display: "flex", alignItems: "center", gap: "0.4rem" }}>
          <TrendingUp size={15} /> {t.coteTitle}
        </div>
        <div style={{ fontSize: "0.78rem", color: "var(--text-muted)" }}>{t.coteNotEnoughData}</div>
      </div>
    );
  }

  const chartData = data.history.map((h) => ({
    date: new Date(h.createdAt).toLocaleDateString("fr-FR", { day: "2-digit", month: "short" }),
    cote: Math.round(h.cote * 100) / 100,
  }));

  return (
    <div className="filter-panel" style={{ marginTop: "1.5rem" }}>
      <div className="display-font" style={{ fontSize: "0.95rem", marginBottom: "0.4rem", display: "flex", alignItems: "center", gap: "0.4rem" }}>
        <TrendingUp size={15} /> {t.coteTitle}
      </div>
      <div style={{ fontSize: "0.72rem", color: "var(--text-muted)", marginBottom: "0.8rem" }}>
        {t.coteBasedOn(data.sampleSize)}
      </div>

      <div style={{ display: "flex", gap: "0.6rem", flexWrap: "wrap", marginBottom: "1rem" }}>
        {CONDITIONS_ORDER.map((cond) => (
          <div key={cond} style={{ flex: 1, minWidth: 100, textAlign: "center", border: "1px solid var(--line)", padding: "0.5rem 0.3rem" }}>
            <div style={{ fontSize: "0.68rem", color: "var(--text-muted)" }}>{cond}</div>
            <div style={{ fontSize: "1rem", fontWeight: 700, color: cond === "Neuve" ? "var(--gold)" : "var(--text)" }}>
              {data.byCondition[cond]} €
            </div>
          </div>
        ))}
      </div>

      {chartData.length > 1 && (
        <div style={{ width: "100%", height: 180 }}>
          <ResponsiveContainer>
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--line)" />
              <XAxis dataKey="date" tick={{ fontSize: 10, fill: "var(--text-muted)" }} />
              <YAxis tick={{ fontSize: 10, fill: "var(--text-muted)" }} width={40} />
              <Tooltip
                contentStyle={{ background: "var(--surface-raised)", border: "1px solid var(--line)", fontSize: "0.8rem" }}
                labelStyle={{ color: "var(--text)" }}
                formatter={(v) => [`${v} €`, t.coteNeuveLabel]}
              />
              <Line type="monotone" dataKey="cote" stroke="var(--accent)" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}
