"use client";

import { useState } from "react";
import { Check, Search } from "lucide-react";
import { useLanguage } from "@/components/LanguageProvider";

// Icônes compactes "J'ai" / "Je recherche" appliquées à TOUTE une collection en un clic,
// superposées en transparence sur le visuel de la vignette (juste au-dessus du bloc
// d'informations). La vignette entière est un lien vers la collection : ces boutons
// empêchent donc la navigation pour agir seuls.
//
// Le changement de couleur est immédiat au clic (avant même la réponse du serveur) pour
// que la prise en compte soit visible tout de suite, sans attendre l'actualisation.
export default function CollectionStatusButtons({ collectionId }) {
  const { t } = useLanguage();
  const [applied, setApplied] = useState(null);

  async function setStatus(e, status) {
    e.preventDefault();
    e.stopPropagation();
    const newStatus = applied === status ? null : status;
    setApplied(newStatus);
    await fetch(`/api/users/me/collections/${collectionId}/status`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: newStatus }),
    });
  }

  return (
    <div className="collection-status-icons">
      <button
        type="button"
        onClick={(e) => setStatus(e, "owned")}
        className={`collection-status-icon ${applied === "owned" ? "active" : ""}`}
        title={t.iOwnCard}
        aria-label={t.iOwnCard}
      >
        <Check size={13} />
      </button>
      <button
        type="button"
        onClick={(e) => setStatus(e, "wanted")}
        className={`collection-status-icon ${applied === "wanted" ? "active" : ""}`}
        title={t.iWantCard}
        aria-label={t.iWantCard}
      >
        <Search size={13} />
      </button>
    </div>
  );
}
