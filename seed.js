const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcryptjs");

const prisma = new PrismaClient();

async function main() {
  const email = process.env.SEED_ADMIN_EMAIL || "admin@archives-carddass.local";
  const password = process.env.SEED_ADMIN_PASSWORD || "changez-moi-123";

  const existing = await prisma.adminUser.findUnique({ where: { email } });
  if (!existing) {
    const passwordHash = await bcrypt.hash(password, 10);
    await prisma.adminUser.create({
      data: { nom: "Administrateur", email, passwordHash, role: "admin" },
    });
    console.log(`Compte admin créé : ${email} / ${password}`);
    console.log("Changez ce mot de passe dès la première connexion.");
  } else {
    console.log("Un compte admin existe déjà, aucune création nécessaire.");
  }

  const count = await prisma.collection.count();
  if (count === 0) {
    await prisma.collection.create({
      data: {
        nom: "Z Color Bord Bleu",
        annee: "1995",
        editeur: null,
        pays: "Taïwan",
        total: null,
        cards: {
          create: [
            { numero: "ZCB-01", personnage: "Vegeta", rarete: "Prisme étoile", description: "Les adieux de Végéta à son fils" },
            { numero: "ZCB-02", personnage: "Z Team", rarete: "Prisme rose", description: "Trunks Goku Vegeta et Piccolo" },
          ],
        },
      },
    });
    console.log("Collection d'exemple créée.");
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
