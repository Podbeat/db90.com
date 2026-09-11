"use client";

// Interrupteur simple : pas d'envoi de version HD pour l'instant, pour économiser l'espace
// de stockage (gratuit, limité) le temps de valider l'usage réel du site. Remettre à `true`
// plus tard réactive l'envoi du fichier original sans rien changer d'autre au code.
const HD_ENABLED = false;

// Redimensionne une image côté navigateur (via <canvas>), pour obtenir une copie légère
// à envoyer à notre serveur (filigrane + compression finale) — la fonction serveur a une
// limite de taille de requête que le fichier original haute définition dépasse facilement.
function resizeInBrowser(file, maxDim = 1600, quality = 0.85) {
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
      canvas.getContext("2d").drawImage(img, 0, 0, width, height);
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
export async function uploadCardImage(file, { watermark = false } = {}) {
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

  const resizedBlob = await resizeInBrowser(file);
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
