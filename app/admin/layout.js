"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard, LineChart, Users, Inbox, Wand2, Layers, Library, UserRound, Upload,
  KeyRound, LogOut, ExternalLink, Menu, X,
} from "lucide-react";

// Menu de l'administration, groupé par thème. « count » renvoie au compteur d'éléments en
// attente (voir /api/admin/pending) affiché à côté du lien.
const GROUPS = [
  {
    title: "Pilotage",
    links: [
      { href: "/admin", label: "Tableau de bord", Icon: LayoutDashboard },
      { href: "/admin/stats", label: "Statistiques", Icon: LineChart },
    ],
  },
  {
    title: "Communauté",
    links: [
      { href: "/admin/utilisateurs", label: "Membres", Icon: Users },
      { href: "/admin/moderation", label: "Modération", Icon: Inbox, count: "total" },
    ],
  },
  {
    title: "Catalogue",
    links: [
      { href: "/admin/atelier", label: "Atelier d'intégration", Icon: Wand2 },
      { href: "/admin/cartes", label: "Cartes", Icon: Layers },
      { href: "/admin/collections", label: "Collections", Icon: Library },
      { href: "/admin/personnages", label: "Personnages", Icon: UserRound },
      { href: "/admin/import", label: "Import en masse", Icon: Upload },
    ],
  },
  {
    title: "Compte",
    links: [{ href: "/admin/compte", label: "Mon compte", Icon: KeyRound }],
  },
];

const PUBLIC_PATHS = ["/admin/login", "/admin/mot-de-passe-oublie", "/admin/reinitialiser-mot-de-passe"];

const isActive = (pathname, href) => (href === "/admin" ? pathname === "/admin" : pathname === href || pathname.startsWith(`${href}/`));

export default function AdminLayout({ children }) {
  const pathname = usePathname();
  const router = useRouter();
  const [pending, setPending] = useState(null);
  const [menuOpen, setMenuOpen] = useState(false);

  // Compteurs rafraîchis à chaque changement de page ; le menu mobile se referme.
  useEffect(() => {
    setMenuOpen(false);
    if (PUBLIC_PATHS.includes(pathname)) return;
    fetch("/api/admin/pending", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then(setPending)
      .catch(() => {});
  }, [pathname]);

  // Une page de modération signale chaque décision : les compteurs se mettent à jour.
  useEffect(() => {
    const refresh = () =>
      fetch("/api/admin/pending", { cache: "no-store" })
        .then((r) => (r.ok ? r.json() : null))
        .then(setPending)
        .catch(() => {});
    window.addEventListener("admin-pending-changed", refresh);
    return () => window.removeEventListener("admin-pending-changed", refresh);
  }, []);

  if (PUBLIC_PATHS.includes(pathname)) return <>{children}</>;

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/admin/login");
    router.refresh();
  }

  const current = GROUPS.flatMap((g) => g.links).find((l) => isActive(pathname, l.href));
  const total = pending?.total || 0;

  return (
    <div className="admin-shell">
      <aside className={`admin-side${menuOpen ? " open" : ""}`}>
        <button type="button" className="admin-menu-toggle" aria-expanded={menuOpen} onClick={() => setMenuOpen((o) => !o)}>
          {menuOpen ? <X size={18} aria-hidden="true" /> : <Menu size={18} aria-hidden="true" />}
          <span className="admin-menu-current">{current?.label || "Administration"}</span>
          {total > 0 && <span className="admin-nav-count">{total}</span>}
        </button>
        <div className="admin-side-body">
          <div className="admin-side-kicker">Administration</div>
          <nav aria-label="Administration">
            {GROUPS.map((g) => (
              <div key={g.title} className="admin-nav-group">
                <div className="admin-nav-title">{g.title}</div>
                {g.links.map((l) => {
                  const active = isActive(pathname, l.href);
                  const count = l.count ? pending?.[l.count] || 0 : 0;
                  return (
                    <Link key={l.href} href={l.href} className={`admin-nav-link${active ? " active" : ""}`} aria-current={active ? "page" : undefined}>
                      <l.Icon size={17} aria-hidden="true" />
                      <span className="admin-nav-label">{l.label}</span>
                      {count > 0 && <span className="admin-nav-count">{count}</span>}
                    </Link>
                  );
                })}
              </div>
            ))}
          </nav>
          <div className="admin-side-foot">
            <a href="/" target="_blank" rel="noopener noreferrer" className="admin-side-action">
              <ExternalLink size={15} aria-hidden="true" /> Voir le site
            </a>
            <button type="button" className="admin-side-action" onClick={handleLogout}>
              <LogOut size={15} aria-hidden="true" /> Se déconnecter
            </button>
          </div>
        </div>
      </aside>
      <main className="admin-main">{children}</main>
    </div>
  );
}
