import { prisma } from "@/lib/db";
import RegistreClient from "./RegistreClient";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://db90.org";

export async function generateMetadata({ params }) {
  const { id } = await params;
  const collection = await prisma.collection.findUnique({ where: { id }, select: { id: true, nom: true } });
  if (!collection) return { title: "Collection introuvable — DB Non-Off 90's" };

  const title = `Registre de ${collection.nom} — DB Non-Off 90's`;
  const description = `Les membres qui ont complété la série « ${collection.nom} » et le classement de ceux qui s'en approchent.`;
  const url = `${SITE_URL}/collections/${collection.id}/registre`;

  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: { title, description, url, siteName: "DB Non-Off 90's", type: "website" },
  };
}

// Composant serveur pour les métadonnées ; l'affichage est dans RegistreClient.js.
export default async function RegistrePage({ params }) {
  const { id } = await params;
  return <RegistreClient id={id} />;
}
