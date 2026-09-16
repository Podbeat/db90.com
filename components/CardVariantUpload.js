"use client";

import { useState } from "react";
import Link from "next/link";
import { Sparkles, Upload } from "lucide-react";
import { useLanguage } from "@/components/LanguageProvider";
import { useCurrentUser } from "@/components/CurrentUserProvider";
import { submitCardVariant } from "@/lib/clientUpload";

// Permet de proposer un scan pour un effet/prisme qui n'existe PAS ENCORE pour ce numéro
// (ex. la carte existe en "Prisme Soft", l'utilisateur a un exemplaire en "Prisme Bris de
// Verre"). Toujours affiché — contrairement à CardScanUpload qui ne concerne que les
// cartes sans visuel du tout — puisqu'il s'agit ici d'ajouter une variante supplémentaire.
export default function CardVariantUpload({ cardId, existingRaretes }) {
  const { t } = useLanguage();
  const { loggedIn, loading } = useCurrentUser();
  const [open, setOpen] = useState(false);
  const [rarete, setRarete] = useState("");
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);

  if (loading) return null;

  async function handleFile(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!rarete.trim()) {
      setError(t.variantNameRequired);
      return;
    }
    setUploading(true);
    setError("");
    try {
      await submitCardVariant(cardId, file, rarete.trim());
      setDone(true);
    } catch (err) {
      setError(err.message || "Échec de l'envoi.");
    } finally {
      setUploading(false);
    }
  }

  if (!open) {
    return (
      <button className="btn-ghost" style={{ fontSize: "0.75rem", display: "inline-flex", alignItems: "center", gap: "0.35rem", marginTop: "0.6rem" }} onClick={() => setOpen(true)}>
        <Sparkles size={13} /> {t.proposeVariantCta}
      </button>
    );
  }

  if (!loggedIn) {
    return (
      <div className="filter-panel" style={{ marginTop: "0.6rem" }}>
        <div style={{ fontSize: "0.8rem", marginBottom: "0.5rem" }}>{t.proposeVariantTitle}</div>
        <Link href="/compte/connexion" className="btn-ghost" style={{ fontSize: "0.75rem", display: "inline-block" }}>
          {t.loginToProposeScan}
        </Link>
      </div>
    );
  }

  if (done) {
    return (
      <div className="filter-panel" style={{ marginTop: "0.6rem" }}>
        <div style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>{t.scanPending}</div>
      </div>
    );
  }

  return (
    <div className="filter-panel" style={{ marginTop: "0.6rem" }}>
      <div style={{ fontSize: "0.8rem", marginBottom: "0.6rem" }}>{t.proposeVariantTitle}</div>
      {existingRaretes?.length > 0 && (
        <div style={{ fontSize: "0.72rem", color: "var(--text-muted)", marginBottom: "0.6rem" }}>
          {t.existingVariantsLabel} {existingRaretes.join(", ")}
        </div>
      )}
      <div className="field">
        <span className="field-label">{t.newVariantNameLabel}</span>
        <input value={rarete} onChange={(e) => setRarete(e.target.value)} placeholder={t.newVariantNamePlaceholder} />
      </div>
      <label className="upload-zone" style={{ cursor: uploading ? "default" : "pointer" }}>
        <Upload size={16} style={{ margin: "0 auto 0.3rem" }} />
        {uploading ? "Envoi en cours…" : t.proposeScanCta}
        <input type="file" accept="image/*" onChange={handleFile} disabled={uploading} className="visually-hidden" />
      </label>
      {error && <div className="toast error" style={{ marginTop: "0.5rem" }}>{error}</div>}
    </div>
  );
}
