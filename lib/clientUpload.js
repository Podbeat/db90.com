"use client";

// Interrupteur simple : pas d'envoi de version HD pour l'instant, pour économiser l'espace
// de stockage (gratuit, limité) le temps de valider l'usage réel du site. Remettre à `true`
// plus tard réactive l'envoi du fichier original sans rien changer d'autre au code.
const HD_ENABLED = false;

// Renforce la netteté d'une image déjà dessinée sur un canvas, via une convolution 3x3
// classique ("sharpen"). Utile pour les vieux scans un peu flous. Ce n'est pas une IA de
// super-résolution (type Real-ESRGAN) — impossible à faire tourner gratuitement et
// rapidement dans un navigateur ou une fonction serverless — mais un filtre de netteté
// réel, gratuit, sans dépendance, qui améliore visiblement un scan flou.
function sharpenCanvas(ctx, width, height) {
  const src = ctx.getImageData(0, 0, width, height);
  const data = src.data;
  const output = new Uint8ClampedArray(data.length);
  const kernel = [0, -1, 0, -1, 5, -1, 0, -1, 0];

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = (y * width + x) * 4;
      for (let c = 0; c < 3; c++) {
        let sum = 0;
        let k = 0;
        for (let ky = -1; ky <= 1; ky++) {
          const yy = Math.min(height - 1, Math.max(0, y + ky));
          for (let kx = -1; kx <= 1; kx++) {
            const xx = Math.min(width - 1, Math.max(0, x + kx));
            sum += data[(yy * width + xx) * 4 + c] * kernel[k++];
          }
        }
        output[idx + c] = sum;
      }
      output[idx + 3] = data[idx + 3];
    }
  }
  src.data.set(output);
  ctx.putImageData(src, 0, 0);
}

// Redimensionne une image côté navigateur (via <canvas>), pour obtenir une copie légère
// à envoyer à notre serveur (filigrane + compression finale) — la fonction serveur a une
// limite de taille de requête que le fichier original haute définition dépasse facilement.
function resizeInBrowser(file, { maxDim = 1600, quality = 0.85, sharpen = false } = {}) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const objectUrl = URL.createObjectURL(file);
    img.onload = () => {
      let { width, height } = img;
      if (width > maxDim || height > maxDim) {
        const scale = maxDim / Math.max(width, height);
        width = Math.round(width * scale);
        height = Math.round(height * scale);
      }
      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d");
      ctx.drawImage(img, 0, 0, width, height);
      if (sharpen) sharpenCanvas(ctx, width, height);
      canvas.toBlob(
        (blob) => {
          URL.revokeObjectURL(objectUrl);
          if (blob) resolve(blob);
          else reject(new Error("Échec du redimensionnement de l'image."));
        },
        "image/jpeg",
        quality
      );
    };
    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error("Impossible de lire l'image."));
    };
    img.src = objectUrl;
  });
}

/**
 * Envoie une image. Tant que HD_ENABLED est à false (réglage actuel) : seule une copie
 * redimensionnée est envoyée pour devenir la version d'affichage, le fichier original
 * n'est jamais stocké — économise l'espace de stockage gratuit le temps de valider le site.
 *
 * Quand HD_ENABLED repasse à true : le fichier original est en plus envoyé directement au
 * stockage (URL signée), sans jamais passer par notre serveur — évite la limite de taille
 * de requête sur les gros scans.
 *
 * Retourne { url, hdUrl } dans tous les cas ; hdUrl vaut null tant que le HD est désactivé.
 */
export async function uploadCardImage(file, { watermark = false, sharpen = false } = {}) {
  let hdUrl = null;

  if (HD_ENABLED) {
    const presignRes = await fetch("/api/upload/presign", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ filename: file.name, contentType: file.type || "application/octet-stream" }),
    });
    const presignData = await presignRes.json();
    if (!presignRes.ok) {
      throw new Error(presignData.error || "Échec de préparation de l'envoi.");
    }

    const putRes = await fetch(presignData.uploadUrl, {
      method: "PUT",
      body: file,
      headers: { "Content-Type": file.type || "application/octet-stream" },
    });
    if (!putRes.ok) {
      throw new Error("Échec de l'envoi du fichier original au stockage.");
    }

    hdUrl = presignData.publicUrl;
  }

  const resizedBlob = await resizeInBrowser(file, { sharpen });
  const fd = new FormData();
  fd.append("file", resizedBlob, "display.jpg");
  fd.append("watermark", watermark ? "true" : "false");

  const displayRes = await fetch("/api/upload", { method: "POST", body: fd });
  const displayData = await displayRes.json();
  if (!displayRes.ok) {
    throw new Error(displayData.error || "Échec du traitement de l'image.");
  }

  return { url: displayData.url, hdUrl };
}

/**
 * Propose un scan pour une carte, côté visiteur connecté (pas admin) — même redimensionnement
 * côté navigateur que l'upload admin, mais envoyé à un point d'entrée séparé qui place la
 * proposition en attente de validation au lieu de modifier la carte directement.
 */
export async function submitCardScan(cardId, file) {
  const resizedBlob = await resizeInBrowser(file, {});
  const fd = new FormData();
  fd.append("file", resizedBlob, "scan.jpg");

  const res = await fetch(`/api/cards/${cardId}/submissions`, { method: "POST", body: fd });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || "Échec de l'envoi du scan.");
  }
  return data;
}
