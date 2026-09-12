"use client";

import { useState } from "react";
import { Share2, Check } from "lucide-react";
import { useLanguage } from "@/components/LanguageProvider";

// Logos vectoriels minimalistes (currentColor, alignés sur la couleur/hover de .btn-icon),
// à la place de simples caractères texte — mêmes proportions que les icônes lucide-react
// utilisées ailleurs sur le site (viewBox 24x24, taille passée en prop).
function XIcon({ size = 14 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
    </svg>
  );
}

function FacebookIcon({ size = 14 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M22 12.06C22 6.505 17.523 2 12 2S2 6.505 2 12.06c0 5.02 3.657 9.184 8.438 9.94v-7.03H7.898v-2.91h2.54V9.845c0-2.522 1.492-3.915 3.777-3.915 1.094 0 2.238.196 2.238.196v2.475h-1.26c-1.243 0-1.63.775-1.63 1.57v1.888h2.773l-.443 2.91h-2.33V22c4.78-.756 8.437-4.92 8.437-9.94z" />
    </svg>
  );
}

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
        style={{ display: "inline-flex", alignItems: "center", justifyContent: "center" }}
      >
        <XIcon size={13} />
      </a>
      <a
        href={`https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`}
        target="_blank"
        rel="noopener noreferrer"
        className="btn-icon"
        title="Facebook"
        style={{ display: "inline-flex", alignItems: "center", justifyContent: "center" }}
      >
        <FacebookIcon size={13} />
      </a>
    </div>
  );
}
