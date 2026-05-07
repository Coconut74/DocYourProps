# DocPlugin — guide pour Claude

Plugin Figma (Figma Design uniquement). TypeScript + UI HTML vanilla.

## Fonctionnalité actuelle

Documentation automatique de composants. L'utilisateur sélectionne un `COMPONENT`, un `COMPONENT_SET` ou une `INSTANCE` ; l'UI affiche un aperçu PNG + le nom + des **checkboxes** pour choisir les sections à inclure ; le bouton "Réaliser la doc" génère **une fiche par section cochée**, posées côte à côte à droite du composant (espacées de `SHEET_GAP = 32px`).

### Style de fiche

Deux familles de styles coexistent :

- **Style "admin"** (`makeAdminSheet` + `makeAdminSheetHeader`) — utilisé pour la fiche **Propriétés** (et la fiche unifiée Props + Combinaisons). Calqué sur la maquette Figma `osmose.proginov.com` (PODS / Proginov).
  - Frame blanche, largeur **adaptative** (`ADMIN_SHEET_WIDTH_DEFAULT = 700` quand props seul ; sinon dérivée de `computeAdminCardLayout(target).sheetW` = 3 cards/row + 32 padding latéral). Padding 32, gap 24, corner radius 12, **stack de 4 drop-shadows** (`y=7/r=3/α=0.02`, `y=4/r=2/α=0.06`, `y=2/r=2/α=0.10`, `y=0/r=1/α=0.12`). `makeAdminSheet` accepte un `sheetWidth` optionnel ; `makeAdminSheetHeader` accepte un `contentWidth` optionnel pour le `FrameTop`.
  - Header (`makeAdminSheetHeader`) en deux blocs : `FrameTop` (row space-between : breadcrumb « icône + `PODS /` + nom du composant » à gauche, `osmose.proginov.com` à droite) + `Title` (32px Medium `#393939` + border-bottom 1px `#CCCCCC`, paddingBottom 16). Le lien `osmose.proginov.com` est rendu en texte simple — l'utilisateur l'attache manuellement comme hyperlink dans Figma. L'icône breadcrumb (`makeBreadcrumbIcon`) est un glyphe 24×24 importé via `figma.createNodeFromSvg` (deux barres parallèles inclinées en `#0C4790`).
  - Tokens dédiés dans `COLOR.ref*` (`refSheetBg`, `refTitlePrimary`, `refBodyText`, `refMutedText`, `refBrand`, `refAccent`, `refHeaderCellBg`, `refBodyCellBg`, `refRowDivider`, `refTitleDivider`, `refCardBg`, `refCardLabel`, `refCellTextStrong`). Pour les cards de matrice redessinées : `refMatrixCardBg = #E6F2FD`, `refMatrixRowBg = #FFFFFF`, `refMatrixRowName = #393939`, `refMatrixRowValue = #808080`, `refMatrixSwitchOn = #007DEB`, `refMatrixSwitchOff = #CCCCCC`, `refMatrixSwitchThumb = #FFFFFF`. Les chips de la colonne **Type** (`makeTypeChip`) délèguent à `makeTag` avec un mapping fixe : BOOLEAN → `TAG_PALETTE_GREEN`, VARIANT → `TAG_PALETTE_PURPLE`, TEXT → `TAG_PALETTE_ORANGE`, INSTANCE_SWAP → `TAG_PALETTE_CYAN`. Les anciens tokens `refChip*` ont été supprimés.
- **Style "elegant"** (`makeSheet` + `makeSheetHeader`) — conservé uniquement pour les sorties PDF (header + tableaux des pages A4). Toutes les fiches canvas (Propriétés, Variables liées) utilisent le style admin. Padding 56px, radius 16, drop-shadow unique, header `nom 12px / titre 36px`.

Palette centralisée dans la constante `COLOR` : tokens "elegant" historiques (bg, bgSubtle, bgChip, divider, dividerStrong, border, textPrimary/Body/Secondary/Muted) **+** tokens `ref*` issus de la maquette osmose.

Fonts (`loadFonts`) : on tente `Colfax` (titres) et `Roboto` (table) en plus d'`Inter` (Regular + Semi Bold). Le cache `FONT = { title, titleMed, body, bodyMed }` exposé globalement retombe automatiquement sur Inter quand Colfax/Roboto ne sont pas disponibles dans le fichier Figma. Toujours utiliser `FONT.*` plutôt qu'un littéral `{ family: ..., style: ... }` pour bénéficier du fallback.

### Sections

1. **Propriétés** — `makeAdminTable` 4 colonnes proportionnelles `[Propriété 142, Description 212, Type 141, Valeurs 141]` (`PROP_COL_WIDTHS`, somme = 636). Le tableau **occupe toute la largeur de contenu disponible** : `buildPropsSection(target, contentWidth)` passe `layout.contentW` quand la matrice est rendue, et `scaleWidths(PROP_COL_WIDTHS, contentWidth)` recalcule chaque colonne en gardant les ratios (la dernière colonne absorbe l'arrondi). Header bg `#F2F2F2`, body bg `#F7F7F7`, border-bottom `#E6E6E6` entre rows. Cellules acceptent `string | SceneNode` (`AdminCellContent`). Description = placeholder fixe `PROP_DESCRIPTION_PLACEHOLDER = "À compléter"`. Type = chip coloré (`makeTypeChip`) avec un (bg, text) par type de prop. Valeurs = liste verticale à puces (`makeBulletList(items)`) — toutes les valeurs sont rendues uniformément (la valeur par défaut n'est plus mise en évidence). `valuesAsItems(p)` retourne juste `string[]`. Le **nom de la prop** passe par `displayPropName(p)` qui préfixe `"Has a "` quand `isPropBoolish(p)` (BOOLEAN ou VARIANT avec deux valeurs `true/false`, `on/off`, `yes/no`). Même prefix appliqué dans la fiche PDF.
2. **Anatomie** — arborescence en `codeBlock` (font mono, bg `COLOR.bgCode`, corner 10, padding 20/24, line-height 160%).
3. **Variables liées** — fiche `makeAdminSheet` + `makeAdminTable` (même header / typo / palette que la fiche Propriétés). Widths `TOKEN_COL_WIDTHS = [296, 140, 200]` (somme = 636 pour s'aligner sur la largeur de contenu admin). Fallback `textFrame` quand aucune variable n'est trouvée ou résolue.
4. **Exemple d'usage** — pseudo-code JSX dans `codeBlock`.
5. **Matrice des props** (rendu sur canvas) — `makeAdminCombinationCard(combo, base, layout, boolishAxes, visualBg)` : card adaptative bg `#E6F2FD`, padding 8, gap 8, radius 12. Largeur card = `max(ADMIN_CARD_MIN_W = 240, componentMaxW + 16 + 16)`, hauteur calculée analytiquement = `2*8 + visualH + 8 + N*32 + (N-1)*4` (avec `N = combo.labels.length`). Visual area radius 8, dimensionnée à `(cardW - 16) × max(ADMIN_VISUAL_MIN_H = 100, componentMaxH + 16)` ; instance centrée. La couleur de fond du visual est **configurable** par l'utilisateur via `options.matrixVisualBg` (hex `#RRGGBB`, défaut `#FFFFFF`) — threadée depuis `buildSheets` → `buildPropsAndMatrixContent` → `buildVariantsSection` → `buildAllAdminCards` → `makeAdminCombinationCard`. La validation passe par `normalizeHex(input)` (regex `^#?[0-9a-fA-F]{6}$`, fallback blanc). Sous le visual, **liste verticale** `Props` qui empile une mini-card par axe (gap 4) :
   - Mini-card : 32px de haut, padding 8/15, radius 6, bg `#FFFFFF`, layout HORIZONTAL FIXED both axes en `primaryAxisAlignItems: "SPACE_BETWEEN"` + `counterAxisAlignItems: "CENTER"`. Name à gauche (Roboto Regular 14 / `#393939`) et value à droite (Roboto Medium 14 / `#808080` / `textAlignHorizontal: "RIGHT"`). Sizing texte par défaut (WIDTH_AND_HEIGHT) — voir bug 1px-collapse plus bas.
   - Si l'axe est booléen (BOOLEAN ou variant aux labels `true/false`, `on/off`, `yes/no` — détecté via `isBoolishOptions`), on rend un `Switch` 28×16 (radius 11, fill `#007DEB` quand on / `#CCCCCC` quand off, thumb 10×10 blanc à `x=14` / `x=4`) à la place du texte de valeur, et le nom de la prop est préfixé par `"Has a "` (ex. `Has a icon`).
   - Layout calculé via `computeAdminCardLayout(target)` qui retourne `{ cardW, visualW, visualH, contentW, sheetW }` ; `contentW = max(636, 3*cardW + 32)` et `sheetW = contentW + 64`. Avec `cardW` minimum à 240, la fiche fait au moins `3*240 + 32 + 64 = 816px` de large quand la matrice est rendue. La grille (`buildAdminFlatGrid`) wrap à `ADMIN_CARDS_PER_ROW = 3` cards par ligne dans `layout.contentW`. Le grouping par axe (`buildAdminLayoutFromCards`) garde la logique récursive du chemin "elegant" mais avec typo Colfax/Roboto et palette ref. `boolishAxes: Set<string>` est calculé une fois dans `buildVariantsSection` et threadé jusqu'au constructeur de card.

**Quand `props` ET `variants` sont cochés** : une seule fiche "Propriétés" via `buildPropsAndMatrixContent` — wrapper Body avec `border-bottom 1px #CCCCCC` et `padding-bottom 24`, contenant : (i) titre nom du composant 24px Medium `#393939`, (ii) `buildSubSection("Props list", buildPropsSection(...))`, (iii) `buildSubSection("Props visual", variants.node, makeTag("X combinaisons"))`. `buildSubSection` rend un en-tête 20px Medium `#393939` (sur une row HORIZONTAL si un `tag` est fourni, sinon directement) + 16px de gap. `buildVariantsSection` retourne `{ node, comboCount }` ; le caption « axes / sort / locks / skipped » a été supprimé, seul le compteur de combinaisons est conservé sous forme de tag à côté du titre. Si seul `props` est coché, on saute le wrapper Body et on passe directement le tableau à `makeAdminSheet`. Si seul `variants` est coché, fiche `makeSheet` "Combinaisons" historique.

**`makeTag(label, palette?)`** rend un chip pill (radius 6, padding 2/8, Roboto Medium 12 / line-height 18). 5 palettes pré-définies dans `TAG_PALETTE_*` : `BLUE` (`#E6F2FD` / `#085FAC` — défaut), `GREEN` (`#ECF7E8` / `#35821B`), `PURPLE` (`#F2EFFC` / `#614CA2`), `ORANGE` (`#FEF0E7` / `#B05112`), `CYAN` (`#E6F9FF` / `#10718D`).

**PDF (`exportAsPdf`)** : pages A4 (515pt de contenu) en **style admin** depuis le restyle. `makePdfHeader` délègue à `makeAdminSheetHeader(...PDF_CONTENT_W, tag?)` → mêmes breadcrumb / `osmose.proginov.com` / titre 32px + bottom divider que les fiches canvas. Gap header→body = `PDF_BODY_GAP = 24`. Les pages utilisent :
- **Propriétés** : `makeAdminTable` avec `PDF_PROP_COL_WIDTHS_A4 = [116, 127, 116, 156]`, cellules type = `makeTypeChip`, valeurs = `makeBulletList(valuesAsItems(p))`, prefix `displayPropName` pour les booleans.
- **Variables liées** : `makeAdminTable` avec `PDF_TOKEN_COL_WIDTHS_A4`.
- **Combinaisons** : `makeAdminCombinationCard` (mêmes cards qu'on-canvas — visual + props rows + switch). Layout calculé via `computeAdminCardLayoutForFixedWidth(target, PDF_CONTENT_W)` qui dérive `cardsPerRow` (max `ADMIN_CARDS_PER_ROW`) du `contentW` constraint au lieu de fixer 3 cards/row. Tag « X combinaisons » (palette BLUE) à côté du titre sur chaque page.

`makeElegantTable`, `makeCombinationCard` et `buildAllCards` (pipeline elegant historique) sont devenus dead code après le restyle PDF — laissés en place pour le moment.

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
- **Bug évité (1px-collapse)** : `layoutWrap: "WRAP"` est sensible — il peut produire un parent ou des enfants à 1px de hauteur dans deux cas distincts :
  1. **Parent WRAP créé directement avec `counterAxisSizingMode: "AUTO"`** : la première reflow peut figer la hauteur à 1px. Solution : créer le WRAP en `counterAxisSizingMode: "FIXED"` avec une hauteur initiale non-nulle (ex. 200), `appendChild` tous les enfants, **puis** flipper en `"AUTO"`. C'est le pattern utilisé dans `buildAdminFlatGrid` et `buildFlatGridFromCards`.
  2. **Enfants WRAP en `primaryAxisSizingMode: "AUTO"`** : Figma peut les ramener à 1px. Solution : tous les enfants du WRAP sont en FIXED hauteur, calculée analytiquement (`cardH = 16 + visualH + 8 + N*32 + (N-1)*4` pour les admin cards).
- **Mini-card props (admin)** : la row HORIZONTAL en FIXED both axes utilise `primaryAxisAlignItems: "SPACE_BETWEEN"` + `counterAxisAlignItems: "CENTER"` avec des textes en sizing par défaut (WIDTH_AND_HEIGHT). Ne **pas** combiner `layoutGrow: 1` + `textAutoResize: "HEIGHT"` sur les textes d'une row entièrement FIXED — Figma peut produire des textes à 1px de hauteur lors du premier layout pass.
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
- `ui.html` — UI 360×540. Deux vues (`#view-main` / `#view-settings-matrix`) togglées via la classe `.view-active` ; pas de routing — un seul `view` actif à la fois. Styles utilisent les variables `--figma-color-*` pour suivre le thème. JS inline.

### UI : architecture deux écrans

- **Écran principal (`#view-main`)** : preview composant + liste des sections (Propriétés / Variables liées / Matrice des props). Chaque ligne de section peut héberger un bouton engrenage (`.gear-btn`) entre le label et le toggle, qui ouvre une vue de paramétrage spécialisée. Pour l'instant seule "Matrice des props" en a un (`#btn-matrix-settings`). Une pastille bleue (`.gear-dot`) s'affiche sur l'engrenage quand un paramétrage non-default est appliqué (groupBy / exclusions / locks). Le bouton est masqué quand la section n'a pas de paramétrage disponible (matrice : axes < 1 ou variants désactivé). Le bouton est cliquable même quand le toggle est OFF — clic sur l'engrenage utilise `stopPropagation` pour ne pas toggler la row.
- **Écran paramétrage matrice (`#view-settings-matrix`)** : header avec bouton retour (←) + titre, body avec les zones `Trier par` / `Exclusions` / `Verrouiller`, footer avec boutons `Annuler` / `Valider`.
- **Édition non-destructive** : ouvrir l'écran de paramétrage clone l'état appliqué dans `pendingGroupByOrder` / `pendingExclusionRules` / `pendingPropLocks` / `pendingMatrixVisualBg`. Les helpers `activeGroupBy()` / `activeRules()` / `activeLocks()` / `activeVisualBg()` retournent le state pending si présent, sinon le state appliqué — toutes les fonctions de rendu et de modification l'utilisent. `Valider` copie pending → applied + persiste. `Annuler` (et le bouton retour) jette pending et revient au main. Une nouvelle sélection de composant force aussi un retour au main.

### UI : couleur de fond du visuel (matrice)

- Section dédiée `#visual-bg-section` dans la vue paramétrage matrice. Trois inputs synchronisés via `setPendingVisualBg(hex)` + `renderVisualBgInputs()` :
  - **Swatch** (`<label class="visual-bg-swatch">`) avec un fond damier transparent et un `<input type="color">` superposé (opacity 0). Le picker natif inclut une **pipette** sur Chrome/Edge/Firefox.
  - **Champ hex** (`<input type="text">`) accepte la saisie manuelle ; valide en live via `HEX_RE = /^#?[0-9a-fA-F]{6}$/` et normalise au blur.
  - **Bouton Reset** qui ramène au défaut `VISUAL_BG_DEFAULT = "#FFFFFF"`.
- Le state `matrixVisualBg` est persisté dans `SavedConfig.matrixVisualBg`. La pastille du gear (`hasActiveMatrixSettings`) s'allume aussi quand `matrixVisualBg !== VISUAL_BG_DEFAULT`.
- Côté sandbox, `normalizeHex` revalide la valeur reçue (mêmes regex/défaut) avant de la passer à `makeAdminCombinationCard`. Même valeur appliquée au PDF via `buildPdfCombinationsPages(target, excludeRules, propLocks, visualBg)`.

### UI : multi-sélection des verrous

- `propLocks` (côté UI et côté `code.ts`) est un `Record<string, string[]>` : pour chaque axe, la liste des labels autorisés. Tableau vide ou clé absente = axe libre (cartésien complet). Tableau non vide = on filtre l'axe à ces valeurs uniquement.
- Rendu : un `.lock-row` par axe, avec une liste de chips `.lock-chip` toggleables (style calqué sur `.axis-chip`). Clic = ajout/retrait dans le tableau de cet axe.
- Migration : `loadSavedConfig` (code.ts) appelle `migratePropLocks` qui détecte l'ancien format `{ axis: "M" }` et le promeut en `{ axis: ["M"] }`. Côté UI, `applySavedConfig` fait la même conversion défensive. Aucune action utilisateur requise.
- Pipeline : `enumerateValidCombinations` (~ligne 1610 de `code.ts`) filtre les `axis.options` pour ne garder que les labels présents dans `propLocks[axis.name]` ; le reste du pipeline (cartésien lazy, dedup, indexing variants) ne change pas.
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
