"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { Mail, Trophy, ThumbsUp, ThumbsDown, Flag } from "lucide-react";
import { useLanguage } from "@/components/LanguageProvider";
import { missingCardPlaceholder } from "@/lib/missingCardPlaceholder";
import { avatarPlaceholder } from "@/lib/avatarPlaceholder";
import ContactUserModal from "@/components/ContactUserModal";
import { computeBadges } from "@/lib/badges";
import { useCurrentUser } from "@/components/CurrentUserProvider";

function MiniGrid({ cards, t, emptyLabel }) {
  if (cards.length === 0) {
    return <div style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>{emptyLabel}</div>;
  }
  return (
    <div className="card-grid">
      {cards.map((c, i) => (
        <Link
          key={c.id}
          href={`/cartes/${c.id}`}
          className="card-tile"
          style={{ "--stagger-delay": `${Math.min(i * 30, 300)}ms` }}
        >
          <div className="card-tile-media">
            {c.image ? (
              <Image src={c.image} alt={c.personnagePrincipal?.name || ""} fill sizes="(max-width: 640px) 45vw, 220px" style={{ objectFit: "cover" }} />
            ) : (
              <img src={missingCardPlaceholder(c, t)} alt={c.personnagePrincipal?.name || ""} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
            )}
          </div>
          <div className="meta">
            <div className="card-collection">{c.collection?.nom} <span className="card-num-inline">n°{c.numero}</span></div>
            <div className="card-nom">{c.personnagePrincipal?.name || t.noCharacterAssigned}</div>
          </div>
        </Link>
      ))}
    </div>
  );
}

function SalesList({ listings, t }) {
  if (listings.length === 0) {
    return <div style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>{t.noSalesListed}</div>;
  }
  return (
    <div>
      {listings.map((l) => (
        <Link
          key={l.id}
          href={`/cartes/${l.card.id}`}
          style={{ display: "flex", alignItems: "center", gap: "0.7rem", padding: "0.5rem 0", borderBottom: "1px solid var(--line)" }}
        >
          <img
            src={l.card.image || ""}
            alt={l.card.personnagePrincipal?.name || ""}
            style={{ width: 40, height: 56, objectFit: "cover", background: "var(--surface-raised)", flexShrink: 0 }}
          />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: "0.85rem" }}>{l.card.personnagePrincipal?.name || t.noCharacterAssigned}</div>
            <div style={{ fontSize: "0.72rem", color: "var(--text-muted)" }}>
              {l.card.collection?.nom} — n°{l.card.numero} · {l.condition}
            </div>
          </div>
          <span style={{ fontSize: "0.85rem", color: "var(--gold)", fontWeight: 600 }}>
            {l.price != null ? `${l.price} €` : t.priceNotSet}
          </span>
        </Link>
      ))}
    </div>
  );
}

function RatingsBox({ username, ratings, me, t, onRated }) {
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

  return (
    <div className="filter-panel" style={{ maxWidth: 360, marginTop: "1.2rem" }}>
      <div className="display-font" style={{ fontSize: "0.95rem", marginBottom: "0.6rem" }}>{t.ratingsTitle}</div>
      <div style={{ display: "flex", gap: "1rem", fontSize: "0.8rem", marginBottom: "0.7rem" }}>
        <span style={{ display: "flex", alignItems: "center", gap: "0.3rem", color: "#4caf6d" }}><ThumbsUp size={13} /> {t.positiveRatingsCount(ratings?.positiveCount || 0)}</span>
        <span style={{ display: "flex", alignItems: "center", gap: "0.3rem", color: "var(--text-muted)" }}><ThumbsDown size={13} /> {t.negativeRatingsCount(ratings?.negativeCount || 0)}</span>
      </div>

      {ratings?.ratings?.length > 0 && (
        <div style={{ marginBottom: "0.8rem" }}>
          {ratings.ratings.slice(0, 5).filter((r) => r.comment).map((r) => (
            <div key={r.id} style={{ fontSize: "0.76rem", color: "var(--text-muted)", padding: "0.3rem 0", borderBottom: "1px solid var(--line)" }}>
              {r.positive ? <ThumbsUp size={11} style={{ color: "#4caf6d" }} /> : <ThumbsDown size={11} />} <strong>{r.rater.username}</strong> — {r.comment}
            </div>
          ))}
        </div>
      )}
      {(!ratings || ratings.ratings.length === 0) && <div style={{ fontSize: "0.78rem", color: "var(--text-muted)", marginBottom: "0.8rem" }}>{t.noRatings}</div>}

      {me && me.username !== username && !showForm && (
        <button className="btn-ghost" style={{ fontSize: "0.76rem" }} onClick={() => setShowForm(true)}>{t.rateThisMember}</button>
      )}
      {showForm && (
        <div>
          <div style={{ display: "flex", gap: "0.5rem", marginBottom: "0.5rem" }}>
            <button className={positive ? "btn-primary" : "btn-ghost"} style={{ fontSize: "0.75rem" }} onClick={() => setPositive(true)}>{t.ratingPositive}</button>
            <button className={!positive ? "btn-primary" : "btn-ghost"} style={{ fontSize: "0.75rem" }} onClick={() => setPositive(false)}>{t.ratingNegative}</button>
          </div>
          <div className="field">
            <span className="field-label">{t.ratingCommentLabel}</span>
            <textarea rows={2} value={comment} onChange={(e) => setComment(e.target.value)} maxLength={500} />
          </div>
          <button className="btn-primary" onClick={submit} disabled={saving}>{saving ? "…" : t.submitRating}</button>
          {error && <div className="toast error" style={{ marginTop: "0.5rem" }}>{error}</div>}
        </div>
      )}
    </div>
  );
}

function ParticipationPanel({ participation, t }) {
  if (!participation) return null;
  const badges = computeBadges(participation, t);
  return (
    <div className="filter-panel" style={{ maxWidth: 360 }}>
      <div className="display-font" style={{ fontSize: "0.95rem", marginBottom: "0.6rem", display: "flex", alignItems: "center", gap: "0.4rem" }}>
        <Trophy size={16} style={{ color: "var(--gold)" }} /> {t.myParticipationTitle}
      </div>
      <div style={{ fontSize: "1.6rem", fontWeight: 700, color: "var(--gold)", marginBottom: "0.6rem" }}>
        {t.participationPoints(participation.totalPoints)}
      </div>
      <div style={{ fontSize: "0.76rem", color: "var(--text-muted)", lineHeight: 1.9 }}>
        <div>{t.participationOwnedLine(participation.ownedCount, participation.ownedPoints)}</div>
        <div>{t.participationCompletedLine(participation.completedCollections, participation.completionBonus)}</div>
        <div>{t.participationContribLine(participation.approvedSubmissions, participation.contributionPoints)}</div>
        <div>{t.participationCollectionProposalLine(participation.approvedCollectionProposals, participation.collectionProposalPoints)}</div>
      </div>
      {badges.length > 0 && (
        <div style={{ display: "flex", flexWrap: "wrap", gap: "0.4rem", marginTop: "0.7rem" }}>
          {badges.map((b) => (
            <span key={b.id} style={{ fontSize: "0.68rem", border: "1px solid var(--gold)", color: "var(--gold)", padding: "0.2rem 0.5rem", borderRadius: 999 }}>
              {b.label}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

export default function UserProfileClient({ username }) {
  const { t } = useLanguage();
  const { me } = useCurrentUser();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [tab, setTab] = useState("participation");
  const [ratings, setRatings] = useState(null);
  const [showReport, setShowReport] = useState(false);

  function loadRatings() {
    fetch(`/api/users/${username}/ratings`)
      .then((r) => (r.ok ? r.json() : null))
      .then(setRatings)
      .catch(() => {});
  }

  useEffect(() => {
    fetch(`/api/users/${username}`)
      .then((r) => {
        if (r.status === 404) { setNotFound(true); return null; }
        return r.json();
      })
      .then((data) => { if (data) setProfile(data); })
      .finally(() => setLoading(false));

    loadRatings();
  }, [username]);

  if (loading) return <div className="container page"><div className="empty-state">Chargement…</div></div>;
  if (notFound || !profile) return <div className="container page"><div className="empty-state">{t.profileNotFound}</div></div>;

  const memberDate = new Date(profile.memberSince).toLocaleDateString();

  const tabs = [
    { key: "participation", label: t.profileTabParticipation },
    { key: "collection", label: `${t.profileTabCollection} · ${t.cardsCount(profile.owned.length)}` },
    { key: "wanted", label: `${t.profileTabWanted} · ${t.cardsCount(profile.wanted.length)}` },
    { key: "sales", label: `${t.profileTabSales} · ${t.cardsCount(profile.selling.length)}` },
  ];

  return (
    <div className="container page">
      <div style={{ display: "flex", alignItems: "center", gap: "1rem", marginBottom: "0.5rem", flexWrap: "wrap" }}>
        <img
          src={profile.avatar || avatarPlaceholder(profile.username)}
          alt=""
          style={{ width: 72, height: 72, borderRadius: "50%", objectFit: "cover", border: "2px solid var(--line)" }}
        />
        <div>
          <h1 className="display-font" style={{ fontSize: "1.3rem" }}>{profile.username}</h1>
          <div style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>{t.memberSince} {memberDate}</div>
        </div>
        {me && me.username !== profile.username && (
          <div style={{ display: "flex", gap: "0.5rem", marginLeft: "auto" }}>
            <Link
              href={`/compte/messages/${profile.username}`}
              className="btn-ghost"
              style={{ fontSize: "0.78rem", display: "inline-flex", alignItems: "center", gap: "0.35rem" }}
            >
              <Mail size={13} /> {t.contactSeller}
            </Link>
            <button
              onClick={() => setShowReport(true)}
              className="btn-icon"
              title={t.reportUser}
            >
              <Flag size={13} />
            </button>
          </div>
        )}
      </div>
      {profile.bio && <p style={{ fontSize: "0.85rem", color: "var(--text-muted)", maxWidth: 560, marginBottom: "1.5rem" }}>{profile.bio}</p>}

      <div style={{ display: "flex", gap: "0.5rem", marginBottom: "1.25rem", flexWrap: "wrap" }}>
        {tabs.map((tb) => (
          <button key={tb.key} onClick={() => setTab(tb.key)} className={tab === tb.key ? "btn-primary" : "btn-ghost"} style={{ fontSize: "0.8rem" }}>
            {tb.label}
          </button>
        ))}
      </div>

      {tab === "participation" && (
        <>
          <ParticipationPanel participation={profile.participation} t={t} />
          <RatingsBox username={profile.username} ratings={ratings} me={me} t={t} onRated={loadRatings} />
        </>
      )}
      {tab === "collection" && <MiniGrid cards={profile.owned} t={t} emptyLabel={t.noCardsOwned} />}
      {tab === "wanted" && <MiniGrid cards={profile.wanted} t={t} emptyLabel={t.noCardsWanted} />}
      {tab === "sales" && <SalesList listings={profile.selling} t={t} />}

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
