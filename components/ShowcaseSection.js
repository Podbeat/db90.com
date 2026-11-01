"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { Share2, Check, Pencil } from "lucide-react";
import { useLanguage } from "@/components/LanguageProvider";
import { missingCardPlaceholder } from "@/lib/missingCardPlaceholder";
import { CARD_GRID_SIZES } from "@/lib/imageSizes";
import { shareUrl } from "@/lib/share";
import { SHOWCASE_SIZE } from "@/lib/showcase";

// « Mon classeur » sur le profil public : une page de 9 cases avec les cartes choisies par
// le membre (les cases libres restent visibles, comme dans un vrai classeur). Le bouton
// Partager envoie le lien du profil, dont l'image de partage reprend ce classeur (bouton
// masqué avec shareable={false} quand la page en propose déjà un, comme le profil public).
export default function ShowcaseSection({ username, cards, isOwner, shareable = true }) {
  const { t } = useLanguage();
  const [copied, setCopied] = useState(false);

  if (cards.length === 0 && !isOwner) return null;

  async function share() {
    const ok = await shareUrl(`${window.location.origin}/u/${username}`, t.showcaseShareTitle(username));
    if (ok && !navigator.share) {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }

  const title = isOwner ? t.showcaseTitleOwn : t.showcaseTitleOther;
  const slots = Array.from({ length: SHOWCASE_SIZE }, (_, i) => cards[i] || null);

  return (
    <section className="showcase" aria-label={title}>
      <div className="showcase-head">
        <h2 className="display-font showcase-title">{title}</h2>
        {cards.length > 0 && (isOwner || shareable) && (
          <div className="showcase-actions">
            {isOwner && (
              <Link href="/compte/collection?classeur=1#classeur" className="showcase-btn">
                <Pencil size={15} aria-hidden="true" /> {t.showcaseEdit}
              </Link>
            )}
            {shareable && (
              <button type="button" className="showcase-btn" onClick={share}>
                {copied ? <Check size={16} aria-hidden="true" /> : <Share2 size={16} aria-hidden="true" />}
                {copied ? t.shareCopied : t.share}
              </button>
            )}
          </div>
        )}
      </div>

      {cards.length === 0 ? (
        <div className="showcase-empty">
          <p>{t.showcaseEmptyOwn}</p>
          <Link href="/compte/collection?classeur=1#classeur" className="btn-primary">{t.showcaseCompose}</Link>
        </div>
      ) : (
        <>
          <div className="showcase-binder">
            {slots.map((c, i) => {
              if (!c) return <span key={`vide-${i}`} className="showcase-slot empty" aria-hidden="true" />;
              const label = [c.personnagePrincipal?.name || c.numero, c.collection?.nom].filter(Boolean).join(", ");
              return (
                <Link key={c.id} href={`/cartes/${c.id}`} className="showcase-slot">
                  {c.image ? (
                    <Image src={c.image} alt={label} fill sizes={CARD_GRID_SIZES} style={{ objectFit: "cover" }} />
                  ) : (
                    <img src={missingCardPlaceholder(c, t)} alt={label} />
                  )}
                </Link>
              );
            })}
          </div>
          <p className="showcase-caption">{t.showcaseCaption(username, cards.length)}</p>
        </>
      )}
    </section>
  );
}
