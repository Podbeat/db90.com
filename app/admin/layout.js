"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { LogOut } from "lucide-react";

export default function AdminLayout({ children }) {
  const pathname = usePathname();
  const router = useRouter();

  if (pathname === "/admin/login") {
    return <>{children}</>;
  }

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/admin/login");
    router.refresh();
  }

  const links = [
    { href: "/admin", label: "Tableau de bord" },
    { href: "/admin/stats", label: "Statistiques" },
    { href: "/admin/cartes", label: "Cartes" },
    { href: "/admin/collections", label: "Collections" },
    { href: "/admin/utilisateurs", label: "Utilisateurs" },
    { href: "/admin/scans", label: "Scans proposés" },
    { href: "/admin/reports", label: "Signalements" },
    { href: "/admin/import", label: "Import en masse" },
    { href: "/admin/compte", label: "Mon compte" },
  ];

  return (
    <div className="container page">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem", flexWrap: "wrap", gap: "0.75rem" }}>
        <div className="nav-links">
          {links.map((l) => (
            <Link key={l.href} href={l.href} className={`nav-btn ${pathname === l.href ? "active" : ""}`}>
              {l.label}
            </Link>
          ))}
        </div>
        <button className="btn-ghost" onClick={handleLogout} style={{ display: "flex", alignItems: "center", gap: "0.35rem" }}>
          <LogOut size={14} /> Se déconnecter
        </button>
      </div>
      {children}
    </div>
  );
}
