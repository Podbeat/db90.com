"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Store, Tag, Search, Users, Sparkles, SlidersHorizontal, Camera, Truck, Star } from "lucide-react";
import { useLanguage } from "@/components/LanguageProvider";
import { useCurrentUser } from "@/components/CurrentUserProvider";
import ListingCard from "@/components/ListingCard";
import { LISTING_CONDITIONS } from "@/lib/market";

// Page Marché : chiffres du marché, « Pour toi » (cartes recherchées en vente, membres qui
// cherchent mes cartes), onglets À vendre / Recherchées avec leurs compteurs, filtres (repliés
// sur téléphone), annonces chargées par pages, puis le mode d'emploi et les bons réflexes.
// Le site met les membres en relation ; le paiement et l'envoi se règlent entre eux.

const TYPES = [
  { key: "all", label: (t) => t.mkTabAll, count: (c) => c.all },
  { key: "seller", label: (t) => t.mkTabSelling, count: (c) => c.seller },
  { key: "buyer", label: (t) => t.mkTabWanted, count: (c) => c.buyer },
];
const SORTS = [
  { key: "recent", label: (t) => t.marketSortRecent },
  { key: "price_asc", label: (t) => t.marketSortPriceAsc },
  { key: "price_desc", label: (t) => t.marketSortPriceDesc },
];
const NO_FILTERS = { collectionId: "all", personnage: "all", pays: "all", condition: "all" };

function Strip({ title, listings }) {
  return (
    <div className="mk-foryou-block">
      <div className="mk-foryou-label">{title}</div>
      <div className="mk-strip">
        {listings.map((l) => (
          <ListingCard key={l.id} listing={l} />
        ))}
      </div>
    </div>
  );
}

export default function MarketPage() {
  const { t } = useLanguage();
  const { me } = useCurrentUser();
  const [type, setType] = useState("all");
  const [filters, setFilters] = useState(NO_FILTERS);
  const [sort, setSort] = useState("recent");
  const [data, setData] = useState(null);
  const [listings, setListings] = useState([]);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [loadError, setLoadError] = useState(false);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [forYou, setForYou] = useState(null);

  const query = (p) => new URLSearchParams({ type, ...filters, sort, page: String(p) }).toString();

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetch(`/api/market?${query(1)}`)
      .then((r) => {
        if (!r.ok) throw new Error("Réponse serveur invalide");
        return r.json();
      })
      .then((d) => {
        if (cancelled) return;
        setLoadError(false);
        setData(d);
        setListings(d.listings || []);
        setPage(1);
      })
      .catch(() => !cancelled && setLoadError(true))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [type, filters, sort]);

  useEffect(() => {
    if (!me) {
      setForYou(null);
      return;
    }
    fetch("/api/market/me", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then(setForYou)
      .catch(() => setForYou(null));
  }, [me]);

  function chooseType(key) {
    setType(key);
    // Une recherche n'a ni prix ni état : ces critères ne s'appliquent qu'aux cartes en vente.
    if (key === "buyer") {
      setFilters((f) => ({ ...f, condition: "all" }));
      setSort("recent");
    }
  }

  function loadMore() {
    const next = page + 1;
    setLoadingMore(true);
    fetch(`/api/market?${query(next)}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (!d) return;
        setListings((prev) => [...prev, ...(d.listings || [])]);
        setPage(next);
      })
      .finally(() => setLoadingMore(false));
  }

  const setFilter = (key, value) => setFilters((f) => ({ ...f, [key]: value }));
  const activeFilters = Object.keys(NO_FILTERS).filter((k) => filters[k] !== "all").length;
  const facets = data?.facets || { collections: [], pays: [], personnages: [] };
  const counts = data?.counts;
  const stats = data?.stats;
  const sorts = type === "buyer" ? SORTS.slice(0, 1) : SORTS;
  const hasMore = !!data && page < data.totalPages;
  const forYouCount = (forYou?.forSale?.length || 0) + (forYou?.buyers?.length || 0);

  return (
    <div className="container page mk-page">
      <header className="lb-hero">
        <div className="lb-hero-text">
          <h1 className="display-font lb-title">
            <Store size={24} aria-hidden="true" /> {t.marketTitle}
          </h1>
          <p className="lb-intro">{t.mkIntro}</p>
        </div>
        <div className="mk-hero-actions">
          {me && (
            <Link href="/compte/ventes" className="btn-ghost mk-hero-btn">
              <Tag size={15} aria-hidden="true" /> {t.navMySales}
            </Link>
          )}
          <a href="#comment-ca-marche" className="btn-primary mk-hero-btn">{t.mkHowCta}</a>
        </div>
      </header>

      {stats && (
        <div className="lb-stats mk-stats">
          {[
            { Icon: Tag, value: stats.selling, label: t.mkStatSelling },
            { Icon: Search, value: stats.wanted, label: t.mkStatWanted },
            { Icon: Users, value: stats.members, label: t.mkStatMembers },
            { Icon: Sparkles, value: stats.new7d, label: t.mkStatNew },
          ].map(({ Icon, value, label }) => (
            <div key={label} className="lb-stat">
              <Icon size={16} aria-hidden="true" />
              <span className="lb-stat-value">{value}</span>
              <span className="lb-stat-label">{label}</span>
            </div>
          ))}
        </div>
      )}

      {forYouCount > 0 && (
        <section className="mk-foryou" aria-labelledby="mk-foryou-title">
          <h2 id="mk-foryou-title" className="lb-section-title">{t.mkForYouTitle}</h2>
          <div className="mk-foryou-grid">
            {forYou.forSale.length > 0 && <Strip title={t.mkForYouSelling(forYou.forSale.length)} listings={forYou.forSale} />}
            {forYou.buyers.length > 0 && <Strip title={t.mkForYouBuyers(forYou.buyers.length)} listings={forYou.buyers} />}
          </div>
        </section>
      )}
      {forYou && forYouCount === 0 && forYou.wantedCount === 0 && <p className="mk-foryou-hint">{t.mkForYouHint}</p>}

      <div className="mk-toolbar">
        <div className="lb-periods mk-types" role="group" aria-label={t.marketTypeLabel}>
          {TYPES.map((x) => (
            <button key={x.key} type="button" aria-pressed={type === x.key} className={type === x.key ? "active" : ""} onClick={() => chooseType(x.key)}>
              {x.label(t)}
              {counts && <span className="mk-count">{x.count(counts)}</span>}
            </button>
          ))}
        </div>
        <div className="mk-sorts">
          <span className="chip-label">{t.marketSortLabel}</span>
          {sorts.map((s) => (
            <button key={s.key} type="button" className={`sort-chip ${sort === s.key ? "active" : ""}`} onClick={() => setSort(s.key)}>
              {s.label(t)}
            </button>
          ))}
        </div>
        <button type="button" className="pill-btn mk-filters-btn" aria-expanded={filtersOpen} onClick={() => setFiltersOpen((o) => !o)}>
          <SlidersHorizontal size={16} aria-hidden="true" /> {t.mkFilters}
          {activeFilters > 0 && <span className="pill-count">{activeFilters}</span>}
        </button>
      </div>

      <div className={`mk-filters${filtersOpen ? " open" : ""}`}>
        <select className="filter-select" value={filters.collectionId} onChange={(e) => setFilter("collectionId", e.target.value)} aria-label={t.collection}>
          <option value="all">{t.allCollections}</option>
          {facets.collections.map((c) => <option key={c.id} value={c.id}>{c.nom}</option>)}
        </select>
        <select className="filter-select" value={filters.personnage} onChange={(e) => setFilter("personnage", e.target.value)} aria-label={t.personnage}>
          <option value="all">{t.allPersonnages}</option>
          {facets.personnages.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
        <select className="filter-select" value={filters.pays} onChange={(e) => setFilter("pays", e.target.value)} aria-label={t.origin}>
          <option value="all">{t.allOrigins}</option>
          {facets.pays.map((p) => <option key={p} value={p}>{p}</option>)}
        </select>
        {type !== "buyer" && (
          <select className="filter-select" value={filters.condition} onChange={(e) => setFilter("condition", e.target.value)} aria-label={t.conditionLabel}>
            <option value="all">{t.mkConditionAll}</option>
            {LISTING_CONDITIONS.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        )}
        {activeFilters > 0 && (
          <button type="button" className="lb-link-btn" onClick={() => setFilters(NO_FILTERS)}>{t.resetFilters}</button>
        )}
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
          {hasMore && (
            <button type="button" className="btn-ghost lb-more" onClick={loadMore} disabled={loadingMore}>
              {loadingMore ? t.loading : t.lbShowMore}
            </button>
          )}
        </>
      )}

      <section className="mk-how" id="comment-ca-marche">
        <div className="lb-panel">
          <h2 className="lb-section-title">{t.mkHowTitle}</h2>
          <ol className="mk-steps">
            {t.mkHowSteps.map((s, i) => (
              <li key={i}>
                <span className="mk-step-num">{i + 1}</span>
                <span>{s}</span>
              </li>
            ))}
          </ol>
          <Link href="/" className="lb-link-btn">{t.mkHowCatalogue}</Link>
        </div>
        <div className="lb-panel">
          <h2 className="lb-section-title">{t.mkTipsTitle}</h2>
          <ul className="lb-rules">
            {[Camera, Truck, Star].map((Icon, i) => (
              <li key={i}>
                <Icon size={14} aria-hidden="true" /> {t.mkTips[i]}
              </li>
            ))}
          </ul>
          <p className="lb-rules-note">{t.mkNote}</p>
        </div>
      </section>
    </div>
  );
}
