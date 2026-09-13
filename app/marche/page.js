"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Store, Tag, ShoppingCart } from "lucide-react";
import { useLanguage } from "@/components/LanguageProvider";
import { avatarPlaceholder } from "@/lib/avatarPlaceholder";

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

      <div className="filter-panel" style={{ display: "flex", gap: "0.8rem", flexWrap: "wrap", marginBottom: "1.5rem" }}>
        <div className="field" style={{ margin: 0, minWidth: 160 }}>
          <span className="field-label">{t.marketTypeLabel}</span>
          <select value={type} onChange={(e) => setType(e.target.value)}>
            <option value="all">{t.marketTypeAll}</option>
            <option value="seller">{t.marketTypeSelling}</option>
            <option value="buyer">{t.marketTypeBuying}</option>
          </select>
        </div>
        <div className="field" style={{ margin: 0, minWidth: 160 }}>
          <span className="field-label">{t.collection}</span>
          <select value={collectionId} onChange={(e) => setCollectionId(e.target.value)}>
            <option value="all">{t.allCollections}</option>
            {facets.collections.map((c) => <option key={c.id} value={c.id}>{c.nom}</option>)}
          </select>
        </div>
        <div className="field" style={{ margin: 0, minWidth: 160 }}>
          <span className="field-label">{t.personnage}</span>
          <select value={personnage} onChange={(e) => setPersonnage(e.target.value)}>
            <option value="all">{t.allPersonnages}</option>
            {facets.personnages.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        </div>
        <div className="field" style={{ margin: 0, minWidth: 140 }}>
          <span className="field-label">{t.origin}</span>
          <select value={pays} onChange={(e) => setPays(e.target.value)}>
            <option value="all">{t.allOrigins}</option>
            {facets.pays.map((p) => <option key={p} value={p}>{p}</option>)}
          </select>
        </div>
        <div className="field" style={{ margin: 0, minWidth: 160 }}>
          <span className="field-label">{t.marketSortLabel}</span>
          <select value={sort} onChange={(e) => setSort(e.target.value)}>
            <option value="recent">{t.marketSortRecent}</option>
            <option value="price_asc">{t.marketSortPriceAsc}</option>
            <option value="price_desc">{t.marketSortPriceDesc}</option>
          </select>
        </div>
      </div>

      {loading ? (
        <div className="empty-state">{t.loading}</div>
      ) : loadError ? (
        <div className="empty-state" style={{ color: "var(--accent)" }}>{t.loadErrorMessage}</div>
      ) : listings.length === 0 ? (
        <div className="empty-state">{t.marketNoListings}</div>
      ) : (
        <>
          <div className="filter-panel" style={{ padding: 0, overflow: "hidden" }}>
            {listings.map((l) => (
              <Link
                key={l.id}
                href={`/cartes/${l.card.id}`}
                style={{ display: "flex", alignItems: "center", gap: "0.8rem", padding: "0.7rem 1rem", borderBottom: "1px solid var(--line)" }}
              >
                <img
                  src={l.card.image || ""}
                  alt={l.card.personnagePrincipal?.name || ""}
                  style={{ width: 42, height: 58, objectFit: "cover", background: "var(--surface-raised)", flexShrink: 0 }}
                />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: "0.85rem", display: "flex", alignItems: "center", gap: "0.4rem" }}>
                    {l.type === "seller" ? <Tag size={12} style={{ color: "var(--gold)" }} /> : <ShoppingCart size={12} style={{ color: "var(--accent)" }} />}
                    {l.card.personnagePrincipal?.name || t.noCharacterAssigned}
                  </div>
                  <div style={{ fontSize: "0.72rem", color: "var(--text-muted)" }}>
                    {l.card.collection?.nom} — n°{l.card.numero}
                    {l.type === "seller" && l.condition && <> · {l.condition}</>}
                  </div>
                </div>
                {l.type === "seller" && l.price != null && (
                  <span style={{ fontSize: "0.85rem", color: "var(--gold)", fontWeight: 600 }}>{l.price} €</span>
                )}
                <div style={{ display: "flex", alignItems: "center", gap: "0.4rem", fontSize: "0.76rem", color: "var(--text-muted)" }}>
                  <img src={l.user.avatar || avatarPlaceholder(l.user.username)} alt="" style={{ width: 20, height: 20, borderRadius: "50%", objectFit: "cover" }} />
                  {l.user.username}
                </div>
              </Link>
            ))}
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
