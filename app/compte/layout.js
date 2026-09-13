"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useLanguage } from "@/components/LanguageProvider";

// Layout partagé de tout l'espace /compte : vérifie la connexion une seule fois (plutôt
// que sur chaque page), et affiche la navigation par onglets entre les différentes
// sections (profil, collection, recherchées, ventes).
export default function CompteLayout({ children }) {
  const { t } = useLanguage();
  const pathname = usePathname();
  const router = useRouter();
  const [checked, setChecked] = useState(false);

  // Les pages de connexion/inscription vivent sous /compte mais ne doivent ni exiger
  // d'être déjà connecté, ni afficher la navigation par onglets réservée à l'espace membre.
  const isAuthPage = pathname === "/compte/connexion" || pathname === "/compte/inscription";

  useEffect(() => {
    if (isAuthPage) return;
    fetch("/api/users/me")
      .then((r) => {
        if (!r.ok) {
          router.push("/compte/connexion");
          return;
        }
        setChecked(true);
      })
      .catch(() => router.push("/compte/connexion"));
  }, [isAuthPage, router]);

  if (isAuthPage) return children;

  if (!checked) {
    return <div className="container page"><div className="empty-state">{t.loading}</div></div>;
  }

  const tabs = [
    { href: "/compte", label: t.navMyProfile },
    { href: "/compte/collection", label: t.myCollectionTitle },
    { href: "/compte/recherchees", label: t.myWantedTitle },
    { href: "/compte/ventes", label: t.navMySales },
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
