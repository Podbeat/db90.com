/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    // Chaque combinaison (image × largeur) transformée compte comme une "transformation"
    // auprès de Vercel, mise en cache seulement 1 à 4h par défaut — donc recomptée sans
    // arrêt sur un site à fort trafic d'images. Nos images (scans, avatars) ne changent
    // jamais après publication : chaque nouvel envoi obtient une URL aléatoire propre
    // (voir lib/storage.js), l'ancienne n'est jamais réécrite. Un cache très long est donc
    // sûr et élimine cette recomptabilisation inutile.
    minimumCacheTTL: 31536000, // 1 an
    // Liste par défaut de Next.js : 16 largeurs possibles (8 deviceSizes + 8 imageSizes),
    // donc jusqu'à 16 transformations distinctes pour une seule image selon l'écran du
    // visiteur. Réduite ici aux tailles réellement utilisées sur le site (grille de cartes
    // ~220px, vignettes ~300px, fiche carte ~280px, dos ~70px) pour limiter ce multiplicateur.
    deviceSizes: [220, 300, 384, 640],
    imageSizes: [70, 96, 128, 256],
    remotePatterns: [
      // Stockage Supabase (scans de cartes, avatars)
      { protocol: "https", hostname: "rwcynpjatybcxmfhrwux.supabase.co" },
      // Domaine du site lui-même (utile si des images y sont référencées en absolu)
      { protocol: "https", hostname: "db90-com.vercel.app" },
      { protocol: "https", hostname: "db90.org" },
      { protocol: "https", hostname: "www.db90.org" },
      // ⚠️ Si vous changez un jour de bucket/CDN pour STORAGE_PUBLIC_URL_BASE,
      // ajoutez son hostname ici — sinon les images depuis ce nouvel hôte ne
      // s'afficheront plus (l'optimiseur Next.js les refusera).
    ],
  },
};

module.exports = nextConfig;
