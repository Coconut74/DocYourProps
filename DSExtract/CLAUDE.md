# CLAUDE.md — Figma Design System Extractor

## Ce que tu dois construire

Un plugin Figma qui, sur la sélection d'un composant par l'utilisateur, collecte toutes les données disponibles (métadonnées JSON + CSS exporté + documentation textuelle à proximité), les envoie à Claude API, et produit une fiche de vérification structurée exportable en JSON et Markdown.

---

## Architecture

```
figma-ds-extractor/
├── manifest.json
├── code.js      ← sandbox Figma (Plugin API uniquement, pas de fetch)
└── ui.html      ← iframe (fetch autorisé, appels Claude ici)
```

**Règle fondamentale :** `code.js` n'a pas accès au réseau. Tous les appels HTTP se font depuis `ui.html`. La communication passe par `figma.ui.postMessage` (code → ui) et `parent.postMessage` (ui → code).

---

## manifest.json

```json
{
  "name": "DS Extractor",
  "id": "ds-extractor-001",
  "api": "1.0.0",
  "main": "code.js",
  "ui": "ui.html",
  "editorType": ["figma"],
  "documentAccess": "dynamic-page"
}
```

---

## code.js — Extraction (3 sources)

### Déclenchement

```js
figma.showUI(__html__, { width: 520, height: 640, title: "DS Extractor" });

figma.ui.onmessage = async (msg) => {
  if (msg.type === 'extract') {
    const node = figma.currentPage.selection[0];
    if (!node) {
      figma.ui.postMessage({ type: 'error', message: 'Sélectionne un composant.' });
      return;
    }
    if (node.type !== 'COMPONENT' && node.type !== 'COMPONENT_SET') {
      figma.ui.postMessage({ type: 'error', message: 'Sélectionne un composant ou un component set.' });
      return;
    }
    const payload = await buildPayload(node);
    figma.ui.postMessage({ type: 'payload', data: payload });
  }
};
```

### Source 1 — Métadonnées JSON

```js
async function extractMetadata(node) {
  const isSet = node.type === 'COMPONENT_SET';
  const components = isSet ? node.children : [node];

  return {
    id: node.id,
    name: node.name,
    type: node.type,
    description: node.description || '',
    width: Math.round(node.width),
    height: Math.round(node.height),
    variantProperties: isSet ? node.variantGroupProperties : null,
    variants: components.map(c => ({
      name: c.name,
      properties: c.variantProperties || {},
      width: Math.round(c.width),
      height: Math.round(c.height),
      layoutMode: c.layoutMode,
      padding: {
        top: c.paddingTop,
        right: c.paddingRight,
        bottom: c.paddingBottom,
        left: c.paddingLeft,
      },
      itemSpacing: c.itemSpacing,
      primaryAxisAlignItems: c.primaryAxisAlignItems,
      counterAxisAlignItems: c.counterAxisAlignItems,
      children: extractChildren(c, 0, 2), // 2 niveaux max
    })),
  };
}

function extractChildren(node, depth, maxDepth) {
  if (depth >= maxDepth || !('children' in node)) return [];
  return node.children.map(child => ({
    name: child.name,
    type: child.type,
    visible: child.visible,
    fillStyleId: typeof child.fillStyleId === 'string' ? child.fillStyleId : null,
    textStyleId: typeof child.textStyleId === 'string' ? child.textStyleId : null,
    effectStyleId: typeof child.effectStyleId === 'string' ? child.effectStyleId : null,
    boundVariables: child.boundVariables ? summarizeBoundVariables(child.boundVariables) : null,
    characters: child.type === 'TEXT' ? child.characters : undefined,
    fontSize: child.type === 'TEXT' ? child.fontSize : undefined,
    fontName: child.type === 'TEXT' ? child.fontName : undefined,
    children: extractChildren(child, depth + 1, maxDepth),
  }));
}

function summarizeBoundVariables(bv) {
  // Retourner les noms des variables liées pour chaque propriété
  const result = {};
  for (const [key, binding] of Object.entries(bv)) {
    if (Array.isArray(binding)) {
      result[key] = binding.map(b => {
        const v = figma.variables.getVariableById(b.id);
        return v ? v.name : b.id;
      });
    } else if (binding?.id) {
      const v = figma.variables.getVariableById(binding.id);
      result[key] = v ? v.name : binding.id;
    }
  }
  return result;
}
```

### Source 2 — Export CSS

```js
async function extractCSS(node) {
  const isSet = node.type === 'COMPONENT_SET';
  const components = isSet ? node.children : [node];
  const cssMap = {};

  for (const variant of components) {
    try {
      const css = await variant.getCSSAsync();
      cssMap[variant.name] = css;
    } catch (e) {
      cssMap[variant.name] = null;
    }
  }
  return cssMap;
}
```

### Source 3 — Documentation à proximité

Chercher sur la même page les frames qui ne sont pas des composants, dont le nom suggère de la documentation, et qui sont spatalement proches du composant sélectionné.

```js
function extractNearbyDocs(componentNode) {
  const DOC_KEYWORDS = ['usage', 'anatomy', 'do', "don't", 'dont', 'spec', 'guideline', 'documentation', 'example', 'règle'];
  const PROXIMITY_THRESHOLD = 2000; // px — à ajuster selon les conventions de l'équipe

  const page = figma.currentPage;
  const cx = componentNode.x + componentNode.width / 2;
  const cy = componentNode.y + componentNode.height / 2;

  const nearbyFrames = page.children.filter(node => {
    if (node.type !== 'FRAME' && node.type !== 'GROUP') return false;
    if (node.id === componentNode.id) return false;

    // Vérifier la proximité spatiale
    const nx = node.x + node.width / 2;
    const ny = node.y + node.height / 2;
    const distance = Math.sqrt((cx - nx) ** 2 + (cy - ny) ** 2);
    if (distance > PROXIMITY_THRESHOLD) return false;

    // Vérifier si le nom contient un mot-clé de documentation
    const nameLower = node.name.toLowerCase();
    return DOC_KEYWORDS.some(kw => nameLower.includes(kw));
  });

  return nearbyFrames.map(frame => ({
    name: frame.name,
    texts: extractAllText(frame),
  }));
}

function extractAllText(node) {
  const texts = [];
  if (node.type === 'TEXT') texts.push(node.characters);
  if ('children' in node) {
    for (const child of node.children) {
      texts.push(...extractAllText(child));
    }
  }
  return texts.filter(Boolean);
}
```

### Assemblage du payload

```js
async function buildPayload(node) {
  const [metadata, css, docs] = await Promise.all([
    extractMetadata(node),
    extractCSS(node),
    Promise.resolve(extractNearbyDocs(node)),
  ]);

  return {
    meta: {
      extractedAt: new Date().toISOString(),
      pageName: figma.currentPage.name,
    },
    metadata,
    css,
    documentation: docs,
  };
}
```

---

## ui.html — Interface + Appel Claude

### Structure de la page

```
[Header : nom du composant détecté]
[Bouton "Extraire ce composant"]
[Barre de progression : Extraction → Analyse IA → Génération]
[Onglets : Aperçu JSON | Aperçu Markdown]
[Boutons export : Télécharger .json | Télécharger .md]
[Section config (collapsible, stockée en localStorage) :
  - Sélecteur provider : Anthropic | OpenAI-compatible
  - Champ endpoint URL (pré-rempli selon provider, éditable)
  - Champ nom du modèle (éditable)
  - Champ clé API]
```

### Configuration provider (stockée en localStorage)

Le plugin est agnostique au provider. L'utilisateur configure dans l'UI :

```js
const DEFAULT_CONFIG = {
  endpoint: 'https://api.groq.com/openai/v1/chat/completions',
  model: 'llama-3.3-70b-versatile', // modèle Groq recommandé pour les tâches d'analyse JSON
  apiKey: '',                        // clé Groq — https://console.groq.com/keys
  provider: 'openai-compatible',     // Groq est OpenAI-compatible
};
```

Les providers supportés et leurs différences :

| Provider | Endpoint | Format | Header auth |
|----------|----------|--------|-------------|
| Anthropic (Claude) | `https://api.anthropic.com/v1/messages` | `{ messages, system, model }` + header `anthropic-version` | `x-api-key` |
| OpenAI-compatible | `https://api.openai.com/v1/chat/completions` | `{ messages: [{role:'system',...}, {role:'user',...}], model }` | `Authorization: Bearer` |

Un backend maison peut aussi être renseigné comme endpoint OpenAI-compatible.

### Appel API (avec adapter provider)

```js
async function callLLM(payload, config) {
  const { endpoint, model, apiKey, provider } = config;
  
  let requestBody, headers;

  if (provider === 'anthropic') {
    headers = {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    };
    requestBody = {
      model,
      max_tokens: 8000,
      system: SYSTEM_PROMPT,
      messages: [{ role: 'user', content: JSON.stringify(payload) }],
    };
  } else {
    // Format OpenAI-compatible (OpenAI, Mistral, Groq, backend maison...)
    headers = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    };
    requestBody = {
      model,
      max_tokens: 8000,
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: JSON.stringify(payload) },
      ],
    };
  }

  const response = await fetch(endpoint, {
    method: 'POST',
    headers,
    body: JSON.stringify(requestBody),
  });

  const data = await response.json();

  // Extraction du texte selon le format de réponse
  let text;
  if (provider === 'anthropic') {
    text = data.content.filter(b => b.type === 'text').map(b => b.text).join('');
  } else {
    text = data.choices?.[0]?.message?.content || '';
  }

  const clean = text.replace(/```json|```/g, '').trim();
  return JSON.parse(clean);
}
```

### System prompt

```
Tu es un expert design system. Tu reçois les données extraites d'un composant Figma : métadonnées JSON, CSS exporté de chaque variante, et documentation textuelle trouvée à proximité dans le fichier.

Ton travail est de produire une fiche de vérification structurée pour ce composant.

Réponds UNIQUEMENT avec un objet JSON valide (sans backticks, sans texte avant ou après) ayant cette structure exacte :

{
  "verification": {
    "name": "nom-kebab-case du composant",
    "description": "description claire en une phrase",
    "variants": {
      "[propriété]": ["valeur1", "valeur2"]
    },
    "anatomy": [
      {
        "slot": "nom-du-slot",
        "required": true,
        "description": "rôle fonctionnel",
        "order": 1
      }
    ],
    "tokens": {
      "color": ["liste des tokens couleur attendus"],
      "typography": ["liste des styles typo attendus"],
      "spacing": ["valeurs de spacing attendues"],
      "radius": "valeur de radius",
      "shadow": "valeur de shadow si applicable"
    },
    "rules": [
      {
        "id": "rule-001",
        "description": "règle formulée de façon testable",
        "severity": "error | warning",
        "source": "inferred | documented"
      }
    ],
    "usage": {
      "do": ["cas d'usage valides extraits de la doc"],
      "dont": ["cas à éviter extraits de la doc"]
    }
  },
  "docs": "documentation complète en Markdown, avec sections : Description, Variantes, Anatomie, Tokens, Règles, Usage"
}

Instructions supplémentaires :
- Les règles doivent être formulées de façon vérifiable programmatiquement quand c'est possible (ex: "paddingLeft doit être 16px" plutôt que "le padding est correct")
- Si la documentation Figma est absente ou vide, infère les règles depuis le CSS et les métadonnées
- Le CSS exporté par Figma est la source de vérité pour les valeurs calculées (préfère-le aux métadonnées brutes pour les valeurs numériques)
- Normalise les noms de slots en kebab-case
- Détecte les états (hover, focus, disabled, loading, error) depuis les noms de variantes
```

---

## Format des fichiers exportés

### component-[nom].verification.json

Le champ `verification` de la réponse Claude, enrichi des métadonnées d'extraction :

```json
{
  "$schema": "ds-extractor/verification/v1",
  "extractedAt": "...",
  "figmaNodeId": "...",
  "component": { ... }
}
```

### component-[nom].docs.md

Le champ `docs` de la réponse Claude, préfixé d'un en-tête :

```markdown
# [Nom du composant]
> Extrait le [date] depuis Figma · Analysé par Claude claude-sonnet-4-20250514

[contenu généré]
```

---

## Edge cases à gérer

- **Nœud sélectionné n'est pas un composant** → message d'erreur explicite dans l'UI
- **`getCSSAsync()` renvoie une erreur** → continuer sans le CSS, noter l'absence dans le payload
- **Aucune frame de doc à proximité** → `documentation: []`, Claude infère depuis CSS + JSON uniquement
- **`textStyleId` est un Symbol (mixed)** → traiter comme `null`
- **Réponse Claude non parseable** → afficher le texte brut en fallback, ne pas crasher
- **Clé API manquante** → bloquer le bouton Extraire et afficher un prompt pour saisir la clé
- **Payload trop grand** → si > 80 000 caractères, tronquer les CSS en ne gardant que les propriétés uniques par variante

---

## Ce que ce plugin produit pour la suite

Le fichier `component-[nom].verification.json` est la source de vérité pour le **plugin vérificateur**. Ne pas modifier son schéma sans mettre à jour les deux plugins en même temps. Le champ `rules[].id` sert de clé de référence dans les rapports de vérification.
