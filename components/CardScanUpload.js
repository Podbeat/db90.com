"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useLanguage } from "@/components/LanguageProvider";
import { useCurrentUser } from "@/components/CurrentUserProvider";
import { submitCardScan } from "@/lib/clientUpload";
import ScanSubmitPanel, { ScanSteps } from "@/components/ScanSubmitPanel";

// Proposer le scan d'une carte encore sans visuel (fiche carte). Le scan reste en attente
// de validation ; une fois validé, le membre est crédité, et le visuel apparaît sur la carte
// à sa mise en ligne (parfois après retouche par l'admin).
export default function CardScanUpload({ cardId }) {
  const { t } = useLanguage();
  const { me, loading } = useCurrentUser();
  const [state, setState] = useState(null);

  useEffect(() => {
    if (!me) return;
    fetch(`/api/cards/${cardId}/submissions`)
      .then((r) => (r.ok ? r.json() : {}))
      .then((d) => setState({ status: d.status || null, published: Boolean(d.published) }))
      .catch(() => setState({ status: null }));
  }, [cardId, me]);

  if (loading) return null;
  if (!me) {
    return (
      <div className="scan-panel compact">
        <div className="scan-panel-title display-font">{t.proposeScanTitle}</div>
        <Link href="/compte/connexion" className="btn-ghost scan-btn">{t.loginToProposeScan}</Link>
      </div>
    );
  }
  if (!state) return null;
  if (state.status === "pending" || (state.status === "approved" && !state.published)) {
    const received = state.status === "approved";
    return (
      <div className="scan-panel compact">
        <p className="scan-status">{received ? t.scanStatusReceived : t.scanStatusReview}</p>
        <ScanSteps step={received ? 2 : 1} />
        <Link href="/compte/envois" className="scan-link">{t.myUploadsLink}</Link>
      </div>
    );
  }
  return (
    <ScanSubmitPanel
      title={state.status === "rejected" ? t.scanRejectedRetry : t.proposeScanTitle}
      submit={(file, opts) => submitCardScan(cardId, file, opts)}
    />
  );
}
