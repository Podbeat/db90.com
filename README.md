# Archives Carddass

Base de référence pour collectionneurs de cartes Dragon Ball : catalogue public (recherche, filtres, fiches détaillées par carte et par collection) et espace d'administration pour votre équipe (ajout/édition/suppression, import en masse de vos scans).

Ce projet a été construit et **compile avec succès** (`npm run build`) avec Next.js 15 (App Router). Il vous reste à le connecter à une vraie base de données et à un stockage d'images pour le mettre en ligne — voir plus bas.

## Stack technique

- **Next.js 15** (App Router) — site public + espace admin + API, dans un seul projet
- **PostgreSQL** via **Prisma** — base de données réelle, tient sans problème plusieurs milliers de fiches
- **Sessions admin** signées (JWT via `jose`) dans un cookie httpOnly — pas de dépendance à un service tiers
- **Stockage des images** : compatible S3 (Supabase Storage, Cloudflare R2, OVH Object Storage, MinIO...), avec repli automatique sur le disque local en développement
- Aucune dépendance de mise en page tierce (pas de Tailwind) : le style est dans `app/globals.css`, facile à modifier

## Installation en local

1. **Prérequis** : Node.js 20+, et un accès à une base PostgreSQL (voir "Choisir un hébergement" ci-dessous — vous pouvez utiliser une base gratuite Supabase/Neon même juste pour tester en local).

2. Installer les dépendances :
   ```bash
   npm install
   ```

3. Copier le fichier d'environnement et le compléter :
   ```bash
   cp .env.example .env
   ```
   Renseignez au minimum `DATABASE_URL` et `AUTH_SECRET` (générez ce dernier avec `openssl rand -base64 48`).

4. Créer les tables et un premier compte admin :
   ```bash
   npx prisma migrate dev --name init
   npm run seed
   ```
   Le script affiche l'e-mail et le mot de passe du compte admin créé (à changer ensuite). Personnalisez-les via `SEED_ADMIN_EMAIL` / `SEED_ADMIN_PASSWORD` dans `.env` avant de lancer la commande.

5. Lancer le site :
   ```bash
   npm run dev
   ```
   Catalogue public sur `/`, espace admin sur `/admin`.

## Choisir un hébergement (recommandation)

Pour une équipe de 2 à 5 personnes visant plusieurs milliers de fiches, la combinaison la plus simple à mettre en place et à maintenir :

- **Hébergement du site : [Vercel](https://vercel.com)** — déploiement automatique depuis GitHub, offre gratuite largement suffisante pour démarrer, fait par les créateurs de Next.js donc zéro friction.
- **Base de données + stockage des images : [Supabase](https://supabase.com)** — fournit à la fois une base PostgreSQL managée et un stockage de fichiers compatible S3, dans un seul compte gratuit. Copiez l'URL de connexion Postgres dans `DATABASE_URL`, et les identifiants "S3 Compatible Storage" de Supabase dans les variables `STORAGE_*` de `.env.example`.

Alternative si vous préférez tout maîtriser vous-même (plus de travail de configuration, mais aucune dépendance à un service géré) : un VPS (OVH, Hetzner...) avec Docker, PostgreSQL et MinIO. Dites-le-moi si vous voulez que je prépare cette configuration Docker.

Quand vous êtes prêt à déployer sur Vercel, ajoutez les mêmes variables d'environnement que dans `.env.example` depuis les réglages du projet, puis lancez `npx prisma migrate deploy` une fois (localement, pointé sur la base de production) pour créer les tables.

## Importer vos scans existants en masse

Rendez-vous sur `/admin/import` une fois connecté. Préparez :

1. Un fichier **CSV** (exportez depuis Excel ou Google Sheets) avec ces colonnes, dans cet ordre ou non, avec l'en-tête en première ligne :
   ```
   collection, numero, personnage, rarete, description, image
   ```
   - `collection` : nom de la collection (créée automatiquement si elle n'existe pas encore)
   - `numero` : référence interne de la carte (ex. `ZCB-01`) — utile même quand la carte elle-même n'est pas numérotée
   - `personnage` : personnage principal (champ central, utilisé pour filtrer le catalogue) ; les personnages secondaires peuvent être mentionnés dans `description`
   - `rarete` : libre — variante/type de prisme (ex. "Prisme rose"), pas nécessairement une échelle de rareté classique
   - `image` : nom exact du fichier scan correspondant (ex. `0014.jpg`)
2. Tous les fichiers scans correspondants, sélectionnés ensemble dans le second champ du formulaire.

L'import associe chaque ligne à son image par nom de fichier et vous indique en fin d'opération le nombre de cartes créées et le détail des lignes en erreur.

Pour une base de plusieurs milliers de cartes, importez par lots (par exemple collection par collection) plutôt qu'en un seul fichier géant, pour limiter la taille de l'envoi.

## Filigrane automatique sur les nouveaux scans

Depuis `lib/storage.js`, chaque image importée est automatiquement marquée du logo "DB Non-Off 90's" (bas à droite, orientation verticale), **uniquement sur la version d'affichage** — le fichier HD reste toujours intact, sans filigrane, pour rester une archive fidèle.

- Le logo utilisé est `assets/watermark-db-nonoff-90s.png` (déjà détouré, fond transparent). Pour le changer, remplacez ce fichier par une nouvelle version détourée.
- Pour désactiver temporairement le filigrane (par exemple pour une collection différente), ajoutez `DISABLE_WATERMARK=true` dans `.env`.

## Visuel de dos partagé par série

Beaucoup de séries non-officielles ont un dos de carte identique pour toute la série (support "dos carton"). Plutôt que de stocker une image de dos par carte, le dos se configure une seule fois au niveau de la **collection** (`/admin/collections`, champ "Visuel du dos") :

- Il s'affiche automatiquement en en-tête de la page de la collection, et à côté du recto sur chaque fiche carte de cette série (avec son propre lien HD).
- Si une série a plusieurs variantes de dos, gérez-la comme plusieurs collections distinctes (ex. "Z Color Bord Bleu — Dos A" / "— Dos B") en attendant une éventuelle gestion par variante.

## Séries au total inconnu

Si vous ne connaissez pas le nombre total de cartes d'une série (fréquent pour les sets non-officiels), laissez le champ "Nombre total de cartes connu" vide dans l'admin. Le site affiche alors "X cartes archivées · série en cours de complétion" plutôt qu'une progression sur un total arbitraire, et vous pouvez ajouter de nouvelles cartes au fil de vos découvertes sans jamais avoir à corriger un total.

## Deux versions de chaque scan : affichage compressé + original HD

Chaque image importée (via l'admin ou l'import en masse) est automatiquement déclinée en deux fichiers, gérés par `lib/storage.js` :

- **Version d'affichage** (`image`) : redimensionnée (~900px de large) et compressée en JPEG. C'est elle qui s'affiche dans le catalogue, les grilles et les fiches — rapide à charger, y compris pour une base de plusieurs milliers de cartes.
- **Version haute définition** (`imageHD`) : le fichier original, jamais modifié. Sur chaque fiche carte, un lien "Voir le scan en haute définition" pointe directement vers ce fichier — utile pour examiner un détail, un hologramme, ou vérifier l'authenticité d'une carte.

Le redimensionnement utilise la librairie `sharp` (déjà incluse dans `package.json`).

## Signalements publics

Chaque fiche carte publique affiche un bouton "Signaler une erreur". N'importe quel visiteur peut décrire ce qui est incorrect (sans créer de compte), avec un contact optionnel pour être recontacté. Ces signalements arrivent dans `/admin/reports`, filtrables par statut (nouveaux / traités / ignorés), avec un lien direct vers la fiche concernée et un compteur sur le tableau de bord admin.

## Structure du projet

```
app/
  page.js                  Catalogue public (recherche, filtres, pagination)
  collections/              Liste et détail des collections
  cartes/[id]/               Fiche détaillée d'une carte (URL partageable)
  admin/                    Espace protégé : tableau de bord, CRUD, import
  api/                      Routes API (collections, cartes, upload, import, auth)
lib/
  db.js                     Client Prisma
  auth.js                   Sessions admin (JWT)
  storage.js                Sauvegarde des images (local ou S3-compatible)
  csv.js                    Parseur CSV maison (sans dépendance)
prisma/
  schema.prisma             Modèle de données (Collection, Card, AdminUser)
  seed.js                   Création du premier compte admin
```

## Sécurité — à faire avant la mise en ligne publique

- Changez le mot de passe admin créé par le script `seed` dès votre première connexion.
- Utilisez une valeur `AUTH_SECRET` longue et aléatoire, différente entre développement et production.
- Ajoutez un compte par membre de l'équipe plutôt que de partager un seul mot de passe (actuellement, seul le script `seed` crée des comptes ; dites-le-moi si vous voulez une page d'admin dédiée à la gestion des comptes).
- La dépendance `xlsx` a volontairement été écartée du projet (vulnérabilités connues sans correctif) au profit d'un import CSV avec un parseur maison.
- Lancez `npm audit` régulièrement et maintenez Next.js à jour.
