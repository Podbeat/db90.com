import { prisma } from "@/lib/db";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://db90-com.vercel.app";

// Le catalogue change souvent (imports en masse, ajouts) : on génère le sitemap à la
// demande plutôt qu'une fois pour toutes au moment du build, pour qu'il reste à jour.
export const dynamic = "force-dynamic";

export default async function sitemap() {
  const [cards, collections] = await Promise.all([
    prisma.card.findMany({ select: { id: true, updatedAt: true } }),
    prisma.collection.findMany({ select: { id: true, updatedAt: true } }),
  ]);

  const staticRoutes = [
    { url: `${SITE_URL}/`, changeFrequency: "daily", priority: 1 },
    { url: `${SITE_URL}/collections`, changeFrequency: "daily", priority: 0.9 },
    { url: `${SITE_URL}/informations`, changeFrequency: "monthly", priority: 0.3 },
  ].map((r) => ({ ...r, lastModified: new Date() }));

  const collectionRoutes = collections.map((c) => ({
    url: `${SITE_URL}/collections/${c.id}`,
    lastModified: c.updatedAt,
    changeFrequency: "weekly",
    priority: 0.8,
  }));

  const cardRoutes = cards.map((c) => ({
    url: `${SITE_URL}/cartes/${c.id}`,
    lastModified: c.updatedAt,
    changeFrequency: "monthly",
    priority: 0.6,
  }));

  return [...staticRoutes, ...collectionRoutes, ...cardRoutes];
}
