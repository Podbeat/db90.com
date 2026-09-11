"use client";

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
 * Envoie une image en deux temps :
 * 1. Le fichier ORIGINAL est envoyé directement au stockage (URL signée), sans jamais
 *    passer par notre serveur — évite la limite de taille de requête sur les gros scans.
 * 2. Une copie redimensionnée (légère) est envoyée à notre serveur pour le traitement
 *    final (filigrane optionnel + compression), qui devient la version d'affichage.
 *
 * Retourne { url, hdUrl }, dans le même format qu'avant pour ne rien changer côté appelant.
 */
export async function uploadCardImage(file, { watermark = false } = {}) {
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

  const resizedBlob = await resizeInBrowser(file);
  const fd = new FormData();
  fd.append("file", resizedBlob, "display.jpg");
  fd.append("watermark", watermark ? "true" : "false");

  const displayRes = await fetch("/api/upload", { method: "POST", body: fd });
  const displayData = await displayRes.json();
  if (!displayRes.ok) {
    throw new Error(displayData.error || "Échec du traitement de l'image.");
  }

  return { url: displayData.url, hdUrl: presignData.publicUrl };
}
