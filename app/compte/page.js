"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Upload, ChevronDown, ChevronUp, Trophy } from "lucide-react";
import { useLanguage } from "@/components/LanguageProvider";
import { avatarPlaceholder } from "@/lib/avatarPlaceholder";
import { computeBadges } from "@/lib/badges";
import { useCurrentUser } from "@/components/CurrentUserProvider";

function EmailVerificationBanner({ t }) {
  const [sent, setSent] = useState(false);
  const [sending, setSending] = useState(false);

  async function handleResend() {
    setSending(true);
    try {
      await fetch("/api/users/resend-verification", { method: "POST" });
      setSent(true);
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="toast" style={{ background: "var(--surface-raised)", border: "1px solid var(--gold)", display: "flex", alignItems: "center", justifyContent: "space-between", gap: "0.8rem", flexWrap: "wrap" }}>
      <span style={{ fontSize: "0.8rem" }}>{sent ? t.verificationEmailResent : t.emailNotVerified}</span>
      {!sent && (
        <button className="btn-ghost" onClick={handleResend} disabled={sending} style={{ fontSize: "0.75rem" }}>
          {sending ? "…" : t.resendVerificationEmail}
        </button>
      )}
    </div>
  );
}

export default function AccountProfilePage() {
  const { t } = useLanguage();
  const fileRef = useRef(null);
  const { me, refetch } = useCurrentUser();

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
    if (!me) return;
    setBio(me.bio || "");
    setEmail(me.email || "");
    setUsername(me.username || "");
  }, [me]);

  useEffect(() => {
    fetch("/api/users/me/participation")
      .then((r) => (r.ok ? r.json() : null))
      .then(setParticipation)
      .catch(() => {});
  }, []);

  async function handleAvatarChange(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingAvatar(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/users/me/avatar", { method: "POST", body: fd });
      const data = await res.json();
      if (res.ok) await refetch();
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
      await refetch();
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

  if (!me) return null;

  return (
    <div>
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
      {me.emailVerified === false && <EmailVerificationBanner t={t} />}

      <div style={{ display: "flex", gap: "1.5rem", flexWrap: "wrap" }}>
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
            {computeBadges(participation, t).length > 0 && (
              <div style={{ display: "flex", flexWrap: "wrap", gap: "0.4rem", marginTop: "0.7rem" }}>
                {computeBadges(participation, t).map((b) => (
                  <span key={b.id} style={{ fontSize: "0.68rem", border: "1px solid var(--gold)", color: "var(--gold)", padding: "0.2rem 0.5rem", borderRadius: 999 }}>
                    {b.label}
                  </span>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
