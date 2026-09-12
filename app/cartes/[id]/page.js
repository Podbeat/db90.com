import { prisma } from "@/lib/db";
import CardDetailClient from "./CardDetailClient";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://db90-com.vercel.app";

export async function generateMetadata({ params }) {
  const { id } = await params;
  const card = await prisma.card.findUnique({
    where: { id },
    include: { collection: { select: { nom: true } } },
  });

  if (!card) return { title: "Carte introuvable — DB Non-Off 90's" };

  const title = `${card.personnage} — n°${card.numero} — ${card.collection.nom} | DB Non-Off 90's`;
  const description =
    (card.description && card.description.slice(0, 155)) ||
    `Carte Dragon Ball non-officielle "${card.personnage}" (réf. ${card.numero}), série ${card.collection.nom}. Archive communautaire à but non lucratif.`;
  const url = `${SITE_URL}/cartes/${card.id}`;

  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: { title, description, url, siteName: "DB Non-Off 90's", type: "article" },
    twitter: { card: "summary_large_image", title, description },
  };
}

// Ce fichier est un composant serveur (pas de "use client") : c'est ce qui permet de
// générer des métadonnées différentes pour chaque carte. Toute la logique d'affichage
// reste dans CardDetailClient.js, inchangée. Next.js 15 fournit `params` sous forme de
// Promise dans les composants serveur : on l'attend ici et on ne transmet au client que
// l'id déjà résolu (un client component ne peut pas "await" une prop directement).
export default async function CardDetailPage({ params }) {
  const { id } = await params;
  return <CardDetailClient id={id} />;
}
