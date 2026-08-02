# ExpLore — Contexte projet pour Claude Code

## Projet
ExpLore (capitales E et L, E initial majuscule) : jeu géoculturel
mobile sur Lyon.
Joueurs = "Explorateurs de la Mémoire" (EN : "Memory Explorers").
Ne pas employer "archéologue". Trois verbes :
Explorer · Collectionner · Découvrir.

## Topologie du repo (TRÈS IMPORTANT)

### Site vitrine : `/index.html` + ressources racine
- Landing page publique d'ExpLore
- URL : explorestudio.github.io/expLore-project/
- Pages liées (chargées par `index.html`) : `lore.html`,
  `carte-vieux-lyon.html`, `wiki.html`
- **Ces 4 fichiers forment un tout** : si on modifie une
  référence visuelle ou textuelle dans l'un, vérifier les
  autres
- Cible : prospects, partenaires (institutions culturelles,
  collectivités, écoles, tourisme), presse, futurs joueurs
- Push = mise en prod immédiate via GitHub Pages
- Pas de Service Worker ici

### Prototype PWA : `/app/index.html`
- Application jouable, wrappée en APK via Bubblewrap
- URL : explorestudio.github.io/expLore-project/app/
- ~632 Ko, contient images base64 inline (décision pesée,
  ne pas changer sans m'avoir consulté)
- Map : MapLibre GL + OpenFreeMap tiles (PAS Mapbox)
- i18n : système data-fr / data-en
- **Service Worker présent : INCRÉMENTER LA VERSION CACHE
  à chaque push** (sinon les utilisateurs gardent l'ancienne
  version)
- Push = mise à jour de l'app pour tous les joueurs existants

### Sandbox : `/app/explore_sandbox.html`
- Terrain d'expérimentation : mécaniques de jeu, UI,
  prototypes d'interactions
- Accompagnée de `/app/explore_design.md` (notes design,
  taxonomie, principes)
- Plus libre sur les expérimentations qu'en production
- Push uniquement si je le demande explicitement

### Archives : `/archive/`
- Anciennes versions gardées pour mémoire (lore-original,
  prototype, prototype_v2, etc.)
- **À ne JAMAIS modifier**. Lecture seule.
- Ne pas non plus s'en servir comme source ("dans
  prototype.html on faisait comme ça...") sans m'avoir
  consulté : ces fichiers reflètent des décisions
  abandonnées.

### Fichier d'appoint : `/app/test.html`
- Brouillon perso pour tester des bouts de code
- Peu utile, peut être modifié librement, ne pas s'inquiéter
  de la cohérence avec le reste

## Règle d'or
**Avant d'éditer un .html, confirmer lequel.** Si je dis
"modifie le bouton dans le hero", il y a un hero sur le
site vitrine ET un sur le prototype. Demande-moi lequel si
c'est ambigu.

## État technique général
- Déploiement : GitHub Pages
- Repo : explorestudio/expLore-project
- Chemin local : D:\ExpLore-project\
- Wrap mobile : Bubblewrap TWA (APK généré pour `/app/`)
- Version Unity en cours (dev externe, hors de ce repo)

## Préférences de travail
- **Edits surgicaux uniquement.** Privilégier les
  modifications ciblées plutôt que réécrire des sections
  entières. Si une modif touche trop de parties
  simultanément, la proposer en plusieurs étapes que je
  valide une par une.
- **Langue : français.** Y compris les logs et commentaires
  de code. Préserver les noms propres historiques français
  même dans la version anglaise du site (attribut data-en).
- **Pas d'over-engineering.** Réponses franches, pas
  rassurantes. Pousse-moi en arrière si une idée est mauvaise.
- **Demande avant action structurante.** Avant de modifier
  l'architecture d'un fichier, lancer une refonte CSS, ou
  toucher au Service Worker du proto, propose le plan,
  attends mon OK.

## Workflow push standard
1. Modifs validées sur le(s) fichier(s)
2. Si modif sur `/app/index.html` → **incrémenter la version
   cache Service Worker** (ex : `'v12'` → `'v13'`)
3. `git add` → `git commit -m "..."` → `git push`
4. GitHub Pages se met à jour automatiquement (1-2 min)

## Principes éditoriaux / game design (impactent copy ET code)
- **Mécaniques** : "Une mécanique qu'on n'utilise pas ne
  devrait pas exister." Difficulté par mécaniques, pas par
  chiffres.
- **Lore** : texture de fond (modèle Hades / Slay the Spire),
  pas narration foregroundée. Onboarding type Pokémon : hook
  simple d'abord ("des cartes sont cachées dans ta ville"),
  lore livré progressivement.
- **Antagonistes** : Collecteurs nommés avec obsessions et
  territoires distincts, pas une organisation faceless.
  Urgence non-punitive : les fragments sont capturés, pas
  détruits.
- **Carnet de bord** : ton documentaire, joueur-scribe
  narrateur, format scrapbook/post-it. Citations de cartes
  entre guillemets, jamais de ventriloquie première personne
  inventée.
- **Cap d'intégrité éditoriale** : ~15 partenaires max, ~25%
  POIs commerciaux max sur le site vitrine.

## Taxonomie stricte (à respecter dans code et contenus)
- "Entité" remplace "Foyer" pour les éléments terrain
- "Pièges" ≠ "Entités" (ne pas confondre)
- L'Explorium se débloque quand le joueur collecte sa
  première "grappe card" (déclencheur structurel, pas
  géographique)

## Ce qu'il ne faut PAS faire sans m'avoir consulté
- Modifier le Service Worker du prototype (au-delà du
  numéro de version cache)
- Toucher au système d'i18n (data-fr / data-en)
- Réécrire des sections entières du HTML (>50 lignes d'un
  coup)
- Extraire les images base64 inline de `/app/index.html`
- Modifier les fichiers dans `/archive/`
- Modifier le prévisionnel Excel ou le business plan
  (passer par claude.ai pour ça)
- Push sans incrémenter la version cache si modif sur
  `/app/index.html`