import { prisma } from "@/lib/db";
import CardDetailClient from "./CardDetailClient";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://db90.org";

export async function generateMetadata({ params }) {
  const { id } = await params;
  const card = await prisma.card.findUnique({
    where: { id },
    include: { collection: { select: { nom: true } }, personnagePrincipal: true },
  });

  if (!card) return { title: "Carte introuvable — DB Non-Off 90's" };

  const nom = card.personnagePrincipal?.name || card.numero;
  const title = `${nom} — n°${card.numero} — ${card.collection.nom} | DB Non-Off 90's`;
  const description =
    (card.description && card.description.slice(0, 155)) ||
    `Carte Dragon Ball non-officielle "${nom}" (réf. ${card.numero}), série ${card.collection.nom}. Archive communautaire à but non lucratif.`;
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

  // Fil d'Ariane structuré (schema.org) : aide Google à afficher un chemin de
  // navigation (Accueil > Collection > Carte) dans les résultats de recherche plutôt
  // que la seule URL brute. Requête légère, séparée de generateMetadata ci-dessus car
  // Next.js n'en partage pas le résultat entre les deux fonctions.
  const card = await prisma.card.findUnique({
    where: { id },
    select: { numero: true, personnagePrincipal: { select: { name: true } }, collection: { select: { id: true, nom: true } } },
  });

  const breadcrumbJsonLd = card && {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Accueil", item: SITE_URL },
      { "@type": "ListItem", position: 2, name: card.collection.nom, item: `${SITE_URL}/collections/${card.collection.id}` },
      { "@type": "ListItem", position: 3, name: card.personnagePrincipal?.name || `Carte n°${card.numero}` },
    ],
  };

  return (
    <>
      {breadcrumbJsonLd && (
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }} />
      )}
      <CardDetailClient id={id} />
    </>
  );
}
