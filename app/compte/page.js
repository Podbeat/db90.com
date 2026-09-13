"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Upload } from "lucide-react";
import { useLanguage } from "@/components/LanguageProvider";
import { avatarPlaceholder } from "@/lib/avatarPlaceholder";

function MiniPreview({ cards }) {
  const shown = cards.slice(0, 8);
  const rest = cards.length - shown.length;
  if (cards.length === 0) return null;
  return (
    <div style={{ display: "flex", gap: "0.4rem", flexWrap: "wrap", marginTop: "0.6rem" }}>
      {shown.map((c) => (
        <Link key={c.id} href={`/cartes/${c.id}`} title={`${c.personnage} — n°${c.numero}`}>
          <img
            src={c.image || ""}
            alt={c.personnage}
            style={{ width: 32, height: 45, objectFit: "cover", background: "var(--surface-raised)", border: "1px solid var(--line)" }}
          />
        </Link>
      ))}
      {rest > 0 && (
        <div style={{ width: 32, height: 45, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "0.7rem", color: "var(--text-muted)", border: "1px solid var(--line)" }}>
          +{rest}
        </div>
      )}
    </div>
  );
}

export default function AccountPage() {
  const { t } = useLanguage();
  const router = useRouter();
  const fileRef = useRef(null);

  const [me, setMe] = useState(null);
  const [loading, setLoading] = useState(true);
  const [notAuthed, setNotAuthed] = useState(false);
  const [owned, setOwned] = useState([]);
  const [wanted, setWanted] = useState([]);
  const [bio, setBio] = useState("");
  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");
  const [message, setMessage] = useState(null);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [passwordMessage, setPasswordMessage] = useState(null);

  useEffect(() => {
    fetch("/api/users/me")
      .then((r) => {
        if (r.status === 401) { setNotAuthed(true); return null; }
        return r.json();
      })
      .then((data) => {
        if (!data) return;
        setMe(data);
        setBio(data.bio || "");
        setEmail(data.email || "");
        setUsername(data.username || "");
      })
      .finally(() => setLoading(false));

    fetch("/api/users/me/cards")
      .then((r) => (r.ok ? r.json() : { owned: [], wanted: [] }))
      .then((d) => { setOwned(d.owned || []); setWanted(d.wanted || []); })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (notAuthed) router.push("/compte/connexion");
  }, [notAuthed, router]);

  async function handleAvatarChange(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingAvatar(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/users/me/avatar", { method: "POST", body: fd });
      const data = await res.json();
      if (res.ok) setMe((prev) => ({ ...prev, avatar: data.avatar }));
      else setMessage({ type: "error", text: data.error });
    } finally {
      setUploadingAvatar(false);
    }
  }

  async function handleSaveProfile(e) {
    e.preventDefault();
    const res = await fetch("/api/users/me", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, bio, email }),
    });
    const data = await res.json();
    if (res.ok) {
      setMe((prev) => ({ ...prev, username: data.username, email: data.email, bio: data.bio }));
      setMessage({ type: "success", text: "Profil mis à jour." });
    } else {
      setMessage({ type: "error", text: data.error });
    }
  }

  async function handleChangePassword(e) {
    e.preventDefault();
    setPasswordMessage(null);
    const res = await fetch("/api/users/me/password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ currentPassword, newPassword }),
    });
    const data = await res.json();
    if (res.ok) {
      setPasswordMessage({ type: "success", text: "Mot de passe modifié." });
      setCurrentPassword("");
      setNewPassword("");
    } else {
      setPasswordMessage({ type: "error", text: data.error });
    }
  }

  if (loading) return <div className="container page"><div className="empty-state">Chargement…</div></div>;
  if (!me) return null;

  return (
    <div className="container page">
      <div style={{ display: "flex", alignItems: "center", gap: "1rem", marginBottom: "1.5rem", flexWrap: "wrap" }}>
        <div style={{ position: "relative" }}>
          <img
            src={me.avatar || avatarPlaceholder(me.username)}
            alt=""
            style={{ width: 72, height: 72, borderRadius: "50%", objectFit: "cover", border: "2px solid var(--line)" }}
          />
          <button
            className="btn-icon"
            onClick={() => fileRef.current?.click()}
            style={{ position: "absolute", bottom: -4, right: -4, borderRadius: "50%", background: "var(--surface)" }}
            title={t.changeAvatar}
          >
            <Upload size={12} />
          </button>
          <input ref={fileRef} type="file" accept="image/*" onChange={handleAvatarChange} style={{ display: "none" }} />
        </div>
        <div>
          <h1 className="display-font" style={{ fontSize: "1.3rem" }}>{me.username}</h1>
          <Link href={`/u/${me.username}`} className="btn-ghost" style={{ fontSize: "0.75rem", marginTop: "0.3rem", display: "inline-block" }}>
            {t.viewPublicProfile}
          </Link>
        </div>
        {uploadingAvatar && <span style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>…</span>}
      </div>

      {message && <div className={`toast ${message.type}`}>{message.text}</div>}

      <div style={{ display: "flex", gap: "1.5rem", flexWrap: "wrap", marginBottom: "2rem" }}>
        <form onSubmit={handleSaveProfile} className="form-panel" style={{ flex: 1, minWidth: 280 }}>
          <div className="display-font" style={{ fontSize: "0.95rem", marginBottom: "0.8rem" }}>{t.accountSettings}</div>
          <div className="field">
            <span className="field-label">{t.usernameLabel}</span>
            <input
              value={username}
              onChange={(e) => setUsername(e.target.value.toLowerCase())}
              pattern="[a-z0-9_-]{3,20}"
              title="3 à 20 caractères : lettres minuscules, chiffres, - ou _"
              required
            />
          </div>
          <div className="field">
            <span className="field-label">{t.emailLabel}</span>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
          <div className="field">
            <span className="field-label">{t.bioLabel}</span>
            <textarea rows={3} value={bio} onChange={(e) => setBio(e.target.value)} maxLength={280} />
          </div>
          <button className="btn-primary" type="submit">{t.saveChanges}</button>
        </form>

        <form onSubmit={handleChangePassword} className="form-panel" style={{ flex: 1, minWidth: 280 }}>
          <div className="display-font" style={{ fontSize: "0.95rem", marginBottom: "0.8rem" }}>{t.changePassword}</div>
          <div className="field">
            <span className="field-label">{t.currentPasswordLabel}</span>
            <input type="password" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} />
          </div>
          <div className="field">
            <span className="field-label">{t.newPasswordLabel}</span>
            <input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} minLength={8} required />
          </div>
          {passwordMessage && <div className={`toast ${passwordMessage.type}`}>{passwordMessage.text}</div>}
          <button className="btn-primary" type="submit">{t.saveChanges}</button>
        </form>
      </div>

      <div style={{ display: "flex", gap: "1.5rem", flexWrap: "wrap" }}>
        <div className="filter-panel" style={{ flex: 1, minWidth: 280 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "0.5rem" }}>
            <div className="display-font" style={{ fontSize: "0.95rem" }}>
              {t.myCollectionTitle} · {t.cardsCount(owned.length)}
            </div>
            {owned.length > 0 && (
              <a href="/api/users/me/owned/pdf" className="btn-ghost" style={{ fontSize: "0.72rem" }}>
                {t.downloadOwnedPdf}
              </a>
            )}
          </div>
          {owned.length === 0 ? (
            <div style={{ fontSize: "0.8rem", color: "var(--text-muted)", marginTop: "0.4rem" }}>{t.noCardsOwned}</div>
          ) : (
            <MiniPreview cards={owned} />
          )}
        </div>

        <div className="filter-panel" style={{ flex: 1, minWidth: 280 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "0.5rem" }}>
            <div className="display-font" style={{ fontSize: "0.95rem" }}>
              {t.myWantedTitle} · {t.cardsCount(wanted.length)}
            </div>
            {wanted.length > 0 && (
              <a href="/api/users/me/wanted/pdf" className="btn-ghost" style={{ fontSize: "0.72rem" }}>
                {t.downloadWantedPdf}
              </a>
            )}
          </div>
          {wanted.length === 0 ? (
            <div style={{ fontSize: "0.8rem", color: "var(--text-muted)", marginTop: "0.4rem" }}>{t.noCardsWanted}</div>
          ) : (
            <MiniPreview cards={wanted} />
          )}
        </div>
      </div>
    </div>
  );
}
