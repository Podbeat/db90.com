"use client";

import { Check, Search } from "lucide-react";
import { useLanguage } from "@/components/LanguageProvider";

// Icônes "J'ai" / "Je recherche" superposées sur une vignette de carte (dans
// .card-tile-media), pour éviter d'avoir à ouvrir chaque fiche. La vignette entière est un
// lien : ces boutons empêchent donc la navigation pour agir seuls. `status` et `onChange`
// sont gérés par le parent (qui connaît le statut de toutes les cartes de la grille en un
// seul chargement, pour éviter une requête par vignette).
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

  return (
    <div className="card-status-icons">
      <button
        type="button"
        onClick={(e) => setStatus(e, "owned")}
        className={`card-status-icon ${status === "owned" ? "active" : ""}`}
        title={t.iOwnCard}
        aria-label={t.iOwnCard}
      >
        <Check size={12} />
      </button>
      <button
        type="button"
        onClick={(e) => setStatus(e, "wanted")}
        className={`card-status-icon ${status === "wanted" ? "active" : ""}`}
        title={t.iWantCard}
        aria-label={t.iWantCard}
      >
        <Search size={12} />
      </button>
    </div>
  );
}
