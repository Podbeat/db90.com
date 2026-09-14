"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Plus, Pencil, Trash2, Send, Check, X } from "lucide-react";
import { useLanguage } from "@/components/LanguageProvider";
import { submitCollectionSubmissionCard } from "@/lib/clientUpload";

const STATUS_LABELS = {
  draft: { key: "statusDraft", color: "var(--text-muted)" },
  pending: { key: "statusPending", color: "var(--gold)" },
  approved: { key: "statusApproved", color: "#4caf6d" },
  rejected: { key: "statusRejected", color: "var(--accent)" },
};

export default function ProposeCollectionBuilderPage() {
  const { t } = useLanguage();
  const { id } = useParams();
  const router = useRouter();

  const [submission, setSubmission] = useState(null);
  const [loading, setLoading] = useState(true);
  const [characters, setCharacters] = useState([]);
  const [message, setMessage] = useState(null);

  const [nom, setNom] = useState("");
  const [annee, setAnnee] = useState("");
  const [editeur, setEditeur] = useState("");
  const [pays, setPays] = useState("");
  const [total, setTotal] = useState("");
  const [description, setDescription] = useState("");

  const [newNumero, setNewNumero] = useState("");
  const [newRarete, setNewRarete] = useState("Commune");
  const [newPersonnage, setNewPersonnage] = useState("");
  const [uploading, setUploading] = useState(false);

  function load() {
    fetch(`/api/collection-submissions/${id}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (!data) return;
        setSubmission(data);
        setNom(data.nom || "");
        setAnnee(data.annee || "");
        setEditeur(data.editeur || "");
        setPays(data.pays || "");
        setTotal(data.total || "");
        setDescription(data.description || "");
      })
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    load();
    fetch("/api/characters").then((r) => (r.ok ? r.json() : [])).then(setCharacters).catch(() => {});
  }, [id]);

  const editable = submission && (submission.status === "draft" || submission.status === "pending");

  async function handleSaveMeta(e) {
    e.preventDefault();
    const res = await fetch(`/api/collection-submissions/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ nom, annee, editeur, pays, total, description }),
    });
    const data = await res.json();
    if (res.ok) {
      setMessage({ type: "success", text: "Enregistré." });
      load();
    } else {
      setMessage({ type: "error", text: data.error });
    }
  }

  async function handleAddCard(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!newNumero.trim()) {
      setMessage({ type: "error", text: t.cardNumberRequired });
      return;
    }
    setUploading(true);
    setMessage(null);
    try {
      await submitCollectionSubmissionCard(id, file, { numero: newNumero.trim(), rarete: newRarete, personnagePrincipalId: newPersonnage });
      setNewNumero("");
      setNewRarete("Commune");
      setNewPersonnage("");
      load();
    } catch (err) {
      setMessage({ type: "error", text: err.message });
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  }

  async function handleDeleteCard(cardId) {
    await fetch(`/api/collection-submissions/${id}/cards/${cardId}`, { method: "DELETE" });
    load();
  }

  async function handleSubmitForReview() {
    const res = await fetch(`/api/collection-submissions/${id}/submit`, { method: "POST" });
    const data = await res.json();
    if (res.ok) {
      load();
    } else {
      setMessage({ type: "error", text: data.error });
    }
  }

  if (loading) return <div className="empty-state">{t.loading}</div>;
  if (!submission) return <div className="empty-state">{t.profileNotFound}</div>;

  return (
    <div>
      <Link href="/compte/proposer-collection" className="btn-ghost" style={{ fontSize: "0.78rem", display: "inline-flex", alignItems: "center", gap: "0.3rem", marginBottom: "1rem" }}>
        <ArrowLeft size={13} /> {t.backToProposals}
      </Link>

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "0.6rem", marginBottom: "1.25rem" }}>
        <h1 className="display-font" style={{ fontSize: "1.3rem" }}>{submission.nom}</h1>
        <span style={{ fontSize: "0.8rem", fontWeight: 600, color: STATUS_LABELS[submission.status]?.color }}>
          {t[STATUS_LABELS[submission.status]?.key]}
        </span>
      </div>

      {submission.status === "approved" && submission.resultingCollectionId && (
        <div className="toast success" style={{ marginBottom: "1.25rem" }}>
          {t.proposalApprovedNote}{" "}
          <Link href={`/collections/${submission.resultingCollectionId}`} style={{ color: "var(--accent)", fontWeight: 600 }}>
            {t.viewResultingCollection}
          </Link>
        </div>
      )}
      {submission.status === "rejected" && (
        <div className="toast error" style={{ marginBottom: "1.25rem" }}>{t.proposalRejectedNote}</div>
      )}
      {message && <div className={`toast ${message.type}`}>{message.text}</div>}

      <div style={{ display: "flex", gap: "1.5rem", flexWrap: "wrap" }}>
        <form onSubmit={handleSaveMeta} className="form-panel" style={{ flex: 1, minWidth: 280, opacity: editable ? 1 : 0.7 }}>
          <div className="display-font" style={{ fontSize: "0.95rem", marginBottom: "0.8rem" }}>{t.collectionInfoTitle}</div>
          <div className="field">
            <span className="field-label">{t.collectionNameLabel}</span>
            <input value={nom} onChange={(e) => setNom(e.target.value)} disabled={!editable} required />
          </div>
          <div style={{ display: "flex", gap: "0.6rem" }}>
            <div className="field" style={{ flex: 1 }}>
              <span className="field-label">{t.year}</span>
              <input value={annee} onChange={(e) => setAnnee(e.target.value)} disabled={!editable} />
            </div>
            <div className="field" style={{ flex: 1 }}>
              <span className="field-label">{t.editor}</span>
              <input value={editeur} onChange={(e) => setEditeur(e.target.value)} disabled={!editable} />
            </div>
          </div>
          <div style={{ display: "flex", gap: "0.6rem" }}>
            <div className="field" style={{ flex: 1 }}>
              <span className="field-label">{t.origin}</span>
              <input value={pays} onChange={(e) => setPays(e.target.value)} disabled={!editable} />
            </div>
            <div className="field" style={{ flex: 1 }}>
              <span className="field-label">{t.totalCardsLabel}</span>
              <input type="number" min="1" value={total} onChange={(e) => setTotal(e.target.value)} disabled={!editable} />
            </div>
          </div>
          <div className="field">
            <span className="field-label">{t.descriptionLabel}</span>
            <textarea rows={3} value={description} onChange={(e) => setDescription(e.target.value)} disabled={!editable} />
          </div>
          {editable && <button className="btn-ghost" type="submit">{t.saveChanges}</button>}
        </form>

        <div className="filter-panel" style={{ flex: 1, minWidth: 280 }}>
          <div className="display-font" style={{ fontSize: "0.95rem", marginBottom: "0.8rem" }}>
            {t.cardsInProposalTitle} ({submission.cards.length})
          </div>

          {submission.cards.length === 0 ? (
            <div style={{ fontSize: "0.8rem", color: "var(--text-muted)", marginBottom: "1rem" }}>{t.noCardsYetInProposal}</div>
          ) : (
            <div style={{ marginBottom: "1rem" }}>
              {submission.cards.map((c) => (
                <div key={c.id} style={{ display: "flex", alignItems: "center", gap: "0.6rem", padding: "0.45rem 0", borderBottom: "1px solid var(--line)" }}>
                  <img src={c.image} alt="" style={{ width: 36, height: 50, objectFit: "cover", flexShrink: 0 }} />
                  <div style={{ flex: 1, minWidth: 0, fontSize: "0.8rem" }}>
                    n°{c.numero} — {c.personnagePrincipal?.name || t.noCharacterAssigned}
                    <div style={{ fontSize: "0.7rem", color: "var(--text-muted)" }}>{c.rarete}</div>
                  </div>
                  {editable && (
                    <button className="btn-icon" onClick={() => handleDeleteCard(c.id)}><Trash2 size={13} /></button>
                  )}
                </div>
              ))}
            </div>
          )}

          {editable && (
            <div style={{ paddingTop: "0.8rem", borderTop: "1px solid var(--line)" }}>
              <div style={{ fontSize: "0.82rem", fontWeight: 600, marginBottom: "0.6rem" }}>{t.addCardTitle}</div>
              <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap", marginBottom: "0.5rem" }}>
                <input value={newNumero} onChange={(e) => setNewNumero(e.target.value)} placeholder={t.cardNumberPlaceholder} style={{ flex: 1, minWidth: 80 }} />
                <input value={newRarete} onChange={(e) => setNewRarete(e.target.value)} placeholder={t.effectPlaceholder} style={{ flex: 1, minWidth: 100 }} />
              </div>
              <select value={newPersonnage} onChange={(e) => setNewPersonnage(e.target.value)} style={{ marginBottom: "0.5rem" }}>
                <option value="">{t.noCharacterAssigned}</option>
                {characters.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
              <label className="upload-zone" style={{ display: "block", cursor: uploading ? "default" : "pointer" }}>
                {uploading ? "Envoi en cours…" : t.addCardUploadCta}
                <input type="file" accept="image/*" onChange={handleAddCard} disabled={uploading} style={{ display: "none" }} />
              </label>
            </div>
          )}

          {submission.status === "draft" && (
            <button
              className="btn-primary"
              style={{ marginTop: "1rem", display: "flex", alignItems: "center", gap: "0.4rem" }}
              onClick={handleSubmitForReview}
              disabled={submission.cards.length === 0}
            >
              <Send size={14} /> {t.submitProposalCta}
            </button>
          )}
          {submission.status === "pending" && (
            <div style={{ fontSize: "0.76rem", color: "var(--text-muted)", marginTop: "1rem" }}>{t.proposalPendingNote}</div>
          )}
        </div>
      </div>
    </div>
  );
}
