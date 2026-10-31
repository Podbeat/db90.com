"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { Plus, Search, X } from "lucide-react";
import { useLanguage } from "@/components/LanguageProvider";
import { useCurrentUser } from "@/components/CurrentUserProvider";
import { missingCardPlaceholder } from "@/lib/missingCardPlaceholder";
import { CARD_GRID_SIZES } from "@/lib/imageSizes";
import { naturalSortByNumero } from "@/lib/naturalSort";
import { SHOWCASE_SIZE } from "@/lib/showcase";

// Appui long avant de pouvoir déplacer une case au doigt (un glissement plus rapide reste
// un défilement de la page) ; à la souris, le déplacement commence dès que l'on bouge.
const LONG_PRESS_MS = 280;
const MOVE_TOLERANCE_PX = 10;

const normalize = (s) => (s || "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
const cardName = (c, t) => c.personnagePrincipal?.name || c.numero || t.noCharacterAssigned;

function Thumb({ card, t }) {
  return card.image ? (
    <Image src={card.image} alt="" fill sizes={CARD_GRID_SIZES} style={{ objectFit: "cover" }} draggable={false} />
  ) : (
    <img src={missingCardPlaceholder(card, t)} alt="" draggable={false} />
  );
}

// « Mon classeur » : composer sa page de 9 cartes parmi celles que l'on possède. Toucher une
// case remplie la vide ; un appui long (ou un glisser à la souris) la déplace.
export default function ShowcaseEditorPage() {
  const { t } = useLanguage();
  const { me } = useCurrentUser();
  const [owned, setOwned] = useState(null);
  const [selection, setSelection] = useState([]);
  const [saved, setSaved] = useState([]);
  const [query, setQuery] = useState("");
  const [notice, setNotice] = useState(null); // "saved" | "error" | "full"
  const [saving, setSaving] = useState(false);
  const [preview, setPreview] = useState(false);
  const [drag, setDrag] = useState(null); // { from, over } pendant un déplacement
  const binderRef = useRef(null);
  const searchRef = useRef(null);
  const pickerRef = useRef(null);
  const press = useRef(null);
  const dragRef = useRef(null);
  const suppressClick = useRef(false);

  useEffect(() => {
    Promise.all([
      fetch("/api/users/me/cards").then((r) => (r.ok ? r.json() : { owned: [] })),
      fetch("/api/users/me/showcase").then((r) => (r.ok ? r.json() : { cardIds: [] })),
    ])
      .then(([cards, showcase]) => {
        const list = [...(cards.owned || [])].sort(
          (a, b) => (a.collection?.nom || "").localeCompare(b.collection?.nom || "") || naturalSortByNumero(a, b)
        );
        const ownedIds = new Set(list.map((c) => c.id));
        const initial = (showcase.cardIds || []).filter((id) => ownedIds.has(id)).slice(0, SHOWCASE_SIZE);
        setOwned(list);
        setSelection(initial);
        setSaved(initial);
      })
      .catch(() => setOwned([]));
  }, []);

  // Pendant un déplacement au doigt, la page ne doit pas défiler.
  useEffect(() => {
    const el = binderRef.current;
    if (!el) return undefined;
    const onTouchMove = (e) => {
      if (press.current?.dragging) e.preventDefault();
    };
    el.addEventListener("touchmove", onTouchMove, { passive: false });
    return () => el.removeEventListener("touchmove", onTouchMove);
  }, [owned]);

  useEffect(() => {
    if (!preview) return undefined;
    const onKey = (e) => {
      if (e.key === "Escape") setPreview(false);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [preview]);

  const byId = useMemo(() => new Map((owned || []).map((c) => [c.id, c])), [owned]);
  const filtered = useMemo(() => {
    const q = normalize(query.trim());
    if (!owned) return [];
    if (!q) return owned;
    return owned.filter((c) =>
      [c.personnagePrincipal?.name, c.collection?.nom, c.numero, c.rarete].some((v) => normalize(v).includes(q))
    );
  }, [owned, query]);

  const cards = selection.map((id) => byId.get(id)).filter(Boolean);
  const dirty = selection.join() !== saved.join();

  function toggle(id) {
    if (selection.includes(id)) {
      setSelection(selection.filter((x) => x !== id));
      setNotice(null);
    } else if (selection.length >= SHOWCASE_SIZE) {
      setNotice("full");
    } else {
      setSelection([...selection, id]);
      setNotice(null);
    }
  }

  function removeAt(index) {
    if (suppressClick.current) return;
    setSelection(selection.filter((_, i) => i !== index));
    setNotice(null);
  }

  function focusPicker() {
    pickerRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    searchRef.current?.focus({ preventScroll: true });
  }

  // --- Déplacement d'une case (pointeur : souris, doigt ou stylet) ---
  function setDragState(next) {
    dragRef.current = next;
    setDrag(next);
  }

  function startDrag() {
    const p = press.current;
    if (!p || p.dragging) return;
    p.dragging = true;
    try {
      p.el.setPointerCapture(p.pointerId);
    } catch (e) {}
    setDragState({ from: p.index, over: p.index });
  }

  function onPointerDown(e, index) {
    if (e.pointerType === "mouse" && e.button !== 0) return;
    press.current = { index, pointerId: e.pointerId, x: e.clientX, y: e.clientY, el: e.currentTarget, type: e.pointerType, dragging: false, timer: null };
    if (e.pointerType !== "mouse") press.current.timer = setTimeout(startDrag, LONG_PRESS_MS);
  }

  function onPointerMove(e) {
    const p = press.current;
    if (!p || e.pointerId !== p.pointerId) return;
    if (!p.dragging) {
      if (Math.hypot(e.clientX - p.x, e.clientY - p.y) <= MOVE_TOLERANCE_PX) return;
      if (p.type !== "mouse") {
        // Le doigt a bougé avant l'appui long : c'est un défilement, pas un déplacement.
        clearTimeout(p.timer);
        press.current = null;
        return;
      }
      startDrag();
    }
    const slot = document.elementFromPoint(e.clientX, e.clientY)?.closest("[data-slot]");
    const over = slot && binderRef.current?.contains(slot) ? Number(slot.dataset.slot) : null;
    if (dragRef.current && dragRef.current.over !== over) setDragState({ ...dragRef.current, over });
  }

  function endPress(e, cancelled) {
    const p = press.current;
    if (!p || e.pointerId !== p.pointerId) return;
    clearTimeout(p.timer);
    press.current = null;
    const d = dragRef.current;
    if (!p.dragging || !d) return;
    // Le clic qui suit le relâchement ne doit pas vider la case déplacée.
    suppressClick.current = true;
    setTimeout(() => {
      suppressClick.current = false;
    }, 60);
    setDragState(null);
    if (cancelled || d.over === null || d.over === d.from) return;
    setSelection((sel) => {
      const next = [...sel];
      const [moved] = next.splice(d.from, 1);
      next.splice(Math.min(d.over, next.length), 0, moved);
      return next;
    });
    setNotice(null);
  }

  async function save() {
    setSaving(true);
    setNotice(null);
    try {
      const res = await fetch("/api/users/me/showcase", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cardIds: selection }),
      });
      if (!res.ok) throw new Error("save failed");
      setSaved(selection);
      setNotice("saved");
    } catch (e) {
      setNotice("error");
    } finally {
      setSaving(false);
    }
  }

  if (owned === null) return <div className="empty-state">{t.loading}</div>;

  return (
    <div className="showcase-editor">
      <h1 className="display-font showcase-editor-title">{t.showcaseTitleOwn}</h1>

      <div className="showcase-editor-main">
        <div className="showcase-editor-binder">
          <div className="showcase-editor-head">
            <span className="showcase-editor-label">{t.showcaseEditorPage}</span>
            <span className="showcase-editor-count">{t.showcaseFilled(cards.length)}</span>
          </div>

          <div className="binder-grid" ref={binderRef}>
            {Array.from({ length: SHOWCASE_SIZE }, (_, i) => {
              const card = byId.get(selection[i]);
              const isTarget = drag && drag.over === i && drag.from !== i;
              if (!card) {
                return (
                  <button
                    key={`vide-${i}`}
                    type="button"
                    data-slot={i}
                    className={`binder-slot empty${isTarget ? " drop-target" : ""}`}
                    aria-label={t.showcaseSlotEmpty(i + 1)}
                    onClick={focusPicker}
                  >
                    <Plus size={22} aria-hidden="true" />
                  </button>
                );
              }
              return (
                <button
                  key={card.id}
                  type="button"
                  data-slot={i}
                  className={`binder-slot filled${drag?.from === i ? " dragging" : ""}${isTarget ? " drop-target" : ""}`}
                  aria-label={t.showcaseSlot(i + 1, cardName(card, t))}
                  onClick={() => removeAt(i)}
                  onPointerDown={(e) => onPointerDown(e, i)}
                  onPointerMove={onPointerMove}
                  onPointerUp={(e) => endPress(e, false)}
                  onPointerCancel={(e) => endPress(e, true)}
                  onContextMenu={(e) => e.preventDefault()}
                >
                  <Thumb card={card} t={t} />
                </button>
              );
            })}
          </div>
          <p className="showcase-editor-hint">{t.showcaseHint}</p>
        </div>

        <div className="showcase-picker" ref={pickerRef}>
          <div className="showcase-editor-label">{t.showcasePickTitle}</div>
          <div className="showcase-search">
            <label htmlFor="cherche-classeur" className="visually-hidden">{t.showcaseSearch}</label>
            <Search size={18} aria-hidden="true" className="showcase-search-icon" />
            <input
              id="cherche-classeur"
              ref={searchRef}
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={t.showcaseSearchPlaceholder}
              autoComplete="off"
            />
          </div>
          {owned.length === 0 ? (
            <div className="empty-state">{t.showcaseNoOwned}</div>
          ) : filtered.length === 0 ? (
            <div className="empty-state">{t.showcaseNoResults}</div>
          ) : (
            <div className="picker-grid">
              {filtered.map((c) => {
                const pos = selection.indexOf(c.id);
                const selected = pos !== -1;
                return (
                  <button
                    key={c.id}
                    type="button"
                    className={`picker-card${selected ? " selected" : ""}`}
                    aria-pressed={selected}
                    aria-label={selected ? t.showcaseRemove(cardName(c, t)) : t.showcaseAdd(cardName(c, t))}
                    title={[cardName(c, t), c.collection?.nom].filter(Boolean).join(" · ")}
                    onClick={() => toggle(c.id)}
                  >
                    <Thumb card={c} t={t} />
                    {selected && <span className="picker-pos" aria-hidden="true">{pos + 1}</span>}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>

      <div className="showcase-editor-bar">
        <div className="showcase-editor-status" role="status" aria-live="polite">
          {notice === "saved" && (
            <span className="ok">
              {t.showcaseSaved}{" "}
              {me && <Link href={`/u/${me.username}`}>{t.showcaseSeeProfile}</Link>}
            </span>
          )}
          {notice === "error" && <span className="error">{t.showcaseSaveFailed}</span>}
          {notice === "full" && <span className="error">{t.showcaseFull}</span>}
          {!notice && dirty && <span>{t.showcaseUnsaved}</span>}
        </div>
        <div className="showcase-editor-buttons">
          <button type="button" className="btn-ghost" onClick={() => setPreview(true)} disabled={cards.length === 0}>
            {t.showcasePreview}
          </button>
          <button type="button" className="btn-primary" onClick={save} disabled={saving || !dirty}>
            {saving ? "…" : t.showcaseSave}
          </button>
        </div>
      </div>

      {preview && (
        <div className="showcase-preview-overlay" onClick={() => setPreview(false)}>
          <div className="showcase-preview" role="dialog" aria-modal="true" aria-label={t.showcasePreview} onClick={(e) => e.stopPropagation()}>
            <div className="showcase-head">
              <h2 className="display-font showcase-title">{t.showcaseTitleOwn}</h2>
              <button type="button" className="showcase-btn" aria-label={t.showcaseClosePreview} onClick={() => setPreview(false)}>
                <X size={18} aria-hidden="true" />
              </button>
            </div>
            <div className="showcase-binder">
              {Array.from({ length: SHOWCASE_SIZE }, (_, i) => cards[i] || null).map((c, i) =>
                c ? (
                  <span key={c.id} className="showcase-slot">
                    <Thumb card={c} t={t} />
                  </span>
                ) : (
                  <span key={`vide-${i}`} className="showcase-slot empty" aria-hidden="true" />
                )
              )}
            </div>
            {me && <p className="showcase-caption">{t.showcaseCaption(me.username, cards.length)}</p>}
          </div>
        </div>
      )}
    </div>
  );
}
