"use client";

import { useState } from "react";
import { Share2, Check } from "lucide-react";
import { shareUrl } from "@/lib/share";

// Petit bouton de partage superposé sur une vignette de carte (dans .card-tile-media),
// visible au survol. La vignette entière est un lien vers la fiche carte : ce bouton doit
// donc empêcher la navigation et le "bouillonnement" du clic pour agir seul.
export default function ShareIconButton({ path, title }) {
  const [copied, setCopied] = useState(false);

  async function handleClick(e) {
    e.preventDefault();
    e.stopPropagation();
    const url = typeof window !== "undefined" ? `${window.location.origin}${path}` : path;
    const ok = await shareUrl(url, title);
    if (ok && !(typeof navigator !== "undefined" && navigator.share)) {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    }
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      className="card-share-btn"
      title="Partager cette carte"
      aria-label="Partager cette carte"
    >
      {copied ? <Check size={13} /> : <Share2 size={13} />}
    </button>
  );
}
