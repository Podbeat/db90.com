"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { Shuffle, Search, SlidersHorizontal, X } from "lucide-react";
import { useLanguage } from "@/components/LanguageProvider";
import { useCurrentUser } from "@/components/CurrentUserProvider";
import { missingCardPlaceholder } from "@/lib/missingCardPlaceholder";
import { effectTone } from "@/lib/effectTone";
import { CARD_GRID_SIZES } from "@/lib/imageSizes";
import HoloCard from "@/components/HoloCard";
import MemberSearch from "@/components/MemberSearch";
import ShareIconButton from "@/components/ShareIconButton";
import CardStatusIcons from "@/components/CardStatusIcons";
import { playShuffleSound } from "@/lib/playShuffleSound";

export default function CataloguePage() {
  const { t } = useLanguage();
  const { me } = useCurrentUser();
  // Recherche de cartes (nom du personnage, numéro, description) : la saisie est appliquée
  // après une courte pause, pour ne pas lancer une requête à chaque lettre tapée.
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  // Sur mobile, le panneau de filtres est replié derrière un bouton « Filtres ».
  const [filtersOpen, setFiltersOpen] = useState(false);
  // Statut « possédée / recherchée » de chaque carte pour le membre connecté (icônes sur les vignettes).
  const [statusMap, setStatusMap] = useState({});
  const [collections, setCollections] = useState([]);
  const [personnages, setPersonnages] = useState([]);
  const [raretes, setRaretes] = useState([]);
  const [pays, setPays] = useState([]);
  const [cards, setCards] = useState([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [highlights, setHighlights] = useState(null);
  const [seenIds, setSeenIds] = useState([]);
  const [shuffling, setShuffling] = useState(false);

  const [filterCollection, setFilterCollection] = useState("all");
  const [filterRarete, setFilterRarete] = useState("all");
  const [filterPersonnage, setFilterPersonnage] = useState("all");
  const [filterPays, setFilterPays] = useState("all");

  const activeFilterCount = [filterCollection, filterPersonnage, filterRarete, filterPays].filter((v) => v !== "all").length;
  const hasActiveFilters = activeFilterCount > 0 || debouncedQuery !== "";

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedQuery(query.trim()), 300);
    return () => clearTimeout(timer);
  }, [query]);

  // Statuts des cartes du membre connecté, chargés une seule fois pour toute la grille.
  useEffect(() => {
    if (!me) {
      setStatusMap({});
      return;
    }
    fetch("/api/users/me/cards")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (!d) return;
        const map = {};
        for (const c of d.owned) map[c.id] = c.forTrade ? "trade" : "owned";
        for (const c of d.wanted) map[c.id] = "wanted";
        setStatusMap(map);
      })
      .catch(() => {});
  }, [me]);

  function handleStatusChange(cardId, status) {
    setStatusMap((prev) => {
      const next = { ...prev };
      if (status) next[cardId] = status;
      else delete next[cardId];
      return next;
    });
  }

  // Feuille de filtres ouverte (mobile) : Échap la referme et la page derrière ne défile plus.
  useEffect(() => {
    if (!filtersOpen) return;
    function handleKey(e) {
      if (e.key === "Escape") setFiltersOpen(false);
    }
    document.addEventListener("keydown", handleKey);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", handleKey);
      document.body.style.overflow = previousOverflow;
    };
  }, [filtersOpen]);

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
    });
    fetch(`/api/cards?${params.toString()}`)
      .then((r) => {
        if (!r.ok) throw new Error("Réponse serveur invalide");
        setLoadError(false);
        return r.json();
      })
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
        setLoadError(true);
      })
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    fetch("/api/highlights").then((r) => r.json()).then(setHighlights).catch(() => setHighlights(null));
  }, []);

  // Facettage croisé : la liste des collections/personnages/pays/effets proposée dans
  // chaque filtre tient compte des autres filtres déjà actifs, pour ne jamais laisser
  // sélectionné un choix qui n'existe plus compte tenu du reste de la sélection.
  useEffect(() => {
    const params = new URLSearchParams({
      collectionId: filterCollection,
      rarete: filterRarete,
      personnage: filterPersonnage,
      pays: filterPays,
      q: debouncedQuery,
    });
    fetch(`/api/facets?${params.toString()}`)
      .then((r) => r.json())
      .then((d) => {
        const newPersonnages = d.personnages || [];
        const newRaretes = d.raretes || [];
        const newPays = d.pays || [];
        const newCollections = d.collections || [];
        setPersonnages(newPersonnages);
        setRaretes(newRaretes);
        setPays(newPays);
        setCollections(newCollections);

        // Si le filtre actuellement sélectionné n'a plus lieu d'être (plus aucune carte
        // ne correspond compte tenu des autres filtres), on le réinitialise plutôt que de
        // laisser l'utilisateur bloqué sur une combinaison vide.
        if (filterPersonnage !== "all" && !newPersonnages.some((p) => p.id === filterPersonnage)) setFilterPersonnage("all");
        if (filterRarete !== "all" && !newRaretes.includes(filterRarete)) setFilterRarete("all");
        if (filterPays !== "all" && !newPays.includes(filterPays)) setFilterPays("all");
        if (filterCollection !== "all" && !newCollections.some((c) => c.id === filterCollection)) setFilterCollection("all");
      })
      .catch(() => {});
  }, [filterCollection, filterRarete, filterPersonnage, filterPays, debouncedQuery]);

  useEffect(() => {
    if (!hasActiveFilters) {
      // Page d'accueil sans filtre : cartes aléatoires dès l'arrivée, pas triées par numéro.
      fetchRandomCards([]);
      return;
    }
    // Si la sélection change avant la réponse (frappe rapide, filtre changé), la réponse
    // devenue périmée est ignorée : seule la dernière demande s'affiche.
    let cancelled = false;
    setLoading(true);
    const params = new URLSearchParams({
      page: String(page),
      pageSize: "20",
      collectionId: filterCollection,
      rarete: filterRarete,
      personnage: filterPersonnage,
      pays: filterPays,
      q: debouncedQuery,
    });
    fetch(`/api/cards?${params.toString()}`)
      .then((r) => {
        if (!r.ok) throw new Error("Réponse serveur invalide");
        return r.json();
      })
      .then((data) => {
        if (cancelled) return;
        setLoadError(false);
        setCards(data.cards || []);
        setTotal(data.total || 0);
        setTotalPages(data.totalPages || 1);
      })
      .catch(() => {
        if (cancelled) return;
        setCards([]);
        setTotal(0);
        setLoadError(true);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [page, filterCollection, filterRarete, filterPersonnage, filterPays, debouncedQuery]);

  useEffect(() => setPage(1), [filterCollection, filterRarete, filterPersonnage, filterPays, debouncedQuery]);

  return (
    <div className="container page">
      {filtersOpen && <div className="sheet-overlay" onClick={() => setFiltersOpen(false)} aria-hidden="true" />}
      <div className="two-col">
        <aside
          className={`filter-panel sidebar ${filtersOpen ? "sheet-open" : ""}`}
          role={filtersOpen ? "dialog" : undefined}
          aria-modal={filtersOpen ? "true" : undefined}
          aria-label={t.filtersButton}
        >
          <div className="sheet-head">
            <span className="sheet-title display-font">{t.filtersButton}</span>
            <button type="button" className="sheet-close" aria-label={t.filtersClose} onClick={() => setFiltersOpen(false)}>
              <X size={22} aria-hidden="true" />
            </button>
          </div>
          <div className="field">
            <span className="field-label">{t.searchMemberLabel}</span>
            <MemberSearch variant="sidebar" />
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
                <option key={p.id} value={p.id}>{p.name}</option>
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
          <div className="sheet-foot">
            <button type="button" className="btn-primary sheet-apply" onClick={() => setFiltersOpen(false)}>
              {t.showResults(total)}
            </button>
          </div>
        </aside>

        <div className="main-col">
          <div className="catalogue-search search-wrap">
            <label htmlFor="catalogue-search-input" className="visually-hidden">{t.searchCardLabel}</label>
            <Search size={18} className="search-icon" aria-hidden="true" />
            <input
              id="catalogue-search-input"
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={t.searchCardPlaceholder}
              autoComplete="off"
            />
          </div>
          <div className="catalogue-toolbar mobile-only">
            <button type="button" className="pill-btn" onClick={() => setFiltersOpen(true)} aria-haspopup="dialog">
              <SlidersHorizontal size={17} aria-hidden="true" /> {t.filtersButton}
              {activeFilterCount > 0 && <span className="pill-count">{activeFilterCount}</span>}
            </button>
            <button type="button" className="pill-btn" onClick={shuffleCards}>
              <Shuffle size={17} aria-hidden="true" /> {t.shuffleShort}
            </button>
            <span className="catalogue-count">{t.cardsCount(total)}</span>
          </div>
          {!hasActiveFilters && highlights && (highlights.lastCard || highlights.lastCollection) && (
            <div className="highlights-row">
              {highlights.lastCard && (
                <Link href={`/cartes/${highlights.lastCard.id}`} className="highlight-card">
                  <Image src={highlights.lastCard.image} alt="" width={36} height={50} style={{ objectFit: "cover" }} />
                  <div>
                    <div className="highlight-label">{t.lastCardAdded}</div>
                    <div className="highlight-title">{highlights.lastCard.personnagePrincipal?.name || t.noCharacterAssigned} — {highlights.lastCard.numero}</div>
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
          ) : loadError ? (
            <div className="empty-state" style={{ color: "var(--accent)" }}>{t.loadErrorMessage}</div>
          ) : cards.length === 0 ? (
            <div className="empty-state">{t.noResults}</div>
          ) : (
            <>
              <div className={`card-grid ${shuffling ? "shuffling" : ""}`}>
                {cards.map((c, i) => (
                  <Link
                    key={c.id}
                    href={`/cartes/${c.id}`}
                    className="card-tile"
                    style={{ "--stagger-delay": `${Math.min(i * 40, 400)}ms` }}
                  >
                    <HoloCard className="card-tile-media">
                      {c.image ? (
                        <Image
                          src={c.image}
                          alt={c.personnagePrincipal?.name || ""}
                          fill
                          sizes={CARD_GRID_SIZES}
                          style={{ objectFit: "cover" }}
                        />
                      ) : (
                        <img
                          src={missingCardPlaceholder(c, t)}
                          alt={c.personnagePrincipal?.name || ""}
                          style={{ width: "100%", height: "100%", objectFit: "cover" }}
                        />
                      )}
                      <ShareIconButton path={`/cartes/${c.id}`} title={`${c.personnagePrincipal?.name || c.numero} — DB Non-Off 90's`} />
                      {me && <CardStatusIcons cardId={c.id} status={statusMap[c.id] || null} onChange={handleStatusChange} />}
                    </HoloCard>
                    <div className="meta">
                      <div className="card-collection">{c.collection?.nom} <span className="card-num-inline">n°{c.numero}</span></div>
                      <div className="card-nom">{c.personnagePrincipal?.name || t.noCharacterAssigned}</div>
                      <span className="rarity-tag" data-tone={effectTone(c.rarete)}>{c.rarete}</span>
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
