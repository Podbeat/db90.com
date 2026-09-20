import HomeClient from "./HomeClient";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://db90.org";

export const metadata = {
  title: "Cartes Dragon Ball vintage non-officielles — Catalogue et collection | DB Non-Off 90's",
  description:
    "Catalogue communautaire des cartes Dragon Ball non-officielles des années 90 (Carddass, PP Card…) éditées en Asie : Hong Kong, Taïwan, Malaisie. Parcourez les collections, suivez votre progression, achetez et vendez entre collectionneurs.",
  alternates: { canonical: `${SITE_URL}/` },
  openGraph: {
    title: "Cartes Dragon Ball vintage non-officielles — Catalogue et collection | DB Non-Off 90's",
    description:
      "Catalogue communautaire des cartes Dragon Ball non-officielles des années 90, éditées en Asie. Parcourez les collections, suivez votre progression, achetez et vendez entre collectionneurs.",
    url: `${SITE_URL}/`,
    siteName: "DB Non-Off 90's",
    type: "website",
  },
  twitter: { card: "summary_large_image" },
};

// Composant serveur (pas de "use client") pour permettre des métadonnées propres à cette
// page plutôt que celles, génériques, du layout racine. L'affichage reste entièrement
// dans HomeClient.js, inchangé.
export default function HomePage() {
  return <HomeClient />;
}
