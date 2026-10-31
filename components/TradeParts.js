"use client";

import Link from "next/link";
import Image from "next/image";
import { ArrowLeftRight } from "lucide-react";
import { CARD_GRID_SIZES } from "@/lib/imageSizes";
import { missingCardPlaceholder } from "@/lib/missingCardPlaceholder";
import { cardName, timeAgo } from "@/lib/tradeText";
import { avatarPlaceholder } from "@/lib/avatarPlaceholder";

// Vignettes des cartes d'un échange (lien vers chaque fiche).
export function TradeThumbs({ cards, t }) {
  return (
    <div className="trade-thumbs">
      {cards.map((c) => {
        const label = `${cardName(c, t)}, ${c.collection?.nom || ""} n°${c.numero}`;
        return (
          <Link key={c.id} href={`/cartes/${c.id}`} className="trade-thumb" title={label}>
            {c.image ? (
              <Image src={c.image} alt={label} fill sizes={CARD_GRID_SIZES} style={{ objectFit: "cover" }} />
            ) : (
              <img src={missingCardPlaceholder(c, t)} alt={label} />
            )}
          </Link>
        );
      })}
    </div>
  );
}

// « Vous recevez » ⇄ « Vous donnez », comme sur la planche validée.
export function TradeSides({ trade, t }) {
  return (
    <div className="trade-sides">
      <div>
        <div className="trade-side-label receive">{t.tradeYouReceive}</div>
        <TradeThumbs cards={trade.iReceive} t={t} />
      </div>
      <div className="trade-sides-icon" aria-hidden="true">
        <ArrowLeftRight size={20} />
      </div>
      <div>
        <div className="trade-side-label give">{t.tradeYouGive}</div>
        <TradeThumbs cards={trade.iGive} t={t} />
      </div>
    </div>
  );
}

export function PartnerHead({ trade, title, sub, badge }) {
  return (
    <div className="trade-head">
      <img src={trade.partner.avatar || avatarPlaceholder(trade.partner.username)} alt="" className="trade-avatar" />
      <span className="trade-head-text">
        <span className="trade-head-title">{title}</span>
        <span className="trade-head-sub">{sub}</span>
      </span>
      {badge && <span className="trade-badge">{badge}</span>}
    </div>
  );
}

// Proposition en attente : le destinataire l'accepte ou la refuse, l'auteur peut la retirer.
export function ProposalCard({ trade, t, onAction, busy }) {
  const received = trade.role === "recipient";
  const positives = trade.partnerStats?.positiveRatings ?? 0;
  return (
    <article className="trade-card">
      <PartnerHead
        trade={trade}
        title={received ? t.tradeProposedToYou(trade.partner.username) : t.tradeProposalSentTo(trade.partner.username)}
        sub={`${timeAgo(trade.createdAt, t)} · ${received ? t.positiveRatingsCount(positives) : t.tradeAwaitingAnswer}`}
        badge={received ? t.tradeNew : null}
      />
      <TradeSides trade={trade} t={t} />
      {trade.message && <blockquote className="trade-message">« {trade.message} »</blockquote>}
      {received ? (
        <div className="trade-actions two">
          <button type="button" className="btn-ghost" disabled={busy} onClick={() => onAction(trade.id, "decline")}>{t.tradeDecline}</button>
          <button type="button" className="btn-primary" disabled={busy} onClick={() => onAction(trade.id, "accept")}>{t.tradeAccept}</button>
        </div>
      ) : (
        <div className="trade-actions two">
          <button type="button" className="btn-ghost" disabled={busy} onClick={() => onAction(trade.id, "cancel")}>{t.tradeCancelProposal}</button>
          <Link href={`/compte/messages/${trade.partner.username}`} className="btn-ghost">{t.tradeWriteTo(trade.partner.username)}</Link>
        </div>
      )}
      {received && (
        <Link href={`/compte/messages/${trade.partner.username}`} className="trade-reply-link">{t.tradeReplyByMessage}</Link>
      )}
    </article>
  );
}
