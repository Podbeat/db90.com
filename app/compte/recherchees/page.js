"use client";

import { useEffect, useState } from "react";
import { useLanguage } from "@/components/LanguageProvider";
import CollectionProgressList from "@/components/CollectionProgressList";

export default function MyWantedPage() {
  const { t } = useLanguage();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/users/me/collections-summary")
      .then((r) => (r.ok ? r.json() : { wanted: [] }))
      .then((d) => setItems(d.wanted || []))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="filter-panel">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "0.5rem" }}>
        <div className="display-font" style={{ fontSize: "0.95rem" }}>{t.myWantedTitle}</div>
        {items.length > 0 && (
          <a href="/api/users/me/wanted/pdf" className="btn-ghost" style={{ fontSize: "0.72rem" }}>
            {t.downloadWantedPdf}
          </a>
        )}
      </div>
      {loading ? (
        <div className="empty-state">{t.loading}</div>
      ) : (
        <CollectionProgressList items={items} emptyLabel={t.noCardsWanted} t={t} />
      )}
    </div>
  );
}
