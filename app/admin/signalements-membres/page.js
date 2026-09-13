"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Check, X } from "lucide-react";

const STATUS_LABELS = { nouveau: "Nouveau", traite: "Traité", ignore: "Ignoré" };

export default function AdminUserReportsPage() {
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    const res = await fetch("/api/admin/user-reports");
    setReports(await res.json());
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  async function updateStatus(id, status) {
    await fetch(`/api/admin/user-reports/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    load();
  }

  return (
    <div>
      <h1 className="display-font" style={{ fontSize: "1.2rem", marginBottom: "1rem" }}>Signalements de membres</h1>

      {loading ? (
        <div className="empty-state">Chargement…</div>
      ) : reports.length === 0 ? (
        <div className="empty-state">Aucun signalement pour l'instant.</div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
          {reports.map((r) => (
            <div key={r.id} className="form-panel">
              <div style={{ display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: "0.5rem" }}>
                <div style={{ fontSize: "0.85rem" }}>
                  Membre signalé : <strong>{r.reportedUser.username}</strong> ({r.reportedUser.email})
                  <Link href={`/u/${r.reportedUser.username}`} target="_blank" style={{ marginLeft: "0.6rem", color: "var(--gold)", fontSize: "0.78rem" }}>
                    Voir le profil ↗
                  </Link>
                </div>
                <span style={{ fontSize: "0.7rem", color: "var(--text-muted)" }}>
                  {new Date(r.createdAt).toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "numeric" })}
                  {" · "}{STATUS_LABELS[r.status] || r.status}
                </span>
              </div>
              <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginTop: "0.3rem" }}>
                Signalé par : {r.reporterUser?.username || "compte supprimé"}
              </div>
              <p style={{ fontSize: "0.85rem", margin: "0.6rem 0" }}>{r.message}</p>
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
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
