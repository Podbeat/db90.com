import { prisma } from "@/lib/db";
import UserProfileClient from "./UserProfileClient";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://db90.org";

export async function generateMetadata({ params }) {
  const { username } = await params;
  const user = await prisma.user.findUnique({
    where: { username: username.toLowerCase() },
    select: { username: true, bio: true, showcase: true },
  });
  if (!user) return { title: "Profil introuvable — DB Non-Off 90's" };

  const title = `${user.username} — DB Non-Off 90's`;
  const description =
    user.bio?.slice(0, 155) ||
    (user.showcase?.length
      ? `Le classeur de ${user.username} : ses cartes Dragon Ball non officielles préférées, sa collection et ses recherches sur DB Non-Off 90's.`
      : `Collection et cartes recherchées de ${user.username} sur DB Non-Off 90's.`);
  const url = `${SITE_URL}/u/${user.username}`;

  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: { title, description, url, siteName: "DB Non-Off 90's", type: "profile" },
    // L'image de partage (opengraph-image.js) montre le classeur du membre.
    twitter: { card: "summary_large_image", title, description },
  };
}

// Composant serveur (pas de "use client") pour permettre des métadonnées par profil.
// Next.js 15 fournit `params` sous forme de Promise ici : on l'attend et on ne transmet
// au client que le username déjà résolu.
export default async function PublicProfilePage({ params }) {
  const { username } = await params;
  return <UserProfileClient username={username} />;
}
