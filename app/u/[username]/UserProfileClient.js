"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { Mail, ThumbsUp, ThumbsDown, Flag, Ban, Share2, Check, Pencil, Camera, Trophy, Crown, MoreHorizontal } from "lucide-react";
import { useLanguage } from "@/components/LanguageProvider";
import { missingCardPlaceholder } from "@/lib/missingCardPlaceholder";
import { avatarPlaceholder } from "@/lib/avatarPlaceholder";
import { CARD_GRID_SIZES } from "@/lib/imageSizes";
import { formatMonthYear } from "@/lib/localize";
import { shareUrl } from "@/lib/share";
import ContactUserModal from "@/components/ContactUserModal";
import ListingCard from "@/components/ListingCard";
import { computeBadges } from "@/lib/badges";
import { useCurrentUser } from "@/components/CurrentUserProvider";
import ShowcaseSection from "@/components/ShowcaseSection";
import CardTileMeta, { CardNumBadge } from "@/components/CardTileMeta";

// Profil public en grille : un en-tête (identité, actions, chiffres clés), puis le classeur
// et les avis à gauche, les badges, les collections et les points à droite, et les cartes en
// bas par onglets. Sur téléphone, les mêmes blocs s'enchaînent sur une seule colonne.

const COLLECTIONS_SHOWN = 6;

function MiniGrid({ cards, t, emptyLabel }) {
  if (cards.length === 0) return <div className="profile-empty">{emptyLabel}</div>;
  return (
    <div className="card-grid">
      {cards.map((c, i) => (
        <Link key={c.id} href={`/cartes/${c.id}`} className="card-tile" style={{ "--stagger-delay": `${Math.min(i * 30, 300)}ms` }}>
          <div className="card-tile-media">
            {c.image ? (
              <Image src={c.image} alt={c.personnagePrincipal?.name || ""} fill sizes={CARD_GRID_SIZES} style={{ objectFit: "cover" }} />
            ) : (
              <img src={missingCardPlaceholder(c, t)} alt={c.personnagePrincipal?.name || ""} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
            )}
            {c.image && <CardNumBadge numero={c.numero} />}
          </div>
          <CardTileMeta collection={c.collection?.nom} rarete={c.rarete} />
        </Link>
      ))}
    </div>
  );
}

function Tile({ title, aside, className = "", children }) {
  return (
    <section className={`profile-tile ${className}`} aria-label={title}>
      <div className="profile-tile-head">
        <h2 className="display-font profile-tile-title">{title}</h2>
        {aside != null && <span className="profile-tile-aside">{aside}</span>}
      </div>
      {children}
    </section>
  );
}

// Bloquer et signaler : rarement utiles, rangés dans un petit menu « ⋯ » pour garder
// l'en-tête léger.
function MoreMenu({ label, items }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    if (!open) return undefined;
    const onPointer = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    const onKey = (e) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("pointerdown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div className="profile-menu-wrap" ref={ref}>
      <button
        type="button"
        className="btn-icon profile-icon-btn"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={label}
        title={label}
        onClick={() => setOpen((o) => !o)}
      >
        <MoreHorizontal size={18} />
      </button>
      {open && (
        <div className="profile-menu" role="menu" aria-label={label}>
          {items.map((it) => (
            <button
              key={it.key}
              type="button"
              role="menuitem"
              className="profile-menu-item"
              onClick={() => {
                setOpen(false);
                it.onSelect();
              }}
            >
              <it.Icon size={16} aria-hidden="true" /> {it.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function Stat({ value, label, sub, tone }) {
  return (
    <div className={`profile-stat${tone ? ` ${tone}` : ""}`}>
      <span className="profile-stat-value display-font">{value}</span>
      <span className="profile-stat-label">{label}</span>
      {sub && <span className="profile-stat-sub">{sub}</span>}
    </div>
  );
}

// Médailles : une par collection complète (vignette de la série, lien vers son registre),
// puis les badges généraux, avec un pictogramme ou leur nombre de cartes.
const GENERIC_MEDALS = {
  first_scan: { Icon: Camera, tone: "turquoise" },
  collector_50: { text: "50", tone: "silver" },
  collector_100: { text: "100", tone: "silver" },
  collector_500: { text: "500", tone: "gold" },
  first_completion: { Icon: Trophy, tone: "gold" },
  collector_multi: { Icon: Crown, tone: "gold" },
};

function Medals({ collections, badges, t }) {
  if (collections.length === 0 && badges.length === 0) return <div className="profile-empty">{t.profileBadgesEmpty}</div>;
  return (
    <ul className="medals">
      {collections.map((c) => (
        <li key={c.id}>
          <Link href={`/collections/${c.id}/registre`} className="medal" title={t.collectionCompleteBadge(c.nom)}>
            <span className="medal-disc collection">
              {c.previewImage && <Image src={c.previewImage} alt="" fill sizes={CARD_GRID_SIZES} style={{ objectFit: "cover", objectPosition: "top" }} />}
              <span className="medal-check" aria-hidden="true"><Check size={12} strokeWidth={3.2} /></span>
            </span>
            <span className="medal-label">{c.nom}</span>
            <span className="medal-sub">{t.profileBadgeCompleteSub}</span>
          </Link>
        </li>
      ))}
      {badges.map((b) => {
        const medal = GENERIC_MEDALS[b.id] || { tone: "silver" };
        return (
          <li key={b.id}>
            <span className="medal">
              <span className={`medal-disc ${medal.tone}`} aria-hidden="true">
                {medal.Icon ? <medal.Icon size={24} strokeWidth={2.2} /> : <span className="medal-number">{medal.text}</span>}
              </span>
              <span className="medal-label">{b.label}</span>
            </span>
          </li>
        );
      })}
    </ul>
  );
}

// Progression par collection commencée ; « ? » quand le total de la série n'est pas encore
// connu (barre grisée, calculée sur les références déjà cataloguées).
function CollectionsList({ collections, t }) {
  const [showAll, setShowAll] = useState(false);
  if (!collections?.length) return <div className="profile-empty">{t.profileCollectionsEmpty}</div>;
  const shown = showAll ? collections : collections.slice(0, COLLECTIONS_SHOWN);
  return (
    <>
      <ul className="profile-collections">
        {shown.map((c) => {
          const pct = c.total ? Math.min(100, Math.round((c.owned / c.total) * 100)) : 0;
          return (
            <li key={c.id}>
              <Link href={`/collections/${c.id}/registre`} className={`profile-collection${c.complete ? " complete" : ""}${c.totalKnown === false ? " open" : ""}`}>
                <span className="profile-collection-cover">
                  {c.previewImage && <Image src={c.previewImage} alt="" fill sizes={CARD_GRID_SIZES} style={{ objectFit: "cover", objectPosition: "top" }} />}
                  {c.complete && <span className="profile-collection-check" aria-hidden="true"><Check size={10} strokeWidth={3.4} /></span>}
                </span>
                <span className="profile-collection-body">
                  <span className="profile-collection-top">
                    <span className="profile-collection-name">{c.nom}</span>
                    <span className="profile-collection-count">{c.owned} / {c.totalKnown === false ? "?" : c.total}</span>
                  </span>
                  <span className="profile-collection-bar" aria-hidden="true"><span style={{ width: `${pct}%` }} /></span>
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
      {!showAll && collections.length > COLLECTIONS_SHOWN && (
        <button type="button" className="profile-more" onClick={() => setShowAll(true)}>
          {t.profileCollectionsMore(collections.length - COLLECTIONS_SHOWN)}
        </button>
      )}
    </>
  );
}

// Répartition des points : une barre en quatre segments et sa légende.
function PointsBreakdown({ participation: p, t }) {
  const parts = [
    { key: "cards", value: p.ownedPoints, text: t.participationOwnedLine(p.ownedCount, p.ownedPoints) },
    { key: "sets", value: p.completionBonus, text: t.participationCompletedLine(p.completedCollections, p.completionBonus) },
    { key: "scans", value: p.contributionPoints, text: t.participationContribLine(p.approvedSubmissions, p.contributionPoints) },
    { key: "proposals", value: p.collectionProposalPoints, text: t.participationCollectionProposalLine(p.approvedCollectionProposals, p.collectionProposalPoints) },
  ];
  const total = Math.max(1, p.totalPoints);
  return (
    <>
      <div className="points-bar" aria-hidden="true">
        {parts
          .filter((x) => x.value > 0)
          .map((x) => <span key={x.key} className={`points-seg ${x.key}`} style={{ flexGrow: x.value / total }} />)}
      </div>
      <ul className="points-legend">
        {parts.map((x) => (
          <li key={x.key} className={x.value > 0 ? "" : "zero"}>
            <span className={`points-dot ${x.key}`} aria-hidden="true" />
            {x.text}
          </li>
        ))}
      </ul>
    </>
  );
}

function Reviews({ username, ratings, me, t, onRated }) {
  const [showForm, setShowForm] = useState(false);
  const [positive, setPositive] = useState(true);
  const [comment, setComment] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function submit() {
    setSaving(true);
    setError("");
    try {
      const res = await fetch(`/api/users/${username}/ratings`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ positive, comment }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Échec de l'envoi.");
        return;
      }
      setShowForm(false);
      setComment("");
      onRated();
    } finally {
      setSaving(false);
    }
  }

  const comments = (ratings?.ratings || []).filter((r) => r.comment).slice(0, 3);
  const none = !ratings || ratings.ratings.length === 0;
  return (
    <>
      {none ? (
        <div className="profile-empty">{t.noRatings}</div>
      ) : (
        <div className="reviews-summary">
          <span className="reviews-count good"><ThumbsUp size={15} aria-hidden="true" /> {t.positiveRatingsCount(ratings.positiveCount || 0)}</span>
          <span className="reviews-count"><ThumbsDown size={15} aria-hidden="true" /> {t.negativeRatingsCount(ratings.negativeCount || 0)}</span>
        </div>
      )}
      {comments.length > 0 && (
        <ul className="reviews-list">
          {comments.map((r) => (
            <li key={r.id} className={r.positive ? "good" : "bad"}>
              <span className="reviews-quote">« {r.comment} »</span>
              <Link href={`/u/${r.rater.username}`} className="reviews-author">{r.rater.username}</Link>
            </li>
          ))}
        </ul>
      )}

      {me && me.username !== username && !showForm && (
        <button type="button" className="btn-ghost reviews-rate" onClick={() => setShowForm(true)}>{t.rateThisMember}</button>
      )}
      {showForm && (
        <div className="reviews-form">
          <div className="reviews-form-choice">
            <button type="button" className={positive ? "btn-primary" : "btn-ghost"} onClick={() => setPositive(true)}>{t.ratingPositive}</button>
            <button type="button" className={!positive ? "btn-primary" : "btn-ghost"} onClick={() => setPositive(false)}>{t.ratingNegative}</button>
          </div>
          <div className="field">
            <span className="field-label">{t.ratingCommentLabel}</span>
            <textarea rows={2} value={comment} onChange={(e) => setComment(e.target.value)} maxLength={500} />
          </div>
          <button type="button" className="btn-primary" onClick={submit} disabled={saving}>{saving ? "…" : t.submitRating}</button>
          {error && <div className="toast error" style={{ marginTop: "0.5rem" }}>{error}</div>}
        </div>
      )}
    </>
  );
}

export default function UserProfileClient({ username }) {
  const { t, lang } = useLanguage();
  const { me } = useCurrentUser();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [tab, setTab] = useState("collection");
  const [ratings, setRatings] = useState(null);
  const [showReport, setShowReport] = useState(false);
  const [blockInfo, setBlockInfo] = useState({ blockedByMe: false, hasBlockedMe: false });
  const [copied, setCopied] = useState(false);

  function loadRatings() {
    fetch(`/api/users/${username}/ratings`)
      .then((r) => (r.ok ? r.json() : null))
      .then(setRatings)
      .catch(() => {});
  }

  async function handleToggleBlock() {
    await fetch(`/api/users/${username}/block`, { method: blockInfo.blockedByMe ? "DELETE" : "POST" });
    setBlockInfo((b) => ({ ...b, blockedByMe: !b.blockedByMe }));
  }

  useEffect(() => {
    fetch(`/api/users/${username}`)
      .then((r) => {
        if (r.status === 404) { setNotFound(true); return null; }
        return r.json();
      })
      .then((data) => { if (data) setProfile(data); })
      .finally(() => setLoading(false));

    fetch(`/api/users/${username}/block`)
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => { if (data) setBlockInfo(data); });

    loadRatings();
  }, [username]);

  if (loading) return <div className="container page"><div className="empty-state">{t.loading}</div></div>;
  if (notFound || !profile) return <div className="container page"><div className="empty-state">{t.profileNotFound}</div></div>;

  const isOwner = me?.username === profile.username;
  const p = profile.participation;
  const forTrade = profile.forTrade || [];
  const showcase = profile.showcase || [];
  const completed = profile.completedCollections || [];
  const badges = computeBadges(p, t);
  const started = profile.collections?.length || 0;
  const positiveReviews = ratings ? ratings.positiveCount || 0 : profile.tradeStats?.positiveRatings || 0;
  const completedTrades = profile.tradeStats?.completedTrades || 0;
  const contribution = p ? p.contributionPoints + p.collectionProposalPoints : 0;

  async function shareProfile() {
    // Le lien du profil ; son image de partage reprend le classeur quand il est composé.
    const title = showcase.length ? t.showcaseShareTitle(profile.username) : `${profile.username} — DB Non-Off 90's`;
    const ok = await shareUrl(`${window.location.origin}/u/${profile.username}`, title);
    if (ok && !navigator.share) {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }

  const hasShowcaseTile = showcase.length > 0 || isOwner;
  const showcaseTile = hasShowcaseTile && (
    <div className="profile-tile profile-showcase-tile">
      <ShowcaseSection username={profile.username} cards={showcase} isOwner={isOwner} shareable={false} />
    </div>
  );
  const badgesTile = (completed.length > 0 || badges.length > 0 || isOwner) && (
    <Tile title={t.badgesLabel} aside={completed.length + badges.length || null} className="profile-badges-tile">
      <Medals collections={completed} badges={badges} t={t} />
    </Tile>
  );
  const collectionsTile = (
    <Tile title={t.profileCollectionsTitle} aside={started ? `${p?.completedCollections || 0} / ${started}` : null} className="profile-collections-tile">
      <CollectionsList collections={profile.collections} t={t} />
    </Tile>
  );
  const reviewsTile = (
    <Tile title={t.ratingsTitle} className="profile-reviews-tile">
      <Reviews username={profile.username} ratings={ratings} me={me} t={t} onRated={loadRatings} />
    </Tile>
  );
  // Sans aucun point, la répartition n'apprend rien : le chiffre de l'en-tête suffit.
  const pointsTile = p?.totalPoints > 0 && (
    <Tile title={t.profilePointsTitle} aside={t.participationPoints(p.totalPoints)} className="profile-points-tile">
      <PointsBreakdown participation={p} t={t} />
    </Tile>
  );

  const tabs = [
    { key: "collection", label: t.profileTabCollection, count: profile.owned.length },
    { key: "trade", label: t.profileTabForTrade, count: forTrade.length },
    { key: "wanted", label: t.profileTabWanted, count: profile.wanted.length },
    { key: "sales", label: t.profileTabSales, count: profile.selling.length },
  ];

  return (
    <div className="container page profile-page">
      <header className="profile-hero">
        <span className="profile-hero-deco" aria-hidden="true" />
        <div className="profile-identity">
          <img src={profile.avatar || avatarPlaceholder(profile.username)} alt="" className="profile-avatar" />
          <div className="profile-heading">
            <h1 className="display-font profile-name">{profile.username}</h1>
            <div className="profile-since">{t.profileMemberSince(formatMonthYear(profile.memberSince, lang))}</div>
          </div>
          {profile.bio && <p className="profile-bio">{profile.bio}</p>}
          <div className="profile-actions">
            {me && !isOwner && (
              <Link href={`/compte/messages/${profile.username}`} className="btn-primary profile-action">
                <Mail size={16} aria-hidden="true" /> {t.contactSeller}
              </Link>
            )}
            {isOwner && (
              <Link href="/compte" className="btn-ghost profile-action">
                <Pencil size={15} aria-hidden="true" /> {t.profileEdit}
              </Link>
            )}
            {/* Sur les très petits écrans, quand une autre action l'accompagne, le bouton se
                réduit à son icône (son nom reste lu par les lecteurs d'écran). */}
            <button type="button" className={`btn-ghost profile-action profile-share${me ? " compactable" : ""}`} onClick={shareProfile}>
              {copied ? <Check size={16} aria-hidden="true" /> : <Share2 size={16} aria-hidden="true" />}
              <span className="profile-action-label">{copied ? t.shareCopied : t.share}</span>
            </button>
            {me && !isOwner && (
              <MoreMenu
                label={t.profileMoreActions}
                items={[
                  { key: "block", Icon: Ban, label: blockInfo.blockedByMe ? t.unblockMember : t.blockMember, onSelect: handleToggleBlock },
                  { key: "report", Icon: Flag, label: t.reportUser, onSelect: () => setShowReport(true) },
                ]}
              />
            )}
          </div>
          {blockInfo.blockedByMe && (
            <p className="profile-blocked">
              <Ban size={14} aria-hidden="true" />
              <span>
                {t.cannotSendYouBlocked}{" "}
                <button type="button" className="profile-link-btn" onClick={handleToggleBlock}>{t.unblockMember}</button>
              </span>
            </p>
          )}
        </div>
        {p && (
          <div className="profile-stats">
            <Stat tone="gold" value={p.totalPoints} label={t.profileStatPoints} sub={contribution ? t.profileStatPointsSub(contribution) : null} />
            <Stat value={p.ownedCount} label={t.profileStatCards} sub={forTrade.length ? t.profileStatCardsSub(forTrade.length) : null} />
            <Stat value={p.completedCollections} label={t.profileStatCompleted} sub={started ? t.profileStatCompletedSub(started) : null} />
            <Stat value={positiveReviews} label={t.profileStatReviews} sub={completedTrades ? t.profileStatReviewsSub(completedTrades) : null} />
          </div>
        )}
      </header>

      <div className={`profile-bento${hasShowcaseTile ? "" : " even"}`}>
        {/* Sur ordinateur, deux colonnes de hauteurs voisines : le classeur (haut) et les
            points d'un côté, le reste de l'autre ; sans classeur, deux colonnes égales. Sur
            téléphone, l'ordre des blocs est fixé par la feuille de style. */}
        <div className="profile-col">
          {hasShowcaseTile ? showcaseTile : collectionsTile}
          {pointsTile}
        </div>
        <div className="profile-col">
          {badgesTile}
          {hasShowcaseTile && collectionsTile}
          {reviewsTile}
        </div>
      </div>

      <section className="profile-cards" aria-label={t.profileCardsTitle}>
        <div className="profile-cards-head">
          <h2 className="display-font profile-tile-title">{t.profileCardsTitle}</h2>
          <div className="profile-tabs" role="tablist" aria-label={t.profileCardsTitle}>
            {tabs.map((x) => (
              <button key={x.key} type="button" role="tab" aria-selected={tab === x.key} className={tab === x.key ? "active" : ""} onClick={() => setTab(x.key)}>
                {x.label} <span className="profile-tab-count">{x.count}</span>
              </button>
            ))}
          </div>
        </div>
        {tab === "collection" && <MiniGrid cards={profile.owned} t={t} emptyLabel={t.noCardsOwned} />}
        {tab === "trade" && <MiniGrid cards={forTrade} t={t} emptyLabel={t.noCardsForTrade} />}
        {tab === "wanted" && <MiniGrid cards={profile.wanted} t={t} emptyLabel={t.noCardsWanted} />}
        {tab === "sales" &&
          (profile.selling.length === 0 ? (
            <div className="profile-empty">{isOwner ? t.noSalesListed : t.profileNoSales}</div>
          ) : (
            <div className="listing-grid">
              {profile.selling.map((l) => <ListingCard key={l.id} listing={l} showSeller={false} />)}
            </div>
          ))}
      </section>

      {showReport && (
        <ContactUserModal
          title={t.reportUserTitle}
          endpoint={`/api/users/${profile.username}/report`}
          messageLabel={t.reportReasonLabel}
          submitLabel={t.reportUser}
          successLabel={t.reportSent}
          onClose={() => setShowReport(false)}
        />
      )}
    </div>
  );
}
