# DocYourComp

Plugin Figma (Figma Design) — squelette de base.

## Installation

```bash
npm install
```

## Build

```bash
npm run build      # compile une fois code.ts -> code.js
npm run watch      # recompile à chaque modification
```

## Charger dans Figma

1. Ouvrir Figma Desktop
2. Menu → Plugins → Development → Import plugin from manifest…
3. Sélectionner `manifest.json` à la racine de ce dossier
4. Lancer via Plugins → Development → DocYourComp

## Structure

- `manifest.json` — déclaration du plugin
- `code.ts` — code sandbox (API `figma.*`), compilé vers `code.js`
- `ui.html` — panneau UI (HTML/CSS/JS inline)
- `tsconfig.json` — config TypeScript
- `package.json` — scripts et dépendances dev
