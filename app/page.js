"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { Search, Shuffle } from "lucide-react";
import { useLanguage } from "@/components/LanguageProvider";
import { missingCardPlaceholder } from "@/lib/missingCardPlaceholder";
import HoloCard from "@/components/HoloCard";
import { playShuffleSound } from "@/lib/playShuffleSound";

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
  const [highlights, setHighlights] = useState(null);
  const [seenIds, setSeenIds] = useState([]);
  const [shuffling, setShuffling] = useState(false);

  const [query, setQuery] = useState("");
  const [filterCollection, setFilterCollection] = useState("all");
  const [filterRarete, setFilterRarete] = useState("all");
  const [filterPersonnage, setFilterPersonnage] = useState("all");
  const [filterPays, setFilterPays] = useState("all");

  const hasActiveFilters =
    query || filterCollection !== "all" || filterPersonnage !== "all" || filterRarete !== "all" || filterPays !== "all";

  // En mode découverte (aucun filtre actif), "Mélanger" ne réordonne pas les mêmes cartes :
  // il va chercher un nouveau lot aléatoire, en excluant celles déjà vues, jusqu'à épuiser
  // le catalogue puis recommencer.
  function shuffleCards() {
    playShuffleSound();
    setShuffling(true);
    setTimeout(() => setShuffling(false), 350);

    if (hasActiveFilters) {
      setCards((prev) => {
        const arr = [...prev];
        for (let i = arr.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [arr[i], arr[j]] = [arr[j], arr[i]];
        }
        return arr;
      });
      return;
    }
    fetchRandomCards(seenIds);
  }

  function fetchRandomCards(excludeIds) {
    setLoading(true);
    const params = new URLSearchParams({
      random: "true",
      pageSize: "20",
      excludeIds: excludeIds.join(","),
      collectionId: filterCollection,
      rarete: filterRarete,
      personnage: filterPersonnage,
      pays: filterPays,
      q: query,
    });
    fetch(`/api/cards?${params.toString()}`)
      .then((r) => r.json())
      .then((data) => {
        const newCards = data.cards || [];
        setCards(newCards);
        setTotal(data.total || 0);
        setTotalPages(1);
        const newIds = newCards.map((c) => c.id);
        // Repart de zéro si le lot renvoyé chevauche largement l'historique (catalogue
        // épuisé et recommencé côté serveur), sinon on cumule au fil des mélanges.
        const overlap = newIds.filter((id) => excludeIds.includes(id)).length;
        setSeenIds(overlap > newIds.length / 2 ? newIds : [...excludeIds, ...newIds]);
      })
      .catch(() => {
        setCards([]);
        setTotal(0);
      })
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    fetch("/api/collections").then((r) => r.json()).then(setCollections).catch(() => setCollections([]));
    fetch("/api/facets").then((r) => r.json()).then((d) => {
      setPersonnages(d.personnages || []);
      setRaretes(d.raretes || []);
      setPays(d.pays || []);
    }).catch(() => {});
    fetch("/api/highlights").then((r) => r.json()).then(setHighlights).catch(() => setHighlights(null));
  }, []);

  useEffect(() => {
    if (!hasActiveFilters) {
      // Page d'accueil sans filtre : cartes aléatoires dès l'arrivée, pas triées par numéro.
      fetchRandomCards([]);
      return;
    }
    setLoading(true);
    const params = new URLSearchParams({
      page: String(page),
      pageSize: "20",
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
          {hasActiveFilters && (
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
          <button
            className="btn-ghost"
            style={{ width: "100%", marginTop: hasActiveFilters ? "0.5rem" : 0, display: "flex", alignItems: "center", justifyContent: "center", gap: "0.4rem" }}
            onClick={shuffleCards}
          >
            <Shuffle size={13} /> {t.randomCard}
          </button>
        </aside>

        <div className="main-col">
          {!hasActiveFilters && highlights && (highlights.lastCard || highlights.lastCollection) && (
            <div className="highlights-row">
              {highlights.lastCard && (
                <Link href={`/cartes/${highlights.lastCard.id}`} className="highlight-card">
                  <Image src={highlights.lastCard.image} alt="" width={36} height={50} style={{ objectFit: "cover" }} />
                  <div>
                    <div className="highlight-label">{t.lastCardAdded}</div>
                    <div className="highlight-title">{highlights.lastCard.personnage} — {highlights.lastCard.numero}</div>
                    <div className="highlight-sub">{highlights.lastCard.collection?.nom}</div>
                  </div>
                </Link>
              )}
              {highlights.lastCollection && (
                <Link href={`/collections/${highlights.lastCollection.id}`} className="highlight-card">
                  {highlights.lastCollection.previewImage ? (
                    <Image src={highlights.lastCollection.previewImage} alt="" width={36} height={50} style={{ objectFit: "cover" }} />
                  ) : (
                    <img
                      src={`data:image/svg+xml;utf8,${encodeURIComponent(
                        "<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 240 336'><rect width='240' height='336' fill='#1a2c4d'/></svg>"
                      )}`}
                      alt=""
                      style={{ width: 36, height: 50, objectFit: "cover" }}
                    />
                  )}
                  <div>
                    <div className="highlight-label">{t.lastCollectionAdded}</div>
                    <div className="highlight-title">{highlights.lastCollection.nom}</div>
                    <div className="highlight-sub">
                      {[highlights.lastCollection.pays, highlights.lastCollection.annee].filter(Boolean).join(" · ")}
                    </div>
                  </div>
                </Link>
              )}
            </div>
          )}
          {loading ? (
            <div className="empty-state">{t.loading}</div>
          ) : cards.length === 0 ? (
            <div className="empty-state">{t.noResults}</div>
          ) : (
            <>
              <div className={`card-grid ${shuffling ? "shuffling" : ""}`}>
                {cards.map((c) => (
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
                      <div className="card-collection">{c.collection?.nom} <span className="card-num-inline">n°{c.numero}</span></div>
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
