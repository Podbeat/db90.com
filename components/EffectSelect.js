"use client";

import { useEffect, useState } from "react";
import { useLanguage } from "@/components/LanguageProvider";

// Valeur du choix « Je ne sais pas » : l'effet est alors laissé à définir par l'administrateur.
export const UNKNOWN_EFFECT = "__inconnu";
// Ce qu'il faut envoyer au serveur pour une valeur du menu ("" = effet à définir).
export const effectToSend = (value) => (value === UNKNOWN_EFFECT ? "" : value || "");

let cache = null; // liste partagée entre les formulaires d'une même visite

// Menu déroulant des effets / prismes, d'après la liste gérée dans l'administration (plus de
// saisie libre : « Feu d'artifice », « Artifice » et « Feu d'artifices » ne font plus qu'un).
// `exclude` retire des effets de la liste (par exemple ceux qui existent déjà pour la carte).
export default function EffectSelect({ value, onChange, exclude = [], id }) {
  const { t } = useLanguage();
  const [names, setNames] = useState(cache || []);

  useEffect(() => {
    if (cache) return;
    fetch("/api/effects")
      .then((r) => (r.ok ? r.json() : []))
      .then((list) => {
        cache = list.map((e) => e.name);
        setNames(cache);
      })
      .catch(() => {});
  }, []);

  const excluded = new Set(exclude.filter(Boolean));
  return (
    <select id={id} value={value} onChange={(e) => onChange(e.target.value)}>
      <option value="">{t.effectSelectPlaceholder}</option>
      {names
        .filter((n) => !excluded.has(n))
        .map((n) => (
          <option key={n} value={n}>{n}</option>
        ))}
      <option value={UNKNOWN_EFFECT}>{t.effectUnknownOption}</option>
    </select>
  );
}
