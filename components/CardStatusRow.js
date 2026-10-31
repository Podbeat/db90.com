"use client";

import Link from "next/link";
import Image from "next/image";
import { Check, Search } from "lucide-react";
import { useLanguage } from "@/components/LanguageProvider";
import { missingCardPlaceholder } from "@/lib/missingCardPlaceholder";
import { CARD_GRID_SIZES } from "@/lib/imageSizes";

// Une ligne du mode liste d'une collection : vignette et nom (lien vers la fiche), puis
// deux boutons « Je l'ai » / « Je la recherche » assez grands pour le doigt.
export default function CardStatusRow({ card, status, onToggle }) {
  const { t } = useLanguage();
  const name = card.personnagePrincipal?.name || t.noCharacterAssigned;

  return (
    <li className="status-row">
      <Link href={`/cartes/${card.id}`} className="status-row-link">
        <span className="status-row-thumb">
          {card.image ? (
            <Image src={card.image} alt="" fill sizes={CARD_GRID_SIZES} style={{ objectFit: "cover" }} />
          ) : (
            <img src={missingCardPlaceholder(card, t)} alt="" />
          )}
        </span>
        <span className="status-row-text">
          <span className="status-row-name">
            {card.numero} · {name}
          </span>
          {card.rarete && <span className="status-row-meta">{card.rarete}</span>}
        </span>
      </Link>
      <button
        type="button"
        className={`status-row-btn owned ${status === "owned" ? "active" : ""}`}
        aria-pressed={status === "owned"}
        aria-label={`${t.iOwnCard} — ${name} (${card.numero})`}
        onClick={() => onToggle(card.id, "owned")}
      >
        <Check size={18} strokeWidth={2.4} aria-hidden="true" />
      </button>
      <button
        type="button"
        className={`status-row-btn wanted ${status === "wanted" ? "active" : ""}`}
        aria-pressed={status === "wanted"}
        aria-label={`${t.iWantCard} — ${name} (${card.numero})`}
        onClick={() => onToggle(card.id, "wanted")}
      >
        <Search size={18} strokeWidth={2.2} aria-hidden="true" />
      </button>
    </li>
  );
}
