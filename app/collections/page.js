"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { ImageOff, Sparkles } from "lucide-react";
import { useLanguage } from "@/components/LanguageProvider";
import { getFlagSvg } from "@/lib/countryFlags";
import CollectionStatusButtons from "@/components/CollectionStatusButtons";
import { useCurrentUser } from "@/components/CurrentUserProvider";

export default function CollectionsPage() {
  const { t } = useLanguage();
  const { loggedIn } = useCurrentUser();
  const [collections, setCollections] = useState([]);
  const [loading, setLoading] = useState(true);
  const [ownedByCollection, setOwnedByCollection] = useState({});
  const [wantedByCollection, setWantedByCollection] = useState({});

  useEffect(() => {
    fetch("/api/collections")
      .then((r) => r.json())
      .then(setCollections)
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!loggedIn) return;
    fetch("/api/users/me/collections-summary")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (!d) return;
        setOwnedByCollection(Object.fromEntries(d.owned.map((i) => [i.collectionId, i.count])));
        setWantedByCollection(Object.fromEntries(d.wanted.map((i) => [i.collectionId, i.count])));
      })
      .catch(() => {});
  }, [loggedIn]);

  return (
    <div className="container page">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "0.75rem", marginBottom: "1.25rem" }}>
        <h1 className="display-font" style={{ fontSize: "1.4rem", margin: 0 }}>{t.collectionsTitle}</h1>
        {loggedIn && (
          <Link href="/compte/proposer-collection" className="btn-ghost" style={{ fontSize: "0.8rem", display: "inline-flex", alignItems: "center", gap: "0.35rem" }}>
            <Sparkles size={14} /> {t.proposeCollectionCta}
          </Link>
        )}
      </div>
      {loading ? (
        <div className="empty-state">{t.loading}</div>
      ) : collections.length === 0 ? (
        <div className="empty-state">{t.noCollections}</div>
      ) : (
        <div className="collection-grid">
          {collections.map((col, i) => {
            const archived = col.withImagesCount ?? 0;
            const totalKnown = col.total != null;
            const denominator = totalKnown ? col.total : col._count?.cards || 0;
            const pct = denominator ? Math.min(100, Math.round((archived / denominator) * 100)) : 0;
            return (
              <Link
                key={col.id}
                href={`/collections/${col.id}`}
                className="collection-tile"
                style={{ "--stagger-delay": `${Math.min(i * 50, 400)}ms` }}
              >
                <div className="collection-thumb">
                  {col.previewImage ? (
                    <Image src={col.previewImage} alt={col.nom} fill sizes="(max-width: 640px) 90vw, 300px" style={{ objectFit: "cover", objectPosition: "top center" }} />
                  ) : (
                    <div className="collection-thumb-empty"><ImageOff size={22} /></div>
                  )}
                  {loggedIn && (
                    <CollectionStatusButtons
                      collectionId={col.id}
                      initialStatus={
                        col.total && (ownedByCollection[col.id] || 0) >= col.total
                          ? "owned"
                          : col.total && (wantedByCollection[col.id] || 0) >= col.total
                          ? "wanted"
                          : null
                      }
                    />
                  )}
                </div>
                <div className="collection-tile-body">
                  <div className="display-font" style={{ fontSize: "0.95rem" }}>{col.nom}</div>
                  <div className="collection-meta">
                    {col.pays && <img src={getFlagSvg(col.pays)} alt="" style={{ width: 16, height: "auto", borderRadius: 2, flexShrink: 0 }} />}
                    <span>{[col.pays, col.annee].filter(Boolean).join(" · ")}</span>
                  </div>
                  {col.editeur && <div className="collection-editor">{col.editeur}</div>}
                  <div style={{ fontSize: "0.75rem", marginTop: "0.7rem" }}>
                    {t.archivedOf(archived, col.total)}
                  </div>
                  <div className="progress-track">
                    <div
                      className={`progress-fill ${pct >= 100 && totalKnown ? "progress-complete" : ""}`}
                      style={{ width: `${pct}%`, background: !totalKnown ? "var(--text-muted)" : undefined }}
                    />
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
