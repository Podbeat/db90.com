"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Eye, Users, Layers, Activity, Inbox, CircleCheck, ImagePlus, FolderPlus, Flag, ShieldAlert, ImageOff, UserX, Hash,
  Image as ImageIcon, Plus, Upload, Megaphone, ChevronRight, TrendingUp, TrendingDown,
} from "lucide-react";

// Tableau de bord de l'administration : ce qui attend une décision, les chiffres clés,
// ce qui reste à compléter dans le catalogue, l'avancement des collections, l'activité
// récente et l'audience des 14 derniers jours (données : /api/admin/overview).

const nf = new Intl.NumberFormat("fr-FR");

function timeAgo(date) {
  const min = Math.round((Date.now() - new Date(date).getTime()) / 60000);
  if (min < 1) return "à l'instant";
  if (min < 60) return `il y a ${min} min`;
  const h = Math.round(min / 60);
  if (h < 24) return `il y a ${h} h`;
  const d = Math.round(h / 24);
  return d === 1 ? "hier" : `il y a ${d} j`;
}

// Évolution en % par rapport à la semaine précédente (rien si pas de point de comparaison).
function Trend({ now, before }) {
  if (!before) return null;
  const diff = Math.round(((now - before) / before) * 100);
  const up = diff >= 0;
  const Icon = up ? TrendingUp : TrendingDown;
  return (
    <span className={`adm-trend ${up ? "up" : "down"}`}>
      <Icon size={13} aria-hidden="true" /> {up ? "+" : ""}{diff} %
    </span>
  );
}

// Petite courbe des vues par jour.
function Sparkline({ values }) {
  if (!values?.length) return null;
  const max = Math.max(1, ...values);
  const w = 120;
  const h = 34;
  const step = w / Math.max(1, values.length - 1);
  const points = values.map((v, i) => `${(i * step).toFixed(1)},${(h - 3 - (v / max) * (h - 6)).toFixed(1)}`).join(" ");
  return (
    <svg className="adm-spark" viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" aria-hidden="true">
      <polyline points={`0,${h} ${points} ${w},${h}`} className="adm-spark-fill" />
      <polyline points={points} className="adm-spark-line" />
    </svg>
  );
}

function Kpi({ icon: Icon, tone, label, value, sub, extra, href, children }) {
  const body = (
    <>
      <div className="adm-kpi-head">
        <span className={`adm-kpi-icon ${tone}`}><Icon size={17} aria-hidden="true" /></span>
        <span className="adm-kpi-label">{label}</span>
        {extra}
      </div>
      <div className="adm-kpi-value display-font">{value}</div>
      {sub && <div className="adm-kpi-sub">{sub}</div>}
      {children}
    </>
  );
  return href ? <Link href={href} className="adm-kpi">{body}</Link> : <div className="adm-kpi">{body}</div>;
}

function Panel({ title, aside, className = "", children }) {
  return (
    <section className={`adm-panel ${className}`} aria-label={title}>
      <div className="adm-panel-head">
        <h2 className="adm-panel-title display-font">{title}</h2>
        {aside}
      </div>
      {children}
    </section>
  );
}

const QUEUE_TYPES = {
  scan: { Icon: ImagePlus, label: "Scan proposé" },
  collection: { Icon: FolderPlus, label: "Collection proposée" },
  card_report: { Icon: Flag, label: "Erreur signalée" },
  user_report: { Icon: ShieldAlert, label: "Membre signalé" },
};

function Queue({ items }) {
  if (!items.length) {
    return (
      <div className="adm-empty">
        <CircleCheck size={28} aria-hidden="true" />
        <div>
          <strong>Tout est à jour</strong>
          <span>Aucun scan, proposition ou signalement n'attend de décision.</span>
        </div>
      </div>
    );
  }
  return (
    <ul className="adm-queue">
      {items.map((it) => {
        const kind = QUEUE_TYPES[it.type] || QUEUE_TYPES.scan;
        return (
          <li key={`${it.type}-${it.id}`}>
            <Link href={it.href} className={`adm-queue-item ${it.type}`}>
              {it.image ? (
                <img src={it.image} alt="" className="adm-queue-thumb" />
              ) : (
                <span className="adm-queue-thumb icon"><kind.Icon size={18} aria-hidden="true" /></span>
              )}
              <span className="adm-queue-body">
                <span className="adm-queue-kind">{kind.label}{it.by ? ` · par ${it.by}` : ""}</span>
                <span className="adm-queue-title">{it.title}</span>
                {it.detail && <span className="adm-queue-detail">{it.detail}</span>}
              </span>
              <span className="adm-queue-meta">
                <span>{timeAgo(it.date)}</span>
                <ChevronRight size={16} aria-hidden="true" />
              </span>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}

// Ce qui manque au catalogue, avec des liens directs vers la fiche à corriger.
const TODO_ROWS = [
  { key: "withoutImage", Icon: ImageOff, label: "Cartes sans scan", link: (x) => `/admin/cartes?modifier=${x.id}` },
  { key: "withoutCharacter", Icon: UserX, label: "Cartes sans personnage", link: (x) => `/admin/cartes?modifier=${x.id}` },
  { key: "withoutTotal", Icon: Hash, label: "Collections sans total connu", link: (x) => `/admin/collections?modifier=${x.id}` },
  { key: "withoutBack", Icon: ImageIcon, label: "Collections sans visuel de dos", link: (x) => `/admin/collections?modifier=${x.id}` },
];

function Todo({ todo }) {
  return (
    <ul className="adm-todo">
      {TODO_ROWS.map((row) => {
        const data = todo[row.key];
        const done = !data?.count;
        return (
          <li key={row.key} className={done ? "done" : ""}>
            <div className="adm-todo-head">
              <span className="adm-todo-icon">{done ? <CircleCheck size={16} aria-hidden="true" /> : <row.Icon size={16} aria-hidden="true" />}</span>
              <span className="adm-todo-label">{row.label}</span>
              <span className="adm-todo-count">{data?.count || 0}</span>
            </div>
            {!done && (
              <div className="adm-todo-links">
                {data.examples.map((x) => (
                  <Link key={x.id} href={row.link(x)} className="adm-chip">{x.label}</Link>
                ))}
                {data.count > data.examples.length && <span className="adm-chip muted">+ {data.count - data.examples.length}</span>}
              </div>
            )}
          </li>
        );
      })}
    </ul>
  );
}

// Avancement de chaque collection : références cataloguées sur le total de la série.
function Archive({ archive }) {
  return (
    <ul className="adm-archive">
      {archive.map((c) => {
        const pct = c.total ? Math.min(100, Math.round((c.references / c.total) * 100)) : null;
        return (
          <li key={c.id}>
            <Link href={`/collections/${c.id}`} className="adm-archive-row" target="_blank">
              <span className="adm-archive-cover">{c.preview && <img src={c.preview} alt="" />}</span>
              <span className="adm-archive-body">
                <span className="adm-archive-top">
                  <span className="adm-archive-name">{c.nom}</span>
                  <span className="adm-archive-count">{c.total ? `${c.references} / ${c.total}` : `${c.references} · total ?`}</span>
                </span>
                <span className={`adm-bar${pct === 100 ? " full" : ""}${pct === null ? " open" : ""}`}>
                  <span style={{ width: `${pct ?? 100}%` }} />
                </span>
                <span className="adm-archive-sub">
                  {c.cards} carte{c.cards > 1 ? "s" : ""}{c.cards > c.references ? ` dont ${c.cards - c.references} variante${c.cards - c.references > 1 ? "s" : ""}` : ""}
                  {c.missingScans > 0 && <span className="warn"> · {c.missingScans} sans scan</span>}
                </span>
              </span>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}

function Timeline({ items }) {
  if (!items.length) return <div className="adm-muted">Pas encore d'activité.</div>;
  return (
    <ul className="adm-timeline">
      {items.map((it, i) => (
        <li key={i} className={it.type}>
          <span className="adm-timeline-dot" aria-hidden="true" />
          <span className="adm-timeline-text">
            {it.actor ? <Link href={`/u/${it.actor}`} target="_blank">{it.actor}</Link> : "Un membre"} {it.text}
          </span>
          <span className="adm-timeline-date">{timeAgo(it.date)}</span>
        </li>
      ))}
    </ul>
  );
}

// Vues par jour sur 14 jours, avec les pages et pays les plus vus sur 7 jours.
function Audience({ audience }) {
  const max = Math.max(1, ...audience.days.map((d) => d.views));
  return (
    <div className="adm-audience">
      <div className="adm-bars" role="img" aria-label="Pages vues par jour sur 14 jours">
        {audience.days.map((d) => (
          <div key={d.day} className="adm-bars-col" title={`${d.day} : ${d.views} vues, ${d.visitors} visiteurs`}>
            <span className="adm-bars-value">{d.views || ""}</span>
            <span className="adm-bars-bar" style={{ height: `${Math.max(2, (d.views / max) * 100)}%` }} />
            <span className="adm-bars-label">{d.day.slice(8)}</span>
          </div>
        ))}
      </div>
      <div className="adm-ranks">
        <div>
          <div className="adm-ranks-title">Pages les plus vues (7 j)</div>
          <ol>
            {audience.topPages.map((p) => (
              <li key={p.path}><span className="adm-ranks-name">{p.path}</span><span>{nf.format(p.views)}</span></li>
            ))}
          </ol>
        </div>
        <div>
          <div className="adm-ranks-title">Pays (7 j)</div>
          <ol>
            {audience.countries.map((c) => (
              <li key={c.country}><span className="adm-ranks-name">{c.country}</span><span>{nf.format(c.views)}</span></li>
            ))}
          </ol>
        </div>
      </div>
    </div>
  );
}

function greeting() {
  const hour = Number(new Intl.DateTimeFormat("fr-FR", { hour: "numeric", hour12: false, timeZone: "Europe/Paris" }).format(new Date()));
  return hour >= 18 || hour < 5 ? "Bonsoir" : "Bonjour";
}

export default function AdminDashboard() {
  const [data, setData] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/admin/overview", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error("failed"))))
      .then(setData)
      .catch(() => setError("Impossible de charger le tableau de bord."));
  }, []);

  if (!data) return <div className="empty-state">{error || "Chargement…"}</div>;

  const { pending, audience, members, community, catalogue } = data;
  const today = new Intl.DateTimeFormat("fr-FR", { weekday: "long", day: "numeric", month: "long", timeZone: "Europe/Paris" }).format(new Date());
  const summary = pending.total
    ? `${pending.total} élément${pending.total > 1 ? "s attendent" : " attend"} ta décision.`
    : "Rien n'attend ta décision : tout est à jour.";

  return (
    <div className="adm-dash">
      <header className="adm-hero">
        <div>
          <div className="adm-hero-date">{today}</div>
          <h1 className="display-font adm-hero-title">{greeting()}{data.admin?.nom ? ` ${data.admin.nom}` : ""}</h1>
          <p className="adm-hero-sub">{summary}</p>
        </div>
        <div className="adm-hero-actions">
          <Link href="/admin/cartes?nouvelle=1" className="btn-primary adm-action"><Plus size={16} aria-hidden="true" /> Ajouter une carte</Link>
          <Link href="/admin/import" className="btn-ghost adm-action"><Upload size={16} aria-hidden="true" /> Importer un lot</Link>
          <Link href="/admin/utilisateurs#message" className="btn-ghost adm-action"><Megaphone size={16} aria-hidden="true" /> Écrire aux membres</Link>
        </div>
      </header>

      <div className="adm-kpis">
        <Kpi icon={Eye} tone="turquoise" label="Visiteurs (7 j)" value={nf.format(audience.visitors7)} href="/admin/stats"
          extra={<Trend now={audience.visitors7} before={audience.visitorsPrev7} />}
          sub={`${nf.format(audience.views7)} pages vues`}>
          <Sparkline values={audience.days.map((d) => d.views)} />
        </Kpi>
        <Kpi icon={Users} tone="gold" label="Membres" value={nf.format(members.total)} href="/admin/utilisateurs"
          sub={[members.new30 ? `+${members.new30} ce mois-ci` : null, members.unverified ? `${members.unverified} e-mail${members.unverified > 1 ? "s" : ""} non vérifié${members.unverified > 1 ? "s" : ""}` : null].filter(Boolean).join(" · ") || null} />
        <Kpi icon={Layers} tone="orange" label="Catalogue" value={nf.format(catalogue.summary.cards)} href="/admin/cartes"
          sub={`cartes · ${catalogue.summary.collections} collections · ${catalogue.summary.characters} personnages`} />
        <Kpi icon={Activity} tone="violet" label="Activité (30 j)" value={nf.format(community.checked30)}
          sub={`cartes cochées · ${members.active30} membre${members.active30 > 1 ? "s" : ""} actif${members.active30 > 1 ? "s" : ""} · ${community.messages30} message${community.messages30 > 1 ? "s" : ""} · ${community.listings} annonce${community.listings > 1 ? "s" : ""} · ${community.openTrades + community.completedTrades} échange${community.openTrades + community.completedTrades > 1 ? "s" : ""}`} />
      </div>

      <div className="adm-grid">
        <Panel title="À traiter" className="adm-queue-panel"
          aside={<span className={`adm-badge${pending.total ? " hot" : ""}`}><Inbox size={14} aria-hidden="true" /> {pending.total}</span>}>
          <Queue items={data.queue} />
        </Panel>
        <Panel title="À compléter dans le catalogue" className="adm-todo-panel">
          <Todo todo={catalogue.todo} />
        </Panel>
        <Panel title="Avancement des collections" className="adm-archive-panel"
          aside={<Link href="/admin/collections" className="adm-panel-link">Gérer</Link>}>
          <Archive archive={catalogue.archive} />
        </Panel>
        <Panel title="Activité récente" className="adm-activity-panel">
          <Timeline items={data.activity} />
        </Panel>
        <Panel title="Audience — 14 derniers jours" className="adm-audience-panel"
          aside={<Link href="/admin/stats" className="adm-panel-link">Statistiques détaillées</Link>}>
          <Audience audience={audience} />
        </Panel>
      </div>
    </div>
  );
}
