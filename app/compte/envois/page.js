"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { FolderPlus, ChevronRight } from "lucide-react";
import { useLanguage } from "@/components/LanguageProvider";
import { formatDate } from "@/lib/localize";
import { ScanSteps } from "@/components/ScanSubmitPanel";

// « Mes envois » : chaque scan proposé avec son étape (Envoyé → Validé → En ligne, ou
// refusé), et les propositions de collection du membre.
const scanStep = (s) => (s.status === "pending" ? 1 : s.status === "approved" ? (s.publishedAt ? 3 : 2) : null);
const PROPOSAL_STATUS = { draft: "statusDraft", pending: "statusPending", approved: "statusApproved", rejected: "statusRejected" };

export default function MyUploadsPage() {
  const { t, lang } = useLanguage();
  const [data, setData] = useState(null);

  useEffect(() => {
    fetch("/api/users/me/submissions", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : { scans: [], collections: [] }))
      .then(setData)
      .catch(() => setData({ scans: [], collections: [] }));
  }, []);

  if (!data) return <div className="empty-state">{t.loading}</div>;
  return (
    <div className="uploads-page">
      <h1 className="display-font uploads-title">{t.myUploadsTitle}</h1>
      <p className="uploads-intro">{t.myUploadsIntro}</p>
      {data.scans.length === 0 ? (
        <div className="uploads-empty">
          <p>{t.myUploadsEmpty}</p>
          <Link href="/collections" className="btn-primary scan-btn">{t.navCollections}</Link>
        </div>
      ) : (
        <ul className="uploads-list">
          {data.scans.map((s) => {
            const card = s.card;
            const label = card ? `${card.collection?.nom || ""} n°${card.numero}` : `${s.collection?.nom || ""} n°${s.numero}`;
            const step = scanStep(s);
            const body = (
              <>
                <img src={s.image} alt="" className="uploads-thumb" />
                <span className="uploads-body">
                  <span className="uploads-name">{label}</span>
                  <span className="uploads-meta">{[card?.personnagePrincipal?.name, card?.rarete || s.rarete, formatDate(s.createdAt, lang)].filter(Boolean).join(" · ")}</span>
                  {step ? <ScanSteps step={step} /> : <span className="uploads-rejected">{t.myUploadsRejected}</span>}
                </span>
                {card && <ChevronRight size={18} aria-hidden="true" className="uploads-chevron" />}
              </>
            );
            return (
              <li key={s.id}>
                {card ? <Link href={`/cartes/${card.id}`} className="uploads-row">{body}</Link> : <div className="uploads-row">{body}</div>}
              </li>
            );
          })}
        </ul>
      )}

      <h2 className="display-font uploads-subtitle"><FolderPlus size={18} aria-hidden="true" /> {t.proposeCollectionTitle}</h2>
      {data.collections.length > 0 && (
        <ul className="uploads-list">
          {data.collections.map((c) => (
            <li key={c.id}>
              <Link href={`/compte/proposer-collection/${c.id}`} className="uploads-row">
                <span className="uploads-body">
                  <span className="uploads-name">{c.nom}</span>
                  <span className="uploads-meta">{c._count.cards} · {t[PROPOSAL_STATUS[c.status]] || c.status} · {formatDate(c.updatedAt, lang)}</span>
                </span>
                <ChevronRight size={18} aria-hidden="true" className="uploads-chevron" />
              </Link>
            </li>
          ))}
        </ul>
      )}
      <Link href="/compte/proposer-collection" className="btn-ghost scan-btn">{t.proposeCollectionTitle}</Link>
    </div>
  );
}
