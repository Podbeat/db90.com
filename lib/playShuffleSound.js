// Petit clin d'œil sonore sur le bouton "Mélanger" : quelques clics rapprochés qui évoquent
// un mélange de cartes, suivis d'un souffle descendant. Généré à la volée via la Web Audio
// API — aucun fichier audio à héberger, aucune question de droits.
export function playShuffleSound() {
  if (typeof window === "undefined") return;
  try {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const now = ctx.currentTime;

    for (let i = 0; i < 4; i++) {
      const t = now + i * 0.045;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "square";
      osc.frequency.setValueAtTime(900 - i * 60, t);
      gain.gain.setValueAtTime(0.05, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.04);
      osc.connect(gain).connect(ctx.destination);
      osc.start(t);
      osc.stop(t + 0.05);
    }

    const whoosh = ctx.createOscillator();
    const whooshGain = ctx.createGain();
    whoosh.type = "sine";
    whoosh.frequency.setValueAtTime(600, now + 0.18);
    whoosh.frequency.exponentialRampToValueAtTime(120, now + 0.38);
    whooshGain.gain.setValueAtTime(0.08, now + 0.18);
    whooshGain.gain.exponentialRampToValueAtTime(0.001, now + 0.4);
    whoosh.connect(whooshGain).connect(ctx.destination);
    whoosh.start(now + 0.18);
    whoosh.stop(now + 0.42);

    setTimeout(() => ctx.close(), 600);
  } catch (e) {
    // Web Audio indisponible (navigateur, permissions) : silencieux, sans impact fonctionnel.
  }
}
