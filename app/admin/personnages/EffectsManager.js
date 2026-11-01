"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Plus, Pencil, Trash2, Merge, Check, X } from "lucide-react";
import { effectKey } from "@/lib/effectKey";

// Liste des effets / prismes proposés dans les menus déroulants (membres, Cartes, Atelier).
// Renommer ou fusionner un effet met à jour toutes les cartes qui l'utilisent ; les doublons
// probables (même nom à un accent, une majuscule ou un pluriel près) sont signalés en tête.
export default function EffectsManager({ onSummary }) {
  const [data, setData] = useState(null);
  const [newName, setNewName] = useState("");
  const [editing, setEditing] = useState(null); // { id, name }
  const [mergeSource, setMergeSource] = useState(null);
  const [mergeTargetId, setMergeTargetId] = useState("");
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [message, setMessage] = useState(null);
  const [busy, setBusy] = useState(false);

  async function load() {
    const res = await fetch("/api/admin/effects", { cache: "no-store" }).catch(() => null);
    setData(res?.ok ? await res.json() : { effects: [], unlisted: [], toDefine: 0 });
  }
  useEffect(() => {
    load();
  }, []);

  async function call(url, method, body) {
    const res = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: body ? JSON.stringify(body) : undefined }).catch(() => null);
    const json = res ? await res.json().catch(() => ({})) : {};
    if (!res?.ok) throw new Error(json.error || "Erreur, réessayez.");
    return json;
  }

  async function run(action, success) {
    setBusy(true);
    setMessage(null);
    try {
      await action();
      if (success) setMessage({ type: "success", text: success });
    } catch (e) {
      setMessage({ type: "error", text: e.message });
    } finally {
      setBusy(false);
      load();
    }
  }

  const add = (name) => run(() => call("/api/admin/effects", "POST", { name }), `« ${name} » ajouté à la liste.`);
  const rename = () => run(() => call(`/api/admin/effects/${editing.id}`, "PATCH", { name: editing.name }), "Effet renommé sur toutes ses cartes.").then(() => setEditing(null));
  const remove = (effect) => run(() => call(`/api/admin/effects/${effect.id}`, "DELETE"), `« ${effect.name} » supprimé.`).then(() => setConfirmDelete(null));
  const merge = (source, target) => call(`/api/admin/effects/${source.id}/merge`, "POST", { targetId: target.id });
  // Doublon : on garde un nom, les autres y sont fusionnés.
  const keep = (group, kept) =>
    run(async () => {
      for (const e of group) if (e.id !== kept.id) await merge(e, kept);
    }, `Doublons fusionnés dans « ${kept.name} ».`);

  const effects = data?.effects || [];
  const duplicates = useMemo(() => {
    const groups = new Map();
    for (const e of effects) {
      const k = effectKey(e.name);
      if (!groups.has(k)) groups.set(k, []);
      groups.get(k).push(e);
    }
    return [...groups.values()].filter((g) => g.length > 1);
  }, [effects]);

  // Nombre d'effets et de doublons, affichés sur l'onglet de la page.
  useEffect(() => {
    if (data) onSummary?.({ count: effects.length, duplicates: duplicates.length });
  }, [data, effects.length, duplicates.length, onSummary]);

  return (
    <section className="eff-section" aria-label="Effets / prismes">
      <p className="eff-intro">
        Liste proposée dans les menus déroulants : envoi de scans par les membres, onglet Cartes et Atelier d'intégration.
        Renommer ou fusionner un effet met à jour toutes les cartes qui l'utilisent. Les imports en masse arrivent avec un
        effet « à définir », à choisir ensuite dans cette liste.
      </p>

      {message && <div className={`toast ${message.type}`}>{message.text}</div>}

      {duplicates.length > 0 && (
        <div className="eff-dupes">
          <div className="eff-dupes-title">Doublons probables : choisissez le nom à garder, les autres y seront fusionnés</div>
          {duplicates.map((g) => (
            <div key={g.map((e) => e.id).join("-")} className="eff-dupe">
              {g.map((e) => (
                <button key={e.id} type="button" className="btn-ghost eff-keep" disabled={busy} onClick={() => keep(g, e)}>
                  Garder « {e.name} » <span>{e.cards} carte{e.cards > 1 ? "s" : ""}</span>
                </button>
              ))}
            </div>
          ))}
        </div>
      )}

      {(data?.unlisted?.length > 0 || data?.toDefine > 0) && (
        <div className="eff-notes">
          {data.unlisted.map((u) => (
            <div key={u.name}>
              « {u.name} » est utilisé sur {u.cards} carte{u.cards > 1 ? "s" : ""} mais n'est pas dans la liste.{" "}
              <button type="button" className="lb-link-btn" disabled={busy} onClick={() => add(u.name)}>Ajouter à la liste</button>
            </div>
          ))}
          {data.toDefine > 0 && (
            <div>
              {data.toDefine} carte{data.toDefine > 1 ? "s ont" : " a"} un effet à définir.{" "}
              <Link href="/admin/atelier" className="lb-link-btn">Les compléter dans l'Atelier</Link>
            </div>
          )}
        </div>
      )}

      <form
        className="form-panel eff-add"
        onSubmit={(e) => {
          e.preventDefault();
          if (newName.trim()) add(newName.trim()).then(() => setNewName(""));
        }}
      >
        <div className="field" style={{ flex: 1, margin: 0 }}>
          <span className="field-label">Nouvel effet</span>
          <input value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="ex. Feu d'artifice" maxLength={60} />
        </div>
        <button className="btn-primary" type="submit" disabled={busy || !newName.trim()} style={{ display: "flex", alignItems: "center", gap: "0.3rem" }}>
          <Plus size={14} /> Ajouter
        </button>
      </form>

      {!data ? (
        <div className="empty-state">Chargement…</div>
      ) : (
        <table className="admin-table">
          <thead>
            <tr>
              <th>Effet</th>
              <th>Cartes</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {effects.map((e) => (
              <tr key={e.id}>
                <td>
                  {editing?.id === e.id ? (
                    <input value={editing.name} onChange={(ev) => setEditing({ ...editing, name: ev.target.value })} style={{ fontSize: "0.85rem" }} maxLength={60} />
                  ) : (
                    e.name
                  )}
                </td>
                <td>{e.cards}</td>
                <td>
                  <div style={{ display: "flex", gap: "0.4rem" }}>
                    {editing?.id === e.id ? (
                      <>
                        <button className="btn-icon" onClick={rename} disabled={busy} aria-label="Enregistrer"><Check size={13} /></button>
                        <button className="btn-icon" onClick={() => setEditing(null)} aria-label="Annuler"><X size={13} /></button>
                      </>
                    ) : (
                      <>
                        <button className="btn-icon" onClick={() => setEditing({ id: e.id, name: e.name })} title="Renommer"><Pencil size={13} /></button>
                        <button className="btn-icon" onClick={() => { setMergeSource(e); setMergeTargetId(""); }} title="Fusionner dans un autre effet"><Merge size={13} /></button>
                        <button className="btn-icon" onClick={() => setConfirmDelete(e)} title="Supprimer"><Trash2 size={13} /></button>
                      </>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {confirmDelete && (
        <div className="eff-overlay" onClick={() => setConfirmDelete(null)}>
          <div className="form-panel" style={{ maxWidth: 380 }} onClick={(e) => e.stopPropagation()}>
            <p style={{ fontSize: "0.9rem", marginTop: 0 }}>
              Supprimer « {confirmDelete.name} » ?
              {confirmDelete.cards > 0 && <> Ses {confirmDelete.cards} carte(s) repasseront à « effet à définir ».</>}
            </p>
            <div style={{ display: "flex", gap: "0.5rem", justifyContent: "flex-end" }}>
              <button className="btn-ghost" onClick={() => setConfirmDelete(null)}>Annuler</button>
              <button className="btn-danger" disabled={busy} onClick={() => remove(confirmDelete)}>Supprimer</button>
            </div>
          </div>
        </div>
      )}
      {mergeSource && (
        <div className="eff-overlay" onClick={() => setMergeSource(null)}>
          <div className="form-panel" style={{ maxWidth: 400 }} onClick={(e) => e.stopPropagation()}>
            <p style={{ fontSize: "0.9rem", marginTop: 0 }}>
              Fusionner « {mergeSource.name} » dans un autre effet : ses {mergeSource.cards} carte(s) passent sur la cible, puis
              « {mergeSource.name} » est supprimé de la liste.
            </p>
            <div className="field">
              <span className="field-label">Fusionner vers</span>
              <select value={mergeTargetId} onChange={(e) => setMergeTargetId(e.target.value)}>
                <option value="">— Choisir —</option>
                {effects.filter((e) => e.id !== mergeSource.id).map((e) => (
                  <option key={e.id} value={e.id}>{e.name}</option>
                ))}
              </select>
            </div>
            <div style={{ display: "flex", gap: "0.5rem", justifyContent: "flex-end" }}>
              <button className="btn-ghost" onClick={() => setMergeSource(null)}>Annuler</button>
              <button
                className="btn-primary"
                disabled={!mergeTargetId || busy}
                onClick={() => {
                  const target = effects.find((e) => e.id === mergeTargetId);
                  run(() => merge(mergeSource, target), `« ${mergeSource.name} » fusionné dans « ${target.name} ».`).then(() => setMergeSource(null));
                }}
              >
                Fusionner
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
