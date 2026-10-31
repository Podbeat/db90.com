"use client";

import { useEffect, useState } from "react";

// Même seuil que les règles mobiles de globals.css (en-tête compact, barre d'onglets,
// filtres repliés). Sert uniquement aux composants qui ne doivent pas être montés deux fois
// (cloche et messages, qui interrogent le serveur) : tout le reste bascule en pur CSS.
export const MOBILE_QUERY = "(max-width: 720px)";

export function useIsMobile() {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia(MOBILE_QUERY);
    const update = () => setIsMobile(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);

  return isMobile;
}
