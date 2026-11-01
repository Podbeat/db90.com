"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Check, X, ImagePlus, FolderPlus, Flag, ShieldAlert, CircleCheck, ExternalLink, Pencil } from "lucide-react";

// Boîte de modération : scans proposés, propositions de collections, erreurs signalées sur
// des cartes et signalements de membres, réunis dans une seule liste. Les données et les
// actions passent par les routes déjà utilisées par les anciennes pages.
const TYPES = [
  { key: "all", label: "Tout" },
  { key: "scan", label: "Scans", Icon: ImagePlus },
  { key: "collection", label: "Collections", Icon: FolderPlus },
  { key: "card_report", label: "Erreurs de cartes", Icon: Flag },
  { key: "user_report", label: "Membres signalés", Icon: ShieldAlert },
];

const fmtDate = (d) => new Date(d).toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric" });
const label = (c) => [c?.collection?.nom, c?.numero ? `n°${c.numero}` : null].filter(Boolean).join(" ");
const getJson = (url) => fetch(url, { cache: "no-store" }).then((r) => (r.ok ? r.json() : [])).catch(() => []);
const isOpen = (status) => status === "pending" || status === "nouveau";

function normalize({ scans, proposals, reports, userReports }) {
  const items = [
    ...scans.map((s) => ({
      type: "scan", id: s.id, status: s.status, date: s.createdAt, by: s.user?.username,
      title: s.card ? label(s.card) : `${s.collection?.nom || ""} n°${s.numero}`,
      detail: s.card ? (s.card.image ? "Remplacerait le visuel actuel" : "Carte encore sans visuel") : `Nouvel effet « ${s.rarete} » : une nouvelle carte sera créée`,
      image: s.image, currentImage: s.card?.image || null,
      link: s.card ? { href: `/cartes/${s.card.id}`, label: "Voir la fiche" } : null,
    })),
    ...proposals.map((p) => ({
      type: "collection", id: p.id, status: p.status, date: p.updatedAt, by: p.user?.username,
      title: p.nom, detail: `${p._count?.cards || 0} carte(s) proposée(s)${p.pays ? ` · ${p.pays}` : ""}${p.annee ? ` · ${p.annee}` : ""}`,
      link: { href: "/admin/propositions-collections", label: "Examiner en détail" },
    })),
    ...reports.map((r) => ({
      type: "card_report", id: r.id, status: r.status, date: r.createdAt, by: r.contact || null,
      title: label(r.card), detail: r.message, image: r.card?.image || null,
      link: r.card ? { href: `/admin/cartes?modifier=${r.card.id}`, label: "Corriger la carte" } : null,
    })),
    ...userReports.map((r) => ({
      type: "user_report", id: r.id, status: r.status, date: r.createdAt, by: r.reporterUser?.username,
      title: r.reportedUser?.username || "Membre supprimé", detail: r.message,
      link: r.reportedUser ? { href: `/admin/utilisateurs?membre=${encodeURIComponent(r.reportedUser.username)}`, label: "Voir la fiche du membre" } : null,
    })),
  ];
  return items.sort((a, b) => new Date(b.date) - new Date(a.date));
}

const post = (url) => fetch(url, { method: "POST" });
const put = (url, status) => fetch(url, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status }) });
const ACTIONS = {
  scan: [
    { key: "approve", label: "Accepter", primary: true, run: (id) => post(`/api/admin/submissions/${id}/approve`) },
    { key: "reject", label: "Refuser", confirm: "Confirmer le refus (le fichier sera supprimé)", run: (id) => post(`/api/admin/submissions/${id}/reject`) },
  ],
  collection: [],
  card_report: [
    { key: "done", label: "Marquer comme traité", primary: true, run: (id) => put(`/api/reports/${id}`, "traite") },
    { key: "ignore", label: "Ignorer", run: (id) => put(`/api/reports/${id}`, "ignore") },
  ],
  user_report: [
    { key: "done", label: "Marquer comme traité", primary: true, run: (id) => put(`/api/admin/user-reports/${id}`, "traite") },
    { key: "ignore", label: "Ignorer", run: (id) => put(`/api/admin/user-reports/${id}`, "ignore") },
  ],
};
const ITEM_LABEL = { scan: "Scan proposé", collection: "Collection proposée", card_report: "Erreur signalée", user_report: "Membre signalé" };
const STATUS_LABEL = { pending: "En attente", nouveau: "Nouveau", approved: "Accepté", rejected: "Refusé", traite: "Traité", ignore: "Ignoré", draft: "Brouillon" };

function Item({ item, onDone }) {
  const [busy, setBusy] = useState(false);
  const [confirming, setConfirming] = useState(null);
  const [error, setError] = useState("");
  const kind = TYPES.find((t) => t.key === item.type);

  async function act(action) {
    if (action.confirm && confirming !== action.key) return setConfirming(action.key);
    setBusy(true);
    setError("");
    const res = await action.run(item.id).catch(() => null);
    setBusy(false);
    setConfirming(null);
    if (res?.ok) onDone(item);
    else setError("L'action a échoué. Réessaie ou recharge la page.");
  }

  return (
    <article className={`mod-item ${item.type}`}>
      <div className="mod-visual">
        {item.image ? <img src={item.image} alt="" className="mod-img" /> : <span className="mod-icon">{kind?.Icon && <kind.Icon size={22} aria-hidden="true" />}</span>}
        {item.currentImage && (
          <span className="mod-current">
            <img src={item.currentImage} alt="" className="mod-img small" />
            <span>actuel</span>
          </span>
        )}
      </div>
      <div className="mod-body">
        <div className="mod-kind">
          {ITEM_LABEL[item.type]}
          {item.by ? <> · par <strong>{item.by}</strong></> : null} · {fmtDate(item.date)}
          {!isOpen(item.status) && <span className={`mod-status ${item.status}`}>{STATUS_LABEL[item.status] || item.status}</span>}
        </div>
        <h2 className="mod-title">{item.title}</h2>
        {item.detail && <p className="mod-detail">{item.detail}</p>}
        <div className="mod-actions">
          {isOpen(item.status) &&
            ACTIONS[item.type].map((a) => (
              <button key={a.key} type="button" disabled={busy} onClick={() => act(a)}
                className={`${a.primary ? "btn-primary" : confirming === a.key ? "btn-danger" : "btn-ghost"} mod-btn`}>
                {a.key === "approve" || a.key === "done" ? <Check size={15} aria-hidden="true" /> : <X size={15} aria-hidden="true" />}
                {confirming === a.key ? a.confirm : a.label}
              </button>
            ))}
          {item.link && (
            <Link href={item.link.href} className="mod-link">
              {item.type === "card_report" ? <Pencil size={14} aria-hidden="true" /> : <ExternalLink size={14} aria-hidden="true" />} {item.link.label}
            </Link>
          )}
        </div>
        {error && <div className="toast error">{error}</div>}
      </div>
    </article>
  );
}

export default function ModerationPage() {
  const [items, setItems] = useState(null);
  const [type, setType] = useState("all");
  const [view, setView] = useState("open");

  const load = useCallback(async () => {
    const [scans, proposals, reports, userReports] = await Promise.all([
      getJson("/api/admin/submissions?status=all"),
      getJson("/api/admin/collection-submissions?status=all"),
      getJson("/api/reports?status=all"),
      getJson("/api/admin/user-reports"),
    ]);
    const arr = (x) => (Array.isArray(x) ? x : []);
    setItems(normalize({ scans: arr(scans), proposals: arr(proposals).filter((p) => p.status !== "draft"), reports: arr(reports), userReports: arr(userReports) }));
  }, []);

  useEffect(() => {
    const t = new URLSearchParams(window.location.search).get("type");
    if (TYPES.some((x) => x.key === t)) setType(t);
    load();
  }, [load]);

  // Après une décision, l'élément quitte la liste « à traiter » et les compteurs suivent.
  function handleDone() {
    load();
    window.dispatchEvent(new Event("admin-pending-changed"));
  }

  if (!items) return <div className="empty-state">Chargement…</div>;
  const inView = items.filter((i) => (view === "open" ? isOpen(i.status) : !isOpen(i.status)));
  const count = (key) => inView.filter((i) => key === "all" || i.type === key).length;
  const shown = inView.filter((i) => type === "all" || i.type === type).slice(0, view === "open" ? 200 : 60);

  return (
    <div className="adm-page">
      <header className="adm-page-head">
        <div>
          <h1 className="display-font adm-page-title">Modération</h1>
          <p className="adm-page-sub">Scans, propositions et signalements au même endroit.</p>
        </div>
        <div className="adm-seg" role="group" aria-label="Vue">
          <button type="button" className={view === "open" ? "active" : ""} onClick={() => setView("open")}>À traiter</button>
          <button type="button" className={view === "done" ? "active" : ""} onClick={() => setView("done")}>Déjà traités</button>
        </div>
      </header>
      <div className="adm-tabs" role="tablist" aria-label="Type">
        {TYPES.map((t) => (
          <button key={t.key} type="button" role="tab" aria-selected={type === t.key} className={type === t.key ? "active" : ""} onClick={() => setType(t.key)}>
            {t.Icon && <t.Icon size={15} aria-hidden="true" />} {t.label} <span className="adm-tab-count">{count(t.key)}</span>
          </button>
        ))}
      </div>
      {shown.length === 0 ? (
        <div className="adm-empty">
          <CircleCheck size={28} aria-hidden="true" />
          <div>
            <strong>{view === "open" ? "Rien à traiter" : "Aucune décision pour l'instant"}</strong>
            <span>{view === "open" ? "Les nouveaux scans, propositions et signalements apparaîtront ici." : "Les éléments traités s'afficheront ici."}</span>
          </div>
        </div>
      ) : (
        <div className="mod-list">{shown.map((i) => <Item key={`${i.type}-${i.id}`} item={i} onDone={handleDone} />)}</div>
      )}
    </div>
  );
}
