"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Check, X } from "lucide-react";

export default function AdminScansPage() {
  const [submissions, setSubmissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("pending");

  async function load(status = filter) {
    setLoading(true);
    const res = await fetch(`/api/admin/submissions?status=${status}`);
    setSubmissions(await res.json());
    setLoading(false);
  }

  useEffect(() => { load(filter); }, [filter]);

  async function handleApprove(id) {
    await fetch(`/api/admin/submissions/${id}/approve`, { method: "POST" });
    load(filter);
  }

  async function handleReject(id) {
    if (!confirm("Refuser ce scan ? Le fichier envoyé sera supprimé du stockage.")) return;
    await fetch(`/api/admin/submissions/${id}/reject`, { method: "POST" });
    load(filter);
  }

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem", flexWrap: "wrap", gap: "0.75rem" }}>
        <h1 className="display-font" style={{ fontSize: "1.2rem" }}>Scans proposés</h1>
        <div className="field" style={{ margin: 0, minWidth: 200 }}>
          <select value={filter} onChange={(e) => setFilter(e.target.value)}>
            <option value="pending">En attente</option>
            <option value="approved">Acceptés</option>
            <option value="rejected">Refusés</option>
            <option value="all">Tous</option>
          </select>
        </div>
      </div>

      {loading ? (
        <div className="empty-state">Chargement…</div>
      ) : submissions.length === 0 ? (
        <div className="empty-state">Aucun scan dans cette catégorie.</div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
          {submissions.map((s) => (
            <div key={s.id} className="form-panel" style={{ display: "flex", gap: "1rem", flexWrap: "wrap", alignItems: "flex-start" }}>
              <img src={s.image} alt="" style={{ width: 70, height: 98, objectFit: "cover", border: "1px solid var(--line)", flexShrink: 0 }} />
              <div style={{ flex: 1, minWidth: 200 }}>
                <div style={{ fontSize: "0.85rem" }}>
                  <strong>{s.card.numero}</strong> — {s.card.personnage} · {s.card.collection?.nom}
                  <Link href={`/cartes/${s.card.id}`} target="_blank" style={{ marginLeft: "0.6rem", color: "var(--gold)", fontSize: "0.78rem" }}>
                    Voir la fiche ↗
                  </Link>
                </div>
                <div style={{ fontSize: "0.78rem", color: "var(--text-muted)", marginTop: "0.3rem" }}>
                  Proposé par <strong>{s.user.username}</strong>
                  {" · "}
                  {new Date(s.createdAt).toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "numeric" })}
                  {" · "}
                  {s.status === "pending" ? "En attente" : s.status === "approved" ? "Accepté" : "Refusé"}
                </div>
                {s.card.image && (
                  <div style={{ fontSize: "0.75rem", color: "var(--accent)", marginTop: "0.3rem" }}>
                    ⚠ Cette carte a déjà un visuel — l'accepter le remplacera.
                  </div>
                )}
                {s.status === "pending" && (
                  <div style={{ display: "flex", gap: "0.5rem", marginTop: "0.7rem" }}>
                    <button className="btn-primary" style={{ display: "flex", alignItems: "center", gap: "0.3rem", fontSize: "0.8rem" }} onClick={() => handleApprove(s.id)}>
                      <Check size={13} /> Accepter
                    </button>
                    <button className="btn-ghost" style={{ display: "flex", alignItems: "center", gap: "0.3rem", fontSize: "0.8rem" }} onClick={() => handleReject(s.id)}>
                      <X size={13} /> Refuser
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
