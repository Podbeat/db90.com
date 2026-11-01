"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useLanguage } from "@/components/LanguageProvider";
import { localize } from "@/lib/localize";
import { missingCardPlaceholder } from "@/lib/missingCardPlaceholder";
import { CardNumBadge } from "@/components/CardTileMeta";
import { groupByNumero } from "@/lib/variants";
import { effectTone } from "@/lib/effectTone";
import { CARD_GRID_SIZES } from "@/lib/imageSizes";
import HoloCard from "@/components/HoloCard";
import ShareIconButton from "@/components/ShareIconButton";
import CardStatusIcons from "@/components/CardStatusIcons";
import CollectionNewCardUpload from "@/components/CollectionNewCardUpload";
import BulkStatusMenu from "@/components/BulkStatusMenu";
import CardStatusRow from "@/components/CardStatusRow";
import { useCurrentUser } from "@/components/CurrentUserProvider";
import { withMyLiveCount } from "@/lib/registryRank";
import { isOwnedStatus } from "@/lib/cardStatus";
import { Trophy, ChevronLeft, ChevronRight } from "lucide-react";

const VIEW_STORAGE_KEY = "db90-collection-view";
// Clé de filtre des cartes dont l'effet / prisme reste à préciser.
const NO_EFFECT = "__a-preciser";
const prismKey = (card) => card.rarete || NO_EFFECT;

export default function CollectionDetailClient({ id }) {
  const { t, lang } = useLanguage();
  const { me } = useCurrentUser();
  const [collection, setCollection] = useState(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [statusMap, setStatusMap] = useState({});
  const [loggedIn, setLoggedIn] = useState(false);

  useEffect(() => {
    fetch(`/api/collections/${id}`)
      .then((r) => {
        if (!r.ok) throw new Error("not found");
        return r.json();
      })
      .then(setCollection)
      .catch(() => setNotFound(true))
      .finally(() => setLoading(false));

    fetch("/api/users/me/cards")
      .then((r) => {
        setLoggedIn(r.ok);
        return r.ok ? r.json() : null;
      })
      .then((d) => {
        if (!d) return;
        const map = {};
        for (const c of d.owned) map[c.id] = c.forTrade ? "trade" : "owned";
        for (const c of d.wanted) map[c.id] = "wanted";
        setStatusMap(map);
      })
      .catch(() => {});
  }, [id]);

  // Registre de la collection (membres connectés) : pour afficher « 4ᵉ sur 21 au registre ».
  const [registry, setRegistry] = useState(null);
  useEffect(() => {
    if (!loggedIn) return;
    fetch(`/api/collections/${id}/registry`)
      .then((r) => (r.ok ? r.json() : null))
      .then(setRegistry)
      .catch(() => {});
  }, [loggedIn, id]);

  function handleStatusChange(cardId, status) {
    setStatusMap((prev) => {
      const next = { ...prev };
      if (status) next[cardId] = status;
      else delete next[cardId];
      return next;
    });
  }

  // Affichage grille ou liste : préférence propre à ce navigateur, sans conséquence si le
  // stockage local est indisponible (navigation privée).
  const [view, setView] = useState("grid");
  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(VIEW_STORAGE_KEY);
      if (saved === "grid" || saved === "list") setView(saved);
    } catch (e) {}
  }, []);
  function changeView(next) {
    setView(next);
    try {
      window.localStorage.setItem(VIEW_STORAGE_KEY, next);
    } catch (e) {}
  }

  // Mode liste : un clic sur le statut déjà actif le retire, comme sur les vignettes.
  async function toggleStatus(cardId, next) {
    const newStatus = statusMap[cardId] === next ? null : next;
    handleStatusChange(cardId, newStatus);
    await fetch("/api/users/me/cards", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ cardId, status: newStatus }),
    }).catch(() => {});
  }

  // Cocher en lot : affichage immédiat, enregistrement en un appel, puis possibilité
  // d'annuler (le serveur renvoie le statut d'avant de chaque carte modifiée).
  const [bulkNotice, setBulkNotice] = useState(null);
  const [bulkBusy, setBulkBusy] = useState(false);
  async function applyBulk(updates, { isUndo = false } = {}) {
    if (!updates.length || bulkBusy) return;
    const snapshot = statusMap;
    setBulkBusy(true);
    setStatusMap((prev) => {
      const next = { ...prev };
      for (const u of updates) {
        if (u.status) next[u.cardId] = u.status;
        else delete next[u.cardId];
      }
      return next;
    });
    try {
      const res = await fetch("/api/users/me/cards/bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ updates }),
      });
      if (!res.ok) throw new Error("bulk failed");
      const data = await res.json();
      setBulkNotice(isUndo || data.changed === 0 ? null : { count: data.changed, previous: data.previous });
    } catch (e) {
      setStatusMap(snapshot);
      setBulkNotice({ error: true });
    } finally {
      setBulkBusy(false);
    }
  }

  // Effets / prismes : le nom n'est plus répété sous chaque vignette. Une collection d'un seul
  // prisme l'annonce une fois au-dessus de la grille ; avec plusieurs prismes, la même ligne
  // sert de filtre. Une carte connue en plusieurs prismes n'a qu'une vignette, avec ‹ › pour
  // faire défiler ses versions.
  const [prismFilter, setPrismFilter] = useState(null);
  const [shownVariant, setShownVariant] = useState({}); // numéro → id de la version affichée
  const groups = useMemo(() => groupByNumero(collection?.cards || []), [collection]);
  const prismStats = useMemo(() => {
    const counts = new Map();
    for (const c of collection?.cards || []) counts.set(prismKey(c), (counts.get(prismKey(c)) || 0) + 1);
    return [...counts.entries()].sort(
      ([a], [b]) => (a === NO_EFFECT) - (b === NO_EFFECT) || a.localeCompare(b, "fr", { sensitivity: "base" })
    );
  }, [collection]);

  function chooseFilter(key) {
    setPrismFilter(key);
    setShownVariant({});
  }
  // Version affichée : celle choisie avec ‹ ›, sinon celle du prisme filtré, sinon celle que le
  // membre possède, sinon la version principale.
  function shownCard(group) {
    return (
      group.cards.find((c) => c.id === shownVariant[group.numero]) ||
      (prismFilter && group.cards.find((c) => prismKey(c) === prismFilter)) ||
      (!prismFilter && group.cards.find((c) => isOwnedStatus(statusMap[c.id]))) ||
      group.cards[0]
    );
  }
  function stepVariant(e, group, direction) {
    e.preventDefault();
    e.stopPropagation();
    const index = group.cards.indexOf(shownCard(group));
    const next = group.cards[(index + direction + group.cards.length) % group.cards.length];
    setShownVariant((prev) => ({ ...prev, [group.numero]: next.id }));
  }

  if (loading) return <div className="container page"><div className="empty-state">{t.loading}</div></div>;
  if (notFound || !collection) return <div className="container page"><div className="empty-state">{t.notFound}</div></div>;

  const visibleGroups = prismFilter ? groups.filter((g) => g.cards.some((c) => prismKey(c) === prismFilter)) : groups;
  const visibleCards = prismFilter ? collection.cards.filter((c) => prismKey(c) === prismFilter) : collection.cards;

  // Progression en références (numéros) : une variante d'effet d'un numéro déjà possédé ne
  // rapproche pas de la collection complète (même règle que lib/completion.js).
  const progressTotal = collection.total || new Set(collection.cards.map((c) => c.numero)).size;
  const ownedHere = new Set(collection.cards.filter((c) => isOwnedStatus(statusMap[c.id])).map((c) => c.numero)).size;
  const progressPct = progressTotal ? Math.min(100, Math.round((ownedHere / progressTotal) * 100)) : 0;
  const showList = loggedIn && view === "list";

  // Place au registre, recalculée avec le nombre de cartes à jour (le registre public est
  // en cache une minute).
  let registryLine = null;
  if (registry && me) {
    const { registry: live, mine } = withMyLiveCount(registry, collection.total, me.username, ownedHere);
    if (!mine) registryLine = t.registryOpenLine;
    else if (collection.total && mine.owned >= collection.total) registryLine = t.registryCompleteLine;
    else registryLine = t.registryRankLine(mine.rank, live.collectors);
  }

  return (
    <div className="container page">
      <Link href="/collections" style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>{t.backToCollections}</Link>
      <div style={{ display: "flex", gap: "1.1rem", alignItems: "flex-start", margin: "0.6rem 0 1.5rem" }}>
        {collection.dos && (
          <div style={{ textAlign: "center", flexShrink: 0 }}>
            <Image src={collection.dos} alt={`${t.verso} — ${collection.nom}`} width={70} height={98} style={{ width: 70, height: "auto", border: "1px solid var(--line)" }} />
            <div style={{ fontSize: "0.65rem", color: "var(--text-muted)", marginTop: "0.3rem" }}>{t.verso}</div>
            {collection.dosHD && (
              <a href={collection.dosHD} target="_blank" rel="noopener noreferrer" style={{ fontSize: "0.65rem", color: "var(--gold)" }}>
                {t.viewHD}
              </a>
            )}
          </div>
        )}
        <div>
          <h1 className="display-font" style={{ fontSize: "1.4rem", margin: "0 0 0.2rem" }}>{collection.nom}</h1>
          <div style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>
            {[collection.editeur, collection.pays, collection.annee].filter(Boolean).join(" · ")}
            {" — "}
            {/* Numéros avec un visuel (les autres prismes d'un même numéro ne comptent pas en plus). */}
            {t.archivedOf(new Set(collection.cards.filter((c) => c.image).map((c) => c.numero)).size, collection.total)}
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem", marginTop: "0.6rem" }}>
            <a href={`/api/collections/${collection.id}/checklist`} className="btn-ghost" style={{ display: "inline-block", fontSize: "0.75rem" }}>
              {t.downloadChecklist}
            </a>
            <Link
              href={`/collections/${collection.id}/registre`}
              className="btn-ghost"
              style={{ display: "inline-flex", alignItems: "center", gap: "0.35rem", fontSize: "0.75rem" }}
            >
              <Trophy size={13} aria-hidden="true" /> {t.registryLink}
            </Link>
          </div>
        </div>
      </div>

      {loggedIn && progressTotal > 0 && (
        <section className="collection-progress-panel" aria-label={t.myProgress}>
          <div className="collection-progress-head">
            <span className="collection-progress-title">{t.myProgress}</span>
            <span>{t.progressCount(ownedHere, progressTotal, progressPct)}</span>
          </div>
          <div className="collection-progress-track">
            <div className="collection-progress-fill" style={{ width: `${progressPct}%` }} />
          </div>
          {registryLine && (
            <Link href={`/collections/${collection.id}/registre`} className="collection-progress-rank">
              {registryLine} <span aria-hidden="true">→</span>
            </Link>
          )}
        </section>
      )}

      {(() => {
        const desc = localize(collection, "description", lang);
        return desc ? (
          <p style={{ fontSize: "0.9rem", color: "var(--text-muted)", lineHeight: 1.6, marginBottom: "1.75rem", whiteSpace: "pre-wrap" }}>
            {desc}
          </p>
        ) : null;
      })()}

      {(() => {
        // Liste des cartes manquantes : uniquement calculable si toutes les références
        // existantes sont de simples numéros (pas des codes du type "ZCB-01"), et si le
        // total de la série est connu.
        if (!collection.total) return null;

        // Si la série est déjà complète (autant de cartes que prévu, toutes avec un
        // visuel), on ne cherche pas plus loin : certaines séries ont une numérotation
        // erronée d'origine (doublons, sauts de numéro dus à un défaut d'impression),
        // ce qui ferait ressortir de faux "numéros manquants" alors que rien ne manque.
        const hasAllVisuals =
          collection.cards.length >= collection.total && collection.cards.every((c) => c.image);
        if (hasAllVisuals) return null;

        const numeros = collection.cards.map((c) => c.numero);
        const allNumeric = numeros.length > 0 && numeros.every((n) => /^\d+$/.test(n));
        if (!allNumeric) return null;

        // "Présente" signifie avoir un vrai scan, pas seulement une ligne en base : une
        // carte créée sans visuel (avis de recherche) doit continuer à apparaître ici tant
        // qu'elle n'a pas de scan, même si elle est déjà cataloguée.
        const present = new Set(
          collection.cards.filter((c) => c.image).map((c) => parseInt(c.numero, 10))
        );
        const missing = [];
        for (let i = 1; i <= collection.total; i++) {
          if (!present.has(i)) missing.push(i);
        }
        if (missing.length === 0) return null;

        return (
          <div className="missing-cards-box">
            <div className="missing-cards-title">{t.missingCards} ({missing.length})</div>
            <p className="missing-cards-intro">{t.missingCardsIntro}</p>
            <div className="missing-cards-list">
              {missing.map((n) => (
                <span key={n} className="missing-card-chip">{n}</span>
              ))}
            </div>
            <Link href="/informations" className="btn-ghost" style={{ display: "inline-block", marginTop: "0.8rem" }}>
              {t.navInfo}
            </Link>
          </div>
        );
      })()}

      {prismStats.length === 1 && prismStats[0][0] !== NO_EFFECT && (
        <div className="prism-row">
          <span className="prism-row-label">{t.rarity}</span>
          <span className="rarity-tag" data-tone={effectTone(prismStats[0][0])}>{prismStats[0][0]}</span>
          <span className="prism-row-note">{t.prismAllCards}</span>
        </div>
      )}
      {prismStats.length > 1 && (
        <div className="prism-row prism-filter" role="group" aria-label={t.rarity}>
          <span className="prism-row-label">{t.rarity}</span>
          <div className="prism-chips">
            <button type="button" className={`prism-chip${prismFilter === null ? " active" : ""}`} aria-pressed={prismFilter === null} onClick={() => chooseFilter(null)}>
              {t.allPrisms}
            </button>
            {prismStats.map(([key, count]) => (
              <button
                key={key}
                type="button"
                className={`prism-chip${prismFilter === key ? " active" : ""}`}
                aria-pressed={prismFilter === key}
                onClick={() => chooseFilter(prismFilter === key ? null : key)}
              >
                {key === NO_EFFECT ? t.effectUnknown : key} <span className="prism-chip-count">{count}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {loggedIn && collection.cards.length > 0 && (
        <>
          <div className="collection-toolbar">
            <div className="segmented" role="group" aria-label={t.viewLabel}>
              <button type="button" aria-pressed={view === "grid"} className={view === "grid" ? "active" : ""} onClick={() => changeView("grid")}>
                {t.viewGrid}
              </button>
              <button type="button" aria-pressed={view === "list"} className={view === "list" ? "active" : ""} onClick={() => changeView("list")}>
                {t.viewList}
              </button>
            </div>
            <BulkStatusMenu cards={visibleCards} statusMap={statusMap} onApply={(updates) => applyBulk(updates)} />
          </div>
          {bulkNotice && (
            <div className={`bulk-notice ${bulkNotice.error ? "error" : ""}`} role="status">
              <span>{bulkNotice.error ? t.bulkFailed : t.bulkDone(bulkNotice.count)}</span>
              {!bulkNotice.error && (
                <button type="button" className="bulk-notice-undo" disabled={bulkBusy} onClick={() => applyBulk(bulkNotice.previous, { isUndo: true })}>
                  {t.undo}
                </button>
              )}
            </div>
          )}
        </>
      )}

      {collection.cards.length === 0 && collection.total ? (
        <div className="empty-state">{t.noResults}</div>
      ) : showList ? (
        <ul className="status-list">
          {visibleCards.map((c) => (
            <CardStatusRow key={c.id} card={c} status={statusMap[c.id] || null} onToggle={toggleStatus} />
          ))}
        </ul>
      ) : (
        <div className="card-grid prism-grid">
          {visibleGroups.map((group, i) => {
            const c = shownCard(group);
            const versions = group.cards.length;
            return (
              <Link
                key={group.numero}
                href={`/cartes/${c.id}`}
                className="card-tile"
                style={{ "--stagger-delay": `${Math.min(i * 40, 400)}ms` }}
              >
                <HoloCard className="card-tile-media">
                  {c.image ? (
                    <Image
                      key={c.id}
                      src={c.image}
                      alt={c.personnagePrincipal?.name || ""}
                      fill
                      sizes={CARD_GRID_SIZES}
                      style={{ objectFit: "cover" }}
                    />
                  ) : (
                    <img
                      key={c.id}
                      src={missingCardPlaceholder(c, t)}
                      alt={c.personnagePrincipal?.name || ""}
                      style={{ width: "100%", height: "100%", objectFit: "cover" }}
                    />
                  )}
                  {c.image && <CardNumBadge numero={c.numero} />}
                  <ShareIconButton path={`/cartes/${c.id}`} title={`${c.personnagePrincipal?.name || c.numero} — DB Non-Off 90's`} />
                  {loggedIn && (
                    <CardStatusIcons
                      key={c.id}
                      cardId={c.id}
                      status={statusMap[c.id] || null}
                      onChange={(cardId, status) => {
                        // La vignette reste sur la version qu'on vient de cocher ou décocher.
                        setShownVariant((prev) => ({ ...prev, [group.numero]: cardId }));
                        handleStatusChange(cardId, status);
                      }}
                    />
                  )}
                </HoloCard>
                {versions > 1 && (
                  <div className="prism-pager">
                    <button type="button" className="prism-pager-btn prev" aria-label={t.prevPrism} onClick={(e) => stepVariant(e, group, -1)}>
                      <ChevronLeft size={14} aria-hidden="true" />
                    </button>
                    <span className="prism-pager-label">
                      <span className="rarity-tag" data-tone={effectTone(c.rarete)}>{c.rarete || t.effectUnknown}</span>
                      <span className="prism-pager-count">{group.cards.indexOf(c) + 1}/{versions}</span>
                    </span>
                    <button type="button" className="prism-pager-btn next" aria-label={t.nextPrism} onClick={(e) => stepVariant(e, group, 1)}>
                      <ChevronRight size={14} aria-hidden="true" />
                    </button>
                  </div>
                )}
              </Link>
            );
          })}
          {!collection.total && <CollectionNewCardUpload collectionId={collection.id} />}
        </div>
      )}
    </div>
  );
}
