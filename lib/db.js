const { PrismaClient } = require("@prisma/client");

// Sur Vercel (serverless), chaque nouvelle instance de PrismaClient ouvre son propre lot de
// connexions Postgres. Sans ce cache, une invocation "chaude" (conteneur réutilisé par
// Vercel) recréerait un client à chaque appel — sous charge réelle, ça épuise très vite les
// connexions disponibles côté Supabase. On réutilise donc l'instance existante dans TOUS
// les environnements (pas seulement en développement), comme le recommande Prisma pour le
// serverless.
const globalForPrisma = globalThis;

const prisma =
  globalForPrisma.prisma ||
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
  });

globalForPrisma.prisma = prisma;

module.exports = { prisma };
