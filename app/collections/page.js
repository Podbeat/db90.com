"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { ImageOff } from "lucide-react";
import { useLanguage } from "@/components/LanguageProvider";
import { getFlagSvg } from "@/lib/countryFlags";
import CollectionStatusButtons from "@/components/CollectionStatusButtons";

export default function CollectionsPage() {
  const { t } = useLanguage();
  const [collections, setCollections] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loggedIn, setLoggedIn] = useState(false);

  useEffect(() => {
    fetch("/api/collections")
      .then((r) => r.json())
      .then(setCollections)
      .finally(() => setLoading(false));
    fetch("/api/users/me")
      .then((r) => setLoggedIn(r.ok))
      .catch(() => setLoggedIn(false));
  }, []);

  return (
    <div className="container page">
      <h1 className="display-font" style={{ fontSize: "1.4rem", marginBottom: "1.25rem" }}>{t.collectionsTitle}</h1>
      {loading ? (
        <div className="empty-state">{t.loading}</div>
      ) : collections.length === 0 ? (
        <div className="empty-state">{t.noCollections}</div>
      ) : (
        <div className="collection-grid">
          {collections.map((col, i) => {
            const archived = col.withImagesCount ?? 0;
            const pct = col.total ? Math.min(100, Math.round((archived / col.total) * 100)) : 0;
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
                  {col.total && (
                    <div className="progress-track">
                      <div className={`progress-fill ${pct >= 100 ? "progress-complete" : ""}`} style={{ width: `${pct}%` }} />
                    </div>
                  )}
                  {loggedIn && <CollectionStatusButtons collectionId={col.id} />}
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
