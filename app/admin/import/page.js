"use client";

import { useState } from "react";

export default function AdminImportPage() {
  const [sheet, setSheet] = useState(null);
  const [images, setImages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");

  async function handleSubmit(e) {
    e.preventDefault();
    if (!sheet) {
      setError("Sélectionnez un fichier CSV ou Excel.");
      return;
    }
    setLoading(true);
    setError("");
    setResult(null);
    try {
      const fd = new FormData();
      fd.append("sheet", sheet);
      images.forEach((img) => fd.append("images", img));
      const res = await fetch("/api/import", { method: "POST", body: fd });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Échec de l'import.");
      } else {
        setResult(data);
      }
    } catch (e) {
      setError("Erreur réseau pendant l'import.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <h1 className="display-font" style={{ fontSize: "1.2rem", marginBottom: "1rem" }}>Import en masse</h1>

      <div className="form-panel" style={{ marginBottom: "1.5rem", fontSize: "0.85rem", color: "var(--text-muted)" }}>
        <p style={{ marginTop: 0 }}>
          Préparez un fichier <strong>CSV</strong> (depuis Excel ou Google Sheets : "Fichier → Télécharger → CSV")
          avec les colonnes suivantes, en-tête en première ligne :
        </p>
        <p style={{ fontFamily: "monospace", color: "var(--text)" }}>
          collection, numero, personnage, rarete, description, image
        </p>
        <p>
          La colonne <strong>image</strong> doit contenir le nom exact du fichier scan correspondant (ex. <code>0014.jpg</code>).
          Sélectionnez ensuite tous vos fichiers scans dans le second champ : ils seront associés automatiquement par nom de fichier.
          Si une collection n'existe pas encore, elle est créée automatiquement.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="form-panel">
        <div className="field">
          <span className="field-label">Fichier de métadonnées (CSV)</span>
          <input type="file" accept=".csv" onChange={(e) => setSheet(e.target.files?.[0] || null)} />
        </div>
        <div className="field">
          <span className="field-label">Scans des cartes (sélection multiple)</span>
          <input type="file" accept="image/*" multiple onChange={(e) => setImages(Array.from(e.target.files || []))} />
          {images.length > 0 && (
            <div style={{ fontSize: "0.78rem", color: "var(--text-muted)", marginTop: "0.4rem" }}>
              {images.length} fichier(s) sélectionné(s)
            </div>
          )}
        </div>
        {error && <div className="toast error">{error}</div>}
        <button className="btn-primary" type="submit" disabled={loading}>
          {loading ? "Import en cours…" : "Lancer l'import"}
        </button>
      </form>

      {result && (
        <div className="form-panel" style={{ marginTop: "1.5rem" }}>
          <div className="toast success">{result.created} carte(s) importée(s) avec succès.</div>
          {result.errors?.length > 0 && (
            <div>
              <div style={{ fontSize: "0.85rem", marginBottom: "0.4rem" }}>{result.errors.length} ligne(s) en erreur :</div>
              <ul style={{ fontSize: "0.8rem", color: "var(--text-muted)", paddingLeft: "1.2rem" }}>
                {result.errors.map((err, i) => <li key={i}>{err}</li>)}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
