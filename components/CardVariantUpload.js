"use client";

import { useState } from "react";
import Link from "next/link";
import { Sparkles } from "lucide-react";
import { useLanguage } from "@/components/LanguageProvider";
import { useCurrentUser } from "@/components/CurrentUserProvider";
import { submitCardVariant } from "@/lib/clientUpload";
import ScanSubmitPanel from "@/components/ScanSubmitPanel";
import EffectSelect, { effectToSend } from "@/components/EffectSelect";

// Proposer un scan pour un effet/prisme qui n'existe PAS ENCORE pour ce numéro (ex. la carte
// existe en « Prisme Soft », le membre a un exemplaire en « Prisme Bris de Verre »). Toujours
// proposé, contrairement à CardScanUpload qui ne concerne que les cartes sans visuel.
export default function CardVariantUpload({ cardId, existingRaretes }) {
  const { t } = useLanguage();
  const { loggedIn, loading } = useCurrentUser();
  const [open, setOpen] = useState(false);
  const [rarete, setRarete] = useState("");
  if (loading) return null;

  if (!open) {
    return (
      <button type="button" className="btn-ghost scan-open-btn" onClick={() => setOpen(true)}>
        <Sparkles size={14} aria-hidden="true" /> {t.proposeVariantCta}
      </button>
    );
  }
  if (!loggedIn) {
    return (
      <div className="scan-panel compact">
        <div className="scan-panel-title display-font">{t.proposeVariantTitle}</div>
        <Link href="/compte/connexion" className="btn-ghost scan-btn">{t.loginToProposeScan}</Link>
      </div>
    );
  }
  return (
    <ScanSubmitPanel
      title={t.proposeVariantTitle}
      validate={() => (rarete ? null : t.effectChooseRequired)}
      submit={(file, opts) => submitCardVariant(cardId, file, effectToSend(rarete), opts)}
    >
      {existingRaretes?.filter(Boolean).length > 0 && <p className="scan-note">{t.existingVariantsLabel} {existingRaretes.filter(Boolean).join(", ")}</p>}
      <div className="field">
        <label className="field-label" htmlFor="effet-variante">{t.newVariantNameLabel}</label>
        <EffectSelect id="effet-variante" value={rarete} onChange={setRarete} exclude={existingRaretes} />
      </div>
    </ScanSubmitPanel>
  );
}
