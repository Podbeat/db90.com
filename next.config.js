/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      // Stockage Supabase (scans de cartes, avatars)
      { protocol: "https", hostname: "rwcynpjatybcxmfhrwux.supabase.co" },
      // Domaine du site lui-même (utile si des images y sont référencées en absolu)
      { protocol: "https", hostname: "db90-com.vercel.app" },
      // ⚠️ Si vous configurez un nom de domaine personnalisé (voir état du projet,
      // section "en attente") ou un autre bucket/CDN pour STORAGE_PUBLIC_URL_BASE,
      // ajoutez son hostname ici — sinon les images depuis ce nouvel hôte ne
      // s'afficheront plus (l'optimiseur Next.js les refusera).
    ],
  },
};

module.exports = nextConfig;
