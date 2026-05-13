# Brief — Figma Design System Extractor (par composant)

## Contexte

L'équipe design maintient un fichier bibliothèque Figma contenant le design system. Chaque composant peut être accompagné de frames de documentation et d'annotations textuelles rédigées par les designers. Il n'existe pas aujourd'hui de moyen d'extraire automatiquement une fiche de référence structurée et exploitable par un outil de vérification.

## Concept

Le plugin fonctionne **composant par composant**. Le designer sélectionne un composant dans Figma, lance l'extraction, et obtient en sortie une fiche de vérification structurée pour ce composant.

L'idée centrale : agréger **toutes les sources d'information disponibles** autour d'un composant et les faire analyser par Claude pour produire un document de référence qu'un humain n'aurait pas le temps d'écrire.

## Flux utilisateur

```
1. Designer sélectionne un composant (ou component set) dans Figma
2. Ouvre le plugin → clique sur "Extraire ce composant"
3. Le plugin collecte toutes les sources disponibles
4. Envoi à Claude pour analyse
5. Affichage + export de la fiche de vérification
```

## Sources d'extraction (inputs)

Le plugin collecte tout ce qui est disponible autour du composant sélectionné.

**Source 1 — Métadonnées JSON (Plugin API)**
- Nom, description Figma, type (COMPONENT / COMPONENT_SET)
- Variantes et leurs propriétés (`variantProperties`)
- Anatomie : arbre des enfants avec nom, type, contraintes de layout
- Tokens liés : `fillStyleId`, `textStyleId`, `effectStyleId`, `boundVariables`
- Dimensions, layout mode, padding, gap, alignment
- États détectés dans les variantes (hover, focus, disabled, loading…)

**Source 2 — Export CSS (Plugin API)**
Figma expose `node.getCSSAsync()` sur chaque nœud. Pour chaque variante du composant, on exporte le CSS et on l'inclut dans le payload. Cela donne à Claude les valeurs réelles et calculées (couleurs résolues, font-size, border-radius…) sans reconstruction depuis les métadonnées brutes.

**Source 3 — Documentation Figma (frames et textes à proximité)**
Dans les fichiers bien tenus, les designers placent à côté des composants :
- Des frames de specs (annotations, mesures, règles d'usage)
- Des frames "Do / Don't"
- Des textes libres de guidelines

Le plugin détecte ces frames sur la même page que le composant (frames non-composants dans un périmètre proche) et extrait :
- Le contenu de tous les nœuds TEXT imbriqués
- Les noms des frames (qui donnent le contexte : "Usage", "Anatomy", "Don't")
- Optionnellement un export PNG de ces frames pour analyse vision

## Ce que Claude produit (output)

Une **fiche de vérification structurée** par composant :

```
component-[nom].verification.json  ← utilisé par le plugin vérificateur
component-[nom].docs.md            ← lisible par l'équipe
```

La fiche contient :

- **Identité** : nom normalisé, description, variantes valides
- **Anatomie** : slots identifiés, obligatoires vs optionnels, ordre attendu
- **Tokens** : liste des tokens que ce composant doit utiliser
- **Règles structurelles** inférées depuis métadonnées + CSS + docs
- **Règles d'usage** extraites de la documentation Figma (Do / Don't, contextes)
- **Contraintes de vérification** formulées de façon testable pour le plugin vérificateur

## Ce qui rend cette approche solide

La combinaison **CSS exporté + JSON métadonnées + documentation textuelle** donne à Claude un niveau d'information qu'aucun parser statique ne peut produire seul :
- Le CSS résout les variables et donne les vraies valeurs calculées
- Le JSON donne la structure et les relations entre nœuds
- La documentation donne l'intention du designer — ce qu'aucune donnée technique ne capture

## Stack technique

| Élément | Choix |
|---------|-------|
| Plugin Figma | JS vanilla, pas de build step |
| Export CSS | `node.getCSSAsync()` — API Figma native |
| Analyse IA | Claude API — `claude-sonnet-4-20250514` |
| Vision (optionnel v2) | `node.exportAsync({ format: 'PNG' })` en base64 |
| Format de sortie | JSON (vérification) + Markdown (documentation) |
| Consommateur | Vue.js + plugin vérificateur (second plugin) |

## Périmètre v1

- Un composant à la fois (pas d'extraction batch)
- Détection automatique des frames de doc à proximité (même page)
- Export CSS de toutes les variantes
- Pas d'export PNG (texte + JSON suffisent pour commencer)
- Clé API Claude saisie dans l'UI, stockée en localStorage

## Hors périmètre v1

- Extraction batch de tous les composants
- Export PNG / analyse vision
- Plugin de vérification (second plugin, brief séparé)
- Synchronisation automatique
