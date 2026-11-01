"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Upload, X } from "lucide-react";
import { useLanguage } from "@/components/LanguageProvider";
import { useCurrentUser } from "@/components/CurrentUserProvider";
import { submitNewCardForCollection } from "@/lib/clientUpload";
import ScanSubmitPanel from "@/components/ScanSubmitPanel";
import EffectSelect, { UNKNOWN_EFFECT, effectToSend } from "@/components/EffectSelect";

// Case « Carte non répertoriée » d'une collection dont le total est encore inconnu : un
// membre y propose une carte qui manque au catalogue (numéro, effet, personnage et scan),
// dans une fenêtre d'envoi guidé.
export default function CollectionNewCardUpload({ collectionId }) {
  const { t } = useLanguage();
  const { loggedIn } = useCurrentUser();
  const [characters, setCharacters] = useState([]);
  const [open, setOpen] = useState(false);
  const [numero, setNumero] = useState("");
  // Effet choisi dans la liste ; par défaut « Je ne sais pas » (l'administrateur le précisera).
  const [rarete, setRarete] = useState(UNKNOWN_EFFECT);
  const [personnage, setPersonnage] = useState("");

  useEffect(() => {
    if (!open) return undefined;
    fetch("/api/characters").then((r) => (r.ok ? r.json() : [])).then(setCharacters).catch(() => {});
    const onKey = (e) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  const trigger = (
    <>
      <span className="new-card-icon"><Upload size={22} aria-hidden="true" /></span>
      <span className="card-nom">{t.missingCardSlotTitle}</span>
      <span className="new-card-hint">{loggedIn ? t.proposeScanCta : t.loginToProposeScan}</span>
    </>
  );

  return (
    <div className="card-tile new-card-tile" style={{ cursor: "default" }}>
      {loggedIn ? (
        <button type="button" className="new-card-trigger" onClick={() => setOpen(true)}>{trigger}</button>
      ) : (
        <Link href="/compte/connexion" className="new-card-trigger">{trigger}</Link>
      )}
      {open && (
        <div className="scan-modal" onClick={() => setOpen(false)}>
          <div className="scan-modal-box" role="dialog" aria-modal="true" aria-label={t.missingCardSlotTitle} onClick={(e) => e.stopPropagation()}>
            <button type="button" className="btn-icon scan-modal-close" onClick={() => setOpen(false)} aria-label="Fermer"><X size={18} /></button>
            <ScanSubmitPanel
              title={t.missingCardSlotTitle}
              validate={() => (numero.trim() ? null : t.cardNumberRequired)}
              submit={(file, opts) => submitNewCardForCollection(collectionId, file, { numero: numero.trim(), rarete: effectToSend(rarete), personnagePrincipalId: personnage, ...opts })}
            >
              <div className="scan-fields">
                <div className="field"><span className="field-label">{t.cardNumberPlaceholder}</span><input value={numero} onChange={(e) => setNumero(e.target.value)} maxLength={20} /></div>
                <div className="field"><span className="field-label">{t.effectPlaceholder}</span><EffectSelect value={rarete} onChange={setRarete} /></div>
                <div className="field">
                  <span className="field-label">{t.personnage}</span>
                  <select value={personnage} onChange={(e) => setPersonnage(e.target.value)}>
                    <option value="">—</option>
                    {characters.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>
              </div>
            </ScanSubmitPanel>
          </div>
        </div>
      )}
    </div>
  );
}
