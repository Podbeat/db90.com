"use client";

import { useEffect, useState } from "react";
import { Trash2, Ban, Mail } from "lucide-react";

export default function AdminUsersPage() {
  const [users, setUsers] = useState([]);
  const [banned, setBanned] = useState([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState(null);

  const [banEmail, setBanEmail] = useState("");
  const [banReason, setBanReason] = useState("");

  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [sending, setSending] = useState(false);
  const [broadcastMessage, setBroadcastMessage] = useState(null);

  async function load() {
    setLoading(true);
    const [uRes, bRes] = await Promise.all([
      fetch("/api/admin/users"),
      fetch("/api/admin/banned-emails"),
    ]);
    setUsers(await uRes.json());
    setBanned(await bRes.json());
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  async function handleDelete(id) {
    if (!confirm("Supprimer définitivement ce compte ?")) return;
    await fetch(`/api/admin/users/${id}`, { method: "DELETE" });
    load();
  }

  async function handleBanUser(id) {
    if (!confirm("Bannir cet e-mail et supprimer le compte ? Cette adresse ne pourra plus se réinscrire.")) return;
    await fetch(`/api/admin/users/${id}/ban`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({}) });
    load();
  }

  async function handleBanEmail(e) {
    e.preventDefault();
    if (!banEmail.trim()) return;
    const res = await fetch("/api/admin/banned-emails", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: banEmail, reason: banReason }),
    });
    if (res.ok) {
      setBanEmail("");
      setBanReason("");
      setMessage({ type: "success", text: "Adresse bannie." });
      load();
    } else {
      const data = await res.json();
      setMessage({ type: "error", text: data.error });
    }
  }

  async function handleUnban(id) {
    await fetch(`/api/admin/banned-emails/${id}`, { method: "DELETE" });
    load();
  }

  async function handleBroadcast(e) {
    e.preventDefault();
    setSending(true);
    setBroadcastMessage(null);
    try {
      const res = await fetch("/api/admin/users/broadcast", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subject, message: body }),
      });
      const data = await res.json();
      if (res.ok) {
        setBroadcastMessage({ type: "success", text: `E-mail envoyé à ${data.count} compte(s).` });
        setSubject("");
        setBody("");
      } else {
        setBroadcastMessage({ type: "error", text: data.error });
      }
    } finally {
      setSending(false);
    }
  }

  return (
    <div>
      <h1 className="display-font" style={{ fontSize: "1.2rem", marginBottom: "1rem" }}>Utilisateurs</h1>

      {message && <div className={`toast ${message.type}`}>{message.text}</div>}

      <div style={{ display: "flex", gap: "1.5rem", flexWrap: "wrap", marginBottom: "2rem" }}>
        <form onSubmit={handleBroadcast} className="form-panel" style={{ flex: 1, minWidth: 300 }}>
          <div style={{ fontSize: "0.9rem", marginBottom: "0.8rem", display: "flex", alignItems: "center", gap: "0.4rem" }}>
            <Mail size={15} /> Envoyer un e-mail à tous les inscrits ({users.length})
          </div>
          <div className="field">
            <span className="field-label">Sujet</span>
            <input value={subject} onChange={(e) => setSubject(e.target.value)} required />
          </div>
          <div className="field">
            <span className="field-label">Message</span>
            <textarea rows={5} value={body} onChange={(e) => setBody(e.target.value)} required />
          </div>
          {broadcastMessage && <div className={`toast ${broadcastMessage.type}`}>{broadcastMessage.text}</div>}
          <button className="btn-primary" type="submit" disabled={sending}>
            {sending ? "Envoi en cours…" : "Envoyer à tous"}
          </button>
        </form>

        <form onSubmit={handleBanEmail} className="form-panel" style={{ flex: 1, minWidth: 300 }}>
          <div style={{ fontSize: "0.9rem", marginBottom: "0.8rem", display: "flex", alignItems: "center", gap: "0.4rem" }}>
            <Ban size={15} /> Bannir une adresse e-mail directement
          </div>
          <div className="field">
            <span className="field-label">E-mail</span>
            <input type="email" value={banEmail} onChange={(e) => setBanEmail(e.target.value)} required />
          </div>
          <div className="field">
            <span className="field-label">Raison (facultatif, usage interne)</span>
            <input value={banReason} onChange={(e) => setBanReason(e.target.value)} />
          </div>
          <button className="btn-ghost" type="submit">Bannir cette adresse</button>

          {banned.length > 0 && (
            <div style={{ marginTop: "1rem" }}>
              <div style={{ fontSize: "0.78rem", color: "var(--text-muted)", marginBottom: "0.4rem" }}>Adresses bannies ({banned.length})</div>
              {banned.map((b) => (
                <div key={b.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: "0.78rem", padding: "0.3rem 0", borderBottom: "1px solid var(--line)" }}>
                  <span>{b.email}{b.reason ? ` — ${b.reason}` : ""}</span>
                  <button className="btn-icon" onClick={() => handleUnban(b.id)} title="Débannir">×</button>
                </div>
              ))}
            </div>
          )}
        </form>
      </div>

      {loading ? (
        <div className="empty-state">Chargement…</div>
      ) : users.length === 0 ? (
        <div className="empty-state">Aucun compte inscrit pour l'instant.</div>
      ) : (
        <table className="admin-table">
          <thead>
            <tr>
              <th></th>
              <th>Nom d'utilisateur</th>
              <th>E-mail</th>
              <th>Cartes suivies</th>
              <th>Inscrit le</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id}>
                <td>{u.avatar && <img src={u.avatar} alt="" style={{ width: 28, height: 28, borderRadius: "50%", objectFit: "cover" }} />}</td>
                <td>{u.username}</td>
                <td>{u.email}</td>
                <td>{u._count.cards}</td>
                <td>{new Date(u.createdAt).toLocaleDateString("fr-FR")}</td>
                <td>
                  <div style={{ display: "flex", gap: "0.4rem" }}>
                    <button className="btn-icon" onClick={() => handleBanUser(u.id)} title="Bannir cet e-mail et supprimer le compte">
                      <Ban size={13} />
                    </button>
                    <button className="btn-icon" onClick={() => handleDelete(u.id)} title="Supprimer le compte">
                      <Trash2 size={13} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
