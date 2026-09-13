"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { Mail, Trophy } from "lucide-react";
import { useLanguage } from "@/components/LanguageProvider";
import { missingCardPlaceholder } from "@/lib/missingCardPlaceholder";
import { avatarPlaceholder } from "@/lib/avatarPlaceholder";
import ContactUserModal from "@/components/ContactUserModal";

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

function ParticipationPanel({ participation, t }) {
  if (!participation) return null;
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
      </div>
    </div>
  );
}

export default function UserProfileClient({ username }) {
  const { t } = useLanguage();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [tab, setTab] = useState("participation");
  const [me, setMe] = useState(null);
  const [showContact, setShowContact] = useState(false);

  useEffect(() => {
    fetch(`/api/users/${username}`)
      .then((r) => {
        if (r.status === 404) { setNotFound(true); return null; }
        return r.json();
      })
      .then((data) => { if (data) setProfile(data); })
      .finally(() => setLoading(false));

    fetch("/api/users/me")
      .then((r) => (r.ok ? r.json() : null))
      .then(setMe)
      .catch(() => {});
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
          <button
            onClick={() => setShowContact(true)}
            className="btn-ghost"
            style={{ fontSize: "0.78rem", display: "inline-flex", alignItems: "center", gap: "0.35rem", marginLeft: "auto" }}
          >
            <Mail size={13} /> {t.contactSeller}
          </button>
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

      {tab === "participation" && <ParticipationPanel participation={profile.participation} t={t} />}
      {tab === "collection" && <MiniGrid cards={profile.owned} t={t} emptyLabel={t.noCardsOwned} />}
      {tab === "wanted" && <MiniGrid cards={profile.wanted} t={t} emptyLabel={t.noCardsWanted} />}
      {tab === "sales" && <SalesList listings={profile.selling} t={t} />}

      {showContact && (
        <ContactUserModal
          title={t.contactSellerTitle(profile.username)}
          endpoint={`/api/users/${profile.username}/contact`}
          onClose={() => setShowContact(false)}
        />
      )}
    </div>
  );
}
