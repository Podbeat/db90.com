"use client";

import { useState } from "react";
import { Share2, Check } from "lucide-react";
import { useLanguage } from "@/components/LanguageProvider";

// Bouton de partage léger : Web Share API si le navigateur la propose (la plupart des
// mobiles, et de plus en plus de navigateurs desktop), sinon copie du lien dans le
// presse-papier. Complété de deux liens rapides X / Facebook, sans SDK ni clé d'API.
export default function ShareButton({ url, title }) {
  const { t } = useLanguage();
  const [copied, setCopied] = useState(false);

  async function handleShare() {
    if (typeof navigator !== "undefined" && navigator.share) {
      try {
        await navigator.share({ title, url });
      } catch (e) {
        // L'utilisateur a annulé le partage, ou l'API a échoué : rien à faire.
      }
      return;
    }
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (e) {
      // Presse-papier indisponible (contexte non sécurisé, permission refusée...).
    }
  }

  const encodedUrl = encodeURIComponent(url);
  const encodedTitle = encodeURIComponent(title || "");

  return (
    <div style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
      <button
        type="button"
        className="btn-ghost"
        onClick={handleShare}
        style={{ display: "inline-flex", alignItems: "center", gap: "0.4rem", fontSize: "0.78rem" }}
      >
        {copied ? <Check size={14} /> : <Share2 size={14} />}
        {copied ? t.shareCopied : t.share}
      </button>
      <a
        href={`https://twitter.com/intent/tweet?url=${encodedUrl}&text=${encodedTitle}`}
        target="_blank"
        rel="noopener noreferrer"
        className="btn-icon"
        title="X (Twitter)"
      >
        𝕏
      </a>
      <a
        href={`https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`}
        target="_blank"
        rel="noopener noreferrer"
        className="btn-icon"
        title="Facebook"
      >
        f
      </a>
    </div>
  );
}
