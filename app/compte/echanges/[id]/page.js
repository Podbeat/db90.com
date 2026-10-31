"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { Check, ChevronLeft, ThumbsUp, ThumbsDown } from "lucide-react";
import { useLanguage } from "@/components/LanguageProvider";
import { formatDate } from "@/lib/localize";
import { cardName, joinNames } from "@/lib/tradeText";
import { TradeSides, ProposalCard } from "@/components/TradeParts";

function Step({ state, title, detail, last }) {
  return (
    <li className={`trade-step ${state}`}>
      <span className="trade-step-rail" aria-hidden="true">
        <span className="trade-step-dot">{state === "done" && <Check size={14} strokeWidth={3} />}</span>
        {!last && <span className="trade-step-line" />}
      </span>
      <span className="trade-step-body">
        <span className="trade-step-title">{title}</span>
        {detail && <span className="trade-step-detail">{detail}</span>}
      </span>
    </li>
  );
}

// Suivi d'un échange : proposition (accepter, refuser, retirer), puis envoi et réception de
// chaque côté. À la réception, le membre peut noter l'autre et mettre à jour sa collection.
export default function TradeDetailPage() {
  const { t, lang } = useLanguage();
  const { id } = useParams();
  const [trade, setTrade] = useState(null);
  const [status, setStatus] = useState("loading");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [rating, setRating] = useState(null); // true, false ou null (pas de note)
  const [comment, setComment] = useState("");
  const [addReceived, setAddReceived] = useState(true);
  const [removeGiven, setRemoveGiven] = useState(true);

  const load = useCallback(() => {
    fetch(`/api/trades/${id}`)
      .then((r) => {
        if (!r.ok) throw new Error("not found");
        return r.json();
      })
      .then((d) => {
        setTrade(d);
        setStatus("ready");
      })
      .catch(() => setStatus("notfound"));
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  async function act(_id, action, extra = {}) {
    setBusy(true);
    setError("");
    try {
      const res = await fetch(`/api/trades/${id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, ...extra }),
      });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(d.error || t.tradeActionFailed);
        load();
      } else {
        setTrade(d);
      }
    } catch (e) {
      setError(t.tradeActionFailed);
    } finally {
      setBusy(false);
    }
  }

  const back = (
    <div className="trade-page-head">
      <Link href="/compte/echanges?onglet=en-cours" className="trade-back" aria-label={t.tradeBack}>
        <ChevronLeft size={22} aria-hidden="true" />
      </Link>
      <h1 className="display-font">{trade ? t.tradeTitleWith(trade.partner.username) : t.tradesTitle}</h1>
    </div>
  );

  if (status === "loading") return <div className="trade-page">{back}<div className="empty-state">{t.loading}</div></div>;
  if (status === "notfound") return <div className="trade-page">{back}<div className="empty-state">{t.notFound}</div></div>;

  const partner = trade.partner.username;
  const fmt = (d) => formatDate(d, lang);
  const errorBox = error && <div className="toast error" style={{ marginBottom: "0.75rem" }}>{error}</div>;

  if (trade.status === "proposed") {
    return (
      <div className="trade-page">
        {back}
        {errorBox}
        <ProposalCard trade={trade} t={t} onAction={act} busy={busy} />
        <p className="trades-note">{t.tradesNote}</p>
      </div>
    );
  }

  if (trade.status === "declined" || trade.status === "cancelled") {
    return (
      <div className="trade-page">
        {back}
        <div className="trade-banner closed">
          {trade.status === "declined" ? t.tradeDeclined : t.tradeCancelled} · {fmt(trade.closedAt)}
        </div>
        <article className="trade-card">
          <TradeSides trade={trade} t={t} />
        </article>
      </div>
    );
  }

  // Échange accepté ou terminé : les trois étapes.
  const bothSent = Boolean(trade.mySentAt && trade.partnerSentAt);
  const bothReceived = Boolean(trade.myReceivedAt && trade.partnerReceivedAt);
  const stepState = (done, isCurrent) => (done ? "done" : isCurrent ? "current" : "todo");
  const nothingMoved = !trade.mySentAt && !trade.partnerSentAt && !trade.myReceivedAt && !trade.partnerReceivedAt;
  const receivedNames = trade.iReceive.map((c) => t.tradeCardLabel(cardName(c, t), c.collection?.nom || "", c.numero));
  const givenNames = trade.iGive.map((c) => cardName(c, t));

  return (
    <div className="trade-page">
      {back}
      {errorBox}
      {trade.status === "completed" && <div className="trade-banner done">{t.tradeCompleted} · {fmt(trade.closedAt)}</div>}

      <ol className="trade-steps" aria-label={t.tradeTitleWith(partner)}>
        <Step state="done" title={t.tradeStepAccepted} detail={`${fmt(trade.acceptedAt)} · ${t.tradeCountLine(trade.iGive.length, trade.iReceive.length)}`} />
        <Step
          state={stepState(bothSent, true)}
          title={t.tradeStepSent}
          detail={`${trade.mySentAt ? t.tradeYouSentOn(fmt(trade.mySentAt)) : t.tradeYouNotSent} · ${
            trade.partnerSentAt ? t.tradePartnerSentOn(partner, fmt(trade.partnerSentAt)) : t.tradePartnerNotSent(partner)
          }`}
        />
        <Step
          state={stepState(bothReceived, bothSent || Boolean(trade.myReceivedAt || trade.partnerReceivedAt))}
          title={t.tradeStepReceived}
          detail={`${trade.myReceivedAt ? t.tradeYouReceivedOn(fmt(trade.myReceivedAt)) : t.tradeYouNotReceived} · ${
            trade.partnerReceivedAt ? t.tradePartnerReceivedOn(partner, fmt(trade.partnerReceivedAt)) : t.tradePartnerNotReceived(partner)
          }`}
          last
        />
      </ol>

      <article className="trade-card">
        <TradeSides trade={trade} t={t} />
      </article>

      {trade.status === "accepted" && !trade.mySentAt && (
        <button type="button" className="btn-ghost trade-wide-btn" disabled={busy} onClick={() => act(id, "sent")}>
          {t.tradeMarkSent}
        </button>
      )}

      {trade.status === "accepted" && !trade.myReceivedAt && (
        <>
          <section className="trade-panel" aria-label={t.tradeHowWasIt}>
            <div className="trade-panel-title">{t.tradeHowWasIt}</div>
            <div className="trade-rating">
              <button type="button" className={`trade-rating-btn good${rating === true ? " active" : ""}`} aria-pressed={rating === true} onClick={() => setRating(rating === true ? null : true)}>
                <ThumbsUp size={18} aria-hidden="true" /> {t.tradeRatingGood}
              </button>
              <button type="button" className={`trade-rating-btn bad${rating === false ? " active" : ""}`} aria-pressed={rating === false} onClick={() => setRating(rating === false ? null : false)}>
                <ThumbsDown size={18} aria-hidden="true" /> {t.tradeRatingProblem}
              </button>
            </div>
            <label htmlFor="avis-echange" className="visually-hidden">{t.tradeRatingComment}</label>
            <input
              id="avis-echange"
              type="text"
              maxLength={500}
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder={t.tradeRatingPlaceholder}
              className="trade-input"
            />
          </section>

          <section className="trade-panel gold" aria-label={t.tradeUpdateCollection}>
            <div className="trade-panel-title">{t.tradeUpdateCollection}</div>
            {receivedNames.length > 0 && (
              <label className="trade-option">
                <input type="checkbox" checked={addReceived} onChange={(e) => setAddReceived(e.target.checked)} />
                <span>{t.tradeAddReceived(joinNames(receivedNames, t), receivedNames.length)}</span>
              </label>
            )}
            {givenNames.length > 0 && (
              <label className="trade-option">
                <input type="checkbox" checked={removeGiven} onChange={(e) => setRemoveGiven(e.target.checked)} />
                <span>
                  {t.tradeRemoveGiven(joinNames(givenNames, t))}
                  <span className="trade-option-hint">{t.tradeRemoveGivenHint}</span>
                </span>
              </label>
            )}
          </section>

          <div className="trade-bar">
            <button
              type="button"
              className="btn-primary trade-bar-btn"
              disabled={busy}
              onClick={() =>
                act(id, "received", {
                  addReceived,
                  removeGiven,
                  rating: rating === null ? null : { positive: rating, comment },
                })
              }
            >
              {t.tradeConfirmReceived}
            </button>
          </div>
        </>
      )}

      {trade.myReceivedAt && trade.status === "accepted" && (
        <p className="trade-info">
          {t.tradeReceivedDone(fmt(trade.myReceivedAt))} {t.tradeNextWaitConfirm(partner)}.
        </p>
      )}

      <div className="trade-links">
        <Link href={`/compte/messages/${partner}`}>{t.tradeWriteTo(partner)}</Link>
        {trade.status === "accepted" && nothingMoved && (
          <button type="button" className="trade-link-btn" disabled={busy} onClick={() => act(id, "cancel")}>
            {t.tradeCancel}
          </button>
        )}
      </div>
    </div>
  );
}
