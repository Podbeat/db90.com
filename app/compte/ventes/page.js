"use client";

import { useEffect, useState } from "react";
import { useLanguage } from "@/components/LanguageProvider";
import ListingCard from "@/components/ListingCard";

export default function MySalesPage() {
  const { t } = useLanguage();
  const [selling, setSelling] = useState([]);
  const [loading, setLoading] = useState(true);

  function load() {
    fetch("/api/users/me/listings")
      .then((r) => (r.ok ? r.json() : { selling: [] }))
      .then((d) => setSelling(d.selling || []))
      .finally(() => setLoading(false));
  }

  useEffect(() => { load(); }, []);

  async function handleRemove(cardId) {
    await fetch(`/api/cards/${cardId}/listings`, { method: "DELETE" });
    load();
  }

  return (
    <div>
      <div className="display-font" style={{ fontSize: "0.95rem", marginBottom: "0.9rem" }}>{t.navMySales}</div>
      {loading ? (
        <div className="empty-state">{t.loading}</div>
      ) : selling.length === 0 ? (
        <div style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>{t.noSalesListed}</div>
      ) : (
        <div className="listing-grid">
          {selling.map((l) => (
            <ListingCard key={l.id} listing={l} showSeller={false} onRemove={handleRemove} />
          ))}
        </div>
      )}
    </div>
  );
}

