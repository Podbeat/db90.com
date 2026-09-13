"use client";

import { useState } from "react";
import { Check, Search } from "lucide-react";
import { useLanguage } from "@/components/LanguageProvider";

// Boutons compacts "J'ai" / "Je recherche" appliqués à TOUTE une collection en un clic,
// affichés dans l'étiquette de la vignette (liste des collections). La vignette entière
// est un lien vers la collection : ces boutons empêchent donc la navigation pour agir seuls.
export default function CollectionStatusButtons({ collectionId }) {
  const { t } = useLanguage();
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(null);

  async function setStatus(e, status) {
    e.preventDefault();
    e.stopPropagation();
    if (busy) return;
    setBusy(true);
    try {
      await fetch(`/api/users/me/collections/${collectionId}/status`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      setDone(status);
      setTimeout(() => setDone(null), 1800);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div style={{ display: "flex", gap: "0.4rem", marginTop: "0.6rem" }}>
      <button
        type="button"
        disabled={busy}
        onClick={(e) => setStatus(e, "owned")}
        className="btn-icon"
        style={{ fontSize: "0.7rem", display: "inline-flex", alignItems: "center", gap: "0.3rem" }}
        title={t.iOwnCard}
      >
        <Check size={12} /> {t.iOwnCard}
      </button>
      <button
        type="button"
        disabled={busy}
        onClick={(e) => setStatus(e, "wanted")}
        className="btn-icon"
        style={{ fontSize: "0.7rem", display: "inline-flex", alignItems: "center", gap: "0.3rem" }}
        title={t.iWantCard}
      >
        <Search size={12} /> {t.iWantCard}
      </button>
      {done && <span style={{ fontSize: "0.7rem", color: "var(--accent)", alignSelf: "center" }}>✓</span>}
    </div>
  );
}
