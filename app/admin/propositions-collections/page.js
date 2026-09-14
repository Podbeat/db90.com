"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Check, X, ChevronDown, ChevronUp } from "lucide-react";

const STATUS_LABELS = { draft: "Brouillon", pending: "En attente", approved: "Acceptée", rejected: "Refusée" };

function ProposalDetail({ id }) {
  const [detail, setDetail] = useState(null);

  useEffect(() => {
    fetch(`/api/admin/collection-submissions/${id}`)
      .then((r) => r.json())
      .then(setDetail);
  }, [id]);

  if (!detail) return <div style={{ padding: "1rem", fontSize: "0.8rem", color: "var(--text-muted)" }}>Chargement…</div>;

  return (
    <div style={{ padding: "0 1rem 1rem" }}>
      <div style={{ fontSize: "0.78rem", color: "var(--text-muted)", marginBottom: "0.6rem" }}>
        {[detail.annee, detail.editeur, detail.pays, detail.total ? `${detail.total} cartes annoncées` : null].filter(Boolean).join(" · ")}
        {detail.description && <p style={{ marginTop: "0.4rem" }}>{detail.description}</p>}
      </div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: "0.6rem" }}>
        {detail.cards.map((c) => (
          <div key={c.id} style={{ width: 90 }}>
            <img src={c.image} alt="" style={{ width: 90, height: 126, objectFit: "cover", border: "1px solid var(--line)" }} />
            <div style={{ fontSize: "0.68rem", marginTop: "0.2rem" }}>n°{c.numero}</div>
            <div style={{ fontSize: "0.65rem", color: "var(--text-muted)" }}>{c.personnagePrincipal?.name || "?"} · {c.rarete}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function AdminCollectionSubmissionsPage() {
  const [submissions, setSubmissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("pending");
  const [expandedId, setExpandedId] = useState(null);

  function load(status = filter) {
    setLoading(true);
    fetch(`/api/admin/collection-submissions?status=${status}`)
      .then((r) => r.json())
      .then(setSubmissions)
      .finally(() => setLoading(false));
  }

  useEffect(() => { load(filter); }, [filter]);

  async function handleApprove(id) {
    if (!confirm("Accepter cette proposition ? Une nouvelle collection sera créée avec toutes ses cartes.")) return;
    const res = await fetch(`/api/admin/collection-submissions/${id}/approve`, { method: "POST" });
    const data = await res.json();
    if (res.ok) load();
    else alert(data.error);
  }

  async function handleReject(id) {
    if (!confirm("Refuser cette proposition ? Les images envoyées seront supprimées.")) return;
    await fetch(`/api/admin/collection-submissions/${id}/reject`, { method: "POST" });
    load();
  }

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem", flexWrap: "wrap", gap: "0.75rem" }}>
        <h1 className="display-font" style={{ fontSize: "1.2rem" }}>Propositions de collections</h1>
        <div className="field" style={{ margin: 0, minWidth: 200 }}>
          <select value={filter} onChange={(e) => setFilter(e.target.value)}>
            <option value="pending">En attente</option>
            <option value="draft">Brouillons</option>
            <option value="approved">Acceptées</option>
            <option value="rejected">Refusées</option>
            <option value="all">Toutes</option>
          </select>
        </div>
      </div>

      {loading ? (
        <div className="empty-state">Chargement…</div>
      ) : submissions.length === 0 ? (
        <div className="empty-state">Aucune proposition dans cette catégorie.</div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
          {submissions.map((s) => (
            <div key={s.id} className="form-panel" style={{ padding: 0 }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0.8rem 1rem", flexWrap: "wrap", gap: "0.5rem" }}>
                <div>
                  <strong style={{ fontSize: "0.9rem" }}>{s.nom}</strong>
                  <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginTop: "0.2rem" }}>
                    Par {s.user.username} · {s._count.cards} carte{s._count.cards > 1 ? "s" : ""} · {STATUS_LABELS[s.status]}
                    {" · "}
                    {new Date(s.updatedAt).toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "numeric" })}
                  </div>
                </div>
                <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
                  <button className="btn-ghost" style={{ fontSize: "0.75rem", display: "flex", alignItems: "center", gap: "0.3rem" }} onClick={() => setExpandedId(expandedId === s.id ? null : s.id)}>
                    {expandedId === s.id ? <ChevronUp size={13} /> : <ChevronDown size={13} />} Voir les cartes
                  </button>
                  {s.status === "pending" && (
                    <>
                      <button className="btn-primary" style={{ fontSize: "0.78rem", display: "flex", alignItems: "center", gap: "0.3rem" }} onClick={() => handleApprove(s.id)}>
                        <Check size={13} /> Accepter
                      </button>
                      <button className="btn-ghost" style={{ fontSize: "0.78rem", display: "flex", alignItems: "center", gap: "0.3rem" }} onClick={() => handleReject(s.id)}>
                        <X size={13} /> Refuser
                      </button>
                    </>
                  )}
                  {s.status === "approved" && s.resultingCollectionId && (
                    <Link href={`/collections/${s.resultingCollectionId}`} target="_blank" style={{ fontSize: "0.78rem", color: "var(--gold)" }}>
                      Voir la collection ↗
                    </Link>
                  )}
                </div>
              </div>
              {expandedId === s.id && <ProposalDetail id={s.id} />}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
