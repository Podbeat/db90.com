"use client";

import { useEffect, useRef, useState } from "react";
import { Plus, Pencil, Trash2, Upload, Copy } from "lucide-react";

function emptyForm(defaultCollectionId) {
  return {
    id: null,
    collectionId: defaultCollectionId || "",
    numero: "",
    personnage: "",
    rarete: "",
    description: "",
    image: null,
    imageHD: null,
    dos: null,
    dosHD: null,
  };
}

export default function AdminCardsPage() {
  const [collections, setCollections] = useState([]);
  const [cards, setCards] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [message, setMessage] = useState(null);
  const [applyWatermark, setApplyWatermark] = useState(false);
  const [applyWatermarkDos, setApplyWatermarkDos] = useState(false);
  const fileRef = useRef(null);
  const dosFileRef = useRef(null);
  const [uploading, setUploading] = useState(false);
  const [uploadingDos, setUploadingDos] = useState(false);

  async function loadCollections() {
    const res = await fetch("/api/collections");
    setCollections(await res.json());
  }

  async function loadCards(p = page) {
    setLoading(true);
    const res = await fetch(`/api/cards?page=${p}&pageSize=30`);
    const data = await res.json();
    setCards(data.cards || []);
    setTotal(data.total || 0);
    setTotalPages(data.totalPages || 1);
    setLoading(false);
  }

  useEffect(() => {
    loadCollections();
    loadCards(1);
  }, []);

  function collectionName(id) {
    return collections.find((c) => c.id === id)?.nom || "—";
  }

  async function handleFile(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("watermark", applyWatermark ? "true" : "false");
      const res = await fetch("/api/upload", { method: "POST", body: fd });
      const data = await res.json();
      if (res.ok) {
        setForm((f) => ({ ...f, image: data.url, imageHD: data.hdUrl }));
      } else {
        setMessage({ type: "error", text: data.error || "Échec de l'import de l'image." });
      }
    } catch (e) {
      setMessage({ type: "error", text: "Échec de l'import de l'image." });
    } finally {
      setUploading(false);
    }
  }

  async function handleDosFile(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingDos(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("watermark", applyWatermarkDos ? "true" : "false");
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
      setUploadingDos(false);
    }
  }

  async function handleSave(e) {
    e.preventDefault();
    const method = form.id ? "PUT" : "POST";
    const url = form.id ? `/api/cards/${form.id}` : "/api/cards";
    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    if (res.ok) {
      setForm(null);
      setMessage({ type: "success", text: "Carte enregistrée." });
      loadCards(page);
    } else {
      const data = await res.json();
      setMessage({ type: "error", text: data.error || "Échec de l'enregistrement." });
    }
  }

  async function handleDelete(id) {
    const res = await fetch(`/api/cards/${id}`, { method: "DELETE" });
    if (res.ok) {
      setConfirmDelete(null);
      loadCards(page);
    }
  }

  function goToPage(p) {
    setPage(p);
    loadCards(p);
  }

  // Pré-remplit collection / référence / personnage à partir d'une carte existante,
  // pour ajouter rapidement un autre effet (variante) de la même carte physique.
  function handleDuplicate(c) {
    setForm({
      id: null,
      collectionId: c.collectionId,
      numero: c.numero,
      personnage: c.personnage,
      rarete: "",
      description: "",
      image: null,
      imageHD: null,
      dos: null,
      dosHD: null,
    });
    setMessage({ type: "success", text: "Référence et personnage repris — précisez la nouvelle variante/effet et son scan." });
  }

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
        <div style={{ fontSize: "0.85rem", color: "var(--text-muted)" }}>{total} carte(s) archivée(s)</div>
        <button className="btn-primary" style={{ display: "flex", alignItems: "center", gap: "0.35rem" }} onClick={() => setForm(emptyForm(collections[0]?.id))}>
          <Plus size={14} /> Ajouter une carte
        </button>
      </div>

      {message && <div className={`toast ${message.type}`}>{message.text}</div>}

      {form && (
        <form onSubmit={handleSave} className="form-panel" style={{ marginBottom: "1.5rem" }}>
          <div className="admin-grid-3">
            <div className="field">
              <span className="field-label">Collection</span>
              <select value={form.collectionId} onChange={(e) => setForm({ ...form, collectionId: e.target.value })} required>
                <option value="" disabled>Choisir…</option>
                {collections.map((c) => (
                  <option key={c.id} value={c.id}>{c.nom}</option>
                ))}
              </select>
            </div>
            <div className="field">
              <span className="field-label">Référence</span>
              <input value={form.numero} onChange={(e) => setForm({ ...form, numero: e.target.value })} placeholder="ex. ZCB-01" required />
            </div>
            <div className="field">
              <span className="field-label">Variante / rareté / effet</span>
              <input value={form.rarete} onChange={(e) => setForm({ ...form, rarete: e.target.value })} placeholder="ex. Prisme rose" />
            </div>
          </div>
          <div className="field">
            <span className="field-label">Personnage principal</span>
            <input value={form.personnage} onChange={(e) => setForm({ ...form, personnage: e.target.value })} placeholder="ex. Son Goku" required />
          </div>
          <div style={{ fontSize: "0.72rem", color: "var(--text-muted)", margin: "-0.4rem 0 0.9rem" }}>
            Une même référence peut exister plusieurs fois (une ligne par effet/variante) : utilisez "Dupliquer" depuis le tableau pour repartir d'une carte existante.
          </div>
          <div className="field">
            <span className="field-label">Description (contexte, autres personnages présents…)</span>
            <textarea rows={2} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
            <div style={{ fontSize: "0.72rem", color: "var(--text-muted)", marginTop: "0.3rem" }}>
              Écrite en français : traduite automatiquement dans les 3 autres langues à l'enregistrement.
            </div>
          </div>
          <div className="admin-grid-2">
            <div className="field">
              <span className="field-label">Scan recto de la carte</span>
              <label style={{ display: "flex", alignItems: "center", gap: "0.5rem", fontSize: "0.8rem", marginBottom: "0.5rem", cursor: "pointer" }}>
                <input type="checkbox" checked={applyWatermark} onChange={(e) => setApplyWatermark(e.target.checked)} style={{ width: "auto" }} />
                Ajouter le filigrane
              </label>
              <div className="upload-zone" onClick={() => fileRef.current?.click()}>
                <Upload size={16} style={{ margin: "0 auto 0.3rem" }} />
                {uploading ? "Envoi en cours…" : form.image ? "Remplacer l'image" : "Cliquer pour importer le scan"}
                <input ref={fileRef} type="file" accept="image/*" onChange={handleFile} style={{ display: "none" }} />
              </div>
              {form.image && <img src={form.image} alt="" style={{ width: 90, marginTop: "0.6rem" }} />}
            </div>
            <div className="field">
              <span className="field-label">Visuel de dos propre à cette carte (optionnel)</span>
              <label style={{ display: "flex", alignItems: "center", gap: "0.5rem", fontSize: "0.8rem", marginBottom: "0.5rem", cursor: "pointer" }}>
                <input type="checkbox" checked={applyWatermarkDos} onChange={(e) => setApplyWatermarkDos(e.target.checked)} style={{ width: "auto" }} />
                Ajouter le filigrane
              </label>
              <div className="upload-zone" onClick={() => dosFileRef.current?.click()}>
                <Upload size={16} style={{ margin: "0 auto 0.3rem" }} />
                {uploadingDos ? "Envoi en cours…" : form.dos ? "Remplacer le dos" : "Cliquer si le dos diffère de la série"}
                <input ref={dosFileRef} type="file" accept="image/*" onChange={handleDosFile} style={{ display: "none" }} />
              </div>
              {form.dos && <img src={form.dos} alt="" style={{ width: 90, marginTop: "0.6rem" }} />}
              <div style={{ fontSize: "0.72rem", color: "var(--text-muted)", marginTop: "0.4rem" }}>
                Laissez vide pour utiliser le dos partagé de la collection.
              </div>
            </div>
          </div>
          <div style={{ display: "flex", gap: "0.5rem", justifyContent: "flex-end" }}>
            <button type="button" className="btn-ghost" onClick={() => setForm(null)}>Annuler</button>
            <button type="submit" className="btn-primary" disabled={uploading || uploadingDos}>Enregistrer la carte</button>
          </div>
        </form>
      )}

      {loading ? (
        <div className="empty-state">Chargement…</div>
      ) : (
        <div style={{ overflowX: "auto" }}>
          <table className="admin-table">
            <thead>
              <tr>
                <th></th><th>Référence</th><th>Personnage</th><th>Collection</th><th>Variante</th><th></th>
              </tr>
            </thead>
            <tbody>
              {cards.map((c) => (
                <tr key={c.id}>
                  <td>{c.image && <img src={c.image} alt="" style={{ width: 34, height: 48, objectFit: "cover" }} />}</td>
                  <td>{c.numero}</td>
                  <td>{c.personnage}</td>
                  <td>{c.collection?.nom || collectionName(c.collectionId)}</td>
                  <td>{c.rarete}</td>
                  <td>
                    <div style={{ display: "flex", gap: "0.4rem" }}>
                      <button className="btn-icon" title="Dupliquer (nouvel effet/variante)" onClick={() => handleDuplicate(c)}><Copy size={13} /></button>
                      <button className="btn-icon" onClick={() => setForm({ ...c, collectionId: c.collectionId })}><Pencil size={13} /></button>
                      <button className="btn-icon" onClick={() => setConfirmDelete(c)}><Trash2 size={13} /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {totalPages > 1 && (
            <div className="pagination">
              <button className="btn-ghost" disabled={page <= 1} onClick={() => goToPage(page - 1)}>Précédent</button>
              <span style={{ alignSelf: "center", fontSize: "0.85rem", color: "var(--text-muted)" }}>Page {page} / {totalPages}</span>
              <button className="btn-ghost" disabled={page >= totalPages} onClick={() => goToPage(page + 1)}>Suivant</button>
            </div>
          )}
        </div>
      )}

      {confirmDelete && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(10,8,5,0.78)", display: "flex", alignItems: "center", justifyContent: "center", padding: "1rem" }} onClick={() => setConfirmDelete(null)}>
          <div className="form-panel" style={{ maxWidth: 360 }} onClick={(e) => e.stopPropagation()}>
            <p style={{ fontSize: "0.9rem", marginTop: 0 }}>Supprimer la carte « {confirmDelete.numero} » ({confirmDelete.personnage}) ?</p>
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
