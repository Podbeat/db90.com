import { ImageResponse } from "next/og";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { prisma } from "@/lib/db";
import { computeParticipation } from "@/lib/participation";
import { SHOWCASE_SIZE } from "@/lib/showcase";

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const alt = "Classeur d'un membre de DB Non-Off 90's";

// Par défaut, ImageResponse demande un cache d'un an (« immutable ») : un classeur modifié
// n'apparaîtrait jamais dans les nouveaux partages. On limite à une heure (navigateurs et
// CDN) ; les réseaux sociaux gardent de toute façon leur propre copie.
const CACHE_HEADERS = { "cache-control": "public, max-age=3600, s-maxage=3600, stale-while-revalidate=86400" };

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://db90.org";
const SITE_HOST = SITE_URL.replace(/^https?:\/\//, "").replace(/^www\./, "").replace(/\/$/, "");

const COLORS = {
  bg: "#0d1526",
  binder: "#0a1120",
  line: "#24385c",
  text: "#eef2fa",
  soft: "#c3d0e6",
  gold: "#e0b04a",
  goldText: "#f2d68f",
  accent: "#f2711c",
  cream: "#faf6ee",
};

// Polices du site (Archivo Black pour les titres, IBM Plex Sans pour le texte), incluses
// dans le dépôt (assets/fonts, licence OFL). Si elles manquent, police par défaut.
async function loadFonts() {
  try {
    const [archivo, plex, plexSemi] = await Promise.all([
      readFile(join(process.cwd(), "assets/fonts/archivo-black-latin-400-normal.woff")),
      readFile(join(process.cwd(), "assets/fonts/ibm-plex-sans-latin-400-normal.woff")),
      readFile(join(process.cwd(), "assets/fonts/ibm-plex-sans-latin-600-normal.woff")),
    ]);
    return [
      { name: "Archivo Black", data: archivo, weight: 400, style: "normal" },
      { name: "IBM Plex Sans", data: plex, weight: 400, style: "normal" },
      { name: "IBM Plex Sans", data: plexSemi, weight: 600, style: "normal" },
    ];
  } catch (e) {
    return [];
  }
}

async function loadLogo() {
  try {
    const png = await readFile(join(process.cwd(), "public/logo.png"));
    return `data:image/png;base64,${png.toString("base64")}`;
  } catch (e) {
    return `${SITE_URL}/logo.png`;
  }
}

function Chip({ children, gold }) {
  return (
    <div
      style={{
        display: "flex", alignItems: "center", height: 44, padding: "0 18px", borderRadius: 999,
        border: `2px solid ${gold ? "rgba(224, 176, 74, 0.6)" : COLORS.line}`,
        color: gold ? COLORS.goldText : COLORS.text, fontSize: 22, fontWeight: 600,
      }}
    >
      {children}
    </div>
  );
}

function Logo({ src }) {
  return (
    <div style={{ display: "flex", alignSelf: "flex-start", padding: "12px 18px", borderRadius: 12, background: COLORS.cream }}>
      <img src={src} width={239} height={44} style={{ width: 239, height: 44 }} />
    </div>
  );
}

// Taille du pseudo : les pseudos longs (jusqu'à 20 caractères) restent sur une ligne.
const usernameSize = (name) => Math.max(36, Math.min(64, Math.floor((64 * 12) / Math.max(name.length, 1))));

function BottomBar() {
  return (
    <div
      style={{
        position: "absolute", left: 0, right: 0, bottom: 0, height: 8,
        backgroundImage: "linear-gradient(90deg, #c9500f, #f2711c, #e0b04a, #f2711c, #c9500f)",
      }}
    />
  );
}

export default async function Image({ params }) {
  const { username } = await params;
  const [fonts, logo] = await Promise.all([loadFonts(), loadLogo()]);
  const options = { ...size, fonts: fonts.length ? fonts : undefined, headers: CACHE_HEADERS };

  const user = await prisma.user.findUnique({
    where: { username: String(username).toLowerCase() },
    select: { id: true, username: true, showcase: true },
  });

  if (!user) {
    return new ImageResponse(
      (
        <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", background: COLORS.bg }}>
          <Logo src={logo} />
          <BottomBar />
        </div>
      ),
      options
    );
  }

  const [participation, ownedShowcase] = await Promise.all([
    computeParticipation(user.id),
    user.showcase.length
      ? prisma.userCard.findMany({
          where: { userId: user.id, status: "owned", cardId: { in: user.showcase } },
          select: { cardId: true, card: { select: { image: true } } },
        })
      : [],
  ]);
  const imageById = new Map(ownedShowcase.map((e) => [e.cardId, e.card.image]));
  const showcase = user.showcase.filter((id) => imageById.has(id)).slice(0, SHOWCASE_SIZE);

  const completedIds = participation.completedCollectionIds || [];
  let completedChip = null;
  if (completedIds.length === 1) {
    const col = await prisma.collection.findUnique({ where: { id: completedIds[0] }, select: { nom: true } });
    if (col) completedChip = `${col.nom} complète`;
  } else if (completedIds.length > 1) {
    completedChip = `${completedIds.length} collections complètes`;
  }

  const chips = (
    <div style={{ display: "flex", gap: 12 }}>
      <Chip>{`${participation.totalPoints} point${participation.totalPoints > 1 ? "s" : ""}`}</Chip>
      {completedChip && <Chip gold>{completedChip}</Chip>}
    </div>
  );
  const url = <div style={{ display: "flex", fontSize: 26, fontWeight: 600, color: COLORS.accent }}>{`${SITE_HOST}/u/${user.username}`}</div>;
  const name = (
    <div style={{ display: "flex", fontFamily: "Archivo Black", fontSize: usernameSize(user.username), lineHeight: 1.05, color: COLORS.text }}>
      {user.username}
    </div>
  );

  // Sans classeur : carte de profil simple (initiale, pseudo, points, adresse).
  if (showcase.length === 0) {
    return new ImageResponse(
      (
        <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", gap: 64, padding: "0 72px", background: COLORS.bg, color: COLORS.text, fontFamily: "IBM Plex Sans" }}>
          <div
            style={{
              display: "flex", alignItems: "center", justifyContent: "center", width: 300, height: 300, borderRadius: 150,
              background: "#1a2c4d", border: `6px solid ${COLORS.gold}`, color: COLORS.gold, fontFamily: "Archivo Black", fontSize: 150,
            }}
          >
            {user.username.charAt(0).toUpperCase()}
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
            <Logo src={logo} />
            <div style={{ display: "flex", fontSize: 26, fontWeight: 600, color: COLORS.gold }}>Collectionneur sur DB Non-Off 90's</div>
            {name}
            <div style={{ display: "flex", fontSize: 26, color: COLORS.soft }}>{`${participation.ownedCount} carte${participation.ownedCount > 1 ? "s" : ""} Dragon Ball non officielles dans sa collection`}</div>
            {chips}
            {url}
          </div>
          <BottomBar />
        </div>
      ),
      options
    );
  }

  const slots = Array.from({ length: SHOWCASE_SIZE }, (_, i) => showcase[i] || null);
  const rows = [slots.slice(0, 3), slots.slice(3, 6), slots.slice(6, 9)];
  const subtitle =
    showcase.length > 1
      ? `Ses ${showcase.length} cartes Dragon Ball non officielles préférées`
      : "Sa carte Dragon Ball non officielle préférée";

  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", gap: 56, padding: "0 64px 0 48px", background: COLORS.bg, color: COLORS.text, fontFamily: "IBM Plex Sans" }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 12, padding: 16, borderRadius: 18, background: COLORS.binder, border: `2px solid ${COLORS.line}`, flexShrink: 0 }}>
          {rows.map((row, r) => (
            <div key={r} style={{ display: "flex", gap: 12 }}>
              {row.map((id, c) => {
                const src = id && imageById.get(id);
                return src ? (
                  <img key={c} src={src} width={128} height={179} style={{ width: 128, height: 179, objectFit: "cover", borderRadius: 6 }} />
                ) : (
                  <div key={c} style={{ display: "flex", width: 128, height: 179, borderRadius: 6, background: "#101b31", border: "2px solid #1c2c4c" }} />
                );
              })}
            </div>
          ))}
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 18, minWidth: 0 }}>
          <Logo src={logo} />
          <div style={{ display: "flex", fontSize: 26, fontWeight: 600, color: COLORS.gold }}>Le classeur de</div>
          <div style={{ display: "flex", marginTop: -14 }}>{name}</div>
          <div style={{ display: "flex", fontSize: 26, lineHeight: 1.35, color: COLORS.soft }}>{subtitle}</div>
          {chips}
          {url}
        </div>
        <BottomBar />
      </div>
    ),
    options
  );
}
