import MarketClient from "./MarketClient";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://db90.org";

export const metadata = {
  title: "Marché : acheter et vendre des cartes Dragon Ball vintage | DB Non-Off 90's",
  description:
    "Annonces d'achat et de vente de cartes Dragon Ball non-officielles entre collectionneurs, avec cote indicative par état de conservation.",
  alternates: { canonical: `${SITE_URL}/marche` },
  openGraph: {
    title: "Marché : acheter et vendre des cartes Dragon Ball vintage | DB Non-Off 90's",
    description:
      "Annonces d'achat et de vente de cartes Dragon Ball non-officielles entre collectionneurs, avec cote indicative par état de conservation.",
    url: `${SITE_URL}/marche`,
    siteName: "DB Non-Off 90's",
    type: "website",
  },
  twitter: { card: "summary_large_image" },
};

// Composant serveur (pas de "use client") pour permettre des métadonnées propres à cette
// page. L'affichage reste entièrement dans MarketClient.js, inchangé.
export default function MarchePage() {
  return <MarketClient />;
}
