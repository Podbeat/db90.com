"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { Trophy, Archive } from "lucide-react";
import { useLanguage } from "@/components/LanguageProvider";
import { avatarPlaceholder } from "@/lib/avatarPlaceholder";
import { formatDate } from "@/lib/localize";
import ActivityFeed from "@/components/ActivityFeed";

// Onglets du classement, avec leur valeur dans l'adresse (?onglet=palmares) pour pouvoir
// partager directement le palmarès.
const TABS = [
  { key: "collectors", param: "collectionneurs", label: (t) => t.leaderboardTabCollectors },
  { key: "contributors", param: "contributeurs", label: (t) => t.leaderboardTabContributors },
  { key: "palmares", param: "palmares", label: (t) => t.leaderboardTabPalmares },
];

function RankList({ items, empty }) {
  if (items.length === 0) return <div className="empty-state">{empty}</div>;
  return (
    <div className="filter-panel">
      {items.map((item, i) => (
        <Link
          key={item.user.username}
          href={`/u/${item.user.username}`}
          style={{ display: "flex", alignItems: "center", gap: "0.7rem", padding: "0.5rem 0", borderBottom: "1px solid var(--line)" }}
        >
          <span style={{ fontSize: "0.9rem", fontWeight: 700, color: i < 3 ? "var(--gold)" : "var(--text-muted)", width: 20 }}>{i + 1}</span>
          <img src={item.user.avatar || avatarPlaceholder(item.user.username)} alt="" style={{ width: 28, height: 28, borderRadius: "50%", objectFit: "cover" }} />
          <span style={{ flex: 1, fontSize: "0.85rem" }}>{item.user.username}</span>
          <span style={{ fontSize: "0.8rem", color: "var(--accent)", fontWeight: 600 }}>{item.count}</span>
        </Link>
      ))}
    </div>
  );
}

function PalmaresHead({ collection, meta }) {
  return (
    <Link href={`/collections/${collection.id}/registre`} className="palmares-head">
      {collection.previewImage ? (
        <Image src={collection.previewImage} alt="" width={44} height={44} sizes="44px" className="palmares-cover" />
      ) : (
        <span className="palmares-cover placeholder"><Archive size={18} aria-hidden="true" /></span>
      )}
      <span className="palmares-head-text">
        <span className="palmares-name">{collection.nom}</span>
        <span className="palmares-meta">{meta}</span>
      </span>
    </Link>
  );
}

function Palmares({ palmares, t, lang }) {
  const done = palmares?.done || [];
  const inProgress = palmares?.inProgress || [];
  return (
    <>
      <p className="palmares-intro">{t.palmaresIntro}</p>
      {done.length === 0 && <div className="empty-state">{t.palmaresEmpty}</div>}
      {done.map((item) => (
        <article key={item.collection.id} className="palmares-card done">
          <PalmaresHead
            collection={item.collection}
            meta={t.palmaresMeta(item.collection.pays, item.collection.total, item.completed.length)}
          />
          <ol className="palmares-members">
            {item.completed.map((c) => (
              <li key={c.user.username}>
                <img src={c.user.avatar || avatarPlaceholder(c.user.username)} alt="" className="palmares-avatar" />
                <Link href={`/u/${c.user.username}`} className="palmares-member">{c.user.username}</Link>
                <span className="palmares-date">{formatDate(c.completedAt, lang)}</span>
              </li>
            ))}
          </ol>
        </article>
      ))}
      {inProgress.map((item) => (
        <article key={item.collection.id} className="palmares-card">
          <PalmaresHead
            collection={item.collection}
            meta={t.palmaresNotYet(item.leader.user.username, item.leader.owned, item.collection.total)}
          />
        </article>
      ))}
    </>
  );
}

export default function LeaderboardPage() {
  const { t, lang } = useLanguage();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState("collectors");

  useEffect(() => {
    fetch("/api/leaderboard")
      .then((r) => (r.ok ? r.json() : null))
      .then(setData)
      .finally(() => setLoading(false));

    const param = new URLSearchParams(window.location.search).get("onglet");
    const initial = TABS.find((x) => x.param === param);
    if (initial) setTab(initial.key);
  }, []);

  function selectTab(key) {
    setTab(key);
    const param = TABS.find((x) => x.key === key).param;
    try {
      const url = new URL(window.location.href);
      url.searchParams.set("onglet", param);
      window.history.replaceState(null, "", url);
    } catch (e) {}
  }

  return (
    <div className="container page">
      <h1 className="display-font" style={{ fontSize: "1.4rem", marginBottom: "0.75rem", display: "flex", alignItems: "center", gap: "0.5rem" }}>
        <Trophy size={22} style={{ color: "var(--gold)" }} /> {t.leaderboardTitle}
      </h1>
      <div className="leaderboard-tabs" role="tablist" aria-label={t.leaderboardTitle}>
        {TABS.map((x) => (
          <button
            key={x.key}
            type="button"
            role="tab"
            id={`tab-${x.key}`}
            aria-selected={tab === x.key}
            aria-controls="leaderboard-panel"
            className={tab === x.key ? "active" : ""}
            onClick={() => selectTab(x.key)}
          >
            {x.label(t)}
          </button>
        ))}
      </div>
      <div id="leaderboard-panel" role="tabpanel" aria-labelledby={`tab-${tab}`} className="leaderboard-panel">
        {loading ? (
          <div className="empty-state">{t.loading}</div>
        ) : tab === "collectors" ? (
          <RankList items={data?.topCollectors || []} empty={t.leaderboardNoCollectors} />
        ) : tab === "contributors" ? (
          <RankList items={data?.topContributors || []} empty={t.leaderboardNoContributors} />
        ) : (
          <Palmares palmares={data?.palmares} t={t} lang={lang} />
        )}
      </div>
      <div style={{ marginTop: "1.75rem" }}>
        <ActivityFeed />
      </div>
    </div>
  );
}
