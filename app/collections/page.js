import CollectionsListClient from "./CollectionsListClient";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://db90.org";

export const metadata = {
  title: "Toutes les collections de cartes Dragon Ball vintage | DB Non-Off 90's",
  description:
    "Parcourez l'ensemble des séries de cartes Dragon Ball non-officielles des années 90 répertoriées sur le site : origine, année, nombre de cartes et état d'avancement du catalogage.",
  alternates: { canonical: `${SITE_URL}/collections` },
  openGraph: {
    title: "Toutes les collections de cartes Dragon Ball vintage | DB Non-Off 90's",
    description:
      "Parcourez l'ensemble des séries de cartes Dragon Ball non-officielles des années 90 répertoriées sur le site.",
    url: `${SITE_URL}/collections`,
    siteName: "DB Non-Off 90's",
    type: "website",
  },
  twitter: { card: "summary_large_image" },
};

// Composant serveur (pas de "use client") pour permettre des métadonnées propres à cette
// page. L'affichage reste entièrement dans CollectionsListClient.js, inchangé.
export default function CollectionsPage() {
  return <CollectionsListClient />;
}
