"use client";

import { useEffect, useState } from "react";
import { Store } from "lucide-react";
import { useLanguage } from "@/components/LanguageProvider";
import ListingCard from "@/components/ListingCard";

export default function MarketPage() {
  const { t } = useLanguage();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);

  const [type, setType] = useState("all");
  const [collectionId, setCollectionId] = useState("all");
  const [personnage, setPersonnage] = useState("all");
  const [pays, setPays] = useState("all");
  const [sort, setSort] = useState("recent");
  const [page, setPage] = useState(1);

  useEffect(() => { setPage(1); }, [type, collectionId, personnage, pays, sort]);

  useEffect(() => {
    const params = new URLSearchParams({ type, collectionId, personnage, pays, sort, page: String(page) });
    fetch(`/api/market?${params.toString()}`)
      .then((r) => {
        if (!r.ok) throw new Error("Réponse serveur invalide");
        setLoadError(false);
        return r.json();
      })
      .then(setData)
      .catch(() => setLoadError(true))
      .finally(() => setLoading(false));
  }, [type, collectionId, personnage, pays, sort, page]);

  const facets = data?.facets || { collections: [], pays: [], personnages: [] };
  const listings = data?.listings || [];

  return (
    <div className="container page">
      <h1 className="display-font" style={{ fontSize: "1.4rem", marginBottom: "0.4rem", display: "flex", alignItems: "center", gap: "0.5rem" }}>
        <Store size={22} /> {t.marketTitle}
      </h1>
      <p style={{ fontSize: "0.82rem", color: "var(--text-muted)", marginBottom: "1.25rem" }}>{t.marketIntro}</p>

      <div className="filter-panel chip-row" style={{ marginBottom: "1.5rem" }}>
        <span className="chip-label">{t.marketTypeLabel}</span>
        <select className="filter-select" value={type} onChange={(e) => setType(e.target.value)}>
          <option value="all">{t.marketTypeAll}</option>
          <option value="seller">{t.marketTypeSelling}</option>
          <option value="buyer">{t.marketTypeBuying}</option>
        </select>
        <select className="filter-select" value={collectionId} onChange={(e) => setCollectionId(e.target.value)}>
          <option value="all">{t.allCollections}</option>
          {facets.collections.map((c) => <option key={c.id} value={c.id}>{c.nom}</option>)}
        </select>
        <select className="filter-select" value={personnage} onChange={(e) => setPersonnage(e.target.value)}>
          <option value="all">{t.allPersonnages}</option>
          {facets.personnages.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
        <select className="filter-select" value={pays} onChange={(e) => setPays(e.target.value)}>
          <option value="all">{t.allOrigins}</option>
          {facets.pays.map((p) => <option key={p} value={p}>{p}</option>)}
        </select>

        <div className="chip-divider" />

        <span className="chip-label">{t.marketSortLabel}</span>
        <button type="button" className={`sort-chip ${sort === "recent" ? "active" : ""}`} onClick={() => setSort("recent")}>{t.marketSortRecent}</button>
        <button type="button" className={`sort-chip ${sort === "price_asc" ? "active" : ""}`} onClick={() => setSort("price_asc")}>{t.marketSortPriceAsc}</button>
        <button type="button" className={`sort-chip ${sort === "price_desc" ? "active" : ""}`} onClick={() => setSort("price_desc")}>{t.marketSortPriceDesc}</button>
      </div>

      {loading ? (
        <div className="empty-state">{t.loading}</div>
      ) : loadError ? (
        <div className="empty-state" style={{ color: "var(--accent)" }}>{t.loadErrorMessage}</div>
      ) : listings.length === 0 ? (
        <div className="empty-state">{t.marketNoListings}</div>
      ) : (
        <>
          <div className="listing-grid">
            {listings.map((l) => <ListingCard key={l.id} listing={l} showSeller />)}
          </div>

          {data.totalPages > 1 && (
            <div style={{ display: "flex", justifyContent: "center", gap: "0.5rem", marginTop: "1.25rem" }}>
              <button className="btn-ghost" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>{t.previous}</button>
              <span style={{ fontSize: "0.8rem", alignSelf: "center", color: "var(--text-muted)" }}>{t.page(page, data.totalPages)}</span>
              <button className="btn-ghost" disabled={page >= data.totalPages} onClick={() => setPage((p) => p + 1)}>{t.next}</button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
