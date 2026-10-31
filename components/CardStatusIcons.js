"use client";

import { ArrowLeftRight, Check, Search } from "lucide-react";
import { useLanguage } from "@/components/LanguageProvider";

// Icônes « J'ai » / « À l'échange » / « Je recherche » superposées sur une vignette de carte
// (dans .card-tile-media), pour éviter d'avoir à ouvrir chaque fiche. La vignette entière
// est un lien : ces boutons empêchent donc la navigation pour agir seuls. `status` et
// `onChange` sont gérés par le parent (qui connaît le statut de toutes les cartes de la
// grille en un seul chargement, pour éviter une requête par vignette).
export default function CardStatusIcons({ cardId, status, onChange }) {
  const { t } = useLanguage();

  async function setStatus(e, next) {
    e.preventDefault();
    e.stopPropagation();
    const newStatus = status === next ? null : next;
    onChange(cardId, newStatus);
    await fetch("/api/users/me/cards", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ cardId, status: newStatus }),
    });
  }

  const options = [
    { key: "owned", Icon: Check, label: t.iOwnCard },
    { key: "trade", Icon: ArrowLeftRight, label: t.iTradeCardLong },
    { key: "wanted", Icon: Search, label: t.iWantCard },
  ];

  return (
    <div className="card-status-icons">
      {options.map(({ key, Icon, label }) => (
        <button
          key={key}
          type="button"
          onClick={(e) => setStatus(e, key)}
          className={`card-status-icon ${key}${status === key ? " active" : ""}`}
          title={label}
          aria-label={label}
          aria-pressed={status === key}
        >
          <Icon size={12} />
        </button>
      ))}
    </div>
  );
}
