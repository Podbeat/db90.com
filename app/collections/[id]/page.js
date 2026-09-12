import { prisma } from "@/lib/db";
import CollectionDetailClient from "./CollectionDetailClient";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://db90-com.vercel.app";

export async function generateMetadata({ params }) {
  const collection = await prisma.collection.findUnique({ where: { id: params.id } });
  if (!collection) return { title: "Collection introuvable — DB Non-Off 90's" };

  const title = `${collection.nom} — DB Non-Off 90's`;
  const description =
    (collection.description && collection.description.slice(0, 155)) ||
    `Série de cartes Dragon Ball non-officielles "${collection.nom}"${collection.pays ? ` (${collection.pays})` : ""}. Catalogue et archive communautaire.`;
  const url = `${SITE_URL}/collections/${collection.id}`;

  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: { title, description, url, siteName: "DB Non-Off 90's", type: "website" },
    twitter: { card: "summary_large_image", title, description },
  };
}

// Composant serveur (pas de "use client") pour permettre des métadonnées par collection.
// L'affichage reste entièrement dans CollectionDetailClient.js, inchangé.
export default function CollectionDetailPage({ params }) {
  return <CollectionDetailClient params={params} />;
}
