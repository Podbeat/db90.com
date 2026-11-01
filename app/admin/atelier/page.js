"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Upload, ImageOff, Plus, Pencil, X, Check } from "lucide-react";
import { uploadCardImage } from "@/lib/clientUpload";

// Atelier d'intégration : la grille d'une collection, numéro par numéro, avec les manques en
// évidence. On y dépose plusieurs scans d'un coup (rangés selon le numéro lu dans le nom du
// fichier : « 014.jpg », « carte-14.png »…) et on choisit le personnage directement.
const toNum = (n) => (/^\d+$/.test(String(n).trim()) ? String(parseInt(n, 10)) : String(n).trim());
const numFromFile = (name) => {
  const groups = name.replace(/\.[a-z0-9]+$/i, "").match(/\d+/g);
  return groups ? String(parseInt(groups[groups.length - 1], 10)) : "";
};

// Cible proposée pour un scan : la première carte du numéro encore sans visuel, sinon la
// première carte du numéro (le scan remplacera son visuel), sinon une nouvelle carte.
function defaultTarget(cards, numero) {
  const same = cards.filter((c) => toNum(c.numero) === numero);
  return (same.find((c) => !c.image) || same[0])?.id || "new";
}

function Tile({ card, characters, onCharacter }) {
  return (
    <div className={`atl-tile${card.image ? "" : " no-scan"}${card.personnagePrincipalId ? "" : " no-char"}`}>
      <div className="atl-thumb">
        {card.image ? <img src={card.image} alt="" loading="lazy" /> : <span><ImageOff size={20} aria-hidden="true" /> sans scan</span>}
        <span className="atl-num">n°{card.numero}</span>
      </div>
      <div className="atl-tile-body">
        {card.rarete && <span className="atl-rarete">{card.rarete}</span>}
        <select value={card.personnagePrincipalId || ""} onChange={(e) => onCharacter(card, e.target.value)} aria-label={`Personnage de la carte n°${card.numero}`}>
          <option value="">— Personnage ? —</option>
          {characters.map((ch) => <option key={ch.id} value={ch.id}>{ch.name}</option>)}
        </select>
        <Link href={`/admin/cartes?modifier=${card.id}`} className="atl-edit"><Pencil size={13} aria-hidden="true" /> Modifier</Link>
      </div>
    </div>
  );
}

function EmptySlot({ numero, collectionId }) {
  return (
    <Link href={`/admin/cartes?nouvelle=1&collection=${collectionId}&numero=${encodeURIComponent(numero)}`} className="atl-tile empty">
      <div className="atl-thumb"><span><Plus size={20} aria-hidden="true" /> à créer</span><span className="atl-num">n°{numero}</span></div>
    </Link>
  );
}

function DropRows({ rows, cards, onChange, onRemove }) {
  return (
    <ul className="atl-drops">
      {rows.map((r, i) => {
        const same = cards.filter((c) => toNum(c.numero) === r.numero);
        const target = same.find((c) => c.id === r.target);
        return (
          <li key={r.key} className={r.state || ""}>
            <img src={r.preview} alt="" className="atl-drop-img" />
            <span className="atl-drop-name" title={r.file.name}>{r.file.name}</span>
            <label className="atl-drop-num">n°
              <input value={r.numero} onChange={(e) => onChange(i, { numero: toNum(e.target.value), target: defaultTarget(cards, toNum(e.target.value)) })} aria-label={`Numéro pour ${r.file.name}`} />
            </label>
            <select value={r.target} onChange={(e) => onChange(i, { target: e.target.value })} aria-label={`Destination de ${r.file.name}`}>
              {same.map((c) => <option key={c.id} value={c.id}>{`n°${c.numero} ${c.rarete || ""}${c.image ? " (remplacer le scan)" : " (sans scan)"}`}</option>)}
              <option value="new">{same.length ? "Nouvelle variante" : "Nouvelle carte"}</option>
            </select>
            <span className="atl-drop-state">
              {r.state === "done" ? <Check size={16} aria-hidden="true" /> : r.state === "error" ? "échec" : target?.image ? "remplace" : ""}
            </span>
            <button type="button" className="btn-icon" onClick={() => onRemove(i)} aria-label={`Retirer ${r.file.name}`}><X size={14} /></button>
          </li>
        );
      })}
    </ul>
  );
}

export default function WorkshopPage() {
  const [collections, setCollections] = useState([]);
  const [characters, setCharacters] = useState([]);
  const [collectionId, setCollectionId] = useState("");
  const [cards, setCards] = useState(null);
  const [onlyGaps, setOnlyGaps] = useState(false);
  const [rows, setRows] = useState([]);
  const [watermark, setWatermark] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState(null);
  const [dragOver, setDragOver] = useState(false);

  useEffect(() => {
    fetch("/api/collections?fresh=1").then((r) => (r.ok ? r.json() : [])).then((list) => {
      const arr = Array.isArray(list) ? list : [];
      setCollections(arr);
      const wanted = new URLSearchParams(window.location.search).get("collection");
      setCollectionId(arr.some((c) => c.id === wanted) ? wanted : arr[0]?.id || "");
    }).catch(() => {});
    fetch("/api/admin/characters").then((r) => (r.ok ? r.json() : [])).then((l) => setCharacters(Array.isArray(l) ? l : [])).catch(() => {});
  }, []);

  const loadCards = useCallback(async (id) => {
    if (!id) return;
    const data = await fetch(`/api/cards?collectionId=${id}&pageSize=500&fresh=1`).then((r) => (r.ok ? r.json() : null)).catch(() => null);
    setCards(data?.cards || []);
  }, []);

  useEffect(() => {
    setCards(null);
    setRows([]);
    setMessage(null);
    loadCards(collectionId);
  }, [collectionId, loadCards]);

  const collection = collections.find((c) => c.id === collectionId);

  // Cases de la grille : 1 → total (ou plus grand numéro connu), puis les numéros non numériques.
  const grid = useMemo(() => {
    if (!cards) return null;
    const byNum = new Map();
    for (const c of cards) {
      const k = toNum(c.numero);
      if (!byNum.has(k)) byNum.set(k, []);
      byNum.get(k).push(c);
    }
    const numeric = [...byNum.keys()].filter((k) => /^\d+$/.test(k)).map(Number);
    const max = Math.max(collection?.total || 0, ...numeric, 0);
    const slots = Array.from({ length: max }, (_, i) => ({ numero: String(i + 1), cards: byNum.get(String(i + 1)) || [] }));
    const others = [...byNum.keys()].filter((k) => !/^\d+$/.test(k) || Number(k) > max || Number(k) < 1).sort().map((k) => ({ numero: k, cards: byNum.get(k) }));
    const all = [...slots, ...others];
    return {
      slots: all,
      missing: all.filter((s) => s.cards.length === 0).length,
      noScan: cards.filter((c) => !c.image).length,
      noChar: cards.filter((c) => !c.personnagePrincipalId).length,
      refs: byNum.size,
    };
  }, [cards, collection]);

  function addFiles(fileList) {
    const files = Array.from(fileList || []).filter((f) => f.type.startsWith("image/"));
    if (!files.length || !cards) return;
    setMessage(null);
    setRows((prev) => [
      ...prev,
      ...files.map((file, i) => {
        const numero = numFromFile(file.name);
        return { key: `${Date.now()}-${i}-${file.name}`, file, preview: URL.createObjectURL(file), numero, target: defaultTarget(cards, numero) };
      }),
    ]);
  }
  const updateRow = (i, patch) => setRows((prev) => prev.map((r, j) => (j === i ? { ...r, ...patch } : r)));
  const removeRow = (i) => setRows((prev) => prev.filter((_, j) => j !== i));

  async function integrate() {
    const todo = rows.filter((r) => r.state !== "done" && r.numero);
    if (!todo.length) return;
    setBusy(true);
    let ok = 0;
    for (let i = 0; i < rows.length; i++) {
      const r = rows[i];
      if (r.state === "done" || !r.numero) continue;
      setMessage({ type: "info", text: `Intégration ${ok + 1} / ${todo.length} : ${r.file.name}…` });
      try {
        const up = await uploadCardImage(r.file, { watermark });
        const res = r.target === "new"
          ? await fetch("/api/cards", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ collectionId, numero: r.numero, image: up.url, imageHD: up.hdUrl }) })
          : await fetch(`/api/admin/cards/${r.target}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ image: up.url, imageHD: up.hdUrl }) });
        if (!res.ok) throw new Error("save");
        ok += 1;
        updateRow(i, { state: "done" });
      } catch (e) {
        updateRow(i, { state: "error" });
      }
    }
    setBusy(false);
    setMessage({ type: ok === todo.length ? "success" : "error", text: `${ok} scan${ok > 1 ? "s" : ""} intégré${ok > 1 ? "s" : ""} sur ${todo.length}.` });
    await loadCards(collectionId);
    setRows((prev) => prev.filter((r) => r.state !== "done"));
  }

  async function setCharacter(card, characterId) {
    setCards((prev) => prev.map((c) => (c.id === card.id ? { ...c, personnagePrincipalId: characterId || null } : c)));
    const res = await fetch(`/api/admin/cards/${card.id}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ personnagePrincipalId: characterId || null }),
    }).catch(() => null);
    if (!res?.ok) {
      setMessage({ type: "error", text: `Le personnage de la carte n°${card.numero} n'a pas été enregistré.` });
      loadCards(collectionId);
    }
  }

  const visible = grid ? grid.slots.filter((s) => !onlyGaps || s.cards.length === 0 || s.cards.some((c) => !c.image || !c.personnagePrincipalId)) : [];
  return (
    <div className="adm-page">
      <header className="adm-page-head">
        <div>
          <h1 className="display-font adm-page-title">Atelier d'intégration</h1>
          <p className="adm-page-sub">Repère les manques d'une collection, dépose plusieurs scans d'un coup et choisis les personnages.</p>
        </div>
        <select className="mem-sort atl-collection" value={collectionId} onChange={(e) => setCollectionId(e.target.value)} aria-label="Collection">
          {collections.map((c) => <option key={c.id} value={c.id}>{c.nom}</option>)}
        </select>
      </header>
      {grid && (
        <div className="atl-stats">
          <div className="atl-stat"><span className="display-font">{grid.refs}{collection?.total ? ` / ${collection.total}` : ""}</span><span>références{collection?.total ? "" : " (total inconnu)"}</span></div>
          <div className={`atl-stat${grid.missing ? " warn" : ""}`}><span className="display-font">{grid.missing}</span><span>numéros manquants</span></div>
          <div className={`atl-stat${grid.noScan ? " warn" : ""}`}><span className="display-font">{grid.noScan}</span><span>cartes sans scan</span></div>
          <div className={`atl-stat${grid.noChar ? " warn" : ""}`}><span className="display-font">{grid.noChar}</span><span>sans personnage</span></div>
        </div>
      )}

      <section className={`atl-drop${dragOver ? " over" : ""}`}
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => { e.preventDefault(); setDragOver(false); addFiles(e.dataTransfer.files); }}>
        <Upload size={26} aria-hidden="true" />
        <div className="atl-drop-text">
          <strong>Dépose ici les scans de la collection</strong>
          <span>Le numéro est lu dans le nom du fichier (« 014.jpg » → n°14). Tu peux le corriger avant d'intégrer.</span>
        </div>
        <label className="btn-ghost mem-btn">
          Choisir des fichiers
          <input type="file" accept="image/*" multiple className="visually-hidden" onChange={(e) => { addFiles(e.target.files); e.target.value = ""; }} />
        </label>
      </section>

      {rows.length > 0 && cards && (
        <section className="adm-panel">
          <div className="adm-panel-head">
            <h2 className="adm-panel-title display-font">{rows.length} scan{rows.length > 1 ? "s" : ""} à intégrer</h2>
            <label className="atl-option"><input type="checkbox" checked={watermark} onChange={(e) => setWatermark(e.target.checked)} /> Ajouter le filigrane</label>
          </div>
          <DropRows rows={rows} cards={cards} onChange={updateRow} onRemove={removeRow} />
          <div className="mem-actions" style={{ marginTop: "0.75rem" }}>
            <button type="button" className="btn-primary mem-btn" disabled={busy} onClick={integrate}><Upload size={15} aria-hidden="true" /> Intégrer les scans</button>
            <button type="button" className="btn-ghost mem-btn" disabled={busy} onClick={() => setRows([])}>Tout retirer</button>
          </div>
        </section>
      )}
      {message && <div className={`toast ${message.type === "info" ? "" : message.type}`}>{message.text}</div>}

      <div className="atl-gridhead">
        <h2 className="adm-panel-title display-font">{collection?.nom || "Collection"}</h2>
        <label className="atl-option"><input type="checkbox" checked={onlyGaps} onChange={(e) => setOnlyGaps(e.target.checked)} /> Seulement ce qui manque</label>
      </div>
      {!grid ? (
        <div className="empty-state">Chargement…</div>
      ) : visible.length === 0 ? (
        <div className="adm-muted">{onlyGaps ? "Rien ne manque dans cette collection." : "Aucune carte dans cette collection."}</div>
      ) : (
        <div className="atl-grid">
          {visible.map((s) =>
            s.cards.length === 0
              ? <EmptySlot key={`vide-${s.numero}`} numero={s.numero} collectionId={collectionId} />
              : s.cards.map((c) => <Tile key={c.id} card={c} characters={characters} onCharacter={setCharacter} />)
          )}
        </div>
      )}
    </div>
  );
}
