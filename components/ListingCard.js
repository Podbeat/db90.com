"use client";

import Link from "next/link";
import Image from "next/image";
import { X, MessageCircle } from "lucide-react";
import { CARD_GRID_SIZES } from "@/lib/imageSizes";
import { missingCardPlaceholder } from "@/lib/missingCardPlaceholder";
import { avatarPlaceholder } from "@/lib/avatarPlaceholder";
import { formatPrice } from "@/lib/localize";
import { useLanguage } from "@/components/LanguageProvider";
import { useCurrentUser } from "@/components/CurrentUserProvider";
import { CardNumBadge } from "@/components/CardTileMeta";

// Fiche-annonce partagée par le Marché (showSeller=true, tous membres confondus), la boutique
// publique d'un membre sur /u/[username] (showSeller=false : on est déjà sur sa page) et la
// gestion de ses propres annonces sur /compte/ventes (onRemove fourni). Même allure que les
// vignettes du catalogue : numéro posé sur le visuel, puis prix et état, puis la collection.
//
// Le bouton de retrait est un frère du lien de la fiche, jamais un enfant : un <button>
// à l'intérieur d'un <a> serait invalide et casserait la navigation au clavier.
export default function ListingCard({ listing, showSeller = true, onRemove }) {
  const { t, lang } = useLanguage();
  const { me } = useCurrentUser();
  const l = listing;
  const isSelling = l.type === "seller";
  const isMine = !!me && me.username === l.user?.username;

  return (
    <div className={`listing-card ${isSelling ? "selling" : "wanted"}`}>
      <Link href={`/cartes/${l.card.id}`} className="listing-link">
        <div className="listing-media">
          {/* Mêmes largeurs que les grilles de cartes, déjà en cache, au lieu du scan de 900 px. */}
          {l.card.image ? (
            <Image src={l.card.image} alt={l.card.personnagePrincipal?.name || ""} fill sizes={CARD_GRID_SIZES} />
          ) : (
            <img src={missingCardPlaceholder(l.card, t)} alt={l.card.personnagePrincipal?.name || ""} />
          )}
          <span className={`listing-badge ${isSelling ? "badge-sell" : "badge-buy"}`}>
            {isSelling ? t.mkBadgeSelling : t.mkBadgeWanted}
          </span>
          {l.card.image && <CardNumBadge numero={l.card.numero} />}
        </div>
        <div className="listing-body">
          <div className="listing-top">
            {isSelling ? (
              <span className="listing-price">{l.price != null ? formatPrice(l.price, lang) : t.priceNotSet}</span>
            ) : (
              <span className="listing-wanted">{t.mkWantedBody}</span>
            )}
            {isSelling && l.condition && <span className="condition-pill">{l.condition}</span>}
          </div>
          <div className="listing-meta">{l.card.collection?.nom}</div>
        </div>
      </Link>

      {showSeller && (
        <div className="listing-seller-row">
          <Link href={`/u/${l.user.username}`} className="listing-seller">
            <img src={l.user.avatar || avatarPlaceholder(l.user.username)} alt="" className="listing-avatar" />
            <span>{l.user.username}</span>
          </Link>
          {!isMine && (
            <Link href={`/compte/messages/${l.user.username}`} className="listing-contact" title={t.contactSellerTitle(l.user.username)}>
              <MessageCircle size={14} aria-hidden="true" />
              <span className="visually-hidden">{t.contactSellerTitle(l.user.username)}</span>
            </Link>
          )}
        </div>
      )}

      {onRemove && (
        <button className="listing-remove-btn" onClick={() => onRemove(l.card.id)} aria-label={t.removeListing} title={t.removeListing} type="button">
          <X size={13} />
        </button>
      )}
    </div>
  );
}
