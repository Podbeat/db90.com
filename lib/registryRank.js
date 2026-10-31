// Classement d'une collection (« registre »), sans accès à la base : utilisé côté serveur
// pour construire le registre, et côté navigateur pour y replacer le membre connecté avec
// son nombre de cartes à jour (la réponse publique est mise en cache une minute).
//
// Une entrée : { user: { username, avatar }, owned, lastAt, completedAt }.
//  - complète (total connu et atteint) → palmarès, dans l'ordre d'arrivée ;
//  - sinon → course vers le total, du plus grand nombre de cartes au plus petit. À égalité,
//    même rang (« 3, 4, 4, 6 ») et celui qui y est arrivé le premier est listé avant.

const time = (d) => (d ? new Date(d).getTime() : 0);

export function rankRegistry(entries, total) {
  const isComplete = (e) => total > 0 && e.owned >= total;
  const completed = entries
    .filter(isComplete)
    .sort((a, b) => time(a.completedAt) - time(b.completedAt));
  const racing = entries
    .filter((e) => !isComplete(e) && e.owned > 0)
    .sort((a, b) => b.owned - a.owned || time(a.lastAt) - time(b.lastAt));

  const ranking = [];
  racing.forEach((e, i) => {
    const sameAsPrevious = i > 0 && racing[i - 1].owned === e.owned;
    const rank = sameAsPrevious ? ranking[i - 1].rank : completed.length + i + 1;
    ranking.push({ ...e, rank });
  });

  return {
    collectors: completed.length + racing.length,
    completedCount: completed.length,
    completed: completed.map((e, i) => ({ ...e, rank: i + 1 })),
    ranking,
  };
}

// Remplace la ligne du membre connecté (peut-être en retard d'une minute) par son nombre
// réel de cartes possédées dans la collection, puis reclasse. Renvoie le registre à jour et
// la ligne du membre (null s'il n'a encore aucune carte de la série).
export function withMyLiveCount(registry, total, username, myOwned) {
  const all = [...registry.completed, ...registry.ranking];
  const previous = all.find((e) => e.user.username === username);
  const others = all.filter((e) => e.user.username !== username);
  const now = new Date().toISOString();

  if (myOwned > 0) {
    const unchanged = previous && previous.owned === myOwned;
    others.push({
      user: previous?.user || { username, avatar: null },
      owned: myOwned,
      lastAt: unchanged ? previous.lastAt : now,
      completedAt: previous?.completedAt && unchanged ? previous.completedAt : now,
      isMe: true,
    });
  }

  const ranked = rankRegistry(others, total);
  const mine = [...ranked.completed, ...ranked.ranking].find((e) => e.isMe) || null;
  return { registry: ranked, mine };
}
