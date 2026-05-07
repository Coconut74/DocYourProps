# DocPlugin — guide pour Claude

Plugin Figma (Figma Design uniquement). TypeScript + UI HTML vanilla.

## Fonctionnalité actuelle

Documentation automatique de composants. L'utilisateur sélectionne un `COMPONENT`, un `COMPONENT_SET` ou une `INSTANCE` ; l'UI affiche un aperçu PNG + le nom + des **checkboxes** pour choisir les sections à inclure ; le bouton "Réaliser la doc" génère **une fiche par section cochée**, posées côte à côte à droite du composant (espacées de `SHEET_GAP = 32px`).

### Style de fiche (`makeSheet`)

Chaque fiche : frame blanche en auto-layout vertical, padding 56px, corner radius 16, bordure subtile (`COLOR.border`), drop-shadow douce (`y=8, radius=32, alpha=0.05`). Header (`makeSheetHeader`) :
- Nom du composant en petit (12px Regular, gris `COLOR.textMuted`, letter-spacing 2%)
- Titre de catégorie en gros (36px Semi Bold, presque-noir `COLOR.textPrimary`, line-height 110%)

Palette centralisée dans la constante `COLOR` (bg, bgSubtle, bgChip, bgCode, divider, dividerStrong, border, textPrimary/Body/Secondary/Muted).

### Sections

1. **Propriétés** — tableau "élégant" (`makeElegantTable`) : pas de bordures de cellules, header en majuscule 10px gris+letter-spacing 8%, rangées séparées par dividers 1px (`COLOR.divider`), cellules en padding vertical 14px, line-height 140% sur le body.
2. **Anatomie** — arborescence en `codeBlock` (font mono, bg `COLOR.bgCode`, corner 10, padding 20/24, line-height 160%).
3. **Variables liées** — même `makeElegantTable` que Propriétés, autres widths (`TOKEN_COL_WIDTHS`).
4. **Exemple d'usage** — pseudo-code JSX dans `codeBlock`.
5. **Matrice des props** — **plus un tableau** : grille de cards (3 par ligne, wrap). Chaque card (`makeCombinationCard`) :
   - Visual area (frame `cardW × visualH`, bg `COLOR.bgSubtle`, `clipsContent: true`) avec une vraie instance live (`base.createInstance()` + `inst.setProperties(combo.payload)`) centrée à la main.
   - Divider 1px.
   - Props area en **stack VERTICAL** (pas de wrap) : chaque mini-card (`makePropMiniCard`) = chip HORIZONTAL avec `primaryAxisAlignItems: "SPACE_BETWEEN"` (label à gauche, value à droite) et `layoutAlign: "STRETCH"` pour fill la largeur du card. Bg `COLOR.bgChip`, corner 6, padding 8/12. Label uppercase 10px Semi Bold gris (letter-spacing 4%), value 11px Semi Bold quasi-noir.

**Quand `props` ET `variants` sont cochés** : une seule fiche "Propriétés" est générée via `buildPropsAndMatrixContent` — tableau des props + sous-section "Combinaisons" (titre 20px Semi Bold via `buildSubSection`) + grille de cards. Si seul l'un est coché, fiche dédiée comme avant.

### Logique matrice

- `eligibleAxes(defs)` retourne les axes possibles : VARIANT, BOOLEAN, INSTANCE_SWAP (avec `preferredValues` ≥ 2, résolus via `figma.importComponentByKeyAsync` / `importComponentSetByKeyAsync`). TEXT non éligible.
- `enumerateCombinations(axes, MAX_COMBINATIONS=24)` produit le produit cartésien tronqué à 24. Chaque `Combination` contient `payload` (pour `setProperties`) et `labels` (pour les mini-cards).
- `totalCombinationCount(axes)` calcule le total réel pour la légende (X non affichées).
- `getBaseComponent(target)` : pour COMPONENT_SET → premier variant ; pour COMPONENT → lui-même.
- `computeVisualSize(target)` : `max(width)` × `max(height)` sur les variants (ou la taille du composant pour standalone) + 32px padding, sans clamp dur (la taille de visual est ensuite clampée [220-280 × 120-220] dans `buildVariantsSection`).
- `MATRIX_AXIS_LIMIT = 12` cap sur les options par axe.
- Cellule fallback "—" si `setProperties` jette (combinaison invalide / variant absent).

### Détails d'implémentation à connaître

- `resolveTarget()` normalise la sélection : `INSTANCE` → `mainComponent`, et toute `COMPONENT` enfant d'un `COMPONENT_SET` est remontée au set parent.
- Les clés de `componentPropertyDefinitions` ont la forme `Nom#1234:0` (sauf VARIANT qui sont sans hash) → `stripPropKey` enlève à partir du `#`. Pour `setProperties` on utilise toujours le `rawKey` exact.
- Aperçu UI : `target.exportAsync` + `figma.base64Encode` → `<img src="data:image/png;base64,...">`. Compatible avec `networkAccess: "none"`.
- Tableaux : auto-layout imbriqué, colonnes à largeur fixe (`PROP_COL_WIDTHS`, `TOKEN_COL_WIDTHS`), cellules en `counterAxisSizingMode: "FIXED"` + `resize(width, 1)`, rangées en `layoutAlign: "STRETCH"` pour égaliser les hauteurs. Texte interne `textAutoResize: "HEIGHT"` + `resize(width - 16, h)` pour wrap (padding-right de la cellule = 16, padding-left = 0 → texte aligné au bord gauche du divider).
- Fonts : Inter Regular + Inter Semi Bold. Pour le mono, `loadFonts()` essaye JetBrains Mono → Source Code Pro → Roboto Mono → fallback Inter Regular.
- `boundVariables` : forme polymorphe (alias direct, array, objet imbriqué) ; `collectBoundVariableIds` lit `.id` partout.
- Cards de matrice : tout en FIXED — `card`, `propsArea` et chaque mini-card. Hauteur calculée **analytiquement** (pas de flip AUTO/FIXED par card) : `cardH = visualH + 1 + (28 + n × miniH + (n-1) × 6)`. `miniH` est mesuré une fois par génération via `getMiniCardHeight()` (cache `cachedMiniCardH`, reset par `resetCardMetricsCache()` au début de `generateDoc`/`exportAsPdf`). Le cache mesure les deux variantes (texte vs booléen avec switch) et garde le max.
- **Bug évité** : `layoutWrap: "WRAP"` sur un parent dont les enfants ont `primaryAxisSizingMode: "AUTO"` peut produire des enfants à 1px de hauteur. Solution actuelle : tous les enfants du WRAP sont en FIXED hauteur (calculée analytiquement). Pas besoin de double flip.
- **Pipeline combinaisons (refactor perf)** : `enumerateValidCombinations(target, allAxes)` valide les combos AVANT toute création d'instance. Pour `COMPONENT_SET`, un `VariantIndex: Map<canonicalKey, ComponentNode>` indexe les enfants existants ; chaque combo théorique fait un lookup O(1) → si le variant n'existe pas, skip immédiat (aucune instance jetée). `IndexedCombination` porte aussi `labelMap` (lookup O(1) pour `buildLayoutFromCards` au lieu de `.find()` linéaire) et `setPropsPayload` (props non-VARIANT à appliquer sur l'instance — VARIANT déjà locked-in via `variantSource`).
- **Async batching** : `buildAllCards()` crée les cards par batches de `CARD_BATCH_SIZE = 50`, avec `await new Promise(r => setTimeout(r, 0))` entre batches → l'UI Figma reste interactive sur les gros volumes. Notification de progression via `figma.notify(..., { timeout: 800 })`.
- **Phase d'assemblage** : `buildLayoutFromCards(combos, cards, groupBy, ...)` est synchrone — prend les cards déjà construites et assemble la hiérarchie de groupes (sub-headers `Axe : Valeur` à chaque niveau). Plus rapide que de faire grouping + création de cards en même temps.
- `setProperties` est sync et peut throw sur une combo invalide. Avec le pipeline refactoré, c'est protégé par try/catch défensif uniquement pour les non-VARIANT props (BOOLEAN/INSTANCE_SWAP) ; les VARIANT sont déjà résolus via `variantSource`.
- INSTANCE_SWAP comme axe : nécessite `figma.importComponentByKeyAsync` (résolution async). Si non accessible (librairie non chargée), on skip cette valeur. Si on retombe sous 2 valeurs, l'axe entier est ignoré.
- **PDF parallèle** : `exportAsPdf` exporte tous les JPEGs via `Promise.all` (au lieu de `for await`) — Figma fan-out l'IO si possible.

## Stack

- **TypeScript** strict, compilé en CommonJS via `tsc`
- **Pas de bundler** : `code.ts` → `code.js` à la racine ; `ui.html` reste tel quel avec son JS inline
- **Pas de framework UI** — HTML/CSS/JS vanilla. Si l'UI grossit, envisager esbuild avant React

## Commandes

```bash
npm run build      # compile une fois
npm run watch      # recompile en continu
```

Pour tester : Figma Desktop → Plugins → Development → Import plugin from manifest → `manifest.json`. Après chaque `build`, recharger via Plugins → Development → DocPlugin (Figma recharge le `code.js` à chaque lancement).

## Architecture

Deux contextes isolés qui communiquent par messages :

- **Sandbox** (`code.ts` → `code.js`) : seul endroit où `figma.*` est accessible. Pas de DOM, pas de `fetch` navigateur.
- **UI** (`ui.html`) : iframe avec DOM complet. Pas d'accès à `figma.*`.

Communication :
- UI → sandbox : `parent.postMessage({ pluginMessage: { type: '...', ... } }, '*')`
- Sandbox → UI : `figma.ui.postMessage({...})`, écoute via `window.onmessage` côté UI
- Sandbox écoute : `figma.ui.onmessage = (msg) => {...}`

## Fichiers clés

- `manifest.json` — `editorType: ["figma"]`, `main: code.js`, `ui: ui.html`. `networkAccess` est verrouillé sur `none` ; l'élargir explicitement si on appelle une API.
- `code.ts` — point d'entrée sandbox. Toute action sur le document Figma passe par ici.
- `ui.html` — UI 360×520. Styles utilisent les variables `--figma-color-*` pour suivre le thème. JS inline.
- `tsconfig.json` — **`lib: ["es6"]` est obligatoire** : les `lib` DOM par défaut entrent en conflit avec `@figma/plugin-typings` (redéclaration de `console`, `fetch`). Ne pas remettre `dom` ici.

## Conventions

- Toujours `await figma.loadFontAsync(...)` avant de toucher `node.characters` ou `node.fontName`. Pour ce plugin on charge `Inter Regular` et `Inter Semi Bold`.
- Le plugin reste ouvert après une action (pas de `figma.closePlugin()` automatique) : l'utilisateur peut sélectionner un autre composant et générer une nouvelle doc. Fermeture via le bouton "Fermer" (envoie `{type:'close'}`).
- La sélection est poussée vers l'UI via `figma.on("selectionchange", ...)` + un envoi initial au démarrage.
- Messages typés : préférer `{ type: 'verb-noun', ... }` (ex. `'generate-doc'`, `'selection'`).
- Garder le `code.js` généré hors de Git (déjà dans `.gitignore`).

## À éviter

- Mettre du code DOM dans `code.ts` (pas de `document`, `window`, `fetch` — utiliser l'API Figma ou passer par l'UI).
- Importer des packages npm dans `code.ts` sans bundler : `tsc` seul ne résout pas les `import` de `node_modules`. Si besoin, ajouter esbuild.
- Utiliser `figma.root` pour itérer toutes les pages sans raison — préférer `figma.currentPage` quand c'est suffisant (perf).

## Pistes pour la suite

- Quasi-gratuit à ajouter : `node.description` + `node.documentationLinks` en haut de la fiche (champs déjà saisis dans Figma).
- Plus coûteux : compteur d'instances dans le fichier (`figma.root.findAllWithCriteria({types:["INSTANCE"]})`), reactions de prototyping, résolution des `INSTANCE_SWAP` defaults via `importComponentByKeyAsync`.
- Refactor : si `code.ts` dépasse ~600 lignes, basculer sur `module: "system"` + `outFile` ou ajouter esbuild pour permettre des modules.
