"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Upload } from "lucide-react";
import { useLanguage } from "@/components/LanguageProvider";
import { useCurrentUser } from "@/components/CurrentUserProvider";
import { submitNewCardForCollection } from "@/lib/clientUpload";

// Slot permanent "Carte recherchée" affiché à la fin de la grille d'une collection encore
// en cours de catalogage (total inconnu) : n'importe quel membre peut y proposer un visuel
// qui n'est pas encore répertorié. Le slot reste toujours affiché après un envoi — rien
// n'est "consommé", il n'y a donc jamais besoin de le régénérer explicitement.
export default function CollectionNewCardUpload({ collectionId }) {
  const { t } = useLanguage();
  const { loggedIn, loading } = useCurrentUser();
  const fileRef = useRef(null);
  const [characters, setCharacters] = useState([]);
  const [open, setOpen] = useState(false);
  const [numero, setNumero] = useState("");
  const [rarete, setRarete] = useState("Commune");
  const [personnage, setPersonnage] = useState("");
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const [justSent, setJustSent] = useState(false);

  useEffect(() => {
    if (open) fetch("/api/characters").then((r) => (r.ok ? r.json() : [])).then(setCharacters).catch(() => {});
  }, [open]);

  if (loading) return null;

  async function handleFile(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!numero.trim()) {
      setError(t.cardNumberRequired);
      return;
    }
    setUploading(true);
    setError("");
    try {
      await submitNewCardForCollection(collectionId, file, { numero: numero.trim(), rarete, personnagePrincipalId: personnage });
      setNumero("");
      setRarete("Commune");
      setPersonnage("");
      setJustSent(true);
      setTimeout(() => setJustSent(false), 4000);
    } catch (err) {
      setError(err.message);
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  }

  return (
    <div className="card-tile" style={{ cursor: "default" }}>
      <div className="card-tile-media" style={{ display: "flex", alignItems: "center", justifyContent: "center", background: "var(--surface-raised)" }}>
        <Upload size={28} style={{ color: "var(--text-muted)" }} />
      </div>
      <div className="meta">
        <div className="card-nom">{t.missingCardSlotTitle}</div>
        {!loggedIn ? (
          <Link href="/compte/connexion" style={{ fontSize: "0.72rem", color: "var(--accent)" }}>{t.loginToProposeScan}</Link>
        ) : !open ? (
          <button className="btn-ghost" style={{ fontSize: "0.72rem", marginTop: "0.3rem" }} onClick={() => setOpen(true)}>
            {t.proposeScanCta}
          </button>
        ) : justSent ? (
          <div style={{ fontSize: "0.72rem", color: "var(--text-muted)" }}>{t.scanPending}</div>
        ) : (
          <div style={{ marginTop: "0.4rem" }}>
            <input value={numero} onChange={(e) => setNumero(e.target.value)} placeholder={t.cardNumberPlaceholder} style={{ fontSize: "0.72rem", marginBottom: "0.3rem" }} />
            <input value={rarete} onChange={(e) => setRarete(e.target.value)} placeholder={t.effectPlaceholder} style={{ fontSize: "0.72rem", marginBottom: "0.3rem" }} />
            <select value={personnage} onChange={(e) => setPersonnage(e.target.value)} style={{ fontSize: "0.72rem", marginBottom: "0.3rem" }}>
              <option value="">{t.noCharacterAssigned}</option>
              {characters.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
            <button
              className="btn-ghost"
              style={{ fontSize: "0.72rem", width: "100%" }}
              onClick={() => !uploading && fileRef.current?.click()}
              disabled={uploading}
            >
              {uploading ? "…" : t.addCardUploadCta}
            </button>
            <input ref={fileRef} type="file" accept="image/*" onChange={handleFile} style={{ display: "none" }} />
            {error && <div style={{ fontSize: "0.68rem", color: "var(--accent)", marginTop: "0.3rem" }}>{error}</div>}
          </div>
        )}
      </div>
    </div>
  );
}
