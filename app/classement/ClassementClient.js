"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { Trophy, Crown, Layers, ScanLine, Library, Repeat, Users, Archive, Sparkles, Flag } from "lucide-react";
import { useLanguage } from "@/components/LanguageProvider";
import { useCurrentUser } from "@/components/CurrentUserProvider";
import { avatarPlaceholder } from "@/lib/avatarPlaceholder";
import { formatDate } from "@/lib/localize";
import ActivityFeed from "@/components/ActivityFeed";

// Page Classement : classement général par points (depuis toujours ou sur 30 jours), podium,
// position du membre connecté, meilleurs par catégorie, palmarès des collections et règles
// des points. Tout est visible d'un coup d'œil, sans onglets ; la liste se charge par pages
// de 50 pour rester légère quand il y aura beaucoup de membres.

const PERIODS = [
  { key: "tout", label: (t) => t.lbPeriodAll },
  { key: "30j", label: (t) => t.lbPeriod30 },
];
const PALMARES_SHOWN = 5;

const avatarOf = (user) => user.avatar || avatarPlaceholder(user.username);

// « 182 cartes · 6 collections · 3 scans » : seulement ce qui n'est pas nul.
function detailLine(e, t) {
  return [
    e.owned > 0 && t.lbCards(e.owned),
    e.completions > 0 && t.lbCollections(e.completions),
    e.scans > 0 && t.lbScans(e.scans),
    e.proposals > 0 && t.lbProposals(e.proposals),
  ]
    .filter(Boolean)
    .join(" · ");
}

function Podium({ entries, t, myName }) {
  // Ordre visuel : 2ᵉ, 1ᵉʳ, 3ᵉ.
  const order = [entries[1], entries[0], entries[2]];
  return (
    <div className="lb-podium">
      {order.map((e, i) =>
        e ? (
          <Link key={e.user.username} href={`/u/${e.user.username}`} className={`lb-podium-spot${e.user.username === myName ? " mine" : ""}`} data-place={Math.min(e.rank, 3)}>
            <span className="lb-podium-avatar">
              {e.rank === 1 && <Crown size={22} className="lb-crown" aria-hidden="true" />}
              <img src={avatarOf(e.user)} alt="" />
            </span>
            <span className="lb-podium-name">{e.user.username}</span>
            <span className="lb-podium-points">
              {e.points} <small>{t.lbPts}</small>
            </span>
            <span className="lb-podium-detail">{detailLine(e, t)}</span>
            <span className="lb-podium-step">{e.rank}</span>
          </Link>
        ) : (
          <span key={`vide-${i}`} className="lb-podium-spot empty" aria-hidden="true" />
        )
      )}
    </div>
  );
}

function RankRow({ e, leaderPoints, t, mine }) {
  const pct = leaderPoints > 0 ? Math.max(4, Math.round((e.points / leaderPoints) * 100)) : 0;
  return (
    <li className={`lb-row${mine ? " mine" : ""}`}>
      <span className="lb-rank">{e.rank}</span>
      <img src={avatarOf(e.user)} alt="" className="lb-row-avatar" />
      <span className="lb-who">
        <Link href={`/u/${e.user.username}`} className="lb-name">
          {e.user.username}
          {mine && <span className="lb-you">{t.lbYou}</span>}
        </Link>
        <span className="lb-detail">{detailLine(e, t)}</span>
      </span>
      <span className="lb-bar" aria-hidden="true">
        <span style={{ width: `${pct}%` }} />
      </span>
      <span className="lb-points">
        {e.points} <small>{t.lbPts}</small>
      </span>
    </li>
  );
}

function MyPosition({ me, position, t }) {
  if (!me) {
    return (
      <div className="lb-me guest">
        <Flag size={18} aria-hidden="true" />
        <span className="lb-me-text">{t.lbGuest}</span>
        <Link href="/compte/connexion" className="lb-me-cta">{t.lbGuestCta}</Link>
      </div>
    );
  }
  if (!position) return null;
  if (!position.rank) {
    return (
      <div className="lb-me">
        <img src={avatarOf(me)} alt="" className="lb-me-avatar" />
        <span className="lb-me-text">{t.lbMyUnranked}</span>
        <Link href="/" className="lb-me-cta">{t.lbMyUnrankedCta}</Link>
      </div>
    );
  }
  const gap = position.ahead ? position.ahead.points - position.points : 0;
  return (
    <div className="lb-me ranked">
      <img src={avatarOf(me)} alt="" className="lb-me-avatar" />
      <span className="lb-me-text">
        <strong>{t.lbMyRank(position.rank, position.totalRanked)}</strong>
        <span>{position.ahead ? t.lbMyGap(gap, position.ahead.username) : t.lbMyLead}</span>
      </span>
      <span className="lb-me-points">
        {position.points} <small>{t.lbPts}</small>
      </span>
    </div>
  );
}

const BOARDS = [
  { key: "collectors", Icon: Layers, title: (t) => t.leaderboardTabCollectors, value: (t, n) => t.lbCards(n) },
  { key: "contributors", Icon: ScanLine, title: (t) => t.leaderboardTabContributors, value: (t, n) => t.lbScans(n) },
  { key: "completers", Icon: Library, title: (t) => t.lbBoardCompleters, value: (t, n) => t.lbCollections(n) },
  { key: "traders", Icon: Repeat, title: (t) => t.lbBoardTraders, value: (t, n) => t.lbTrades(n) },
];

function Boards({ boards, t }) {
  return (
    <div className="lb-boards">
      {BOARDS.map(({ key, Icon, title, value }) => {
        const items = boards?.[key] || [];
        return (
          <div key={key} className="lb-board">
            <div className="lb-board-title">
              <Icon size={14} aria-hidden="true" /> {title(t)}
            </div>
            {items.length === 0 ? (
              <div className="lb-board-empty">{t.lbBoardEmpty}</div>
            ) : (
              <ol>
                {items.map((it, i) => (
                  <li key={it.user.username}>
                    <span className="lb-board-rank" data-place={i + 1}>{i + 1}</span>
                    <img src={avatarOf(it.user)} alt="" />
                    <Link href={`/u/${it.user.username}`} className="lb-board-name">{it.user.username}</Link>
                    <span className="lb-board-value">{value(t, it.value)}</span>
                  </li>
                ))}
              </ol>
            )}
          </div>
        );
      })}
    </div>
  );
}

function CollectionThumb({ collection }) {
  return collection.previewImage ? (
    <Image src={collection.previewImage} alt="" width={36} height={50} className="lb-col-thumb" />
  ) : (
    <span className="lb-col-thumb placeholder"><Archive size={15} aria-hidden="true" /></span>
  );
}

function Palmares({ palmares, t, lang }) {
  const [showAll, setShowAll] = useState(false);
  const done = palmares?.done || [];
  const races = palmares?.inProgress || [];
  const shown = showAll ? done : done.slice(0, PALMARES_SHOWN);
  return (
    <>
      {done.length === 0 && <div className="lb-board-empty">{t.palmaresEmpty}</div>}
      <ul className="lb-palmares">
        {shown.map((item) => {
          const first = item.completed[0];
          return (
            <li key={item.collection.id}>
              <Link href={`/collections/${item.collection.id}/registre`} className="lb-palmares-item">
                <CollectionThumb collection={item.collection} />
                <span className="lb-palmares-text">
                  <span className="lb-palmares-name">{item.collection.nom}</span>
                  <span className="lb-palmares-meta">{t.lbFirstFinisher(first.user.username, formatDate(first.completedAt, lang))}</span>
                  <span className="lb-palmares-meta">{t.lbFinishers(item.completed.length)}</span>
                </span>
                <span className="lb-avatars" aria-hidden="true">
                  {item.completed.slice(0, 4).map((c) => (
                    <img key={c.user.username} src={avatarOf(c.user)} alt="" />
                  ))}
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
      {done.length > PALMARES_SHOWN && !showAll && (
        <button type="button" className="lb-link-btn" onClick={() => setShowAll(true)}>
          {t.lbShowAllPalmares(done.length - PALMARES_SHOWN)}
        </button>
      )}
      {races.length > 0 && (
        <>
          <h3 className="lb-subtitle">{t.lbRacesTitle}</h3>
          <ul className="lb-palmares">
            {races.map((item) => (
              <li key={item.collection.id}>
                <Link href={`/collections/${item.collection.id}/registre`} className="lb-palmares-item">
                  <CollectionThumb collection={item.collection} />
                  <span className="lb-palmares-text">
                    <span className="lb-palmares-name">{item.collection.nom}</span>
                    <span className="lb-palmares-meta">{t.lbRaceLeader(item.leader.user.username, item.leader.owned, item.collection.total)}</span>
                    <span className="lb-race-bar" aria-hidden="true">
                      <span style={{ width: `${Math.round((item.leader.owned / item.collection.total) * 100)}%` }} />
                    </span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </>
      )}
    </>
  );
}

function Stats({ stats, t }) {
  const items = [
    { Icon: Users, value: stats.members, label: t.lbStatMembers },
    { Icon: Layers, value: stats.cards, label: t.lbStatCards },
    { Icon: ScanLine, value: stats.scans, label: t.lbStatScans },
    { Icon: Library, value: stats.completions, label: t.lbStatCompletions },
    { Icon: Repeat, value: stats.trades, label: t.lbStatTrades },
  ];
  return (
    <div className="lb-stats">
      {items.map(({ Icon, value, label }) => (
        <div key={label} className="lb-stat">
          <Icon size={16} aria-hidden="true" />
          <span className="lb-stat-value">{value}</span>
          <span className="lb-stat-label">{label}</span>
        </div>
      ))}
    </div>
  );
}

function Rules({ points, t }) {
  if (!points) return null;
  return (
    <ul className="lb-rules">
      <li><Layers size={14} aria-hidden="true" /> {t.lbRuleCard(points.card)}</li>
      <li><ScanLine size={14} aria-hidden="true" /> {t.lbRuleScan(points.scan)}</li>
      <li><Library size={14} aria-hidden="true" /> {t.lbRuleCompletion(points.completion)}</li>
      <li><Sparkles size={14} aria-hidden="true" /> {t.lbRuleProposal(points.proposal)}</li>
    </ul>
  );
}

export default function LeaderboardPage() {
  const { t, lang } = useLanguage();
  const { me } = useCurrentUser();
  const [period, setPeriod] = useState(null);
  const [data, setData] = useState(null);
  const [ranking, setRanking] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [position, setPosition] = useState(null);

  // Période lue dans l'adresse (?periode=30j) ; les anciens liens ?onglet=palmares mènent au palmarès.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    setPeriod(params.get("periode") === "30j" ? "30j" : "tout");
  }, []);

  useEffect(() => {
    if (!period) return;
    let cancelled = false;
    setLoading(true);
    fetch(`/api/leaderboard?periode=${period}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (cancelled) return;
        setData(d);
        setRanking(d?.ranking || []);
      })
      .catch(() => !cancelled && setData(null))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [period]);

  // Position du membre connecté (réponse propre à chacun, jamais mise en cache).
  useEffect(() => {
    if (!period || !me) {
      setPosition(null);
      return;
    }
    fetch(`/api/leaderboard/me?periode=${period}`, { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then(setPosition)
      .catch(() => setPosition(null));
  }, [period, me]);

  useEffect(() => {
    if (loading || !data) return;
    if (new URLSearchParams(window.location.search).get("onglet") === "palmares") {
      document.getElementById("palmares")?.scrollIntoView({ block: "start" });
    }
  }, [loading, data]);

  function choosePeriod(key) {
    if (key === period) return;
    setPeriod(key);
    try {
      const url = new URL(window.location.href);
      url.searchParams.delete("onglet");
      if (key === "tout") url.searchParams.delete("periode");
      else url.searchParams.set("periode", key);
      window.history.replaceState(null, "", url);
    } catch (e) {}
  }

  function loadMore() {
    setLoadingMore(true);
    fetch(`/api/leaderboard?periode=${period}&depuis=${ranking.length}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => d && setRanking((prev) => [...prev, ...(d.ranking || [])]))
      .finally(() => setLoadingMore(false));
  }

  const myName = me?.username;
  const leaderPoints = ranking[0]?.points || 0;
  const podium = ranking.filter((e) => e.rank <= 3).slice(0, 3);
  const rest = ranking.slice(podium.length);
  const total = data?.totalRanked || 0;

  return (
    <div className="container page lb-page">
      <header className="lb-hero">
        <div className="lb-hero-text">
          <h1 className="display-font lb-title">
            <Trophy size={24} aria-hidden="true" /> {t.leaderboardTitle}
          </h1>
          <p className="lb-intro">{t.lbSubtitle}</p>
        </div>
        <div className="lb-periods" role="group" aria-label={t.lbPeriodLabel}>
          {PERIODS.map((p) => (
            <button key={p.key} type="button" aria-pressed={period === p.key} className={period === p.key ? "active" : ""} onClick={() => choosePeriod(p.key)}>
              {p.label(t)}
            </button>
          ))}
        </div>
      </header>

      {data?.stats && <Stats stats={data.stats} t={t} />}

      <div className="lb-layout">
        <section className="lb-main" aria-labelledby="lb-ranking-title">
          <h2 id="lb-ranking-title" className="lb-section-title">{t.lbRankingTitle}</h2>
          <MyPosition me={me} position={position} t={t} />
          {loading ? (
            <div className="empty-state">{t.loading}</div>
          ) : ranking.length === 0 ? (
            <div className="empty-state">{t.lbEmpty}</div>
          ) : (
            <>
              <Podium entries={podium} t={t} myName={myName} />
              {rest.length > 0 && (
                <ol className="lb-list">
                  {rest.map((e) => (
                    <RankRow key={e.user.username} e={e} leaderPoints={leaderPoints} t={t} mine={e.user.username === myName} />
                  ))}
                </ol>
              )}
              {ranking.length < total && (
                <button type="button" className="btn-ghost lb-more" onClick={loadMore} disabled={loadingMore}>
                  {loadingMore ? t.loading : t.lbShowMore}
                </button>
              )}
            </>
          )}
          <div className="lb-activity">
            <ActivityFeed />
          </div>
        </section>

        <aside className="lb-side">
          <section className="lb-panel">
            <h2 className="lb-section-title">{t.lbBoardsTitle}</h2>
            <Boards boards={data?.boards} t={t} />
          </section>
          <section className="lb-panel" id="palmares">
            <h2 className="lb-section-title">{t.lbPalmaresTitle}</h2>
            <Palmares palmares={data?.palmares} t={t} lang={lang} />
          </section>
          <section className="lb-panel">
            <h2 className="lb-section-title">{t.lbRulesTitle}</h2>
            <Rules points={data?.points} t={t} />
            {period === "30j" && <p className="lb-rules-note">{t.lbRulesNote}</p>}
          </section>
        </aside>
      </div>
    </div>
  );
}
