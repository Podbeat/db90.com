"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeftRight, X } from "lucide-react";
import { useLanguage } from "@/components/LanguageProvider";
import { avatarPlaceholder } from "@/lib/avatarPlaceholder";
import { missingCardPlaceholder } from "@/lib/missingCardPlaceholder";
import { CARD_GRID_SIZES } from "@/lib/imageSizes";
import { cardName } from "@/lib/tradeText";

function CardCheckList({ cards, selected, onToggle, tone, t }) {
  return (
    <ul className="trade-check-list">
      {cards.map((c) => (
        <li key={c.id}>
          <label className="trade-check-row">
            <span className="trade-check-thumb">
              {c.image ? (
                <Image src={c.image} alt="" fill sizes={CARD_GRID_SIZES} style={{ objectFit: "cover" }} />
              ) : (
                <img src={missingCardPlaceholder(c, t)} alt="" />
              )}
            </span>
            <span className="trade-check-text">
              <span className="trade-check-name">{cardName(c, t)}</span>
              <span className="trade-check-meta">{c.collection?.nom} · n°{c.numero}</span>
            </span>
            <input type="checkbox" className={`trade-check ${tone}`} checked={selected.has(c.id)} onChange={() => onToggle(c.id)} />
          </label>
        </li>
      ))}
    </ul>
  );
}

// Proposer un échange à un membre depuis « Échanges possibles » : je coche ce que je donne
// (cartes qu'il recherche et que j'ai) et ce que je reçois (cartes que je recherche et
// qu'il a), avec un message facultatif.
export default function ProposeTradePage() {
  const { t } = useLanguage();
  const router = useRouter();
  const { username } = useParams();
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  const [give, setGive] = useState(new Set());
  const [receive, setReceive] = useState(new Set());
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);

  useEffect(() => {
    fetch(`/api/trades/preview?with=${encodeURIComponent(username)}`)
      .then(async (r) => {
        const d = await r.json().catch(() => ({}));
        if (!r.ok) throw new Error(d.error || t.tradeActionFailed);
        return d;
      })
      .then((d) => {
        setData(d);
        setGive(new Set(d.give.map((c) => c.id)));
        setReceive(new Set(d.receive.map((c) => c.id)));
      })
      .catch((e) => setError(e.message));
  }, [username, t.tradeActionFailed]);

  const toggle = (set, setter) => (id) => {
    const next = new Set(set);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setter(next);
  };

  async function send() {
    setSending(true);
    setError("");
    try {
      const res = await fetch("/api/trades", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ recipient: username, give: [...give], receive: [...receive], message }),
      });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(d.error || t.tradeActionFailed);
      router.push(`/compte/echanges/${d.id}`);
    } catch (e) {
      setError(e.message);
      setSending(false);
    }
  }

  const header = (
    <div className="trade-page-head">
      <h1 className="display-font">{t.tradePropose}</h1>
      <Link href="/compte/echanges" className="trade-close" aria-label={t.tradeClose}>
        <X size={22} aria-hidden="true" />
      </Link>
    </div>
  );

  if (!data) {
    return (
      <div className="trade-page">
        {header}
        {error ? <div className="toast error">{error}</div> : <div className="empty-state">{t.loading}</div>}
      </div>
    );
  }

  const partner = data.partner;
  const possible = data.give.length > 0 && data.receive.length > 0;
  const canSend = possible && !data.pendingTradeId && !data.blocked && give.size > 0 && receive.size > 0;

  return (
    <div className="trade-page">
      {header}
      <div className="trade-head">
        <img src={partner.avatar || avatarPlaceholder(partner.username)} alt="" className="trade-avatar" />
        <span className="trade-head-text">
          <span className="trade-head-title">{t.tradeWith(partner.username)}</span>
          <span className="trade-head-sub">{t.tradeStats(partner.positiveRatings, partner.completedTrades)}</span>
        </span>
      </div>

      {data.blocked && <div className="toast error">{t.tradeBlocked}</div>}
      {data.pendingTradeId && (
        <div className="trade-notice">
          {t.tradePendingExists(partner.username)}{" "}
          <Link href={`/compte/echanges/${data.pendingTradeId}`}>{t.tradeSeePending}</Link>
        </div>
      )}
      {!possible && <div className="empty-state">{t.tradeNothingPossible(partner.username)}</div>}

      {possible && (
        <>
          <div className="trade-side-label give trade-section-label">{t.tradeIGive}</div>
          <CardCheckList cards={data.give} selected={give} onToggle={toggle(give, setGive)} tone="give" t={t} />
          <p className="trade-hint">{t.tradeGiveHint(partner.username)}</p>

          <div className="trade-swap" aria-hidden="true">
            <ArrowLeftRight size={22} />
          </div>

          <div className="trade-side-label receive trade-section-label">{t.tradeIReceive}</div>
          <CardCheckList cards={data.receive} selected={receive} onToggle={toggle(receive, setReceive)} tone="receive" t={t} />
          <p className="trade-hint">{t.tradeReceiveHint(partner.username)}</p>

          <label htmlFor="message-echange" className="trade-field-label">{t.tradeMessageLabel}</label>
          <textarea
            id="message-echange"
            rows={2}
            maxLength={500}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder={t.tradeMessagePlaceholder}
            className="trade-textarea"
          />

          <div className="trade-bar">
            {error && <div className="toast error" style={{ marginBottom: "0.5rem" }}>{error}</div>}
            <div className="trade-bar-summary">{t.tradeSummary(give.size, receive.size)}</div>
            <button type="button" className="btn-primary trade-bar-btn" disabled={!canSend || sending} onClick={send}>
              {sending ? "…" : t.tradeSend}
            </button>
          </div>
        </>
      )}
    </div>
  );
}
