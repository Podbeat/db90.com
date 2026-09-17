"use client";

import Link from "next/link";
import { X } from "lucide-react";
import { useLanguage } from "@/components/LanguageProvider";
import { avatarPlaceholder } from "@/lib/avatarPlaceholder";

// Fiche-annonce partagée entre trois pages qui affichaient auparavant trois listes plates
// indépendantes : la vue d'ensemble /marche (showSeller=true, tous vendeurs confondus),
// la boutique publique d'un membre sur /u/[username] (showSeller=false — on est déjà sur sa
// page), et la gestion de ses propres annonces sur /compte/ventes (onRemove fourni).
//
// Le bouton de retrait est un frère du lien de la fiche, jamais un enfant : un <button>
// à l'intérieur d'un <a> serait invalide et casserait la navigation au clavier.
export default function ListingCard({ listing, showSeller = true, onRemove }) {
  const { t } = useLanguage();
  const l = listing;
  const isSelling = l.type === "seller";

  return (
    <div className="listing-card">
      <Link href={`/cartes/${l.card.id}`} className="listing-link">
        <div className="listing-media">
          <img src={l.card.image || ""} alt={l.card.personnagePrincipal?.name || ""} />
          <span className={`listing-badge ${isSelling ? "badge-sell" : "badge-buy"}`}>
            {isSelling ? t.marketTypeSelling : t.marketTypeBuying}
          </span>
        </div>
        <div className="listing-body">
          {isSelling ? (
            <div className="listing-price">{l.price != null ? `${l.price} €` : t.priceNotSet}</div>
          ) : (
            <div className="listing-wanted">{t.marketTypeBuying}</div>
          )}
          <div className="listing-name">{l.card.personnagePrincipal?.name || t.noCharacterAssigned}</div>
          <div className="listing-meta">{l.card.collection?.nom} — n°{l.card.numero}</div>
          {isSelling && l.condition && <span className="condition-pill">{l.condition}</span>}
        </div>
      </Link>

      {showSeller && (
        <Link href={`/u/${l.user.username}`} className="listing-seller-row">
          <img src={l.user.avatar || avatarPlaceholder(l.user.username)} alt="" className="listing-avatar" />
          {l.user.username}
        </Link>
      )}

      {onRemove && (
        <button className="listing-remove-btn" onClick={() => onRemove(l.card.id)} aria-label={t.removeListing} title={t.removeListing} type="button">
          <X size={13} />
        </button>
      )}
    </div>
  );
}
