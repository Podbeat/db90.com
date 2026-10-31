"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { CARD_GRID_SIZES } from "@/lib/imageSizes";
import { Repeat, ArrowRight, ChevronRight } from "lucide-react";
import { useLanguage } from "@/components/LanguageProvider";
import { avatarPlaceholder } from "@/lib/avatarPlaceholder";
import { formatDate } from "@/lib/localize";
import { nextStep } from "@/lib/tradeText";
import { TradeSides, PartnerHead, ProposalCard } from "@/components/TradeParts";

// Onglets de la page, avec leur valeur dans l'adresse (?onglet=en-cours) : les liens des
// notifications et des e-mails ouvrent directement le bon.
const TABS = [
  { key: "possible", param: "possibles" },
  { key: "active", param: "en-cours" },
  { key: "done", param: "termines" },
];

function MiniCard({ card, t }) {
  return (
    <Link href={`/cartes/${card.id}`} style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
      {card.image ? (
        <Image src={card.image} alt="" width={28} height={39} sizes={CARD_GRID_SIZES} style={{ objectFit: "cover", background: "var(--surface-raised)", flexShrink: 0 }} />
      ) : (
        <span style={{ width: 28, height: 39, background: "var(--surface-raised)", flexShrink: 0 }} />
      )}
      <span style={{ fontSize: "0.78rem" }}>{card.personnagePrincipal?.name || t.noCharacterAssigned} <span style={{ color: "var(--text-muted)" }}>· {card.collection?.nom}</span></span>
    </Link>
  );
}

function Possible({ data, t }) {
  if (!data) return null;
  const nothing = data.mutual.length === 0 && data.theyWantMine.length === 0 && data.theyHaveMine.length === 0;
  return (
    <>
      <p style={{ fontSize: "0.8rem", color: "var(--text-muted)", marginBottom: "1.25rem" }}>{t.matchesIntro}</p>
      {nothing && <div className="empty-state">{t.noMatches}</div>}

      {data.mutual.length > 0 && (
        <div className="filter-panel" style={{ marginBottom: "1.5rem" }}>
          <div style={{ fontSize: "0.9rem", fontWeight: 600, marginBottom: "0.8rem" }}>{t.mutualMatchesTitle}</div>
          {data.mutual.map((m) => (
            <div key={m.user.username} style={{ padding: "0.8rem 0", borderBottom: "1px solid var(--line)" }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "0.75rem", flexWrap: "wrap", marginBottom: "0.6rem" }}>
                <Link href={`/u/${m.user.username}`} style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                  <img src={m.user.avatar || avatarPlaceholder(m.user.username)} alt="" style={{ width: 26, height: 26, borderRadius: "50%", objectFit: "cover" }} />
                  <strong style={{ fontSize: "0.88rem" }}>{m.user.username}</strong>
                </Link>
                <Link href={`/compte/echanges/proposer/${m.user.username}`} className="btn-primary trade-propose-btn">
                  {t.tradePropose}
                </Link>
              </div>
              <div style={{ display: "flex", gap: "1.5rem", flexWrap: "wrap" }}>
                <div style={{ flex: 1, minWidth: 200 }}>
                  <div style={{ fontSize: "0.7rem", color: "var(--accent)", marginBottom: "0.4rem" }}>{t.tradeYouGive}</div>
                  {m.iOffer.map((c) => <div key={c.id} style={{ marginBottom: "0.3rem" }}><MiniCard card={c} t={t} /></div>)}
                </div>
                <ArrowRight size={16} style={{ alignSelf: "center", color: "var(--text-muted)" }} />
                <div style={{ flex: 1, minWidth: 200 }}>
                  <div style={{ fontSize: "0.7rem", color: "var(--gold)", marginBottom: "0.4rem" }}>{t.tradeYouReceive}</div>
                  {m.iReceive.map((c) => <div key={c.id} style={{ marginBottom: "0.3rem" }}><MiniCard card={c} t={t} /></div>)}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <div style={{ display: "flex", gap: "1.5rem", flexWrap: "wrap" }}>
        {data.theyWantMine.length > 0 && (
          <div className="filter-panel" style={{ flex: 1, minWidth: 260 }}>
            <div style={{ fontSize: "0.85rem", fontWeight: 600, marginBottom: "0.6rem" }}>{t.theyWantMineTitle}</div>
            {data.theyWantMine.map((m, i) => (
              <div key={i} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0.4rem 0", borderBottom: "1px solid var(--line)" }}>
                <MiniCard card={m.card} t={t} />
                <Link href={`/u/${m.user.username}`} style={{ fontSize: "0.74rem", color: "var(--text-muted)" }}>{m.user.username}</Link>
              </div>
            ))}
          </div>
        )}
        {data.theyHaveMine.length > 0 && (
          <div className="filter-panel" style={{ flex: 1, minWidth: 260 }}>
            <div style={{ fontSize: "0.85rem", fontWeight: 600, marginBottom: "0.6rem" }}>{t.theyHaveMineTitle}</div>
            {data.theyHaveMine.map((m, i) => (
              <div key={i} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0.4rem 0", borderBottom: "1px solid var(--line)" }}>
                <MiniCard card={m.card} t={t} />
                <Link href={`/u/${m.user.username}`} style={{ fontSize: "0.74rem", color: "var(--text-muted)" }}>{m.user.username}</Link>
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  );
}

// Échange accepté : où on en est, et lien vers le suivi détaillé.
function AcceptedCard({ trade, t }) {
  const step = nextStep(trade, t);
  return (
    <article className="trade-card">
      <PartnerHead trade={trade} title={t.tradeTitleWith(trade.partner.username)} sub={t.tradeCountLine(trade.iGive.length, trade.iReceive.length)} />
      <TradeSides trade={trade} t={t} />
      <Link href={`/compte/echanges/${trade.id}`} className={`trade-next${step.mine ? " mine" : ""}`}>
        <span>{step.text}</span>
        <span className="trade-next-cta">{t.tradeFollow} <ChevronRight size={16} aria-hidden="true" /></span>
      </Link>
    </article>
  );
}

function DoneRow({ trade, t, lang }) {
  const date = formatDate(trade.closedAt || trade.createdAt, lang);
  const status =
    trade.status === "completed" ? t.tradeDoneOn(date) : trade.status === "declined" ? t.tradeDeclinedOn(date) : t.tradeCancelledOn(date);
  return (
    <Link href={`/compte/echanges/${trade.id}`} className={`trade-done-row ${trade.status}`}>
      <img src={trade.partner.avatar || avatarPlaceholder(trade.partner.username)} alt="" className="trade-avatar small" />
      <span className="trade-head-text">
        <span className="trade-head-title">{t.tradeTitleWith(trade.partner.username)}</span>
        <span className="trade-head-sub">{status} · {t.tradeCountLine(trade.iGive.length, trade.iReceive.length)}</span>
      </span>
      <ChevronRight size={18} aria-hidden="true" className="trade-done-chevron" />
    </Link>
  );
}

export default function TradesPage() {
  const { t, lang } = useLanguage();
  const [tab, setTab] = useState(null);
  const [matches, setMatches] = useState(null);
  const [trades, setTrades] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const loadTrades = useCallback(
    () =>
      fetch("/api/trades")
        .then((r) => (r.ok ? r.json() : { active: [], done: [] }))
        .then((d) => {
          setTrades(d);
          return d;
        })
        .catch(() => setTrades({ active: [], done: [] })),
    []
  );

  useEffect(() => {
    fetch("/api/users/me/matches")
      .then((r) => (r.ok ? r.json() : null))
      .then(setMatches)
      .catch(() => setMatches(null));
    loadTrades().then((d) => {
      // Onglet demandé dans l'adresse, sinon « En cours » s'il y a une proposition à traiter.
      const param = new URLSearchParams(window.location.search).get("onglet");
      const fromUrl = TABS.find((x) => x.param === param);
      const waiting = d?.active?.some((x) => x.status === "proposed" && x.role === "recipient");
      setTab(fromUrl ? fromUrl.key : waiting ? "active" : "possible");
    });
  }, [loadTrades]);

  function selectTab(key) {
    setTab(key);
    try {
      const url = new URL(window.location.href);
      url.searchParams.set("onglet", TABS.find((x) => x.key === key).param);
      window.history.replaceState(null, "", url);
    } catch (e) {}
  }

  async function act(id, action) {
    setBusy(true);
    setError("");
    try {
      const res = await fetch(`/api/trades/${id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      if (!res.ok) setError((await res.json().catch(() => ({}))).error || t.tradeActionFailed);
      await loadTrades();
    } catch (e) {
      setError(t.tradeActionFailed);
    } finally {
      setBusy(false);
    }
  }

  if (!trades || !tab) return <div className="empty-state">{t.loading}</div>;

  // Les propositions reçues d'abord (elles attendent une réponse), puis les échanges acceptés.
  const order = (x) => (x.status === "proposed" && x.role === "recipient" ? 0 : x.status === "accepted" ? 1 : 2);
  const active = [...trades.active].sort((a, b) => order(a) - order(b));

  return (
    <div className="trades-page">
      <h1 className="display-font trades-title">
        <Repeat size={18} aria-hidden="true" /> {t.tradesTitle}
      </h1>
      <div className="leaderboard-tabs trades-tabs" role="tablist" aria-label={t.tradesTitle}>
        {TABS.map((x) => (
          <button
            key={x.key}
            type="button"
            role="tab"
            id={`onglet-${x.key}`}
            aria-selected={tab === x.key}
            aria-controls="echanges-panneau"
            className={tab === x.key ? "active" : ""}
            onClick={() => selectTab(x.key)}
          >
            {x.key === "possible" ? t.tradesTabPossible : x.key === "active" ? t.tradesTabActive(active.length) : t.tradesTabDone}
          </button>
        ))}
      </div>

      <div id="echanges-panneau" role="tabpanel" aria-labelledby={`onglet-${tab}`} className="trades-panel">
        {error && <div className="toast error" style={{ marginBottom: "0.75rem" }}>{error}</div>}
        {tab === "possible" && <Possible data={matches} t={t} />}
        {tab === "active" && (
          <>
            {active.length === 0 && <div className="empty-state">{t.tradesNoneActive}</div>}
            {active.map((trade) =>
              trade.status === "proposed" ? (
                <ProposalCard key={trade.id} trade={trade} t={t} onAction={act} busy={busy} />
              ) : (
                <AcceptedCard key={trade.id} trade={trade} t={t} />
              )
            )}
            <p className="trades-note">{t.tradesNote}</p>
          </>
        )}
        {tab === "done" && (
          <>
            {trades.done.length === 0 && <div className="empty-state">{t.tradesNoneDone}</div>}
            <div className="trade-done-list">
              {trades.done.map((trade) => (
                <DoneRow key={trade.id} trade={trade} t={t} lang={lang} />
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
