"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Plus, Sparkles } from "lucide-react";
import { useLanguage } from "@/components/LanguageProvider";

const STATUS_LABELS = {
  draft: { key: "statusDraft", color: "var(--text-muted)" },
  pending: { key: "statusPending", color: "var(--gold)" },
  approved: { key: "statusApproved", color: "#4caf6d" },
  rejected: { key: "statusRejected", color: "var(--accent)" },
};

export default function ProposeCollectionListPage() {
  const { t } = useLanguage();
  const router = useRouter();
  const [submissions, setSubmissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [nom, setNom] = useState("");
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/users/me/collection-submissions")
      .then((r) => (r.ok ? r.json() : []))
      .then(setSubmissions)
      .finally(() => setLoading(false));
  }, []);

  async function handleCreate(e) {
    e.preventDefault();
    if (!nom.trim()) return;
    setCreating(true);
    setError("");
    try {
      const res = await fetch("/api/users/me/collection-submissions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nom: nom.trim() }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error);
        return;
      }
      router.push(`/compte/proposer-collection/${data.id}`);
    } finally {
      setCreating(false);
    }
  }

  return (
    <div>
      <h1 className="display-font" style={{ fontSize: "1.3rem", marginBottom: "0.4rem", display: "flex", alignItems: "center", gap: "0.5rem" }}>
        <Sparkles size={20} /> {t.proposeCollectionTitle}
      </h1>
      <p style={{ fontSize: "0.82rem", color: "var(--text-muted)", marginBottom: "1.5rem" }}>{t.proposeCollectionIntro}</p>

      <form onSubmit={handleCreate} className="form-panel" style={{ marginBottom: "2rem", display: "flex", gap: "0.6rem", alignItems: "flex-end", flexWrap: "wrap", maxWidth: 480 }}>
        <div className="field" style={{ flex: 1, margin: 0, minWidth: 200 }}>
          <span className="field-label">{t.newCollectionNameLabel}</span>
          <input value={nom} onChange={(e) => setNom(e.target.value)} placeholder={t.newCollectionNamePlaceholder} />
        </div>
        <button className="btn-primary" type="submit" disabled={creating || !nom.trim()} style={{ display: "flex", alignItems: "center", gap: "0.3rem" }}>
          <Plus size={14} /> {t.startProposalCta}
        </button>
      </form>
      {error && <div className="toast error">{error}</div>}

      {loading ? (
        <div className="empty-state">{t.loading}</div>
      ) : submissions.length === 0 ? (
        <div className="empty-state">{t.noProposalsYet}</div>
      ) : (
        <div className="filter-panel" style={{ padding: 0, overflow: "hidden" }}>
          {submissions.map((s) => (
            <Link
              key={s.id}
              href={`/compte/proposer-collection/${s.id}`}
              style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0.7rem 1rem", borderBottom: "1px solid var(--line)" }}
            >
              <div>
                <div style={{ fontSize: "0.88rem" }}>{s.nom}</div>
                <div style={{ fontSize: "0.72rem", color: "var(--text-muted)" }}>{t.cardsCount(s._count.cards)}</div>
              </div>
              <span style={{ fontSize: "0.75rem", fontWeight: 600, color: STATUS_LABELS[s.status]?.color }}>
                {t[STATUS_LABELS[s.status]?.key]}
              </span>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
