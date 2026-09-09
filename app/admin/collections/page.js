"use client";

import { useEffect, useRef, useState } from "react";
import { Plus, Pencil, Trash2, Upload } from "lucide-react";

function emptyForm() {
  return { id: null, nom: "", annee: "", editeur: "", pays: "", total: "", dos: null, dosHD: null };
}

export default function AdminCollectionsPage() {
  const [collections, setCollections] = useState([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [message, setMessage] = useState(null);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef(null);

  async function load() {
    setLoading(true);
    const res = await fetch("/api/collections");
    setCollections(await res.json());
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  async function handleDosFile(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/upload", { method: "POST", body: fd });
      const data = await res.json();
      if (res.ok) {
        setForm((f) => ({ ...f, dos: data.url, dosHD: data.hdUrl }));
      } else {
        setMessage({ type: "error", text: data.error || "Échec de l'import de l'image." });
      }
    } catch (e) {
      setMessage({ type: "error", text: "Échec de l'import de l'image." });
    } finally {
      setUploading(false);
    }
  }

  async function handleSave(e) {
    e.preventDefault();
    const method = form.id ? "PUT" : "POST";
    const url = form.id ? `/api/collections/${form.id}` : "/api/collections";
    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    if (res.ok) {
      setForm(null);
      setMessage({ type: "success", text: "Collection enregistrée." });
      load();
    } else {
      const data = await res.json();
      setMessage({ type: "error", text: data.error || "Échec de l'enregistrement." });
    }
  }

  async function handleDelete(id) {
    const res = await fetch(`/api/collections/${id}`, { method: "DELETE" });
    if (res.ok) {
      setConfirmDelete(null);
      load();
    }
  }

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
        <div style={{ fontSize: "0.85rem", color: "var(--text-muted)" }}>{collections.length} collection(s)</div>
        <button className="btn-primary" style={{ display: "flex", alignItems: "center", gap: "0.35rem" }} onClick={() => setForm(emptyForm())}>
          <Plus size={14} /> Ajouter une collection
        </button>
      </div>

      {message && <div className={`toast ${message.type}`}>{message.text}</div>}

      {form && (
        <form onSubmit={handleSave} className="form-panel" style={{ marginBottom: "1.5rem" }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0 1rem" }}>
            <div className="field">
              <span className="field-label">Nom de la collection</span>
              <input value={form.nom} onChange={(e) => setForm({ ...form, nom: e.target.value })} required />
            </div>
            <div className="field">
              <span className="field-label">Éditeur (optionnel)</span>
              <input value={form.editeur} onChange={(e) => setForm({ ...form, editeur: e.target.value })} />
            </div>
            <div className="field">
              <span className="field-label">Pays / origine</span>
              <input value={form.pays} onChange={(e) => setForm({ ...form, pays: e.target.value })} />
            </div>
            <div className="field">
              <span className="field-label">Année</span>
              <input value={form.annee} onChange={(e) => setForm({ ...form, annee: e.target.value })} />
            </div>
            <div className="field">
              <span className="field-label">Nombre total de cartes connu (laisser vide si inconnu)</span>
              <input type="number" value={form.total} onChange={(e) => setForm({ ...form, total: e.target.value })} />
            </div>
          </div>

          <div className="field">
            <span className="field-label">Visuel du dos (partagé par toute la série, si identique)</span>
            <div className="upload-zone" onClick={() => fileRef.current?.click()}>
              <Upload size={16} style={{ margin: "0 auto 0.3rem" }} />
              {uploading ? "Envoi en cours…" : form.dos ? "Remplacer le visuel du dos" : "Cliquer pour importer le scan du dos"}
              <input ref={fileRef} type="file" accept="image/*" onChange={handleDosFile} style={{ display: "none" }} />
            </div>
            {form.dos && <img src={form.dos} alt="" style={{ width: 90, marginTop: "0.6rem" }} />}
          </div>

          <div style={{ display: "flex", gap: "0.5rem", justifyContent: "flex-end" }}>
            <button type="button" className="btn-ghost" onClick={() => setForm(null)}>Annuler</button>
            <button type="submit" className="btn-primary" disabled={uploading}>Enregistrer</button>
          </div>
        </form>
      )}

      {loading ? (
        <div className="empty-state">Chargement…</div>
      ) : (
        <div style={{ overflowX: "auto" }}>
          <table className="admin-table">
            <thead>
              <tr><th></th><th>Nom</th><th>Origine</th><th>Année</th><th>Total connu</th><th>Archivées</th><th></th></tr>
            </thead>
            <tbody>
              {collections.map((col) => (
                <tr key={col.id}>
                  <td>{col.dos && <img src={col.dos} alt="" style={{ width: 28, height: 40, objectFit: "cover" }} />}</td>
                  <td>{col.nom}</td>
                  <td>{col.pays || "—"}</td>
                  <td>{col.annee || "—"}</td>
                  <td>{col.total || "En cours de complétion"}</td>
                  <td>{col._count?.cards ?? "—"}</td>
                  <td>
                    <div style={{ display: "flex", gap: "0.4rem" }}>
                      <button className="btn-icon" onClick={() => setForm({ ...col, total: col.total || "" })}><Pencil size={13} /></button>
                      <button className="btn-icon" onClick={() => setConfirmDelete(col)}><Trash2 size={13} /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {confirmDelete && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(10,8,5,0.78)", display: "flex", alignItems: "center", justifyContent: "center", padding: "1rem" }} onClick={() => setConfirmDelete(null)}>
          <div className="form-panel" style={{ maxWidth: 380 }} onClick={(e) => e.stopPropagation()}>
            <p style={{ fontSize: "0.9rem", marginTop: 0 }}>
              Supprimer « {confirmDelete.nom} » ? Toutes les cartes de cette collection seront supprimées aussi.
            </p>
            <div style={{ display: "flex", gap: "0.5rem", justifyContent: "flex-end" }}>
              <button className="btn-ghost" onClick={() => setConfirmDelete(null)}>Annuler</button>
              <button className="btn-danger" onClick={() => handleDelete(confirmDelete.id)}>Supprimer</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
