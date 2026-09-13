/**
 * Traduit un texte libre (présentation de collection, description de carte…) vers
 * l'anglais, le chinois traditionnel et le chinois simplifié, en un seul appel à l'API
 * Anthropic. Nécessite ANTHROPIC_API_KEY dans .env ; en son absence, ou en cas d'échec
 * de l'appel, échoue silencieusement (l'affichage public retombe alors sur le texte
 * français) : une panne de traduction ne doit jamais empêcher un enregistrement.
 */
async function translateFreeText(text) {
  const empty = { en: null, zhTW: null, zhCN: null };
  if (!text || !text.trim()) return empty;

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return empty;

  try {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 1500,
        system:
          'Tu traduis un texte descriptif lié à une carte à collectionner vintage, pour un site d\'archive communautaire. Réponds UNIQUEMENT avec un objet JSON valide, sans aucun texte avant ou après, ni balises markdown, au format exact : {"en": "...", "zhTW": "...", "zhCN": "..."}. "en" : traduction anglaise naturelle. "zhTW" : traduction en chinois traditionnel, registre naturel pour des collectionneurs à Taïwan/Hong Kong. "zhCN" : traduction en chinois simplifié, registre naturel pour des collectionneurs en Chine continentale. Conserve le sens, le ton et les noms propres du texte source (personnages, séries...), sans ajouter ni omettre d\'information.',
        messages: [{ role: "user", content: text }],
      }),
    });

    if (!res.ok) return empty;

    const data = await res.json();
    const textBlock = (data.content || []).find((b) => b.type === "text")?.text || "";
    const cleaned = textBlock.replace(/```json|```/g, "").trim();
    const parsed = JSON.parse(cleaned);

    return {
      en: parsed.en || null,
      zhTW: parsed.zhTW || null,
      zhCN: parsed.zhCN || null,
    };
  } catch (e) {
    console.error("Échec de la traduction automatique :", e.message);
    return empty;
  }
}

// Conservé pour compatibilité : alias explicite de translateFreeText.
const translateCollectionDescription = translateFreeText;

module.exports = { translateFreeText, translateCollectionDescription };
