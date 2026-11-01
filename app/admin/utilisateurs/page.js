"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Search, Mail, Ban, Trash2, ExternalLink, X, Megaphone, ThumbsUp, ThumbsDown } from "lucide-react";
import { avatarPlaceholder } from "@/lib/avatarPlaceholder";

// Membres : recherche, filtres et tri ; fiche détaillée de chaque membre (activité,
// contributions, avis, signalements) avec e-mail individuel, bannissement ou suppression ;
// e-mail à tous les membres et adresses bannies.
const fmtDate = (d) => new Date(d).toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric" });
const FILTERS = [
  { key: "all", label: "Tous", test: () => true },
  { key: "unverified", label: "E-mail non vérifié", test: (u) => !u.emailVerified },
  { key: "reported", label: "Signalés", test: (u) => u._count?.reportsReceived > 0 },
  { key: "contributors", label: "Contributeurs", test: (u) => u._count?.submissions > 0 },
];
const SORTS = {
  recent: { label: "Inscription récente", fn: (a, b) => new Date(b.createdAt) - new Date(a.createdAt) },
  cards: { label: "Le plus de cartes", fn: (a, b) => (b._count?.cards || 0) - (a._count?.cards || 0) },
  name: { label: "Nom", fn: (a, b) => a.username.localeCompare(b.username) },
};

function Confirm({ label, confirmLabel, onConfirm, danger, Icon }) {
  const [armed, setArmed] = useState(false);
  return (
    <button type="button" className={`${armed || danger ? "btn-danger" : "btn-ghost"} mem-btn`}
      onClick={() => (armed ? onConfirm() : setArmed(true))} onBlur={() => setArmed(false)}>
      {Icon && <Icon size={15} aria-hidden="true" />} {armed ? confirmLabel : label}
    </button>
  );
}

function MemberPanel({ member, onClose, onChanged }) {
  const [detail, setDetail] = useState(null);
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [status, setStatus] = useState(null);

  useEffect(() => {
    setDetail(null);
    fetch(`/api/admin/users/${member.id}`, { cache: "no-store" }).then((r) => (r.ok ? r.json() : null)).then(setDetail).catch(() => {});
    const onKey = (e) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [member.id, onClose]);

  async function sendEmail(e) {
    e.preventDefault();
    setStatus({ type: "info", text: "Envoi…" });
    const res = await fetch(`/api/admin/users/${member.id}/email`, {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ subject, message }),
    }).catch(() => null);
    const data = await res?.json().catch(() => ({}));
    if (res?.ok) { setSubject(""); setMessage(""); setStatus({ type: "success", text: "E-mail envoyé." }); }
    else setStatus({ type: "error", text: data?.error || "Échec de l'envoi." });
  }

  async function remove(ban) {
    const res = await fetch(ban ? `/api/admin/users/${member.id}/ban` : `/api/admin/users/${member.id}`, {
      method: ban ? "POST" : "DELETE", headers: { "Content-Type": "application/json" }, body: ban ? "{}" : undefined,
    }).catch(() => null);
    if (res?.ok) { onChanged(); onClose(); } else setStatus({ type: "error", text: "L'action a échoué." });
  }

  const d = detail;
  const stat = (value, labelText) => (
    <div className="mem-stat"><span className="display-font">{value ?? "…"}</span><span>{labelText}</span></div>
  );
  return (
    <div className="mem-overlay" onClick={onClose}>
      <aside className="mem-panel" role="dialog" aria-modal="true" aria-label={`Fiche de ${member.username}`} onClick={(e) => e.stopPropagation()}>
        <div className="mem-panel-head">
          <img src={member.avatar || avatarPlaceholder(member.username)} alt="" className="mem-avatar big" />
          <div className="mem-panel-id">
            <h2 className="display-font">{member.username}</h2>
            <div className="mem-sub">{member.email}</div>
            <div className="mem-sub">Inscrit le {fmtDate(member.createdAt)} · {member.emailVerified ? "e-mail vérifié" : <span className="mem-warn">e-mail non vérifié</span>}</div>
          </div>
          <button type="button" className="btn-icon mem-close" onClick={onClose} aria-label="Fermer"><X size={18} /></button>
        </div>
        <div className="mem-stats">
          {stat(d ? d.cards.owned || 0 : null, "possédées")}
          {stat(d ? d.cards.wanted || 0 : null, "recherchées")}
          {stat(d ? d.submissions.approved || 0 : null, "scans validés")}
          {stat(d ? d.listings : null, "annonces")}
          {stat(d ? d.messagesSent : null, "messages envoyés")}
          {stat(d ? d.ratings.filter((r) => r.positive).length : null, "avis positifs")}
        </div>
        {d?.lastCardAt && <p className="mem-sub">Dernière carte cochée le {fmtDate(d.lastCardAt)}</p>}
        <div className="mem-links">
          <Link href={`/u/${member.username}`} target="_blank" className="mod-link"><ExternalLink size={14} aria-hidden="true" /> Profil public</Link>
        </div>

        {d?.reports?.length > 0 && (
          <section className="mem-section">
            <h3>Signalements reçus ({d.reports.length})</h3>
            <ul className="mem-list">
              {d.reports.map((r) => (
                <li key={r.id}>
                  <span className="mem-list-meta">{fmtDate(r.createdAt)}{r.reporterUser ? ` · par ${r.reporterUser.username}` : ""} · {r.status}</span>
                  <span>{r.message}</span>
                </li>
              ))}
            </ul>
          </section>
        )}
        {d?.ratings?.length > 0 && (
          <section className="mem-section">
            <h3>Avis reçus</h3>
            <ul className="mem-list">
              {d.ratings.map((r, i) => (
                <li key={i}>
                  <span className="mem-list-meta">
                    {r.positive ? <ThumbsUp size={12} aria-hidden="true" /> : <ThumbsDown size={12} aria-hidden="true" />} {r.rater?.username} · {fmtDate(r.createdAt)}
                  </span>
                  {r.comment && <span>{r.comment}</span>}
                </li>
              ))}
            </ul>
          </section>
        )}

        <form className
="mem-section" onSubmit={sendEmail}>
          <h3><Mail size={15} aria-hidden="true" /> Écrire à {member.username}</h3>
          <div className="field">
            <span className="field-label">Sujet</span>
            <input value={subject} onChange={(e) => setSubject(e.target.value)} maxLength={200} required />
          </div>
          <div className="field">
            <span className="field-label">Message</span>
            <textarea rows={4} value={message} onChange={(e) => setMessage(e.target.value)} maxLength={5000} required />
          </div>
          <button type="submit" className="btn-primary mem-btn"><Mail size={15} aria-hidden="true" /> Envoyer l'e-mail</button>
          {status && <div className={`toast ${status.type === "info" ? "" : status.type}`}>{status.text}</div>}
        </form>

        <section className="mem-section danger">
          <h3>Sanctions</h3>
          <p className="mem-sub">Bannir supprime le compte et empêche cette adresse de se réinscrire. Supprimer efface seulement le compte.</p>
          <div className="mem-actions">
            <Confirm Icon={Ban} label="Bannir l'adresse" confirmLabel="Confirmer le bannissement" onConfirm={() => remove(true)} />
            <Confirm Icon={Trash2} label="Supprimer le compte" confirmLabel="Confirmer la suppression" onConfirm={() => remove(false)} />
          </div>
        </section>
      </aside>
    </div>
  );
}

function Broadcast({ count }) {
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [sending, setSending] = useState(false);
  const [status, setStatus] = useState(null);

  async function send(e) {
    e.preventDefault();
    setSending(true);
    setStatus(null);
    const res = await fetch("/api/admin/users/broadcast", {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ subject, message: body }),
    }).catch(() => null);
    const data = await res?.json().catch(() => ({}));
    setSending(false);
    if (res?.ok) { setSubject(""); setBody(""); setStatus({ type: "success", text: `E-mail envoyé à ${data.count} membre(s).` }); }
    else setStatus({ type: "error", text: data?.error || "Échec de l'envoi." });
  }

  return (
    <details className="adm-fold" id="message">
      <summary><Megaphone size={16} aria-hidden="true" /> Écrire à tous les membres <span className="adm-tab-count">{count}</span></summary>
      <form onSubmit={send} className="adm-fold-body">
        <p className="mem-sub">Envoi en copie cachée depuis l'adresse du site. Le compte Gmail est limité à 500 destinataires par 24 heures, e-mails de vérification compris.</p>
        <div className="field"><span className="field-label">Sujet</span><input value={subject} onChange={(e) => setSubject(e.target.value)} required /></div>
        <div className="field"><span className="field-label">Message</span><textarea rows={5} value={body} onChange={(e) => setBody(e.target.value)} required /></div>
        <button className="btn-primary mem-btn" type="submit" disabled={sending}>{sending ? "Envoi en cours…" : `Envoyer à ${count} membre${count > 1 ? "s" : ""}`}</button>
        {status && <div className={`toast ${status.type}`}>{status.text}</div>}
      </form>
    </details>
  );
}

function BannedEmails({ banned, onChanged }) {
  const [email, setEmail] = useState("");
  const [reason, setReason] = useState("");
  const [error, setError] = useState("");

  async function add(e) {
    e.preventDefault();
    setError("");
    const res = await fetch("/api/admin/banned-emails", {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email, reason }),
    }).catch(() => null);
    if (res?.ok) { setEmail(""); setReason(""); onChanged(); }
    else setError((await res?.json().catch(() => ({})))?.error || "Échec.");
  }

  return (
    <details className="adm-fold">
      <summary><Ban size={16} aria-hidden="true" /> Adresses bannies <span className="adm-tab-count">{banned.length}</span></summary>
      <div className="adm-fold-body">
        {banned.length > 0 && (
          <ul className="mem-list">
            {banned.map((b) => (
              <li key={b.id} className="mem-banned">
                <span>{b.email}{b.reason ? <span className="mem-sub"> — {b.reason}</span> : null}</span>
                <button type="button" className="btn-ghost mem-btn" onClick={() => fetch(`/api/admin/banned-emails/${b.id}`, { method: "DELETE" }).then(onChanged)}>Débannir</button>
              </li>
            ))}
          </ul>
        )}
        <form onSubmit={add} className="mem-ban-form">
          <div className="field"><span className="field-label">Adresse à bannir</span><input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required /></div>
          <div className="field"><span className="field-label">Raison (usage interne)</span><input value={reason} onChange={(e) => setReason(e.target.value)} /></div>
          <button className="btn-ghost mem-btn" type="submit"><Ban size={15} aria-hidden="true" /> Bannir cette adresse</button>
          {error && <div className="toast error">{error}</div>}
        </form>
      </div>
    </details>
  );
}

export default function AdminMembersPage() {
  const [users, setUsers] = useState(null);
  const [banned, setBanned] = useState([]);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("all");
  const [sort, setSort] = useState("recent");
  const [selected, setSelected] = useState(null);
  const closePanel = useCallback(() => setSelected(null), []);

  async function load() {
    const [u, b] = await Promise.all([
      fetch("/api/admin/users", { cache: "no-store" }).then((r) => (r.ok ? r.json() : [])).catch(() => []),
      fetch("/api/admin/banned-emails", { cache: "no-store" }).then((r) => (r.ok ? r.json() : [])).catch(() => []),
    ]);
    setUsers(Array.isArray(u) ? u : []);
    setBanned(Array.isArray(b) ? b : []);
    return Array.isArray(u) ? u : [];
  }

  // ?membre=<pseudo> (lien depuis la modération) ouvre directement sa fiche.
  useEffect(() => {
    load().then((list) => {
      const name = new URLSearchParams(window.location.search).get("membre");
      const found = name && list.find((u) => u.username === name);
      if (found) setSelected(found);
    });
  }, []);

  const shown = useMemo(() => {
    if (!users) return [];
    const q = query.trim().toLowerCase();
    const test = FILTERS.find((f) => f.key === filter).test;
    return users
      .filter((u) => test(u) && (!q || u.username.toLowerCase().includes(q) || u.email.toLowerCase().includes(q)))
      .sort(SORTS[sort].fn);
  }, [users, query, filter, sort]);

  if (!users) return <div className="empty-state">Chargement…</div>;
  const unverified = users.filter((u) => !u.emailVerified).length;
  const reported = users.filter((u) => u._count?.reportsReceived > 0).length;

  return (
    <div className="adm-page">
      <header className="adm-page-head">
        <div>
          <h1 className="display-font adm-page-title">Membres</h1>
          <p className="adm-page-sub">
            {users.length} membre{users.length > 1 ? "s" : ""} · {unverified} e-mail{unverified > 1 ? "s" : ""} non vérifié{unverified > 1 ? "s" : ""} · {reported} signalé{reported > 1 ? "s" : ""}
          </p>
        </div>
      </header>
      <div className="mem-toolbar">
        <label className="mem-search">
          <Search size={16} aria-hidden="true" />
          <span className="visually-hidden">Rechercher un membre</span>
          <input type="search" placeholder="Pseudo ou e-mail" value={query} onChange={(e) => setQuery(e.target.value)} />
        </label>
        <div className="adm-tabs" role="tablist" aria-label="Filtre">
          {FILTERS.map((f) => (
            <button key={f.key} type="button" role="tab" aria-selected={filter === f.key} className={filter === f.key ? "active" : ""} onClick={() => setFilter(f.key)}>
              {f.label} <span className="adm-tab-count">{users.filter(f.test).length}</span>
            </button>
          ))}
        </div>
        <select className="mem-sort" value={sort} onChange={(e) => setSort(e.target.value)} aria-label="Trier">
          {Object.entries(SORTS).map(([k, s]) => <option key={k} value={k}>{s.label}</option>)}
        </select>
      </div>

      {shown.length === 0 ? (
        <div className="adm-muted">Aucun membre ne correspond.</div>
      ) : (
        <ul className="mem-rows">
          {shown.map((u) => (
            <li key={u.id}>
              <button type="button" className="mem-row" onClick={() => setSelected(u)}>
                <img src={u.avatar || avatarPlaceholder(u.username)} alt="" className="mem-avatar" />
                <span className="mem-row-id">
                  <span className="mem-row-name">{u.username}</span>
                  <span className="mem-sub">{u.email}</span>
                </span>
                <span className="mem-row-tags">
                  {!u.emailVerified && <span className="mem-tag warn">non vérifié</span>}
                  {u._count?.reportsReceived > 0 && <span className="mem-tag danger">{u._count.reportsReceived} signalement{u._count.reportsReceived > 1 ? "s" : ""}</span>}
                  {u._count?.submissions > 0 && <span className="mem-tag">{u._count.submissions} scan{u._count.submissions > 1 ? "s" : ""}</span>}
                </span>
                <span className="mem-row-num"><strong>{u._count?.cards || 0}</strong> cartes</span>
                <span className="mem-row-date">{fmtDate(u.createdAt)}</span>
              </button>
            </li>
          ))}
        </ul>
      )}

      <Broadcast count={users.length} />
      <BannedEmails banned={banned} onChanged={load} />
      {selected && <MemberPanel member={selected} onClose={closePanel} onChanged={load} />}
    </div>
  );
}
