"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Upload, ChevronDown, ChevronUp, Trophy } from "lucide-react";
import { useLanguage } from "@/components/LanguageProvider";
import { avatarPlaceholder } from "@/lib/avatarPlaceholder";

// Une ligne par collection avec une fraction (ex. 22/25) plutôt que les vignettes de
// chaque carte — reste lisible même avec plusieurs centaines de cartes suivies.
function CollectionProgressList({ items, emptyLabel }) {
  if (items.length === 0) {
    return <div style={{ fontSize: "0.8rem", color: "var(--text-muted)", marginTop: "0.4rem" }}>{emptyLabel}</div>;
  }
  return (
    <div style={{ marginTop: "0.6rem" }}>
      {items.map((it) => {
        const totalKnown = it.total != null;
        // Total inconnu (collection encore en cours) : on affiche quand même une barre —
        // en gris, remplie par rapport à ce qui est déjà catalogué — plutôt que de ne rien
        // afficher, pour éviter que les lignes ne sautent selon qu'un total est défini ou non.
        const denominator = totalKnown ? it.total : it.catalogued;
        const pct = denominator ? Math.min(100, Math.round((it.count / denominator) * 100)) : 0;
        const complete = totalKnown && it.count >= it.total;
        return (
          <Link
            key={it.collectionId}
            href={`/collections/${it.collectionId}`}
            style={{ display: "block", padding: "0.5rem 0", borderBottom: "1px solid var(--line)" }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.82rem" }}>
              <span>{it.nom}</span>
              <span style={{ color: totalKnown ? (complete ? "#4caf6d" : "var(--accent)") : "var(--text-muted)", fontWeight: 600 }}>
                {it.count}/{totalKnown ? it.total : "x"}
              </span>
            </div>
            <div className="progress-track">
              <div
                className={`progress-fill ${complete ? "progress-complete" : ""}`}
                style={{ width: `${pct}%`, background: !totalKnown ? "var(--text-muted)" : complete ? undefined : "var(--accent)" }}
              />
            </div>
          </Link>
        );
      })}
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
  const [ownedByCollection, setOwnedByCollection] = useState([]);
  const [wantedByCollection, setWantedByCollection] = useState([]);
  const [participation, setParticipation] = useState(null);
  const [bio, setBio] = useState("");
  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");
  const [message, setMessage] = useState(null);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);

  const [showPasswordForm, setShowPasswordForm] = useState(false);
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

    fetch("/api/users/me/collections-summary")
      .then((r) => (r.ok ? r.json() : { owned: [], wanted: [] }))
      .then((d) => { setOwnedByCollection(d.owned || []); setWantedByCollection(d.wanted || []); })
      .catch(() => {});

    fetch("/api/users/me/participation")
      .then((r) => (r.ok ? r.json() : null))
      .then(setParticipation)
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
        <form onSubmit={handleSaveProfile} className="form-panel" style={{ flex: 2, minWidth: 280 }}>
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

          <button
            type="button"
            onClick={() => setShowPasswordForm((v) => !v)}
            className="btn-ghost"
            style={{ display: "inline-flex", alignItems: "center", gap: "0.3rem", fontSize: "0.75rem", marginTop: "1rem" }}
          >
            {showPasswordForm ? <ChevronUp size={13} /> : <ChevronDown size={13} />} {t.changePasswordToggle}
          </button>
          {showPasswordForm && (
            <div style={{ marginTop: "0.7rem", paddingTop: "0.7rem", borderTop: "1px solid var(--line)" }}>
              <div className="field">
                <span className="field-label">{t.currentPasswordLabel}</span>
                <input type="password" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} />
              </div>
              <div className="field">
                <span className="field-label">{t.newPasswordLabel}</span>
                <input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} minLength={8} required />
              </div>
              {passwordMessage && <div className={`toast ${passwordMessage.type}`}>{passwordMessage.text}</div>}
              <button className="btn-ghost" type="button" onClick={handleChangePassword}>{t.saveChanges}</button>
            </div>
          )}
        </form>

        {participation && (
          <div className="filter-panel" style={{ flex: 1, minWidth: 240 }}>
            <div className="display-font" style={{ fontSize: "0.95rem", marginBottom: "0.6rem", display: "flex", alignItems: "center", gap: "0.4rem" }}>
              <Trophy size={16} style={{ color: "var(--gold)" }} /> {t.myParticipationTitle}
            </div>
            <div style={{ fontSize: "1.6rem", fontWeight: 700, color: "var(--gold)", marginBottom: "0.6rem" }}>
              {t.participationPoints(participation.totalPoints)}
            </div>
            <div style={{ fontSize: "0.76rem", color: "var(--text-muted)", lineHeight: 1.9 }}>
              <div>{t.participationOwnedLine(participation.ownedCount, participation.ownedPoints)}</div>
              <div>{t.participationCompletedLine(participation.completedCollections, participation.completionBonus)}</div>
              <div>{t.participationContribLine(participation.approvedSubmissions, participation.contributionPoints)}</div>
            </div>
            <div style={{ fontSize: "0.7rem", color: "var(--text-muted)", marginTop: "0.6rem", fontStyle: "italic" }}>
              {t.participationNote}
            </div>
          </div>
        )}
      </div>

      <div style={{ display: "flex", gap: "1.5rem", flexWrap: "wrap" }}>
        <div className="filter-panel" style={{ flex: 1, minWidth: 280 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "0.5rem" }}>
            <div className="display-font" style={{ fontSize: "0.95rem" }}>{t.myCollectionTitle}</div>
            {ownedByCollection.length > 0 && (
              <a href="/api/users/me/owned/pdf" className="btn-ghost" style={{ fontSize: "0.72rem" }}>
                {t.downloadOwnedPdf}
              </a>
            )}
          </div>
          <CollectionProgressList items={ownedByCollection} emptyLabel={t.noCardsOwned} />
        </div>

        <div className="filter-panel" style={{ flex: 1, minWidth: 280 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "0.5rem" }}>
            <div className="display-font" style={{ fontSize: "0.95rem" }}>{t.myWantedTitle}</div>
            {wantedByCollection.length > 0 && (
              <a href="/api/users/me/wanted/pdf" className="btn-ghost" style={{ fontSize: "0.72rem" }}>
                {t.downloadWantedPdf}
              </a>
            )}
          </div>
          <CollectionProgressList items={wantedByCollection} emptyLabel={t.noCardsWanted} />
        </div>
      </div>
    </div>
  );
}
