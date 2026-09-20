import InformationsClient from "./InformationsClient";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://db90.org";

export const metadata = {
  title: "À propos, contribuer et nous soutenir | DB Non-Off 90's",
  description:
    "Tout savoir sur le projet DB Non-Off 90's : comment proposer un scan, signaler une erreur, soutenir le site ou nous contacter.",
  alternates: { canonical: `${SITE_URL}/informations` },
  openGraph: {
    title: "À propos, contribuer et nous soutenir — DB Non-Off 90's",
    description:
      "Tout savoir sur le projet DB Non-Off 90's : comment proposer un scan, signaler une erreur, soutenir le site ou nous contacter.",
    url: `${SITE_URL}/informations`,
    siteName: "DB Non-Off 90's",
    type: "website",
  },
  twitter: { card: "summary_large_image" },
};

// Composant serveur (pas de "use client") pour permettre des métadonnées propres à cette
// page. L'affichage reste entièrement dans InformationsClient.js, inchangé.
export default function InformationsPage() {
  return <InformationsClient />;
}
