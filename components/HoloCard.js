"use client";

// Léger effet "holo/foil" au survol : un dégradé arc-en-ciel qui suit le curseur, mélangé
// en mode color-dodge. Pur CSS + une poignée de lignes de JS pour suivre la position de la
// souris (aucune dépendance, aucun asset). S'applique à n'importe quel conteneur enfant.
export default function HoloCard({ className = "", children, style, ...props }) {
  function handleMove(e) {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    e.currentTarget.style.setProperty("--holo-x", `${x}%`);
    e.currentTarget.style.setProperty("--holo-y", `${y}%`);
  }

  return (
    <div className={`holo-card ${className}`} style={style} onMouseMove={handleMove} {...props}>
      {children}
    </div>
  );
}
