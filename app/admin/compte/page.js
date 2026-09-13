"use client";

import { useState } from "react";

export default function AdminAccountPage() {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [status, setStatus] = useState("idle");
  const [error, setError] = useState("");

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");

    if (newPassword !== confirmPassword) {
      setError("Les deux nouveaux mots de passe ne correspondent pas.");
      return;
    }

    setStatus("sending");
    try {
      const res = await fetch("/api/auth/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      const data = await res.json();
      if (res.ok) {
        setStatus("done");
        setCurrentPassword("");
        setNewPassword("");
        setConfirmPassword("");
      } else {
        setStatus("idle");
        setError(data.error || "Échec du changement de mot de passe.");
      }
    } catch (e) {
      setStatus("idle");
      setError("Erreur réseau.");
    }
  }

  return (
    <div>
      <h1 className="display-font" style={{ fontSize: "1.2rem", marginBottom: "1rem" }}>Mon compte</h1>

      <form onSubmit={handleSubmit} className="form-panel" style={{ maxWidth: 420 }}>
        <div style={{ fontSize: "0.85rem", marginBottom: "1rem" }}>Changer le mot de passe</div>

        {status === "done" && <div className="toast success">Mot de passe mis à jour avec succès.</div>}
        {error && <div className="toast error">{error}</div>}

        <div className="field">
          <span className="field-label">Mot de passe actuel</span>
          <input type="password" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} required />
        </div>
        <div className="field">
          <span className="field-label">Nouveau mot de passe (8 caractères minimum)</span>
          <input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} required minLength={8} />
        </div>
        <div className="field">
          <span className="field-label">Confirmer le nouveau mot de passe</span>
          <input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} required minLength={8} />
        </div>

        <button className="btn-primary" type="submit" disabled={status === "sending"}>
          {status === "sending" ? "Enregistrement…" : "Changer le mot de passe"}
        </button>
      </form>
    </div>
  );
}
