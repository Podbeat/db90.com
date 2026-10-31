"use client";

import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";

// Courbe de cote d'une carte. Isolée dans son propre fichier pour être chargée à la demande
// (next/dynamic dans CardMarketplace) : la librairie recharts (~100 Ko compressés) n'est
// téléchargée que sur les fiches qui ont réellement une cote, pas sur toutes.
export default function CoteLineChart({ data, valueLabel }) {
  return (
    <ResponsiveContainer>
      <LineChart data={data}>
        <XAxis dataKey="date" tick={{ fontSize: 9, fill: "var(--text-muted)" }} />
        <YAxis tick={{ fontSize: 9, fill: "var(--text-muted)" }} width={32} domain={["auto", "auto"]} />
        <Tooltip
          contentStyle={{ background: "var(--surface-raised)", border: "1px solid var(--line)", fontSize: "0.75rem" }}
          labelStyle={{ color: "var(--text)" }}
          formatter={(v) => [`${v} €`, valueLabel]}
        />
        <Line type="monotone" dataKey="cote" stroke="var(--accent)" strokeWidth={2} dot={{ r: 3, fill: "var(--accent)" }} />
      </LineChart>
    </ResponsiveContainer>
  );
}
