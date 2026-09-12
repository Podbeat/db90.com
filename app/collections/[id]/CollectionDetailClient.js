"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useLanguage } from "@/components/LanguageProvider";
import { localize } from "@/lib/localize";
import { missingCardPlaceholder } from "@/lib/missingCardPlaceholder";
import HoloCard from "@/components/HoloCard";

export default function CollectionDetailClient({ params }) {
  const { t, lang } = useLanguage();
  const [collection, setCollection] = useState(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    fetch(`/api/collections/${params.id}`)
      .then((r) => {
        if (!r.ok) throw new Error("not found");
        return r.json();
      })
      .then(setCollection)
      .catch(() => setNotFound(true))
      .finally(() => setLoading(false));
  }, [params.id]);

  if (loading) return <div className="container page"><div className="empty-state">{t.loading}</div></div>;
  if (notFound || !collection) return <div className="container page"><div className="empty-state">{t.notFound}</div></div>;

  return (
    <div className="container page">
      <Link href="/collections" style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>{t.backToCollections}</Link>
      <div style={{ display: "flex", gap: "1.1rem", alignItems: "flex-start", margin: "0.6rem 0 1.5rem" }}>
        {collection.dos && (
          <div style={{ textAlign: "center", flexShrink: 0 }}>
            <Image src={collection.dos} alt={`${t.verso} — ${collection.nom}`} width={70} height={98} style={{ width: 70, height: "auto", border: "1px solid var(--line)" }} />
            <div style={{ fontSize: "0.65rem", color: "var(--text-muted)", marginTop: "0.3rem" }}>{t.verso}</div>
            {collection.dosHD && (
              <a href={collection.dosHD} target="_blank" rel="noopener noreferrer" style={{ fontSize: "0.65rem", color: "var(--gold)" }}>
                {t.viewHD}
              </a>
            )}
          </div>
        )}
        <div>
          <h1 className="display-font" style={{ fontSize: "1.4rem", margin: "0 0 0.2rem" }}>{collection.nom}</h1>
          <div style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>
            {[collection.editeur, collection.pays, collection.annee].filter(Boolean).join(" · ")}
            {" — "}
            {t.archivedOf(collection.cards.filter((c) => c.image).length, collection.total)}
          </div>
          <a href={`/api/collections/${collection.id}/checklist`} className="btn-ghost" style={{ display: "inline-block", marginTop: "0.6rem", fontSize: "0.75rem" }}>
            {t.downloadChecklist}
          </a>
        </div>
      </div>

      {(() => {
        const desc = localize(collection, "description", lang);
        return desc ? (
          <p style={{ fontSize: "0.9rem", color: "var(--text-muted)", lineHeight: 1.6, marginBottom: "1.75rem", whiteSpace: "pre-wrap" }}>
            {desc}
          </p>
        ) : null;
      })()}

      {(() => {
        // Liste des cartes manquantes : uniquement calculable si toutes les références
        // existantes sont de simples numéros (pas des codes du type "ZCB-01"), et si le
        // total de la série est connu.
        if (!collection.total) return null;

        // Si la série est déjà complète (autant de cartes que prévu, toutes avec un
        // visuel), on ne cherche pas plus loin : certaines séries ont une numérotation
        // erronée d'origine (doublons, sauts de numéro dus à un défaut d'impression),
        // ce qui ferait ressortir de faux "numéros manquants" alors que rien ne manque.
        const hasAllVisuals =
          collection.cards.length >= collection.total && collection.cards.every((c) => c.image);
        if (hasAllVisuals) return null;

        const numeros = collection.cards.map((c) => c.numero);
        const allNumeric = numeros.length > 0 && numeros.every((n) => /^\d+$/.test(n));
        if (!allNumeric) return null;

        // "Présente" signifie avoir un vrai scan, pas seulement une ligne en base : une
        // carte créée sans visuel (avis de recherche) doit continuer à apparaître ici tant
        // qu'elle n'a pas de scan, même si elle est déjà cataloguée.
        const present = new Set(
          collection.cards.filter((c) => c.image).map((c) => parseInt(c.numero, 10))
        );
        const missing = [];
        for (let i = 1; i <= collection.total; i++) {
          if (!present.has(i)) missing.push(i);
        }
        if (missing.length === 0) return null;

        return (
          <div className="missing-cards-box">
            <div className="missing-cards-title">{t.missingCards} ({missing.length})</div>
            <p className="missing-cards-intro">{t.missingCardsIntro}</p>
            <div className="missing-cards-list">
              {missing.map((n) => (
                <span key={n} className="missing-card-chip">{n}</span>
              ))}
            </div>
            <Link href="/informations" className="btn-ghost" style={{ display: "inline-block", marginTop: "0.8rem" }}>
              {t.navInfo}
            </Link>
          </div>
        );
      })()}

      {collection.cards.length === 0 ? (
        <div className="empty-state">{t.noResults}</div>
      ) : (
        <div className="card-grid">
          {collection.cards.map((c) => (
            <Link key={c.id} href={`/cartes/${c.id}`} className="card-tile">
              <HoloCard className="card-tile-media">
                {c.image ? (
                  <Image
                    src={c.image}
                    alt={c.personnage}
                    fill
                    sizes="(max-width: 640px) 45vw, 220px"
                    style={{ objectFit: "cover" }}
                  />
                ) : (
                  <img
                    src={missingCardPlaceholder(c, t)}
                    alt={c.personnage}
                    style={{ width: "100%", height: "100%", objectFit: "cover" }}
                  />
                )}
              </HoloCard>
              <div className="meta">
                <div className="card-num">{c.numero}</div>
                <div className="card-nom">{c.personnage}</div>
                <span className="rarity-tag">{c.rarete}</span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
