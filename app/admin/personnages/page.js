"use client";

import { useEffect, useState } from "react";
import { Plus, Pencil, Trash2, Check, X, Merge } from "lucide-react";

export default function AdminCharactersPage() {
  const [characters, setCharacters] = useState([]);
  const [loading, setLoading] = useState(true);
  const [newName, setNewName] = useState("");
  const [message, setMessage] = useState(null);
  const [editingId, setEditingId] = useState(null);
  const [editingName, setEditingName] = useState("");
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [mergeSource, setMergeSource] = useState(null);
  const [mergeTargetId, setMergeTargetId] = useState("");

  // Ferme la modale de confirmation ouverte au clavier, en plus du clic sur le fond.
  useEffect(() => {
    if (!confirmDelete && !mergeSource) return;
    function handleKeyDown(e) {
      if (e.key !== "Escape") return;
      if (confirmDelete) setConfirmDelete(null);
      else setMergeSource(null);
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [confirmDelete, mergeSource]);

  async function load() {
    setLoading(true);
    const res = await fetch("/api/admin/characters");
    setCharacters(await res.json());
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  async function handleAdd(e) {
    e.preventDefault();
    const name = newName.trim();
    if (!name) return;
    const res = await fetch("/api/admin/characters", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name }),
    });
    const data = await res.json();
    if (res.ok) {
      setNewName("");
      load();
    } else {
      setMessage({ type: "error", text: data.error });
    }
  }

  function startEdit(ch) {
    setEditingId(ch.id);
    setEditingName(ch.name);
  }

  async function saveEdit(id) {
    const name = editingName.trim();
    if (!name) return;
    const res = await fetch(`/api/admin/characters/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name }),
    });
    const data = await res.json();
    if (res.ok) {
      setEditingId(null);
      load();
    } else {
      setMessage({ type: "error", text: data.error });
    }
  }

  async function handleDelete(id) {
    await fetch(`/api/admin/characters/${id}`, { method: "DELETE" });
    setConfirmDelete(null);
    load();
  }

  async function handleMerge() {
    if (!mergeTargetId) return;
    const res = await fetch(`/api/admin/characters/${mergeSource.id}/merge`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ targetId: mergeTargetId }),
    });
    const data = await res.json();
    if (res.ok) {
      setMergeSource(null);
      setMergeTargetId("");
      load();
    } else {
      setMessage({ type: "error", text: data.error });
    }
  }

  return (
    <div>
      <h1 className="display-font" style={{ fontSize: "1.2rem", marginBottom: "1rem" }}>Personnages</h1>
      <p style={{ fontSize: "0.8rem", color: "var(--text-muted)", marginBottom: "1rem" }}>
        Liste utilisée pour le menu déroulant "Personnage principal" et les personnages secondaires sur les cartes.
        Supprimer un personnage déjà utilisé le retire des cartes concernées (repassent à "à définir plus tard").
      </p>

      {message && <div className={`toast ${message.type}`}>{message.text}</div>}

      <form onSubmit={handleAdd} className="form-panel" style={{ marginBottom: "1.5rem", display: "flex", gap: "0.5rem", alignItems: "flex-end", maxWidth: 420 }}>
        <div className="field" style={{ flex: 1, margin: 0 }}>
          <span className="field-label">Nouveau personnage</span>
          <input value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="ex. Son Goku" />
        </div>
        <button className="btn-primary" type="submit" style={{ display: "flex", alignItems: "center", gap: "0.3rem" }}>
          <Plus size={14} /> Ajouter
        </button>
      </form>

      {loading ? (
        <div className="empty-state">Chargement…</div>
      ) : (
        <table className="admin-table">
          <thead>
            <tr>
              <th>Nom</th>
              <th>Cartes (principal)</th>
              <th>Cartes (secondaire)</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {characters.map((ch) => (
              <tr key={ch.id}>
                <td>
                  {editingId === ch.id ? (
                    <input value={editingName} onChange={(e) => setEditingName(e.target.value)} style={{ fontSize: "0.85rem" }} />
                  ) : (
                    ch.name
                  )}
                </td>
                <td>{ch._count.primaryCards}</td>
                <td>{ch._count.secondaryCards}</td>
                <td>
                  <div style={{ display: "flex", gap: "0.4rem" }}>
                    {editingId === ch.id ? (
                      <>
                        <button className="btn-icon" onClick={() => saveEdit(ch.id)}><Check size={13} /></button>
                        <button className="btn-icon" onClick={() => setEditingId(null)}><X size={13} /></button>
                      </>
                    ) : (
                      <>
                        <button className="btn-icon" onClick={() => startEdit(ch)}><Pencil size={13} /></button>
                        <button className="btn-icon" onClick={() => setMergeSource(ch)} title="Fusionner dans un autre personnage"><Merge size={13} /></button>
                        <button className="btn-icon" onClick={() => setConfirmDelete(ch)}><Trash2 size={13} /></button>
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
        <div style={{ position: "fixed", inset: 0, background: "rgba(10,8,5,0.78)", display: "flex", alignItems: "center", justifyContent: "center", padding: "1rem" }} onClick={() => setConfirmDelete(null)}>
          <div className="form-panel" style={{ maxWidth: 380 }} onClick={(e) => e.stopPropagation()}>
            <p style={{ fontSize: "0.9rem", marginTop: 0 }}>
              Supprimer « {confirmDelete.name} » ?
              {(confirmDelete._count.primaryCards + confirmDelete._count.secondaryCards) > 0 && (
                <> Utilisé sur {confirmDelete._count.primaryCards + confirmDelete._count.secondaryCards} carte(s) — elles repasseront à "à définir plus tard".</>
              )}
            </p>
            <div style={{ display: "flex", gap: "0.5rem", justifyContent: "flex-end" }}>
              <button className="btn-ghost" onClick={() => setConfirmDelete(null)}>Annuler</button>
              <button className="btn-danger" onClick={() => handleDelete(confirmDelete.id)}>Supprimer</button>
            </div>
          </div>
        </div>
      )}
      {mergeSource && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(10,8,5,0.78)", display: "flex", alignItems: "center", justifyContent: "center", padding: "1rem" }} onClick={() => setMergeSource(null)}>
          <div className="form-panel" style={{ maxWidth: 400 }} onClick={(e) => e.stopPropagation()}>
            <p style={{ fontSize: "0.9rem", marginTop: 0 }}>
              Fusionner « {mergeSource.name} » dans un autre personnage — toutes ses cartes (principal et secondaire)
              basculent sur la cible, puis « {mergeSource.name} » est supprimé. Utile pour corriger un doublon créé par une faute de frappe.
            </p>
            <div className="field">
              <span className="field-label">Fusionner vers</span>
              <select value={mergeTargetId} onChange={(e) => setMergeTargetId(e.target.value)}>
                <option value="">— Choisir —</option>
                {characters.filter((c) => c.id !== mergeSource.id).map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
            <div style={{ display: "flex", gap: "0.5rem", justifyContent: "flex-end" }}>
              <button className="btn-ghost" onClick={() => setMergeSource(null)}>Annuler</button>
              <button className="btn-primary" onClick={handleMerge} disabled={!mergeTargetId}>Fusionner</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
