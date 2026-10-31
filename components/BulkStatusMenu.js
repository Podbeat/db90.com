"use client";

import { useEffect, useRef, useState } from "react";
import { ChevronDown } from "lucide-react";
import { useLanguage } from "@/components/LanguageProvider";
import { isOwnedStatus } from "@/lib/cardStatus";

// « Cocher en lot » sur une page de collection : marque d'un coup les cartes manquantes en
// recherchées, tout en possédé, ou retire tout. Le menu calcule les changements à partir
// des statuts actuels et les confie au parent (`onApply`), qui les enregistre et propose
// d'annuler juste après.
export default function BulkStatusMenu({ cards, statusMap, onApply }) {
  const { t } = useLanguage();
  const [open, setOpen] = useState(false);
  const wrapRef = useRef(null);

  useEffect(() => {
    if (!open) return;
    function onPointer(e) {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false);
    }
    function onKey(e) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onPointer);
    document.addEventListener("touchstart", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onPointer);
      document.removeEventListener("touchstart", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const missing = cards.filter((c) => !statusMap[c.id]);
  // « Tout marquer possédé » ne touche pas aux cartes déjà « À l'échange » (elles sont possédées).
  const notOwned = cards.filter((c) => !isOwnedStatus(statusMap[c.id]));
  const tracked = cards.filter((c) => statusMap[c.id]);

  function run(updates) {
    setOpen(false);
    if (updates.length) onApply(updates);
  }

  return (
    <div className="bulk-menu-wrap" ref={wrapRef}>
      <button
        type="button"
        className="bulk-menu-btn"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
      >
        {t.bulkButton}
        <ChevronDown size={14} strokeWidth={2.4} aria-hidden="true" />
      </button>
      {open && (
        <div className="bulk-menu" role="menu" aria-label={t.bulkButton}>
          <button
            type="button"
            role="menuitem"
            className="bulk-menu-item highlighted"
            disabled={missing.length === 0}
            onClick={() => run(missing.map((c) => ({ cardId: c.id, status: "wanted" })))}
          >
            <span>{t.bulkMissingToWanted(missing.length)}</span>
            <span className="bulk-menu-hint">{t.bulkMissingHint}</span>
          </button>
          <button
            type="button"
            role="menuitem"
            className="bulk-menu-item"
            disabled={notOwned.length === 0}
            onClick={() => run(notOwned.map((c) => ({ cardId: c.id, status: "owned" })))}
          >
            {t.bulkAllOwned(cards.length)}
          </button>
          <button
            type="button"
            role="menuitem"
            className="bulk-menu-item"
            disabled={tracked.length === 0}
            onClick={() => run(tracked.map((c) => ({ cardId: c.id, status: null })))}
          >
            {t.bulkClear}
          </button>
          <div className="bulk-menu-note">{t.bulkUndoNote}</div>
        </div>
      )}
    </div>
  );
}
