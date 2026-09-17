"use client";

import { useEffect, useState } from "react";
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
    <div className="card-tile new-card-tile" style={{ cursor: "default" }}>
      {!open ? (
        loggedIn ? (
          <button type="button" className="new-card-trigger" onClick={() => setOpen(true)}>
            <span className="new-card-icon"><Upload size={22} /></span>
            <span className="card-nom">{t.missingCardSlotTitle}</span>
            <span className="new-card-hint">{t.proposeScanCta}</span>
          </button>
        ) : (
          <Link href="/compte/connexion" className="new-card-trigger">
            <span className="new-card-icon"><Upload size={22} /></span>
            <span className="card-nom">{t.missingCardSlotTitle}</span>
            <span className="new-card-hint">{t.loginToProposeScan}</span>
          </Link>
        )
      ) : (
        <div className="meta">
          <div className="card-nom" style={{ marginBottom: "0.5rem" }}>{t.missingCardSlotTitle}</div>
          {justSent ? (
            <div style={{ fontSize: "0.75rem", color: "var(--turquoise)" }}>{t.scanPending}</div>
          ) : (
            <>
              <div className="field" style={{ margin: "0 0 0.4rem" }}>
                <input value={numero} onChange={(e) => setNumero(e.target.value)} placeholder={t.cardNumberPlaceholder} style={{ fontSize: "0.78rem", padding: "0.4rem 0.55rem" }} />
              </div>
              <div className="field" style={{ margin: "0 0 0.4rem" }}>
                <input value={rarete} onChange={(e) => setRarete(e.target.value)} placeholder={t.effectPlaceholder} style={{ fontSize: "0.78rem", padding: "0.4rem 0.55rem" }} />
              </div>
              <div className="field" style={{ margin: "0 0 0.5rem" }}>
                <select value={personnage} onChange={(e) => setPersonnage(e.target.value)} style={{ fontSize: "0.78rem", padding: "0.4rem 0.55rem" }}>
                  <option value="">{t.noCharacterAssigned}</option>
                  {characters.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              <label className="upload-zone" style={{ display: "block", fontSize: "0.75rem", padding: "0.5rem", cursor: uploading ? "default" : "pointer" }}>
                {uploading ? "…" : t.addCardUploadCta}
                <input type="file" accept="image/*" onChange={handleFile} disabled={uploading} className="visually-hidden" />
              </label>
              {error && <div style={{ fontSize: "0.7rem", color: "var(--accent)", marginTop: "0.4rem" }}>{error}</div>}
            </>
          )}
        </div>
      )}
    </div>
  );
}
