# DocPlugin — guide pour Claude

Plugin Figma (Figma Design uniquement). TypeScript + UI HTML vanilla.

## Fonctionnalité actuelle

Documentation automatique de composants. L'utilisateur sélectionne un `COMPONENT`, un `COMPONENT_SET` ou une `INSTANCE` ; l'UI affiche un aperçu PNG + le nom + des **checkboxes** pour choisir les sections à inclure ; le bouton "Réaliser la doc" génère **une fiche par section cochée**, posées côte à côte à droite du composant (espacées de `SHEET_GAP = 32px`).

### Style de fiche

Deux familles de styles coexistent :

- **Style "admin"** (`makeAdminSheet` + `makeAdminSheetHeader`) — utilisé pour la fiche **Propriétés** (et la fiche unifiée Props + Combinaisons). Calqué sur la maquette Figma `osmose.proginov.com` (PODS / Proginov).
  - Frame blanche, **largeur fixe `ADMIN_SHEET_WIDTH = 700`**, padding 32, gap 24, corner radius 12, **stack de 4 drop-shadows** (`y=7/r=3/α=0.02`, `y=4/r=2/α=0.06`, `y=2/r=2/α=0.10`, `y=0/r=1/α=0.12`).
  - Header (`makeAdminSheetHeader`) en deux blocs : `FrameTop` (row space-between : breadcrumb « icône + `PODS /` + nom du composant » à gauche, `osmose.proginov.com` à droite) + `Title` (32px Medium `#393939` + border-bottom 1px `#CCCCCC`, paddingBottom 16). Le lien `osmose.proginov.com` est rendu en texte simple — l'utilisateur l'attache manuellement comme hyperlink dans Figma.
  - Tokens dédiés dans `COLOR.ref*` (`refSheetBg`, `refTitlePrimary`, `refBodyText`, `refMutedText`, `refBrand`, `refAccent`, `refHeaderCellBg`, `refBodyCellBg`, `refRowDivider`, `refTitleDivider`, `refCardBg`, `refCardLabel`, `refCellTextStrong`, plus `refChip*` pour chaque type de prop).
- **Style "elegant"** (`makeSheet` + `makeSheetHeader`) — conservé pour les autres fiches (Variables liées, sorties PDF). Padding 56px, radius 16, drop-shadow unique, header `nom 12px / titre 36px`.

Palette centralisée dans la constante `COLOR` : tokens "elegant" historiques (bg, bgSubtle, bgChip, divider, dividerStrong, border, textPrimary/Body/Secondary/Muted) **+** tokens `ref*` issus de la maquette osmose.

Fonts (`loadFonts`) : on tente `Colfax` (titres) et `Roboto` (table) en plus d'`Inter` (Regular + Semi Bold). Le cache `FONT = { title, titleMed, body, bodyMed }` exposé globalement retombe automatiquement sur Inter quand Colfax/Roboto ne sont pas disponibles dans le fichier Figma. Toujours utiliser `FONT.*` plutôt qu'un littéral `{ family: ..., style: ... }` pour bénéficier du fallback.

### Sections

1. **Propriétés** — `makeAdminTable` 4 colonnes `[Propriété 126, Description 260, Type 125, Valeurs 125]` (largeurs dans `PROP_COL_WIDTHS`). Header bg `#F2F2F2`, body bg `#F7F7F7`, border-bottom `#E6E6E6` entre rows. Cellules acceptent `string | SceneNode` (`AdminCellContent`). Description = placeholder fixe `PROP_DESCRIPTION_PLACEHOLDER = "À compléter"`. Type = chip coloré (`makeTypeChip`) avec un (bg, text) par type de prop. Valeurs = liste verticale à puces (`makeBulletList`) — la valeur par défaut est mise en accent `#007DEB` Medium. Le mapping prop→valeurs passe par `valuesAsItems(p): { items, defaultIndex }`.
2. **Anatomie** — arborescence en `codeBlock` (font mono, bg `COLOR.bgCode`, corner 10, padding 20/24, line-height 160%).
3. **Variables liées** — `makeElegantTable` style historique, widths `TOKEN_COL_WIDTHS`.
4. **Exemple d'usage** — pseudo-code JSX dans `codeBlock`.
5. **Matrice des props** (rendu sur canvas) — `makeAdminCombinationCard` : card FIXED 201×146, bg `#F3F6F9`, padding 8, gap 8, radius 12. Visual area FIXED 185×85 blanc radius 8 avec instance live (`base.createInstance()` + `setProperties(combo.setPropsPayload)` ; pour COMPONENT_SET on utilise `combo.variantSource.createInstance()` directement, donc plus de `setProperties` pour les axes VARIANT). Label `"PropName = Value"` (joint par ` / ` quand multi-axes) en Roboto 14 Regular `#506177` centré sous le visual. Plus de mini-cards / chips de props sur la card. La grille (`buildAdminFlatGrid`) wrap à 3 cards par ligne dans la `ADMIN_CONTENT_WIDTH = 636`. Le grouping par axe (`buildAdminLayoutFromCards`) garde la logique récursive du chemin "elegant" mais avec typo Colfax/Roboto et palette ref.

**Quand `props` ET `variants` sont cochés** : une seule fiche "Propriétés" via `buildPropsAndMatrixContent` — wrapper Body avec `border-bottom 1px #CCCCCC` et `padding-bottom 24`, contenant : (i) titre nom du composant 24px Medium `#393939`, (ii) `buildSubSection("Props list", buildPropsSection(...))`, (iii) `buildSubSection("Props visual", buildVariantsSection(...))`. `buildSubSection` rend un en-tête 20px Medium `#393939` + 16px de gap. Si seul `props` est coché, on saute le wrapper Body et on passe directement le tableau à `makeAdminSheet`. Si seul `variants` est coché, fiche `makeSheet` "Combinaisons" historique.

**PDF (`exportAsPdf`)** : pages A4 avec `makePdfHeader` style "elegant" + `makeElegantTable` 4 colonnes (`PDF_PROP_COL_WIDTHS_A4 = [100, 175, 100, 140]`) — la colonne Description y est aussi présente avec le même placeholder. Les pages Combinaisons utilisent toujours l'ancien `makeCombinationCard` (mini-cards) et restent indépendantes du restyle on-canvas.

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
- Fonts : Inter Regular + Inter Semi Bold (baseline garantie). En plus, `loadFonts()` tente `Colfax` (Regular + Medium) et `Roboto` (Regular + Medium) en best-effort via `tryLoadFont` ; les nodes texte de la fiche "admin" lisent `FONT.title / titleMed / body / bodyMed` qui pointent sur la première famille disponible. Pour le mono (codeBlock), même approche : JetBrains Mono → Source Code Pro → Roboto Mono → fallback Inter Regular.
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
