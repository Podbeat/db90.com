const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const sharp = require("sharp");

const useS3 = Boolean(process.env.STORAGE_BUCKET);
const WATERMARK_PATH = path.join(process.cwd(), "assets", "watermark-db-nonoff-90s.png");
const WATERMARK_ENABLED = process.env.DISABLE_WATERMARK !== "true" && fs.existsSync(WATERMARK_PATH);

function safeExt(filename) {
  const ext = path.extname(filename || "").toLowerCase();
  return [".jpg", ".jpeg", ".png", ".webp", ".gif"].includes(ext) ? ext : ".jpg";
}

function randomName(originalName, suffix) {
  return `${Date.now()}-${crypto.randomBytes(6).toString("hex")}${suffix}${safeExt(originalName)}`;
}

/**
 * Superpose le logo "DB Non-Off 90's" en bas à droite de l'image, en pivotant le
 * filigrane à la verticale (comme sur vos scans faits à la main). N'est appliqué
 * qu'à la version d'affichage : le fichier HD reste toujours intact.
 * Désactivable avec DISABLE_WATERMARK=true dans .env.
 */
async function applyWatermark(imageBuffer) {
  if (!WATERMARK_ENABLED) return imageBuffer;

  const base = sharp(imageBuffer);
  const meta = await base.metadata();

  const watermarkWidth = Math.round(meta.width * 0.16);
  const watermark = await sharp(WATERMARK_PATH)
    .resize({ width: watermarkWidth })
    .rotate(-90, { background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png()
    .toBuffer();
  const wmMeta = await sharp(watermark).metadata();

  const margin = Math.round(meta.width * 0.035);
  const left = Math.max(0, meta.width - wmMeta.width - margin);
  const top = Math.max(0, meta.height - wmMeta.height - margin);

  return base.composite([{ input: watermark, left, top }]).toBuffer();
}

async function putObject(buffer, filename, contentType) {
  if (useS3) {
    const { S3Client, PutObjectCommand } = require("@aws-sdk/client-s3");
    const client = new S3Client({
      region: process.env.STORAGE_REGION || "auto",
      endpoint: process.env.STORAGE_ENDPOINT,
      forcePathStyle: true,
      credentials: {
        accessKeyId: process.env.STORAGE_ACCESS_KEY_ID,
        secretAccessKey: process.env.STORAGE_SECRET_ACCESS_KEY,
      },
    });
    await client.send(
      new PutObjectCommand({
        Bucket: process.env.STORAGE_BUCKET,
        Key: filename,
        Body: buffer,
        ContentType: contentType,
        ACL: "public-read",
      })
    );
    const base = process.env.STORAGE_PUBLIC_URL_BASE?.replace(/\/$/, "");
    return `${base}/${filename}`;
  }

  const uploadsDir = path.join(process.cwd(), "public", "uploads");
  fs.mkdirSync(uploadsDir, { recursive: true });
  fs.writeFileSync(path.join(uploadsDir, filename), buffer);
  return `/uploads/${filename}`;
}

/**
 * Enregistre le scan d'une carte en DEUX versions et renvoie leurs URLs publiques :
 * - `display` : copie compressée et redimensionnée (~900px de large, JPEG qualité 82),
 *   utilisée dans le catalogue, les grilles et les fiches — rapide à charger.
 * - `hd` : le fichier original, non modifié, conservé pour le téléchargement en haute
 *   définition (zoom sur les détails, authentification, impression...).
 *
 * En local / sans configuration : écrit dans public/uploads (pratique en développement,
 * mais NE PAS utiliser tel quel en production sur un hébergement sans disque persistant,
 * comme Vercel : configurez STORAGE_* pour un stockage compatible S3).
 */
async function saveImage(buffer, originalName) {
  const hdName = randomName(originalName, "-hd");
  const hdUrl = await putObject(buffer, hdName, "application/octet-stream");

  const resized = await sharp(buffer)
    .rotate()
    .resize({ width: 900, withoutEnlargement: true })
    .toBuffer();

  const watermarked = await applyWatermark(resized);

  const displayBuffer = await sharp(watermarked).jpeg({ quality: 82 }).toBuffer();
  const displayName = randomName(originalName, "-display").replace(/\.[^.]+$/, ".jpg");
  const displayUrl = await putObject(displayBuffer, displayName, "image/jpeg");

  return { display: displayUrl, hd: hdUrl };
}

module.exports = { saveImage, applyWatermark };

