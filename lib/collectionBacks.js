// Dos supplémentaires d'une série (table CollectionBack), envoyés par le formulaire
// d'administration des collections : on ne garde que des adresses d'images valides, dans
// l'ordre reçu (12 au plus).
export const BACKS_ORDER = { orderBy: [{ position: "asc" }, { createdAt: "asc" }] };
export const BACKS_SELECT = { ...BACKS_ORDER, select: { id: true, image: true, imageHD: true } };

export function backsInput(list) {
  if (!Array.isArray(list)) return null;
  return list
    .filter((b) => b && typeof b.image === "string" && /^https:\/\//.test(b.image))
    .slice(0, 12)
    .map((b, i) => ({ image: b.image, imageHD: typeof b.imageHD === "string" && /^https:\/\//.test(b.imageHD) ? b.imageHD : null, position: i }));
}
