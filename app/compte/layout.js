"use client";

import { useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useLanguage } from "@/components/LanguageProvider";
import { useCurrentUser } from "@/components/CurrentUserProvider";

// Layout partagé de tout l'espace /compte : vérifie la connexion une seule fois (plutôt
// que sur chaque page), et affiche la navigation par onglets entre les différentes
// sections (profil, collection, recherchées, ventes).
export default function CompteLayout({ children }) {
  const { t } = useLanguage();
  const pathname = usePathname();
  const router = useRouter();
  const { me, loading } = useCurrentUser();

  // Les pages de connexion/inscription vivent sous /compte mais ne doivent ni exiger
  // d'être déjà connecté, ni afficher la navigation par onglets réservée à l'espace membre.
  const isAuthPage = pathname === "/compte/connexion" || pathname === "/compte/inscription";

  useEffect(() => {
    if (isAuthPage || loading) return;
    if (!me) router.push("/compte/connexion");
  }, [isAuthPage, loading, me, router]);

  if (isAuthPage) return children;

  if (loading || !me) {
    return <div className="container page"><div className="empty-state">{t.loading}</div></div>;
  }

  const tabs = [
    { href: "/compte", label: t.navMyProfile },
    { href: "/compte/collection", label: t.myCollectionTitle },
    { href: "/compte/recherchees", label: t.myWantedTitle },
    { href: "/compte/ventes", label: t.navMySales },
    { href: "/compte/echanges", label: t.matchesTitle },
  ];

  return (
    <div className="container page">
      <div className="nav-links" style={{ marginBottom: "1.5rem", paddingBottom: "0.6rem", borderBottom: "1px solid var(--line)" }}>
        {tabs.map((tab) => (
          <Link key={tab.href} href={tab.href} className={`nav-btn ${pathname === tab.href ? "active" : ""}`}>
            {tab.label}
          </Link>
        ))}
      </div>
      {children}
    </div>
  );
}
