import ClassementClient from "./ClassementClient";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://db90.org";

export const metadata = {
  title: "Classement des collectionneurs | DB Non-Off 90's",
  description:
    "Le classement des membres les plus actifs de l'archive DB Non-Off 90's : points de participation, collections complétées, contributions validées.",
  alternates: { canonical: `${SITE_URL}/classement` },
  openGraph: {
    title: "Classement des collectionneurs — DB Non-Off 90's",
    description:
      "Le classement des membres les plus actifs de l'archive DB Non-Off 90's : points de participation, collections complétées, contributions validées.",
    url: `${SITE_URL}/classement`,
    siteName: "DB Non-Off 90's",
    type: "website",
  },
  twitter: { card: "summary_large_image" },
};

// Composant serveur (pas de "use client") pour permettre des métadonnées propres à cette
// page. L'affichage reste entièrement dans ClassementClient.js, inchangé.
export default function ClassementPage() {
  return <ClassementClient />;
}
