"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Check, X, Trash2 } from "lucide-react";

const STATUS_LABELS = { nouveau: "Nouveau", traite: "Traité", ignore: "Ignoré" };

export default function AdminReportsPage() {
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("nouveau");

  async function load(status = filter) {
    setLoading(true);
    const res = await fetch(`/api/reports?status=${status}`);
    setReports(await res.json());
    setLoading(false);
  }

  useEffect(() => { load(filter); }, [filter]);

  async function updateStatus(id, status) {
    await fetch(`/api/reports/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    load(filter);
  }

  async function remove(id) {
    await fetch(`/api/reports/${id}`, { method: "DELETE" });
    load(filter);
  }

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem", flexWrap: "wrap", gap: "0.75rem" }}>
        <h1 className="display-font" style={{ fontSize: "1.2rem" }}>Signalements</h1>
        <div className="field" style={{ margin: 0, minWidth: 200 }}>
          <select value={filter} onChange={(e) => setFilter(e.target.value)}>
            <option value="nouveau">Nouveaux</option>
            <option value="traite">Traités</option>
            <option value="ignore">Ignorés</option>
            <option value="all">Tous</option>
          </select>
        </div>
      </div>

      {loading ? (
        <div className="empty-state">Chargement…</div>
      ) : reports.length === 0 ? (
        <div className="empty-state">Aucun signalement dans cette catégorie.</div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
          {reports.map((r) => (
            <div key={r.id} className="form-panel">
              <div style={{ display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: "0.5rem" }}>
                <div style={{ fontSize: "0.85rem" }}>
                  <strong>{r.card.numero}</strong> — {r.card.personnage} · {r.card.collection?.nom}
                  <Link href={`/cartes/${r.card.id}`} target="_blank" style={{ marginLeft: "0.6rem", color: "var(--gold)", fontSize: "0.78rem" }}>
                    Voir la fiche ↗
                  </Link>
                </div>
                <span style={{ fontSize: "0.7rem", color: "var(--text-muted)" }}>
                  {new Date(r.createdAt).toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "numeric" })}
                  {" · "}{STATUS_LABELS[r.status] || r.status}
                </span>
              </div>
              <p style={{ fontSize: "0.85rem", margin: "0.6rem 0" }}>{r.message}</p>
              {r.contact && (
                <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginBottom: "0.6rem" }}>Contact : {r.contact}</div>
              )}
              <div style={{ display: "flex", gap: "0.5rem" }}>
                {r.status !== "traite" && (
                  <button className="btn-ghost" style={{ display: "flex", alignItems: "center", gap: "0.3rem" }} onClick={() => updateStatus(r.id, "traite")}>
                    <Check size={13} /> Marquer traité
                  </button>
                )}
                {r.status !== "ignore" && (
                  <button className="btn-ghost" style={{ display: "flex", alignItems: "center", gap: "0.3rem" }} onClick={() => updateStatus(r.id, "ignore")}>
                    <X size={13} /> Ignorer
                  </button>
                )}
                <button className="btn-icon" onClick={() => remove(r.id)}><Trash2 size={13} /></button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
