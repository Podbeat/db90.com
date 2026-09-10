"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Search } from "lucide-react";
import { useLanguage } from "@/components/LanguageProvider";

export default function CataloguePage() {
  const { t } = useLanguage();
  const [collections, setCollections] = useState([]);
  const [personnages, setPersonnages] = useState([]);
  const [raretes, setRaretes] = useState([]);
  const [pays, setPays] = useState([]);
  const [cards, setCards] = useState([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);

  const [query, setQuery] = useState("");
  const [filterCollection, setFilterCollection] = useState("all");
  const [filterRarete, setFilterRarete] = useState("all");
  const [filterPersonnage, setFilterPersonnage] = useState("all");
  const [filterPays, setFilterPays] = useState("all");

  useEffect(() => {
    fetch("/api/collections").then((r) => r.json()).then(setCollections).catch(() => setCollections([]));
    fetch("/api/facets").then((r) => r.json()).then((d) => {
      setPersonnages(d.personnages || []);
      setRaretes(d.raretes || []);
      setPays(d.pays || []);
    }).catch(() => {});
  }, []);

  useEffect(() => {
    setLoading(true);
    const params = new URLSearchParams({
      page: String(page),
      pageSize: "40",
      collectionId: filterCollection,
      rarete: filterRarete,
      personnage: filterPersonnage,
      pays: filterPays,
      q: query,
    });
    fetch(`/api/cards?${params.toString()}`)
      .then((r) => r.json())
      .then((data) => {
        setCards(data.cards || []);
        setTotal(data.total || 0);
        setTotalPages(data.totalPages || 1);
      })
      .catch(() => {
        setCards([]);
        setTotal(0);
      })
      .finally(() => setLoading(false));
  }, [page, filterCollection, filterRarete, filterPersonnage, filterPays, query]);

  useEffect(() => setPage(1), [filterCollection, filterRarete, filterPersonnage, filterPays, query]);

  return (
    <div className="container page">
      <div className="two-col">
        <aside className="filter-panel sidebar">
          <div className="field">
            <span className="field-label">{t.search}</span>
            <div className="search-wrap">
              <Search size={14} className="search-icon" />
              <input
                placeholder={t.searchPlaceholder}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
            </div>
          </div>
          <div className="field">
            <span className="field-label">{t.collection}</span>
            <select value={filterCollection} onChange={(e) => setFilterCollection(e.target.value)}>
              <option value="all">{t.allCollections}</option>
              {collections.map((c) => (
                <option key={c.id} value={c.id}>{c.nom}</option>
              ))}
            </select>
          </div>
          <div className="field">
            <span className="field-label">{t.personnage}</span>
            <select value={filterPersonnage} onChange={(e) => setFilterPersonnage(e.target.value)}>
              <option value="all">{t.allPersonnages}</option>
              {personnages.map((p) => (
                <option key={p} value={p}>{p}</option>
              ))}
            </select>
          </div>
          <div className="field">
            <span className="field-label">{t.origin}</span>
            <select value={filterPays} onChange={(e) => setFilterPays(e.target.value)}>
              <option value="all">{t.allOrigins}</option>
              {pays.map((p) => (
                <option key={p} value={p}>{p}</option>
              ))}
            </select>
          </div>
          <div className="field">
            <span className="field-label">{t.rarity}</span>
            <select value={filterRarete} onChange={(e) => setFilterRarete(e.target.value)}>
              <option value="all">{t.allRarities}</option>
              {raretes.map((r) => (
                <option key={r} value={r}>{r}</option>
              ))}
            </select>
          </div>
          <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", borderTop: "1px solid var(--line)", paddingTop: "0.6rem", marginBottom: "0.8rem" }}>
            {t.cardsArchived(total)}
          </div>
          {(query || filterCollection !== "all" || filterPersonnage !== "all" || filterRarete !== "all" || filterPays !== "all") && (
            <button
              className="btn-ghost"
              style={{ width: "100%" }}
              onClick={() => {
                setQuery("");
                setFilterCollection("all");
                setFilterPersonnage("all");
                setFilterRarete("all");
                setFilterPays("all");
              }}
            >
              {t.resetFilters}
            </button>
          )}
        </aside>

        <div className="main-col">
          {loading ? (
            <div className="empty-state">{t.loading}</div>
          ) : cards.length === 0 ? (
            <div className="empty-state">{t.noResults}</div>
          ) : (
            <>
              <div className="card-grid">
                {cards.map((c) => (
                  <Link key={c.id} href={`/cartes/${c.id}`} className="card-tile">
                    <img src={c.image || placeholderFor(c)} alt={c.personnage} />
                    <div className="meta">
                      <div className="card-num">{c.numero}</div>
                      <div className="card-nom">{c.personnage}</div>
                      <span className="rarity-tag">{c.rarete}</span>
                    </div>
                  </Link>
                ))}
              </div>
              {totalPages > 1 && (
                <div className="pagination">
                  <button className="btn-ghost" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
                    {t.previous}
                  </button>
                  <span style={{ alignSelf: "center", fontSize: "0.85rem", color: "var(--text-muted)" }}>
                    {t.page(page, totalPages)}
                  </span>
                  <button className="btn-ghost" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>
                    {t.next}
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function placeholderFor(card) {
  const svg = `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 240 336'><rect width='240' height='336' fill='#1a2c4d'/><text x='120' y='170' font-family='Arial' font-size='16' fill='#8ea3c4' text-anchor='middle'>${card.numero}</text></svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}
