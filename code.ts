type DocTarget = ComponentNode | ComponentSetNode;

// An exclusion rule = AND of conditions { axisName → expected valueLabel }.
// A combo is excluded if it matches ANY rule (rules are OR'd).
type ExclusionRule = { [axisName: string]: string };

// Lock an axis to one or more values: narrows that axis in the cartesian
// product to only the listed labels. Empty / absent array = axis is free.
type PropLocks = { [axisName: string]: string[] };

// Variant selection for the Anatomy section: { axisName → variant value }.
// Empty / absent = first variant (default behavior).
type VariantSelection = { [axisName: string]: string };

type DocOptions = {
  props: boolean;
  tokens: boolean;
  variants: boolean;
  layout: boolean;
  anatomy: boolean;
  groupBy?: string[];
  excludeRules?: ExclusionRule[];
  propLocks?: PropLocks;
  // Hex string ("#RRGGBB") for the visual area background inside matrix cards.
  // Falls back to white when missing or invalid.
  matrixVisualBg?: string;
  // Variant selection used as the basis for the Anatomy section.
  anatomyVariant?: VariantSelection;
  // Layer keys (path-of-indexes from the instance root) the user explicitly
  // chose to include in the Anatomy section. `undefined` = use the smart
  // auto-detection heuristic (default). Empty array = manual but no layers.
  anatomyIncludedLayers?: string[];
  // Variant + layer scope for the Design Tokens section. Independent of the
  // anatomy settings once the user has validated the Tokens panel; before
  // that, the Tokens UI defaults its variant to anatomy's (and vice versa).
  tokenVariant?: VariantSelection;
  tokenIncludedLayers?: string[];
  // UI-only flags persisted with the rest of the config — they don't affect
  // generation, just whether the next time the user opens a settings panel
  // it should inherit from the other.
  anatomyConfigured?: boolean;
  tokensConfigured?: boolean;
  // AI-generated descriptions per prop name. Populated by the request handlers
  // from clientStorage just before delegating to buildSheets / exportAsPdf /
  // buildDocData. Missing or empty → fall back to PROP_DESCRIPTION_PLACEHOLDER.
  propDescriptions?: Record<string, string>;
  // General description of the component (1-3 sentences) produced alongside
  // propDescriptions. Used by the Markdown export.
  generalDescription?: string;
};

// Persisted per-component config — restored when the user reselects a component.
type SavedConfig = {
  options: {
    props: boolean;
    tokens: boolean;
    variants: boolean;
    layout: boolean;
    anatomy: boolean;
  };
  groupBy: string[];
  excludeRules: ExclusionRule[];
  propLocks: PropLocks;
  matrixVisualBg?: string;
  anatomyVariant?: VariantSelection;
  anatomyIncludedLayers?: string[];
  tokenVariant?: VariantSelection;
  tokenIncludedLayers?: string[];
  // True once the user has validated the corresponding settings panel. Used
  // by the UI to decide whether to inherit the variant config from the other
  // panel on first open (anatomy → tokens, or tokens → anatomy).
  anatomyConfigured?: boolean;
  tokensConfigured?: boolean;
};

type PropInfo = {
  name: string;
  rawKey: string;
  type: ComponentPropertyType;
  defaultValue: string | boolean;
  variantOptions?: string[];
};

// Why the target is null — surfaced to the UI so the empty state can give the
// user a precise hint about WHAT they need to do.
type EmptyReason =
  | { reason: "no-selection" }
  | { reason: "multi-selection"; count: number }
  | { reason: "wrong-type"; nodeType: string };

type SelectionPayload =
  | {
      id: string;
      name: string;
      kind: "COMPONENT" | "COMPONENT_SET";
      props: { name: string; type: string; values: string }[];
      previewBase64: string | null;
      axes: string[];
      axisValues: { [axisName: string]: string[] };
      // Subset of `axes` that are VARIANT-typed — these are the only axes the user
      // can pick from when choosing the variant basis for the Anatomy section.
      variantAxes: string[];
      combinationCount: number;
      savedConfig: SavedConfig | null;
      // Section titles already documented on the canvas for this target. The UI
      // surfaces a per-row "regen" button only for sections in this list.
      existingSections: string[];
    }
  | null;

type AxisOption = { label: string; value: string | boolean };
type VariantAxis = {
  rawKey: string;
  name: string;
  propType: ComponentPropertyType;
  options: AxisOption[];
};

type Combination = {
  payload: { [key: string]: string | boolean };
  labels: { axisName: string; valueLabel: string }[];
};

type IndexedCombination = Combination & {
  // O(1) axisName → valueLabel lookup for grouping
  labelMap: Map<string, string>;
  // For COMPONENT_SET: the exact variant child to instantiate (skips setProperties on VARIANT)
  variantSource: ComponentNode | null;
  // Props to apply via setProperties (BOOLEAN/INSTANCE_SWAP/TEXT — never VARIANT when variantSource is set)
  setPropsPayload: { [key: string]: string | boolean };
};

type VariantIndex = Map<string, ComponentNode>;

const PROP_COL_WIDTHS = [142, 212, 141, 141];
const PROP_COL_HEADERS = ["Propriété", "Description", "Type", "Valeurs"];
const PROP_DESCRIPTION_PLACEHOLDER = "À compléter";

// Read an AI-generated description for `propDisplayName` (the kebab-cased
// display name produced by `displayPropName`) from the propDescriptions map.
// Tries the display name first, then the raw prop key (without the "Has a "
// boolean prefix added by `displayPropName`). Falls back to the placeholder.
function pickPropDescription(
  propRawName: string,
  propDisplayName: string,
  propDescriptions: Record<string, string> | undefined
): string {
  if (!propDescriptions) return PROP_DESCRIPTION_PLACEHOLDER;
  const fromDisplay = propDescriptions[propDisplayName];
  if (typeof fromDisplay === "string" && fromDisplay.trim().length > 0) return fromDisplay;
  const fromRaw = propDescriptions[propRawName];
  if (typeof fromRaw === "string" && fromRaw.trim().length > 0) return fromRaw;
  return PROP_DESCRIPTION_PLACEHOLDER;
}

const ADMIN_SHEET_WIDTH_DEFAULT = 700;
const ADMIN_SHEET_PADDING = 32;
const ADMIN_CONTENT_WIDTH_DEFAULT = ADMIN_SHEET_WIDTH_DEFAULT - ADMIN_SHEET_PADDING * 2; // 636

// Admin combination card layout (osmose.proginov.com reference).
// Card adapts to component size — see computeAdminCardLayout().
const ADMIN_CARD_MIN_W = 240;
const ADMIN_CARD_PADDING = 8;
const ADMIN_CARD_GAP = 8;
const ADMIN_GRID_GAP = 16;
const ADMIN_CARDS_PER_ROW = 3;
const ADMIN_VISUAL_PADDING = 16;
const ADMIN_VISUAL_MIN_H = 100;
const ADMIN_PROP_ROW_HEIGHT = 32;
const ADMIN_PROP_ROW_GAP = 4;
const TOKEN_COL_WIDTHS = [296, 140, 200]; // sum = 636 (admin content width)
const TOKEN_COL_HEADERS = ["Variable", "Type", "Collection"];

const SHEET_GAP = 32;
const CARD_BATCH_SIZE = 50;

// A4 at 72ppi — matches PDF point coordinates (1pt = 1px here)
const PDF_W = 595;
const PDF_H = 842;
const PDF_MARGIN = 40;
const PDF_CONTENT_W = PDF_W - PDF_MARGIN * 2; // 515
const PDF_CARD_GAP = 12;
const PDF_PROP_COL_WIDTHS_A4 = [116, 127, 116, 156]; // sum = 515 (Propriété, Description, Type, Valeurs)
const PDF_TOKEN_COL_WIDTHS_A4 = [240, 110, 165]; // sum = 515

function hex(h: string): RGB {
  const v = h.replace("#", "");
  return {
    r: parseInt(v.slice(0, 2), 16) / 255,
    g: parseInt(v.slice(2, 4), 16) / 255,
    b: parseInt(v.slice(4, 6), 16) / 255,
  };
}

const VISUAL_BG_DEFAULT = "#FFFFFF";
const HEX_RE = /^#?[0-9a-fA-F]{6}$/;
function normalizeHex(input: string | undefined | null): string {
  if (typeof input !== "string" || !HEX_RE.test(input)) return VISUAL_BG_DEFAULT;
  return input.startsWith("#") ? input.toUpperCase() : "#" + input.toUpperCase();
}

const COLOR = {
  bg: { r: 1, g: 1, b: 1 },
  bgSubtle: { r: 0.985, g: 0.985, b: 0.99 },
  bgChip: { r: 0.96, g: 0.96, b: 0.97 },
  divider: { r: 0.93, g: 0.93, b: 0.95 },
  dividerStrong: { r: 0.85, g: 0.85, b: 0.88 },
  border: { r: 0.91, g: 0.91, b: 0.93 },
  textPrimary: { r: 0.08, g: 0.08, b: 0.12 },
  textBody: { r: 0.15, g: 0.15, b: 0.2 },
  textSecondary: { r: 0.4, g: 0.4, b: 0.45 },
  textMuted: { r: 0.55, g: 0.55, b: 0.6 },

  // ─── osmose.proginov.com reference palette ────────────────────────────────
  refSheetBg: hex("#FFFFFF"),
  refTitlePrimary: hex("#393939"),
  refBodyText: hex("#616161"),
  refMutedText: hex("#999999"),
  refBrand: hex("#0C4790"),
  refAccent: hex("#007DEB"),
  refHeaderCellBg: hex("#F2F2F2"),
  refBodyCellBg: hex("#F7F7F7"),
  refRowDivider: hex("#E6E6E6"),
  refTitleDivider: hex("#CCCCCC"),
  refCardBg: hex("#F3F6F9"),
  refCardLabel: hex("#506177"),
  // Redesigned matrix card (Pnv compact spec)
  refMatrixCardBg: hex("#E6F2FD"),
  refMatrixRowBg: hex("#FFFFFF"),
  refMatrixRowName: hex("#393939"),
  refMatrixRowValue: hex("#808080"),
  refMatrixSwitchOn: hex("#007DEB"),
  refMatrixSwitchOff: hex("#CCCCCC"),
  refMatrixSwitchThumb: hex("#FFFFFF"),
  refCellTextStrong: hex("#242424"),
};

// Fallback-aware font cache. Filled by loadFonts() so render code can call
// FONT.titleHeavy etc. synchronously without re-checking availability.
type FontWeight = "regular" | "medium";
const FONT: {
  title: FontName; // "Colfax" or fallback Inter Regular — used for sheet title 32px / breadcrumb / section names
  titleMed: FontName; // "Colfax" Medium / Inter Semi Bold — used for titles + section headings
  body: FontName; // "Roboto" / Inter Regular — used for table body text
  bodyMed: FontName; // "Roboto" Medium / Inter Semi Bold — used for table headers
  bodyBold: FontName; // "Roboto" Bold / Inter Bold — used for the pin numbers
} = {
  title: { family: "Inter", style: "Regular" },
  titleMed: { family: "Inter", style: "Semi Bold" },
  body: { family: "Inter", style: "Regular" },
  bodyMed: { family: "Inter", style: "Semi Bold" },
  bodyBold: { family: "Inter", style: "Bold" },
};

let lastSheets: FrameNode[] = [];

// Generation warnings buffer — collected during generation/export and surfaced
// in the post-generation toast. Avoids the previously-silent try/catch sites
// that would drop variables / variants / fonts without telling the user.
let generationWarnings: string[] = [];
function resetGenerationWarnings(): void {
  generationWarnings = [];
}
function pushGenerationWarning(msg: string): void {
  generationWarnings.push(msg);
}
function summarizeWarnings(): string {
  if (generationWarnings.length === 0) return "";
  // Group identical messages with a count suffix.
  const counts = new Map<string, number>();
  for (const w of generationWarnings) counts.set(w, (counts.get(w) ?? 0) + 1);
  const parts: string[] = [];
  for (const [msg, n] of counts) parts.push(n > 1 ? `${msg} (×${n})` : msg);
  return parts.join(" · ");
}

// Single-slot cache for enumerateValidCombinations. Hits when the same target
// is re-evaluated with the same rules+locks (e.g., Generate clicked twice in
// a row, or sendSelection running again after a no-op selection bounce).
type CombosCacheEntry = {
  targetId: string;
  rulesKey: string;
  result: ReturnType<typeof enumerateValidCombinations>;
};
let combosCache: CombosCacheEntry | null = null;
function cachedEnumerateValidCombinations(
  target: DocTarget,
  allAxes: VariantAxis[],
  excludeRules: ExclusionRule[] = [],
  propLocks: PropLocks = {}
): ReturnType<typeof enumerateValidCombinations> {
  const rulesKey = JSON.stringify([excludeRules, propLocks]);
  if (combosCache && combosCache.targetId === target.id && combosCache.rulesKey === rulesKey) {
    return combosCache.result;
  }
  const result = enumerateValidCombinations(target, allAxes, excludeRules, propLocks);
  combosCache = { targetId: target.id, rulesKey, result };
  return result;
}

const CONFIG_KEY_PREFIX = "docyourprops:config:";

async function loadSavedConfig(targetId: string): Promise<SavedConfig | null> {
  try {
    const raw = await figma.clientStorage.getAsync(CONFIG_KEY_PREFIX + targetId);
    if (!raw) return null;
    return migratePropLocks(raw as SavedConfig);
  } catch {
    return null;
  }
}

// Migrate old single-string propLocks ({ axis: "M" }) to multi-value
// ({ axis: ["M"] }). Keeps configs saved before the multi-select rollout usable.
function migratePropLocks(config: SavedConfig): SavedConfig {
  const locks = config.propLocks;
  if (!locks || typeof locks !== "object") return config;
  let needsMigration = false;
  for (const k of Object.keys(locks)) {
    if (typeof (locks as unknown as { [k: string]: unknown })[k] === "string") {
      needsMigration = true;
      break;
    }
  }
  if (!needsMigration) return config;
  const migrated: PropLocks = {};
  for (const k of Object.keys(locks)) {
    const v = (locks as unknown as { [k: string]: unknown })[k];
    if (typeof v === "string") migrated[k] = v ? [v] : [];
    else if (Array.isArray(v)) migrated[k] = v.filter((x) => typeof x === "string");
  }
  return { ...config, propLocks: migrated };
}

async function saveConfig(targetId: string, options: DocOptions): Promise<void> {
  const config: SavedConfig = {
    options: {
      props: options.props,
      tokens: options.tokens,
      variants: options.variants,
      layout: options.layout,
      anatomy: options.anatomy,
    },
    groupBy: options.groupBy ?? [],
    excludeRules: options.excludeRules ?? [],
    propLocks: options.propLocks ?? {},
    matrixVisualBg: options.matrixVisualBg,
    anatomyVariant: options.anatomyVariant ?? {},
    anatomyIncludedLayers: options.anatomyIncludedLayers,
    tokenVariant: options.tokenVariant ?? {},
    tokenIncludedLayers: options.tokenIncludedLayers,
    anatomyConfigured: options.anatomyConfigured === true,
    tokensConfigured: options.tokensConfigured === true,
  };
  try {
    await figma.clientStorage.setAsync(CONFIG_KEY_PREFIX + targetId, config);
  } catch {
    // Best-effort — don't surface errors to the user.
  }
}

figma.showUI(__html__, { width: 488, height: 860 });

const ONBOARDED_KEY = "docyourprops:onboarded";

// Global LLM config (endpoint, model, apiKey). Shared across all components —
// not scoped per-target like CONFIG_KEY_PREFIX.
const LLM_CONFIG_KEY = "docyourcomp:llm-config";

type LlmConfig = {
  endpoint?: string;
  model?: string;
  apiKey?: string;
};

async function loadLlmConfig(): Promise<LlmConfig | null> {
  try {
    const raw = await figma.clientStorage.getAsync(LLM_CONFIG_KEY);
    if (raw && typeof raw === "object") return raw as LlmConfig;
  } catch {
    /* ignore */
  }
  return null;
}

// Per-component AI artifacts: linked doc frame IDs + LLM-generated descriptions.
const AI_DESCRIPTIONS_KEY_PREFIX = "docyourcomp:ai-descriptions:";

type AiDescriptionsStored = {
  generalDescription?: string;
  propDescriptions?: Record<string, string>;
  linkedDocFrameIds?: string[];
  linkedDocFrameInfo?: { id: string; name: string; type: string }[];
  generatedAt?: string;
  model?: string;
};

async function loadAiDescriptions(targetId: string): Promise<AiDescriptionsStored | null> {
  try {
    const raw = await figma.clientStorage.getAsync(AI_DESCRIPTIONS_KEY_PREFIX + targetId);
    if (raw && typeof raw === "object") return raw as AiDescriptionsStored;
  } catch {
    /* ignore */
  }
  return null;
}

async function saveAiDescriptions(
  targetId: string,
  data: AiDescriptionsStored
): Promise<void> {
  await figma.clientStorage.setAsync(AI_DESCRIPTIONS_KEY_PREFIX + targetId, data);
}

// Global corpus of `.md` documents the user imported into the Chat tab — fed
// to the LLM as the only source of truth for Q&A.
const CHAT_DOCS_KEY = "docyourcomp:chat-docs";

type ChatDoc = { name: string; content: string };

async function loadChatDocs(): Promise<ChatDoc[]> {
  try {
    const raw = await figma.clientStorage.getAsync(CHAT_DOCS_KEY);
    if (Array.isArray(raw)) return raw as ChatDoc[];
  } catch {
    /* ignore */
  }
  return [];
}

// Listen-mode state: while true, selectionchange feeds the UI a doc-frame
// candidate instead of triggering the normal sendSelection() pipeline.
let aiListenForDocFrames = false;
let aiListenTargetId: string | null = null;

async function sendDocFrameCandidate(): Promise<void> {
  const sel = figma.currentPage.selection;
  if (sel.length !== 1) {
    figma.ui.postMessage({ type: "ai-link-doc-candidate", data: null });
    return;
  }
  const node = sel[0];
  if (node.id === aiListenTargetId) {
    figma.ui.postMessage({ type: "ai-link-doc-candidate", data: null });
    return;
  }
  if (node.type !== "FRAME" && node.type !== "SECTION" && node.type !== "GROUP") {
    figma.ui.postMessage({ type: "ai-link-doc-candidate", data: null });
    return;
  }
  let preview: string | null = null;
  try {
    const bytes = await (node as ExportMixin).exportAsync({
      format: "PNG",
      constraint: { type: "SCALE", value: 0.5 },
    });
    preview = figma.base64Encode(bytes);
  } catch {
    preview = null;
  }
  figma.ui.postMessage({
    type: "ai-link-doc-candidate",
    data: { id: node.id, name: node.name, type: node.type, preview },
  });
}

async function sendInit(): Promise<void> {
  let onboarded = true;
  try {
    const v = await figma.clientStorage.getAsync(ONBOARDED_KEY);
    onboarded = v === true;
  } catch {
    /* fail silently — better to skip onboarding than spam the user */
  }
  figma.ui.postMessage({ type: "init", onboarded });
}

figma.on("selectionchange", () => {
  combosCache = null; // stale once the target changes
  if (aiListenForDocFrames) {
    // In listen mode we feed the UI a candidate frame instead of swapping
    // the documented component. The locked target is kept until the user
    // clicks "Terminer" (which posts ai-link-doc-end).
    void sendDocFrameCandidate();
    return;
  }
  void sendSelection();
});
void sendInit();
void sendSelection();

figma.ui.onmessage = async (msg: {
  type: string;
  options?: DocOptions;
  anatomyVariant?: VariantSelection;
  tokenVariant?: VariantSelection;
  seq?: number;
  key?: string;
  section?: string;
  targetId?: string;
  data?: unknown;
  docFrameIds?: string[];
}) => {
  if (msg.type === "ai-extract") {
    const target = await resolveTarget();
    if (!target) {
      figma.ui.postMessage({
        type: "ai-extract-error",
        message: "Sélectionne un composant.",
      });
      return;
    }
    const docFrameIds = Array.isArray(msg.docFrameIds) ? msg.docFrameIds : [];
    const docFrames: SceneNode[] = [];
    for (const id of docFrameIds) {
      const node = await figma.getNodeByIdAsync(id);
      if (
        node &&
        (node.type === "FRAME" || node.type === "SECTION" || node.type === "GROUP")
      ) {
        docFrames.push(node as SceneNode);
      }
    }
    try {
      const payload = await buildAiPayload(target, docFrames);
      figma.ui.postMessage({ type: "ai-extract-ready", data: payload });
    } catch (e) {
      figma.ui.postMessage({
        type: "ai-extract-error",
        message: e instanceof Error ? e.message : String(e),
      });
    }
    return;
  }
  if (msg.type === "get-llm-config") {
    const cfg = await loadLlmConfig();
    figma.ui.postMessage({ type: "llm-config", data: cfg });
    return;
  }
  if (msg.type === "save-llm-config") {
    try {
      await figma.clientStorage.setAsync(LLM_CONFIG_KEY, msg.data || {});
      figma.ui.postMessage({ type: "llm-config-saved", ok: true });
    } catch (e) {
      figma.ui.postMessage({
        type: "llm-config-saved",
        ok: false,
        message: e instanceof Error ? e.message : String(e),
      });
    }
    return;
  }
  if (msg.type === "ai-link-doc-start") {
    aiListenForDocFrames = true;
    const t = await resolveTarget();
    aiListenTargetId = t ? t.id : null;
    figma.notify("Sélectionne une frame de documentation dans Figma puis valide.");
    void sendDocFrameCandidate();
    return;
  }
  if (msg.type === "ai-link-doc-end") {
    aiListenForDocFrames = false;
    // Restore the documented component as the active Figma selection so the UI
    // stays in context (the user may have clicked random frames while linking).
    if (aiListenTargetId) {
      try {
        const locked = await figma.getNodeByIdAsync(aiListenTargetId);
        if (locked && "type" in locked) {
          figma.currentPage.selection = [locked as SceneNode];
        }
      } catch {
        /* selection restore is best-effort */
      }
    }
    aiListenTargetId = null;
    void sendSelection();
    return;
  }
  if (msg.type === "get-ai-descriptions") {
    if (!msg.targetId) {
      figma.ui.postMessage({ type: "ai-descriptions", data: null });
      return;
    }
    const data = await loadAiDescriptions(msg.targetId);
    figma.ui.postMessage({ type: "ai-descriptions", data });
    return;
  }
  if (msg.type === "save-ai-descriptions") {
    if (!msg.targetId) {
      figma.ui.postMessage({ type: "ai-descriptions-saved", ok: false, message: "No targetId" });
      return;
    }
    try {
      await saveAiDescriptions(msg.targetId, (msg.data as AiDescriptionsStored) || {});
      figma.ui.postMessage({ type: "ai-descriptions-saved", ok: true });
    } catch (e) {
      figma.ui.postMessage({
        type: "ai-descriptions-saved",
        ok: false,
        message: e instanceof Error ? e.message : String(e),
      });
    }
    return;
  }
  if (msg.type === "get-chat-docs") {
    const docs = await loadChatDocs();
    figma.ui.postMessage({ type: "chat-docs", data: docs });
    return;
  }
  if (msg.type === "save-chat-docs") {
    try {
      const data = Array.isArray(msg.data) ? (msg.data as ChatDoc[]) : [];
      await figma.clientStorage.setAsync(CHAT_DOCS_KEY, data);
      figma.ui.postMessage({ type: "chat-docs-saved", ok: true });
    } catch (e) {
      figma.ui.postMessage({
        type: "chat-docs-saved",
        ok: false,
        message: e instanceof Error ? e.message : String(e),
      });
    }
    return;
  }
  const defaultOptions: DocOptions = {
    props: true,
    tokens: true,
    variants: true,
    layout: false,
    anatomy: false,
    anatomyVariant: {},
    tokenVariant: {},
  };

  if (msg.type === "fetch-anatomy-layers") {
    const target = await resolveTarget();
    const layers = target ? previewAnatomyLayers(target, msg.anatomyVariant) : [];
    figma.ui.postMessage({ type: "anatomy-layers", layers, seq: msg.seq ?? 0 });
    return;
  }
  if (msg.type === "fetch-tokens-layers") {
    const target = await resolveTarget();
    const layers = target ? previewTokensLayers(target, msg.tokenVariant) : { tree: [], autoSelected: [] };
    figma.ui.postMessage({ type: "tokens-layers", layers, seq: msg.seq ?? 0 });
    return;
  }
  if (msg.type === "generate-doc") {
    const target = await resolveTarget();
    if (!target) {
      figma.notify("Sélectionnez un composant.", { error: true });
      figma.ui.postMessage({ type: "generation-error" });
      return;
    }
    const opts = msg.options ?? defaultOptions;
    const ai = await loadAiDescriptions(target.id);
    if (ai) {
      if (ai.propDescriptions) opts.propDescriptions = ai.propDescriptions;
      if (ai.generalDescription) opts.generalDescription = ai.generalDescription;
    }
    resetGenerationWarnings();
    try {
      await generateDoc(target, opts);
      void saveConfig(target.id, opts);
      const summary = summarizeWarnings();
      const message = summary
        ? `Documentation créée — ${generationWarnings.length} avertissement(s) : ${summary}`
        : "Documentation créée";
      figma.notify(message, { timeout: summary ? 4500 : 1800 });
      const doc = await buildDocAsObject(target, opts);
      const markdownContent = buildMarkdown(doc);
      const safeName = target.name.replace(/[\\/:*?"<>|]/g, "_");
      figma.ui.postMessage({ type: "generation-done", markdown: markdownContent, componentName: safeName });
    } catch (e) {
      figma.notify(`Erreur: ${(e as Error).message}`, { error: true });
      figma.ui.postMessage({ type: "generation-error" });
    }
  } else if (msg.type === "export-pdf") {
    const target = await resolveTarget();
    if (!target) {
      figma.notify("Sélectionnez un composant.", { error: true });
      figma.ui.postMessage({ type: "pdf-error" });
      return;
    }
    const opts = msg.options ?? defaultOptions;
    const ai = await loadAiDescriptions(target.id);
    if (ai) {
      if (ai.propDescriptions) opts.propDescriptions = ai.propDescriptions;
      if (ai.generalDescription) opts.generalDescription = ai.generalDescription;
    }
    resetGenerationWarnings();
    try {
      await exportAsPdf(target, opts);
      void saveConfig(target.id, opts);
      // Note: the `pdf-export` event already drives the UI to restore the
      // button state — no separate done event needed here. The PDF "ready"
      // notification is emitted from inside exportAsPdf.
      const summary = summarizeWarnings();
      if (summary) {
        figma.notify(
          `PDF prêt — ${generationWarnings.length} avertissement(s) : ${summary}`,
          { timeout: 4500 }
        );
      }
    } catch (e) {
      figma.notify(`Erreur PDF : ${(e as Error).message}`, { error: true });
      figma.ui.postMessage({ type: "pdf-error" });
    }
  } else if (msg.type === "export-markdown" || msg.type === "export-json") {
    const target = await resolveTarget();
    if (!target) {
      figma.notify("Sélectionnez un composant.", { error: true });
      figma.ui.postMessage({ type: "export-error" });
      return;
    }
    const opts = msg.options ?? defaultOptions;
    const ai = await loadAiDescriptions(target.id);
    if (ai) {
      if (ai.propDescriptions) opts.propDescriptions = ai.propDescriptions;
      if (ai.generalDescription) opts.generalDescription = ai.generalDescription;
    }
    resetGenerationWarnings();
    try {
      const doc = await buildDocAsObject(target, opts);
      const safeName = target.name.replace(/[\\/:*?"<>|]/g, "_");
      if (msg.type === "export-markdown") {
        const content = buildMarkdown(doc);
        figma.ui.postMessage({
          type: "download",
          content,
          filename: `${safeName}.md`,
          mime: "text/markdown;charset=utf-8",
        });
        figma.notify("Markdown prêt au téléchargement");
      } else {
        const content = JSON.stringify(doc, null, 2);
        figma.ui.postMessage({
          type: "download",
          content,
          filename: `${safeName}.json`,
          mime: "application/json;charset=utf-8",
        });
        figma.notify("JSON prêt au téléchargement");
      }
    } catch (e) {
      figma.notify(`Erreur export : ${(e as Error).message}`, { error: true });
      figma.ui.postMessage({ type: "export-error" });
    }
  } else if (msg.type === "clear-config") {
    const target = await resolveTarget();
    if (target) {
      try {
        await figma.clientStorage.deleteAsync(CONFIG_KEY_PREFIX + target.id);
      } catch {
        /* best effort */
      }
    }
  } else if (msg.type === "set-onboarded") {
    try {
      await figma.clientStorage.setAsync(ONBOARDED_KEY, true);
    } catch {
      /* best effort */
    }
  } else if (msg.type === "regen-section") {
    const target = await resolveTarget();
    if (!target || typeof msg.section !== "string") return;
    const opts = msg.options ?? defaultOptions;
    resetGenerationWarnings();
    try {
      await regenSection(target, msg.section, opts);
      void saveConfig(target.id, opts);
      const summary = summarizeWarnings();
      figma.notify(
        summary
          ? `Section regénérée — ${generationWarnings.length} avertissement(s) : ${summary}`
          : "Section regénérée",
        { timeout: summary ? 4500 : 1800 }
      );
      figma.ui.postMessage({ type: "generation-done" });
    } catch (e) {
      figma.notify(`Erreur: ${(e as Error).message}`, { error: true });
      figma.ui.postMessage({ type: "generation-error" });
    }
  } else if (msg.type === "fetch-doc-index") {
    // Scan the current page for all generated sheets and group them by the
    // component they document. Returns the list to the UI for navigation.
    const sheets = figma.currentPage.findAll(
      (n) => n.getPluginData("docyourprops:component") !== ""
    ) as FrameNode[];
    const byTarget = new Map<string, { sections: Set<string>; sheets: FrameNode[] }>();
    for (const s of sheets) {
      const tid = s.getPluginData("docyourprops:component");
      const section = s.getPluginData("docyourprops:section");
      const entry = byTarget.get(tid) ?? { sections: new Set<string>(), sheets: [] };
      if (section) entry.sections.add(section);
      entry.sheets.push(s);
      byTarget.set(tid, entry);
    }
    const items: { targetId: string; name: string; sections: string[]; missing: boolean }[] = [];
    for (const [tid, entry] of byTarget.entries()) {
      let name = "Composant supprimé";
      let missing = true;
      try {
        const node = await figma.getNodeByIdAsync(tid);
        if (node && node.removed !== true) {
          name = node.name;
          missing = false;
        }
      } catch {
        /* node unavailable — keep missing flag */
      }
      items.push({
        targetId: tid,
        name,
        sections: Array.from(entry.sections),
        missing,
      });
    }
    // Sort: present-first, then alphabetic.
    items.sort((a, b) => {
      if (a.missing !== b.missing) return a.missing ? 1 : -1;
      return a.name.localeCompare(b.name);
    });
    const currentTarget = await resolveTarget();
    figma.ui.postMessage({
      type: "doc-index",
      items,
      currentTargetId: currentTarget ? currentTarget.id : null,
    });
  } else if (msg.type === "locate-component-doc") {
    if (typeof msg.targetId !== "string") return;
    const sheets = figma.currentPage.findAll(
      (n) => n.getPluginData("docyourprops:component") === msg.targetId
    );
    if (sheets.length === 0) {
      figma.notify("Aucune doc trouvée pour ce composant.", { error: true });
      return;
    }
    figma.viewport.scrollAndZoomIntoView(sheets);
  } else if (msg.type === "select-component") {
    if (typeof msg.targetId !== "string") return;
    let node: BaseNode | null = null;
    try {
      node = await figma.getNodeByIdAsync(msg.targetId);
    } catch {
      node = null;
    }
    if (!node || node.removed) {
      figma.notify("Composant introuvable.", { error: true });
      return;
    }
    if (node.type !== "COMPONENT" && node.type !== "COMPONENT_SET") {
      figma.notify("Composant introuvable.", { error: true });
      return;
    }
    const page = (() => {
      let p: BaseNode | null = node;
      while (p && p.type !== "PAGE") p = p.parent;
      return p && p.type === "PAGE" ? (p as PageNode) : null;
    })();
    if (page && page.id !== figma.currentPage.id) {
      try {
        await figma.setCurrentPageAsync(page);
      } catch {
        // ignore — fall back to current page scrollAndZoom
      }
    }
    figma.currentPage.selection = [node as SceneNode];
    figma.viewport.scrollAndZoomIntoView([node as SceneNode]);
  } else if (msg.type === "select-layer") {
    const target = await resolveTarget();
    if (!target || typeof msg.key !== "string") return;
    const root = getBaseComponent(target);
    if (!root) return;
    const node = resolveLayerByKey(root, msg.key);
    if (!node) {
      figma.notify("Calque introuvable.", { error: true });
      return;
    }
    figma.currentPage.selection = [node];
    figma.viewport.scrollAndZoomIntoView([node]);
  } else if (msg.type === "close") {
    figma.closePlugin();
  }
};

async function resolveTarget(): Promise<DocTarget | null> {
  const sel = figma.currentPage.selection;
  if (sel.length !== 1) return null;
  const node = sel[0];
  if (node.type === "COMPONENT_SET") return node;
  if (node.type === "COMPONENT") {
    if (node.parent && node.parent.type === "COMPONENT_SET") return node.parent;
    return node;
  }
  if (node.type === "INSTANCE") {
    const main = await node.getMainComponentAsync();
    if (main) {
      if (main.parent && main.parent.type === "COMPONENT_SET") return main.parent;
      return main;
    }
  }
  return null;
}

// Diagnose why resolveTarget returned null so the UI can show a precise hint.
function diagnoseEmptySelection(): EmptyReason {
  const sel = figma.currentPage.selection;
  if (sel.length === 0) return { reason: "no-selection" };
  if (sel.length > 1) return { reason: "multi-selection", count: sel.length };
  return { reason: "wrong-type", nodeType: sel[0].type };
}

async function sendSelection(): Promise<void> {
  const target = await resolveTarget();
  let payload: SelectionPayload = null;
  let emptyReason: EmptyReason | null = null;

  if (target) {
    let preview: string | null = null;
    try {
      const bytes = await target.exportAsync({
        format: "PNG",
        constraint: { type: "SCALE", value: 2 },
      });
      preview = figma.base64Encode(bytes);
    } catch {
      preview = null;
    }
    const props = extractProps(target).map((p) => ({
      name: p.name,
      type: p.type,
      values: formatValuesDisplay(p),
    }));
    const axes = await eligibleAxes(target.componentPropertyDefinitions);
    // Real count = post-dedup, post-existence (matches what generation will produce)
    const combinationCount =
      axes.length > 0 ? cachedEnumerateValidCombinations(target, axes).combos.length : 0;
    const axisValues: { [k: string]: string[] } = {};
    for (const a of axes) axisValues[a.name] = a.options.map((o) => o.label);
    const savedConfig = await loadSavedConfig(target.id);
    // Discover which section sheets already exist on the page for this target —
    // used by the UI to show a "regen" button per section.
    const existingSections: string[] = [];
    for (const n of figma.currentPage.findAll(
      (x) => x.getPluginData("docyourprops:component") === target.id
    )) {
      const section = n.getPluginData("docyourprops:section");
      if (section && existingSections.indexOf(section) === -1) existingSections.push(section);
    }
    payload = {
      id: target.id,
      name: target.name,
      kind: target.type,
      props,
      previewBase64: preview,
      axes: axes.map((a) => a.name),
      axisValues,
      variantAxes: axes
        .filter((a) => a.propType === "VARIANT" || a.propType === "BOOLEAN")
        .map((a) => a.name),
      combinationCount,
      savedConfig,
      existingSections,
    };
  } else {
    emptyReason = diagnoseEmptySelection();
  }

  figma.ui.postMessage({ type: "selection", target: payload, emptyReason });
}

// Returns prop display-names in the order Figma shows them in the component panel.
// For COMPONENT_SET, variantProperties keys on the first variant give the correct
// VARIANT ordering; non-VARIANT props follow in their defs insertion order.
function orderedPropKeys(target: DocTarget): string[] {
  const defs = target.componentPropertyDefinitions;
  if (target.type === "COMPONENT_SET") {
    const first = target.children.find((c) => c.type === "COMPONENT") as
      | ComponentNode
      | undefined;
    if (first?.variantProperties) {
      const variantNames = Object.keys(first.variantProperties);
      const nonVariantNames = Object.keys(defs)
        .filter((k) => defs[k].type !== "VARIANT")
        .map((k) => stripPropKey(k));
      return [...variantNames, ...nonVariantNames];
    }
  }
  return Object.keys(defs).map((k) => stripPropKey(k));
}

function extractProps(target: DocTarget): PropInfo[] {
  const defs = target.componentPropertyDefinitions;
  const byName = new Map<string, PropInfo>();
  for (const key of Object.keys(defs)) {
    const def = defs[key];
    const info: PropInfo = {
      name: stripPropKey(key),
      rawKey: key,
      type: def.type,
      defaultValue: def.defaultValue,
    };
    if (def.type === "VARIANT") info.variantOptions = def.variantOptions;
    byName.set(info.name, info);
  }
  return orderedPropKeys(target)
    .filter((n) => byName.has(n))
    .map((n) => byName.get(n)!);
}

function stripPropKey(key: string): string {
  const i = key.indexOf("#");
  return i >= 0 ? key.slice(0, i) : key;
}

function formatValuesDisplay(p: PropInfo): string {
  switch (p.type) {
    case "BOOLEAN":
      return "true / false";
    case "TEXT":
      return "Texte libre";
    case "VARIANT":
      return (p.variantOptions ?? []).join(", ");
    case "INSTANCE_SWAP":
      return "Instance de composant";
    default:
      return "";
  }
}

async function buildSheets(target: DocTarget, options: DocOptions): Promise<FrameNode[]> {
  const sheets: FrameNode[] = [];
  const visualBg = normalizeHex(options.matrixVisualBg);
  const instanceSwapNames = options.props
    ? await resolveInstanceSwapNames(target.componentPropertyDefinitions)
    : undefined;

  if (options.props && options.variants) {
    const layout = computeAdminCardLayout(target);
    const content = await buildPropsAndMatrixContent(
      target,
      options.groupBy ?? [],
      options.excludeRules ?? [],
      options.propLocks ?? {},
      layout,
      visualBg,
      instanceSwapNames,
      options.propDescriptions
    );
    sheets.push(makeAdminSheet(target, "Propriétés", content, layout.sheetW));
  } else if (options.props) {
    sheets.push(
      makeAdminSheet(
        target,
        "Propriétés",
        buildPropsSection(
          target,
          ADMIN_CONTENT_WIDTH_DEFAULT,
          instanceSwapNames,
          options.propDescriptions
        )
      )
    );
  }

  if (options.layout) {
    sheets.push(makeAdminSheet(target, "Layout", buildLayoutSection(target)));
  }

  if (options.anatomy) {
    sheets.push(
      makeAdminSheet(
        target,
        "Anatomie",
        buildAnatomySection(target, options.anatomyVariant, options.anatomyIncludedLayers)
      )
    );
  }

  if (options.tokens) {
    sheets.push(
      makeAdminSheet(
        target,
        "Design tokens",
        await buildTokensSection(target, options.tokenVariant, options.tokenIncludedLayers)
      )
    );
  }

  return sheets;
}

// Find sheets previously generated for this target (tagged via setPluginData),
// remove them, and return the leftmost one's position so the new sheets can
// take its place. Scoped to currentPage for perf — generation always lands here.
function removeExistingSheets(target: DocTarget): { x: number; y: number } | null {
  const existing = figma.currentPage.findAll(
    (n) => n.getPluginData("docyourprops:component") === target.id
  ) as FrameNode[];
  if (existing.length === 0) return null;
  let minX = Infinity;
  let minY = 0;
  for (const sheet of existing) {
    if (sheet.x < minX) {
      minX = sheet.x;
      minY = sheet.y;
    }
  }
  for (const sheet of existing) sheet.remove();
  return { x: minX, y: minY };
}

async function generateDoc(target: DocTarget, options: DocOptions): Promise<void> {
  await loadFonts();
  // If a previous doc exists for this target, replace it in place at the same position.
  const oldPos = removeExistingSheets(target);
  const sheets = await buildSheets(target, options);
  if (sheets.length === 0) return;

  lastSheets = sheets;

  let x = oldPos ? oldPos.x : target.x + target.width + 80;
  const y = oldPos ? oldPos.y : target.y;
  for (const sheet of sheets) {
    figma.currentPage.appendChild(sheet);
    sheet.x = x;
    sheet.y = y;
    sheet.setPluginData("docyourprops:component", target.id);
    x += sheet.width + SHEET_GAP;
  }

  figma.currentPage.selection = sheets;
  figma.viewport.scrollAndZoomIntoView(sheets);
}

// Build a single-section variant of `options` so we can reuse `buildSheets`
// to produce just the requested section's sheet (1-element array).
function singleSectionOptions(section: string, options: DocOptions): DocOptions {
  const o: DocOptions = {
    ...options,
    props: section === "Propriétés",
    layout: section === "Layout",
    anatomy: section === "Anatomie",
    tokens: section === "Design tokens",
  };
  // For "Propriétés", keep variants in sync with the user's intent — the
  // matrix lives inside the props sheet and the original options.variants
  // already encodes whether to draw it.
  if (section !== "Propriétés") o.variants = false;
  return o;
}

// Regenerate one section in place: find the existing tagged sheet (if any),
// build a fresh one with the same options, and place it at the same X/Y.
// Other sections are left untouched.
async function regenSection(
  target: DocTarget,
  section: string,
  options: DocOptions
): Promise<void> {
  await loadFonts();
  const allExisting = figma.currentPage.findAll(
    (n) => n.getPluginData("docyourprops:component") === target.id
  ) as FrameNode[];
  const existingForSection = allExisting.find(
    (s) => s.getPluginData("docyourprops:section") === section
  );

  const sectionSheets = await buildSheets(target, singleSectionOptions(section, options));
  const newSheet = sectionSheets[0];
  if (!newSheet) {
    if (existingForSection) {
      figma.notify("Cette section ne génère pas de contenu pour la combinaison choisie.", {
        error: true,
      });
    }
    return;
  }

  let placeX: number;
  let placeY: number;
  if (existingForSection) {
    placeX = existingForSection.x;
    placeY = existingForSection.y;
    existingForSection.remove();
  } else if (allExisting.length > 0) {
    // No sheet for this section yet — drop it to the right of the rightmost.
    let maxRight = -Infinity;
    let topY = 0;
    for (const s of allExisting) {
      const right = s.x + s.width;
      if (right > maxRight) {
        maxRight = right;
        topY = s.y;
      }
    }
    placeX = maxRight + SHEET_GAP;
    placeY = topY;
  } else {
    placeX = target.x + target.width + 80;
    placeY = target.y;
  }

  figma.currentPage.appendChild(newSheet);
  newSheet.x = placeX;
  newSheet.y = placeY;
  newSheet.setPluginData("docyourprops:component", target.id);

  figma.currentPage.selection = [newSheet];
  figma.viewport.scrollAndZoomIntoView([newSheet]);
}

async function exportAsPdf(target: DocTarget, options: DocOptions): Promise<void> {
  await loadFonts();

  const pdfPages: FrameNode[] = [];
  const instanceSwapNames = options.props
    ? await resolveInstanceSwapNames(target.componentPropertyDefinitions)
    : undefined;
  if (options.props)
    pdfPages.push(buildPdfPropsPage(target, instanceSwapNames, options.propDescriptions));
  if (options.layout) pdfPages.push(buildPdfLayoutPage(target));
  if (options.anatomy)
    pdfPages.push(buildPdfAnatomyPage(target, options.anatomyVariant, options.anatomyIncludedLayers));
  if (options.variants)
    pdfPages.push(
      ...(await buildPdfCombinationsPages(
        target,
        options.excludeRules ?? [],
        options.propLocks ?? {},
        normalizeHex(options.matrixVisualBg)
      ))
    );
  if (options.tokens)
    pdfPages.push(
      ...(await buildPdfTokensPage(target, options.tokenVariant, options.tokenIncludedLayers))
    );

  if (pdfPages.length === 0) {
    figma.notify("Aucune section sélectionnée.", { error: true });
    return;
  }

  // Attach all pages to an off-screen container so Figma computes layout
  const container = figma.createFrame();
  container.name = "__pdf_tmp__";
  container.resize(PDF_W, PDF_H * pdfPages.length + 20 * Math.max(0, pdfPages.length - 1));
  figma.currentPage.appendChild(container);
  container.x = -999999;
  container.y = -999999;
  for (let i = 0; i < pdfPages.length; i++) {
    container.appendChild(pdfPages[i]);
    pdfPages[i].x = 0;
    pdfPages[i].y = i * (PDF_H + 20);
  }

  // Parallel JPEG export — Figma will fan out IO if it can.
  const jpegs = await Promise.all(
    pdfPages.map(async (page) => {
      const bytes = await page.exportAsync({
        format: "JPG",
        constraint: { type: "SCALE", value: 2 },
      });
      return {
        base64: figma.base64Encode(bytes),
        width: PDF_W * 2,
        height: PDF_H * 2,
      };
    })
  );

  container.remove();

  figma.ui.postMessage({ type: "pdf-export", jpegs, filename: "documentation.pdf" });
  figma.notify("PDF prêt au téléchargement");
}

async function tryLoadFont(font: FontName): Promise<boolean> {
  try {
    await figma.loadFontAsync(font);
    return true;
  } catch {
    return false;
  }
}

async function loadFonts(): Promise<void> {
  // Inter is the safe baseline — must succeed.
  await figma.loadFontAsync({ family: "Inter", style: "Regular" });
  await figma.loadFontAsync({ family: "Inter", style: "Semi Bold" });

  // Try the reference fonts (Colfax for titles, Roboto for table body).
  // Each weight is independent: a half-loaded family still beats Inter.
  const colfaxRegular = await tryLoadFont({ family: "Colfax", style: "Regular" });
  const colfaxMedium = await tryLoadFont({ family: "Colfax", style: "Medium" });
  const robotoRegular = await tryLoadFont({ family: "Roboto", style: "Regular" });
  const robotoMedium = await tryLoadFont({ family: "Roboto", style: "Medium" });
  const robotoBold = await tryLoadFont({ family: "Roboto", style: "Bold" });
  const interBold = await tryLoadFont({ family: "Inter", style: "Bold" });

  FONT.title = colfaxRegular
    ? { family: "Colfax", style: "Regular" }
    : { family: "Inter", style: "Regular" };
  FONT.titleMed = colfaxMedium
    ? { family: "Colfax", style: "Medium" }
    : { family: "Inter", style: "Semi Bold" };
  FONT.body = robotoRegular
    ? { family: "Roboto", style: "Regular" }
    : { family: "Inter", style: "Regular" };
  FONT.bodyMed = robotoMedium
    ? { family: "Roboto", style: "Medium" }
    : { family: "Inter", style: "Semi Bold" };
  FONT.bodyBold = robotoBold
    ? { family: "Roboto", style: "Bold" }
    : interBold
    ? { family: "Inter", style: "Bold" }
    : { family: "Inter", style: "Semi Bold" };
}

// ─── PDF page builders ───────────────────────────────────────────────────────

function makePdfPage(): FrameNode {
  const page = figma.createFrame();
  page.name = "PDF page";
  page.resize(PDF_W, PDF_H);
  page.fills = [{ type: "SOLID", color: COLOR.bg }];
  return page;
}

// PDF page header — same admin layout as the on-canvas sheet (breadcrumb +
// title + bottom divider), constrained to PDF_CONTENT_W. An optional tag
// renders next to the title (used for the combo count on the matrix pages).
function makePdfHeader(
  componentName: string,
  sectionTitle: string,
  tag?: SceneNode
): FrameNode {
  return makeAdminSheetHeader(componentName, sectionTitle, PDF_CONTENT_W, tag);
}

// Gap between the admin header (which has a built-in 16px paddingBottom on
// its title row + divider) and the page body content.
const PDF_BODY_GAP = 24;

function buildPdfPropsPage(
  target: DocTarget,
  instanceSwapNames?: Map<string, string[]>,
  propDescriptions?: Record<string, string>
): FrameNode {
  const page = makePdfPage();

  const header = makePdfHeader(target.name, "Propriétés");
  page.appendChild(header);
  header.x = PDF_MARGIN;
  header.y = PDF_MARGIN;

  const contentY = PDF_MARGIN + header.height + PDF_BODY_GAP;
  const props = extractProps(target);
  if (props.length > 0) {
    const table = makeAdminTable(
      PROP_COL_HEADERS,
      PDF_PROP_COL_WIDTHS_A4,
      props.map((p) => {
        const display = displayPropName(p);
        return [
          display,
          pickPropDescription(p.name, display, propDescriptions),
          makeTypeChip(p.type),
          makeBulletList(valuesAsItems(p, instanceSwapNames)),
        ] as AdminCellContent[];
      })
    );
    page.appendChild(table);
    table.x = PDF_MARGIN;
    table.y = contentY;
  }

  return page;
}

async function buildPdfCombinationsPages(
  target: DocTarget,
  excludeRules: ExclusionRule[],
  propLocks: PropLocks,
  visualBg: string
): Promise<FrameNode[]> {
  const defs = target.componentPropertyDefinitions;
  const allAxes = await eligibleAxes(defs);

  const emptyPage = (): FrameNode => {
    const p = makePdfPage();
    const h = makePdfHeader(target.name, "Combinaisons");
    p.appendChild(h);
    h.x = PDF_MARGIN;
    h.y = PDF_MARGIN;
    return p;
  };

  if (allAxes.length === 0) return [emptyPage()];
  const base = getBaseComponent(target);
  if (!base) return [emptyPage()];

  allAxes.sort((a, b) => b.options.length - a.options.length);

  const { combos } = cachedEnumerateValidCombinations(
    target,
    allAxes,
    excludeRules,
    propLocks
  );
  if (combos.length === 0) return [emptyPage()];

  const propOrder = orderedPropKeys(target);
  const propOrderMap = new Map<string, number>(propOrder.map((n, i) => [n, i]));
  for (const c of combos) {
    c.labels.sort(
      (a, b) =>
        (propOrderMap.get(a.axisName) ?? 99) -
        (propOrderMap.get(b.axisName) ?? 99)
    );
  }

  // Same admin card style as on-canvas, but cards-per-row is derived from the
  // fixed PDF content width (515) instead of fixed at 3.
  const layout = computeAdminCardLayoutForFixedWidth(target, PDF_CONTENT_W);
  const cardsPerRow = Math.max(
    1,
    Math.floor((layout.contentW + ADMIN_GRID_GAP) / (layout.cardW + ADMIN_GRID_GAP))
  );

  const boolishAxes = new Set<string>();
  for (const a of allAxes) {
    if (a.propType === "BOOLEAN" || isBoolishOptions(a.options)) boolishAxes.add(a.name);
  }

  const validCards = await buildAllAdminCards(combos, base, layout, boolishAxes, visualBg);
  if (validCards.length === 0) return [emptyPage()];

  // Card height is identical for every card (shared visualH + propsAreaH).
  const cardH = validCards[0].height;
  const contentMaxY = PDF_H - PDF_MARGIN - 16;
  const tagLabel = `${combos.length} combinaison${combos.length > 1 ? "s" : ""}`;

  const pages: FrameNode[] = [];
  let cardIndex = 0;
  while (cardIndex < validCards.length) {
    const page = makePdfPage();

    // Tag rendered on every page — the count is constant across pages.
    const header = makePdfHeader(target.name, "Combinaisons", makeTag(tagLabel));
    page.appendChild(header);
    header.x = PDF_MARGIN;
    header.y = PDF_MARGIN;

    let currentY = PDF_MARGIN + header.height + PDF_BODY_GAP;

    while (cardIndex < validCards.length && currentY + cardH <= contentMaxY) {
      let cardX = PDF_MARGIN;
      for (let i = 0; i < cardsPerRow && cardIndex < validCards.length; i++, cardIndex++) {
        const card = validCards[cardIndex];
        page.appendChild(card);
        card.x = cardX;
        card.y = currentY;
        cardX += layout.cardW + ADMIN_GRID_GAP;
      }
      currentY += cardH + ADMIN_GRID_GAP;
    }

    pages.push(page);
  }

  return pages;
}

async function buildPdfTokensPage(
  target: DocTarget,
  variantSel?: VariantSelection,
  includedLayers?: string[]
): Promise<FrameNode[]> {
  const page = makePdfPage();

  const header = makePdfHeader(target.name, "Design tokens");
  page.appendChild(header);
  header.x = PDF_MARGIN;
  header.y = PDF_MARGIN;

  const contentY = PDF_MARGIN + header.height + PDF_BODY_GAP;
  const body = await buildTokensSectionForWidth(
    target,
    PDF_CONTENT_W,
    variantSel,
    includedLayers
  );
  page.appendChild(body);
  body.x = PDF_MARGIN;
  body.y = contentY;

  return [page];
}

// ─── Markdown / JSON export ─────────────────────────────────────────────────

type DocData = {
  component: {
    name: string;
    kind: "COMPONENT" | "COMPONENT_SET";
    width: number;
    height: number;
    propCount: number;
    combinationCount: number;
  };
  // AI-generated 1-3 sentence summary of the component's role. Rendered as a
  // blockquote right under the H1 of the Markdown export when present.
  generalDescription?: string;
  props?: Array<{
    name: string;
    type: string;
    description: string;
    values: string[];
  }>;
  layout?: { [section: string]: Array<{ label: string; value: string }> };
  anatomy?: string[];
  tokens?: {
    colors: Array<{ name: string; collection: string; count: number }>;
    typography: Array<{ name: string; spec: string; count: number }>;
  };
};

// Format a LayoutRow value (string or SceneNode) into a flat string for export.
function flattenLayoutValue(v: AdminCellContent): string {
  if (typeof v === "string") return v;
  // A SceneNode — use its .name as best-effort label, or "(node)" if missing.
  const node = v as SceneNode;
  return node.name || "(node)";
}

async function buildDocAsObject(target: DocTarget, options: DocOptions): Promise<DocData> {
  const base = getBaseComponent(target);
  const baseW = base ? base.width : 0;
  const baseH = base ? base.height : 0;

  const props = extractProps(target);
  const axes = await eligibleAxes(target.componentPropertyDefinitions);
  const combinationCount =
    axes.length > 0 ? cachedEnumerateValidCombinations(target, axes).combos.length : 0;
  const instanceSwapNames = options.props
    ? await resolveInstanceSwapNames(target.componentPropertyDefinitions)
    : undefined;

  const doc: DocData = {
    component: {
      name: target.name,
      kind: target.type,
      width: baseW,
      height: baseH,
      propCount: props.length,
      combinationCount,
    },
  };
  if (typeof options.generalDescription === "string" && options.generalDescription.trim().length > 0) {
    doc.generalDescription = options.generalDescription.trim();
  }

  if (options.props) {
    doc.props = props.map((p) => {
      const display = displayPropName(p);
      return {
        name: display,
        type: p.type,
        description: pickPropDescription(p.name, display, options.propDescriptions),
        values: valuesAsItems(p, instanceSwapNames),
      };
    });
  }

  if (options.layout && base) {
    const sections: { [k: string]: Array<{ label: string; value: string }> } = {};
    sections["Dimensions"] = dimensionRows(base).map((r) => ({
      label: r[0],
      value: flattenLayoutValue(r[1]),
    }));
    if (base.layoutMode !== "NONE") {
      sections["Auto-layout"] = autoLayoutRows(base).map((r) => ({
        label: r[0],
        value: flattenLayoutValue(r[1]),
      }));
    }
    sections["Visuel"] = visualRows(base).map((r) => ({
      label: r[0],
      value: flattenLayoutValue(r[1]),
    }));
    const fx = effectRows(base);
    if (fx.length > 0) {
      sections["Effets"] = fx.map((r) => ({
        label: r[0],
        value: flattenLayoutValue(r[1]),
      }));
    }
    doc.layout = sections;
  }

  if (options.anatomy && base) {
    // Reuse the smart-detection walker — same set as the canvas anatomy when
    // no manual includedLayers list is provided.
    const { base: probedBase, booleanPayload } = getAnatomyBaseAndOverrides(
      target,
      options.anatomyVariant
    );
    if (probedBase) {
      const probe = probedBase.createInstance();
      if (Object.keys(booleanPayload).length > 0) {
        try {
          probe.setProperties(booleanPayload);
        } catch {
          /* keep default state */
        }
      }
      let layers: AnatomyLayer[];
      if (options.anatomyIncludedLayers !== undefined) {
        const inc = new Set(options.anatomyIncludedLayers);
        layers = findAllVisibleLayersWithPositions(probe).filter((l) => inc.has(l.key));
        if (layers.length > ANATOMY_MAX_LAYERS) layers = layers.slice(0, ANATOMY_MAX_LAYERS);
      } else {
        layers = findNamedLayersOnInstance(probe);
      }
      doc.anatomy = layers.map((l) => l.node.name).filter((n) => n.length > 0);
      probe.remove();
    }
  }

  if (options.tokens && base) {
    const { base: tBase, booleanPayload: tBool } = getAnatomyBaseAndOverrides(
      target,
      options.tokenVariant
    );
    if (tBase) {
      const probe = tBase.createInstance();
      if (Object.keys(tBool).length > 0) {
        try {
          probe.setProperties(tBool);
        } catch {
          /* keep default state */
        }
      }
      let varUsages = collectVariableUsagesOnInstance(probe);
      let styleUsages = collectTextStyleUsagesOnInstance(probe);
      probe.remove();

      if (options.tokenIncludedLayers !== undefined) {
        const inc = new Set(options.tokenIncludedLayers);
        varUsages = varUsages.filter((u) => isAnchorInScope(u.anchorKey, inc));
        styleUsages = styleUsages.filter((u) => isAnchorInScope(u.anchorKey, inc));
      }

      const varIds = new Set<string>();
      for (const u of varUsages) varIds.add(u.variableId);
      const varInfo = await resolveVariableInfo(varIds);
      const styleIds = new Set<string>();
      for (const u of styleUsages) styleIds.add(u.styleId);
      const styleInfo = await resolveTextStyleInfo(styleIds);

      // Dedupe by id (count usages).
      const colorMap = new Map<string, { name: string; collection: string; count: number }>();
      for (const u of varUsages) {
        const info = varInfo.get(u.variableId);
        if (!info || info.type !== "COLOR") continue;
        const cur = colorMap.get(u.variableId) ?? {
          name: info.name,
          collection: info.collection,
          count: 0,
        };
        cur.count++;
        colorMap.set(u.variableId, cur);
      }
      const typoMap = new Map<string, { name: string; spec: string; count: number }>();
      for (const u of styleUsages) {
        const info = styleInfo.get(u.styleId);
        if (!info) continue;
        const cur = typoMap.get(u.styleId) ?? { name: info.name, spec: info.spec, count: 0 };
        cur.count++;
        typoMap.set(u.styleId, cur);
      }

      doc.tokens = {
        colors: Array.from(colorMap.values()),
        typography: Array.from(typoMap.values()),
      };
    }
  }

  return doc;
}

function escapeMdCell(s: string): string {
  return s.replace(/\|/g, "\\|").replace(/\r?\n/g, " ");
}

function buildMarkdown(doc: DocData): string {
  const lines: string[] = [];
  lines.push(`# ${doc.component.name}`);
  const meta = [
    doc.component.kind === "COMPONENT_SET" ? "Set de variants" : "Composant",
    `${doc.component.propCount} prop${doc.component.propCount !== 1 ? "s" : ""}`,
  ];
  if (doc.component.combinationCount > 0) {
    meta.push(
      `${doc.component.combinationCount} combinaison${doc.component.combinationCount !== 1 ? "s" : ""}`
    );
  }
  lines.push(`> ${meta.join(" · ")}`);
  lines.push("");

  if (doc.generalDescription) {
    lines.push(doc.generalDescription);
    lines.push("");
  }

  if (doc.props && doc.props.length > 0) {
    lines.push("## Propriétés");
    lines.push("");
    lines.push("| Propriété | Type | Description | Valeurs |");
    lines.push("|---|---|---|---|");
    for (const p of doc.props) {
      const values = p.values.length > 0 ? p.values.join(", ") : "—";
      lines.push(
        `| ${escapeMdCell(p.name)} | ${p.type} | ${escapeMdCell(p.description)} | ${escapeMdCell(values)} |`
      );
    }
    lines.push("");
  }

  if (doc.layout) {
    lines.push("## Layout");
    lines.push("");
    for (const section in doc.layout) {
      const rows = doc.layout[section];
      lines.push(`### ${section}`);
      for (const r of rows) {
        lines.push(`- **${r.label}** : ${r.value}`);
      }
      lines.push("");
    }
  }

  if (doc.anatomy && doc.anatomy.length > 0) {
    lines.push("## Anatomie");
    lines.push("");
    doc.anatomy.forEach((name, i) => lines.push(`${i + 1}. ${name}`));
    lines.push("");
  }

  if (doc.tokens) {
    const hasContent = doc.tokens.colors.length > 0 || doc.tokens.typography.length > 0;
    if (hasContent) {
      lines.push("## Design tokens");
      lines.push("");
      if (doc.tokens.colors.length > 0) {
        lines.push("### Couleurs");
        for (const c of doc.tokens.colors) {
          const usage = c.count > 1 ? ` _(×${c.count})_` : "";
          lines.push(`- ${c.name} — ${c.collection}${usage}`);
        }
        lines.push("");
      }
      if (doc.tokens.typography.length > 0) {
        lines.push("### Typographie");
        for (const t of doc.tokens.typography) {
          const usage = t.count > 1 ? ` _(×${t.count})_` : "";
          lines.push(`- ${t.name} — ${t.spec}${usage}`);
        }
        lines.push("");
      }
    }
  }

  return lines.join("\n");
}

// ─────────────────────────────────────────────────────────────────────────────

function makeSheet(target: DocTarget, title: string, content: SceneNode): FrameNode {
  const sheet = figma.createFrame();
  sheet.name = `Doc · ${title} · ${target.name}`;
  sheet.layoutMode = "VERTICAL";
  sheet.primaryAxisSizingMode = "AUTO";
  sheet.counterAxisSizingMode = "AUTO";
  sheet.itemSpacing = 32;
  sheet.paddingTop = 56;
  sheet.paddingBottom = 56;
  sheet.paddingLeft = 56;
  sheet.paddingRight = 56;
  sheet.fills = [{ type: "SOLID", color: COLOR.bg }];
  sheet.cornerRadius = 16;
  sheet.strokes = [{ type: "SOLID", color: COLOR.border }];
  sheet.strokeWeight = 1;
  sheet.effects = [
    {
      type: "DROP_SHADOW",
      color: { r: 0, g: 0, b: 0, a: 0.05 },
      offset: { x: 0, y: 8 },
      radius: 32,
      spread: 0,
      visible: true,
      blendMode: "NORMAL",
    },
  ];

  sheet.appendChild(makeSheetHeader(target.name, title));
  sheet.appendChild(content);
  return sheet;
}

function makeSheetHeader(componentName: string, categoryTitle: string): FrameNode {
  const header = figma.createFrame();
  header.layoutMode = "VERTICAL";
  header.primaryAxisSizingMode = "AUTO";
  header.counterAxisSizingMode = "AUTO";
  header.itemSpacing = 6;
  header.fills = [];

  const name = figma.createText();
  name.fontName = { family: "Inter", style: "Regular" };
  name.fontSize = 12;
  name.characters = componentName;
  name.fills = [{ type: "SOLID", color: COLOR.textMuted }];
  name.letterSpacing = { value: 2, unit: "PERCENT" };
  header.appendChild(name);

  const title = figma.createText();
  title.fontName = { family: "Inter", style: "Semi Bold" };
  title.fontSize = 36;
  title.characters = categoryTitle;
  title.fills = [{ type: "SOLID", color: COLOR.textPrimary }];
  title.lineHeight = { value: 110, unit: "PERCENT" };
  header.appendChild(title);

  return header;
}

// ─── Admin-style sheet (osmose.proginov.com reference) ────────────────────

function makeAdminSheet(
  target: DocTarget,
  title: string,
  content: SceneNode,
  sheetWidth: number = ADMIN_SHEET_WIDTH_DEFAULT
): FrameNode {
  const contentW = sheetWidth - ADMIN_SHEET_PADDING * 2;
  const sheet = figma.createFrame();
  sheet.name = `Doc · ${title} · ${target.name}`;
  sheet.layoutMode = "VERTICAL";
  // Both axes start AUTO so Figma computes the natural size from children.
  // We FIX the width AFTER appendChild — see end of function.
  sheet.primaryAxisSizingMode = "AUTO";
  sheet.counterAxisSizingMode = "AUTO";
  sheet.itemSpacing = 24;
  sheet.paddingTop = ADMIN_SHEET_PADDING;
  sheet.paddingBottom = ADMIN_SHEET_PADDING;
  sheet.paddingLeft = ADMIN_SHEET_PADDING;
  sheet.paddingRight = ADMIN_SHEET_PADDING;
  sheet.fills = [{ type: "SOLID", color: COLOR.refSheetBg }];
  sheet.cornerRadius = 12;
  sheet.strokes = [];
  sheet.effects = [
    {
      type: "DROP_SHADOW",
      color: { r: 0, g: 0, b: 0, a: 0.02 },
      offset: { x: 0, y: 7 },
      radius: 3,
      spread: 0,
      visible: true,
      blendMode: "NORMAL",
    },
    {
      type: "DROP_SHADOW",
      color: { r: 0, g: 0, b: 0, a: 0.06 },
      offset: { x: 0, y: 4 },
      radius: 2,
      spread: 0,
      visible: true,
      blendMode: "NORMAL",
    },
    {
      type: "DROP_SHADOW",
      color: { r: 0, g: 0, b: 0, a: 0.10 },
      offset: { x: 0, y: 2 },
      radius: 2,
      spread: 0,
      visible: true,
      blendMode: "NORMAL",
    },
    {
      type: "DROP_SHADOW",
      color: { r: 0, g: 0, b: 0, a: 0.12 },
      offset: { x: 0, y: 0 },
      radius: 1,
      spread: 0,
      visible: true,
      blendMode: "NORMAL",
    },
  ];

  sheet.appendChild(makeAdminSheetHeader(target.name, title, contentW));
  sheet.appendChild(content);

  // Lock the width NOW that children are in place — AUTO already computed the
  // natural height. STRETCH inside children expands them to the content width
  // on the next layout pass.
  sheet.counterAxisSizingMode = "FIXED";
  sheet.resize(sheetWidth, sheet.height);
  // Tag the sheet with its section title so per-section regen can locate /
  // replace exactly the right one (in addition to the component-id tag set
  // when the sheet is positioned in generateDoc).
  sheet.setPluginData("docyourprops:section", title);
  return sheet;
}

// 24×24 brand glyph — two parallel slanted bars in #0C4790. Imported from
// SVG so it survives PNG/JPEG export and matches the design 1:1.
function makeBreadcrumbIcon(): FrameNode {
  const svg = `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M7.23114 18.4368H3.84808L8.22284 5.56299H11.4968L7.23114 18.4368Z" fill="#0C4790"/><path d="M15.8862 18.4368H12.5038L16.8793 5.56299H20.1518L15.8862 18.4368Z" fill="#0C4790"/></svg>`;
  const node = figma.createNodeFromSvg(svg);
  node.name = "Icon";
  return node;
}

function makeAdminSheetHeader(
  componentName: string,
  categoryTitle: string,
  contentWidth: number = ADMIN_CONTENT_WIDTH_DEFAULT,
  tag?: SceneNode
): FrameNode {
  const header = figma.createFrame();
  header.name = "FrameHeader";
  header.layoutMode = "VERTICAL";
  header.primaryAxisSizingMode = "AUTO";
  header.counterAxisSizingMode = "AUTO";
  header.layoutAlign = "STRETCH";
  header.itemSpacing = 32;
  header.fills = [];

  // ── Breadcrumb top row ───────────────────────────────────────────────────
  const top = figma.createFrame();
  top.name = "FrameTop";
  top.layoutMode = "HORIZONTAL";
  top.primaryAxisSizingMode = "FIXED";
  top.counterAxisSizingMode = "AUTO";
  top.layoutAlign = "STRETCH";
  top.resize(contentWidth, 24);
  top.primaryAxisAlignItems = "SPACE_BETWEEN";
  top.counterAxisAlignItems = "CENTER";
  top.itemSpacing = 8;
  top.fills = [];

  // Left: icon + "PODS /" + componentName
  const breadcrumb = figma.createFrame();
  breadcrumb.name = "TitleBreadCrumb";
  breadcrumb.layoutMode = "HORIZONTAL";
  breadcrumb.primaryAxisSizingMode = "AUTO";
  breadcrumb.counterAxisSizingMode = "AUTO";
  breadcrumb.counterAxisAlignItems = "CENTER";
  breadcrumb.itemSpacing = 4;
  breadcrumb.fills = [];

  breadcrumb.appendChild(makeBreadcrumbIcon());

  const podsText = figma.createText();
  podsText.fontName = FONT.title;
  podsText.fontSize = 16;
  podsText.lineHeight = { value: 24, unit: "PIXELS" };
  podsText.characters = "PODS /";
  podsText.fills = [{ type: "SOLID", color: COLOR.refMutedText }];
  breadcrumb.appendChild(podsText);

  const compText = figma.createText();
  compText.fontName = FONT.titleMed;
  compText.fontSize = 16;
  compText.lineHeight = { value: 24, unit: "PIXELS" };
  compText.characters = componentName;
  compText.fills = [{ type: "SOLID", color: COLOR.refMutedText }];
  breadcrumb.appendChild(compText);

  top.appendChild(breadcrumb);

  // Right: brand URL (text only — user attaches the hyperlink manually)
  const url = figma.createText();
  url.name = "Brand link";
  url.fontName = FONT.title;
  url.fontSize = 16;
  url.lineHeight = { value: 19, unit: "PIXELS" };
  url.characters = "osmose.proginov.com";
  url.fills = [{ type: "SOLID", color: COLOR.refBrand }];
  top.appendChild(url);

  header.appendChild(top);

  // ── Title row (text + bottom divider) ────────────────────────────────────
  const titleWrap = figma.createFrame();
  titleWrap.name = "Title";
  titleWrap.layoutMode = "VERTICAL";
  titleWrap.primaryAxisSizingMode = "AUTO";
  titleWrap.counterAxisSizingMode = "AUTO";
  titleWrap.layoutAlign = "STRETCH";
  titleWrap.paddingBottom = 16;
  titleWrap.itemSpacing = 8;
  titleWrap.fills = [];
  titleWrap.strokes = [{ type: "SOLID", color: COLOR.refTitleDivider }];
  titleWrap.strokeAlign = "INSIDE";
  titleWrap.strokeTopWeight = 0;
  titleWrap.strokeBottomWeight = 1;
  titleWrap.strokeLeftWeight = 0;
  titleWrap.strokeRightWeight = 0;

  const title = figma.createText();
  title.fontName = FONT.titleMed;
  title.fontSize = 32;
  title.lineHeight = { value: 38, unit: "PIXELS" };
  title.characters = categoryTitle;
  title.fills = [{ type: "SOLID", color: COLOR.refTitlePrimary }];

  if (tag) {
    const titleRow = figma.createFrame();
    titleRow.name = "TitleRow";
    titleRow.layoutMode = "HORIZONTAL";
    titleRow.primaryAxisSizingMode = "AUTO";
    titleRow.counterAxisSizingMode = "AUTO";
    titleRow.itemSpacing = 12;
    titleRow.counterAxisAlignItems = "CENTER";
    titleRow.fills = [];
    titleRow.appendChild(title);
    titleRow.appendChild(tag);
    titleWrap.appendChild(titleRow);
  } else {
    title.layoutAlign = "STRETCH";
    titleWrap.appendChild(title);
  }

  header.appendChild(titleWrap);

  return header;
}

// A prop is "boolean-like" if it's a real BOOLEAN, or a VARIANT with two
// values matching true/false, on/off, yes/no (any casing). Such props get a
// "Has a " prefix in display contexts.
function isPropBoolish(p: PropInfo): boolean {
  if (p.type === "BOOLEAN") return true;
  if (p.type === "VARIANT") {
    const opts = (p.variantOptions ?? []).map((v) => ({ label: v, value: v }));
    return isBoolishOptions(opts);
  }
  return false;
}

function displayPropName(p: PropInfo): string {
  return isPropBoolish(p) ? `Has a ${p.name}` : p.name;
}

// Scale a fixed widths list to a target total while preserving proportions.
// Last column absorbs the rounding remainder so the sum is exact.
function scaleWidths(widths: number[], targetTotal: number): number[] {
  const total = widths.reduce((a, b) => a + b, 0);
  if (total === targetTotal) return widths.slice();
  const scaled: number[] = [];
  let acc = 0;
  for (let i = 0; i < widths.length - 1; i++) {
    const w = Math.round((widths[i] * targetTotal) / total);
    scaled.push(w);
    acc += w;
  }
  scaled.push(targetTotal - acc);
  return scaled;
}

function buildPropsSection(
  target: DocTarget,
  contentWidth: number = ADMIN_CONTENT_WIDTH_DEFAULT,
  instanceSwapNames?: Map<string, string[]>,
  propDescriptions?: Record<string, string>
): SceneNode {
  const props = extractProps(target);
  if (props.length === 0) return textFrame("Aucune propriété détectée.");
  const widths = scaleWidths(PROP_COL_WIDTHS, contentWidth);
  return makeAdminTable(
    PROP_COL_HEADERS,
    widths,
    props.map((p) => {
      const display = displayPropName(p);
      return [
        display,
        pickPropDescription(p.name, display, propDescriptions),
        makeTypeChip(p.type),
        makeBulletList(valuesAsItems(p, instanceSwapNames)),
      ] as AdminCellContent[];
    })
  );
}

async function buildPropsAndMatrixContent(
  target: DocTarget,
  groupBy: string[],
  excludeRules: ExclusionRule[],
  propLocks: PropLocks,
  layout: AdminCardLayout,
  visualBg: string,
  instanceSwapNames?: Map<string, string[]>,
  propDescriptions?: Record<string, string>
): Promise<SceneNode> {
  const wrapper = figma.createFrame();
  wrapper.name = "Body";
  wrapper.layoutMode = "VERTICAL";
  wrapper.primaryAxisSizingMode = "AUTO";
  wrapper.counterAxisSizingMode = "AUTO";
  wrapper.layoutAlign = "STRETCH";
  wrapper.itemSpacing = 24;
  wrapper.paddingBottom = 24;
  wrapper.fills = [];
  wrapper.strokes = [{ type: "SOLID", color: COLOR.refTitleDivider }];
  wrapper.strokeAlign = "INSIDE";
  wrapper.strokeTopWeight = 0;
  wrapper.strokeBottomWeight = 1;
  wrapper.strokeLeftWeight = 0;
  wrapper.strokeRightWeight = 0;

  // Component name as section title (24px Medium)
  const sectionTitle = figma.createText();
  sectionTitle.fontName = FONT.titleMed;
  sectionTitle.fontSize = 24;
  sectionTitle.lineHeight = { value: 29, unit: "PIXELS" };
  sectionTitle.characters = target.name;
  sectionTitle.fills = [{ type: "SOLID", color: COLOR.refTitlePrimary }];
  wrapper.appendChild(sectionTitle);

  wrapper.appendChild(
    buildSubSection(
      "Props list",
      buildPropsSection(target, layout.contentW, instanceSwapNames, propDescriptions)
    )
  );
  const variants = await buildVariantsSection(target, groupBy, excludeRules, propLocks, layout, visualBg);
  const visualTag =
    variants.comboCount > 0
      ? makeTag(`${variants.comboCount} combinaison${variants.comboCount > 1 ? "s" : ""}`)
      : undefined;
  wrapper.appendChild(buildSubSection("Props visual", variants.node, visualTag));
  return wrapper;
}

function buildSubSection(
  label: string,
  content: SceneNode,
  tag?: SceneNode
): FrameNode {
  const section = figma.createFrame();
  section.layoutMode = "VERTICAL";
  section.primaryAxisSizingMode = "AUTO";
  section.counterAxisSizingMode = "AUTO";
  section.layoutAlign = "STRETCH";
  section.itemSpacing = 16;
  section.fills = [];

  const h = figma.createText();
  h.fontName = FONT.titleMed;
  h.fontSize = 20;
  h.lineHeight = { value: 24, unit: "PIXELS" };
  h.characters = label;
  h.fills = [{ type: "SOLID", color: COLOR.refTitlePrimary }];

  if (tag) {
    const headerRow = figma.createFrame();
    headerRow.name = "SubSectionHeader";
    headerRow.layoutMode = "HORIZONTAL";
    headerRow.primaryAxisSizingMode = "AUTO";
    headerRow.counterAxisSizingMode = "AUTO";
    headerRow.itemSpacing = 8;
    headerRow.counterAxisAlignItems = "CENTER";
    headerRow.fills = [];
    headerRow.appendChild(h);
    headerRow.appendChild(tag);
    section.appendChild(headerRow);
  } else {
    section.appendChild(h);
  }

  section.appendChild(content);
  return section;
}

// Inline tag chip — small pill rendered next to a section title.
// Palette = one of the brand-tag color pairs. Default is the blue pair
// (matches the matrix card surface).
type TagPalette = { bg: string; fg: string };
const TAG_PALETTE_BLUE: TagPalette = { bg: "#E6F2FD", fg: "#085FAC" };
const TAG_PALETTE_GREEN: TagPalette = { bg: "#ECF7E8", fg: "#35821B" };
const TAG_PALETTE_PURPLE: TagPalette = { bg: "#F2EFFC", fg: "#614CA2" };
const TAG_PALETTE_ORANGE: TagPalette = { bg: "#FEF0E7", fg: "#B05112" };
const TAG_PALETTE_CYAN: TagPalette = { bg: "#E6F9FF", fg: "#10718D" };

function makeTag(label: string, palette: TagPalette = TAG_PALETTE_BLUE): FrameNode {
  const tag = figma.createFrame();
  tag.name = "Tag";
  tag.layoutMode = "HORIZONTAL";
  tag.primaryAxisSizingMode = "AUTO";
  tag.counterAxisSizingMode = "AUTO";
  tag.paddingTop = 2;
  tag.paddingBottom = 2;
  tag.paddingLeft = 8;
  tag.paddingRight = 8;
  tag.cornerRadius = 6;
  tag.counterAxisAlignItems = "CENTER";
  tag.fills = [{ type: "SOLID", color: hex(palette.bg) }];

  const t = figma.createText();
  t.fontName = FONT.bodyMed;
  t.fontSize = 12;
  t.lineHeight = { value: 18, unit: "PIXELS" };
  t.characters = label;
  t.fills = [{ type: "SOLID", color: hex(palette.fg) }];
  tag.appendChild(t);
  return tag;
}

type ResolvedVar = {
  id: string;
  name: string;
  type: VariableResolvedDataType;
  collection: string;
};

// Resolve metadata (name, type, collection) for each unique variable id.
// Skips ids that don't resolve (library not loaded). Result map uses the
// variable id as key.
async function resolveVariableInfo(ids: Set<string>): Promise<Map<string, ResolvedVar>> {
  const out = new Map<string, ResolvedVar>();
  for (const id of ids) {
    try {
      const v = await figma.variables.getVariableByIdAsync(id);
      if (!v) continue;
      let collName = "—";
      try {
        const coll = await figma.variables.getVariableCollectionByIdAsync(
          v.variableCollectionId
        );
        if (coll) collName = coll.name;
      } catch {
        /* ignore */
      }
      out.set(id, { id, name: v.name, type: v.resolvedType, collection: collName });
    } catch {
      pushGenerationWarning("variable non résolvable");
    }
  }
  return out;
}

type ResolvedTextStyle = {
  id: string;
  name: string;
  spec: string; // human-readable typographic spec ("Inter Bold · 14 px")
};

// Resolve TextStyle metadata for unique ids. Skips ids that don't resolve to
// a TEXT-typed style (lib not loaded, removed, etc.).
async function resolveTextStyleInfo(
  ids: Set<string>
): Promise<Map<string, ResolvedTextStyle>> {
  const out = new Map<string, ResolvedTextStyle>();
  for (const id of ids) {
    try {
      const s = await figma.getStyleByIdAsync(id);
      if (!s || s.type !== "TEXT") continue;
      const ts = s as TextStyle;
      const fn = ts.fontName;
      const family = typeof fn === "object" ? fn.family : "Mixed";
      const style = typeof fn === "object" ? fn.style : "";
      const size = typeof ts.fontSize === "number" ? `${ts.fontSize} px` : "Mixed";
      const spec = `${family}${style ? " " + style : ""} · ${size}`;
      out.set(id, { id, name: ts.name, spec });
    } catch {
      pushGenerationWarning("style de texte non résolvable");
    }
  }
  return out;
}

// True if `anchorKey` is in `set`, OR any of its ancestor keys is. The "root"
// anchor is special-cased: it's always in scope (always documented).
function isAnchorInScope(anchorKey: string, set: Set<string>): boolean {
  if (anchorKey === "root") return true;
  let cur = anchorKey;
  while (true) {
    if (set.has(cur)) return true;
    const slash = cur.lastIndexOf("/");
    if (slash === -1) return false;
    cur = cur.substring(0, slash);
  }
}

// Walk up `anchorKey`'s ancestor chain and return the first key present in
// the picker `treeKeys` set. Used to surface deep token usages (inside nested
// instances) as auto-selections on the visible parent in the picker tree.
function nearestPickerAncestor(anchorKey: string, treeKeys: Set<string>): string | null {
  if (anchorKey === "root") return null;
  let cur = anchorKey;
  while (true) {
    if (treeKeys.has(cur)) return cur;
    const slash = cur.lastIndexOf("/");
    if (slash === -1) return null;
    cur = cur.substring(0, slash);
  }
}

async function buildTokensSectionForWidth(
  target: DocTarget,
  contentW: number,
  variantSel?: VariantSelection,
  includedLayers?: string[]
): Promise<SceneNode> {
  // Reuse the anatomy variant resolver — for COMPONENT_SET, picks the
  // matching child variant; applies BOOLEAN overrides on the probe.
  const { base, booleanPayload } = getAnatomyBaseAndOverrides(target, variantSel);
  if (!base) return textFrame("Aucun composant à analyser.");

  // Walk a probe instance to collect both variable usages (for COLOR tokens)
  // and text-style usages (for typography). The probe is removed once we've
  // snapshotted everything.
  const probe = base.createInstance();
  if (Object.keys(booleanPayload).length > 0) {
    try {
      probe.setProperties(booleanPayload);
    } catch {
      /* invalid combo — keep default state */
    }
  }
  let varUsages = collectVariableUsagesOnInstance(probe);
  let styleUsages = collectTextStyleUsagesOnInstance(probe);
  probe.remove();

  // Layer filter: when the user has restricted the search scope, keep only
  // usages whose anchor IS or is a descendant of any included key. This
  // sub-tree semantic means checking a sub-component (e.g. an icon) also
  // pulls in the tokens bound on its inner layers. The instance root is
  // always kept — it's not exposed in the layer picker.
  if (includedLayers !== undefined) {
    const inc = new Set(includedLayers);
    varUsages = varUsages.filter((u) => isAnchorInScope(u.anchorKey, inc));
    styleUsages = styleUsages.filter((u) => isAnchorInScope(u.anchorKey, inc));
  }

  // Resolve variable metadata for unique ids — we only keep COLOR-typed ones.
  // FLOAT/STRING/BOOLEAN variables are intentionally ignored : design tokens
  // here mean color + typography.
  const uniqueVarIds = new Set<string>();
  for (const u of varUsages) uniqueVarIds.add(u.variableId);
  const varInfo = await resolveVariableInfo(uniqueVarIds);
  const colorUsages = varUsages.filter((u) => {
    const info = varInfo.get(u.variableId);
    return info && info.type === "COLOR";
  });

  // Resolve text style metadata for unique ids.
  const uniqueStyleIds = new Set<string>();
  for (const u of styleUsages) uniqueStyleIds.add(u.styleId);
  const styleInfo = await resolveTextStyleInfo(uniqueStyleIds);
  const validStyleUsages = styleUsages.filter((u) => styleInfo.has(u.styleId));

  if (colorUsages.length === 0 && validStyleUsages.length === 0) {
    if (varUsages.length > 0 || styleUsages.length > 0) {
      return textFrame(
        "Design tokens détectés mais non résolvables (librairie non chargée)."
      );
    }
    return textFrame("Aucun design token détecté.");
  }

  const visualW = Math.round(contentW * ANATOMY_VISUAL_RATIO);
  const wrapper = figma.createFrame();
  wrapper.name = "TokensBody";
  wrapper.layoutMode = "VERTICAL";
  wrapper.primaryAxisSizingMode = "AUTO";
  wrapper.counterAxisSizingMode = "AUTO";
  wrapper.layoutAlign = "STRETCH";
  wrapper.itemSpacing = 32;
  wrapper.fills = [];

  if (colorUsages.length > 0) {
    const anchors: PinAnchor[] = colorUsages.map((u) => ({
      key: u.anchorKey,
      localX: u.anchorLocalX,
      localY: u.anchorLocalY,
      w: u.anchorW,
      h: u.anchorH,
    }));
    const legendRows: PinLegendRow[] = colorUsages.map((u) => {
      const info = varInfo.get(u.variableId)!;
      return { primary: info.name, secondary: info.collection };
    });
    const block = buildPinnedVisualBlock(
      base,
      booleanPayload,
      anchors,
      legendRows,
      contentW,
      visualW,
      "TokensVisual·COLOR"
    );
    wrapper.appendChild(buildSubSection("Couleurs", block));
  }

  if (validStyleUsages.length > 0) {
    const anchors: PinAnchor[] = validStyleUsages.map((u) => ({
      key: u.anchorKey,
      localX: u.anchorLocalX,
      localY: u.anchorLocalY,
      w: u.anchorW,
      h: u.anchorH,
    }));
    const legendRows: PinLegendRow[] = validStyleUsages.map((u) => {
      const info = styleInfo.get(u.styleId)!;
      return { primary: info.name, secondary: info.spec };
    });
    const block = buildPinnedVisualBlock(
      base,
      booleanPayload,
      anchors,
      legendRows,
      contentW,
      visualW,
      "TokensVisual·TYPOGRAPHY"
    );
    wrapper.appendChild(buildSubSection("Typographie", block));
  }

  return wrapper;
}

async function buildTokensSection(
  target: DocTarget,
  variantSel?: VariantSelection,
  includedLayers?: string[]
): Promise<SceneNode> {
  return buildTokensSectionForWidth(
    target,
    ADMIN_CONTENT_WIDTH_DEFAULT,
    variantSel,
    includedLayers
  );
}

// ─── Layout section ──────────────────────────────────────────────────────────

const LAYOUT_COL_WIDTHS = [220, 416]; // sum = 636 (admin content width)
const LAYOUT_COL_HEADERS = ["Propriété", "Valeur"];
const PDF_LAYOUT_COL_WIDTHS_A4 = [180, 335]; // sum = 515

type LayoutNode = ComponentNode;

function fmtPx(n: number): string {
  const r = Math.round(n * 100) / 100;
  return `${r} px`;
}

function fmtPaddingShorthand(node: LayoutNode): string {
  const t = node.paddingTop;
  const r = node.paddingRight;
  const b = node.paddingBottom;
  const l = node.paddingLeft;
  if (t === r && r === b && b === l) return fmtPx(t);
  if (t === b && r === l) return `${fmtPx(t)} · ${fmtPx(r)} (V · H)`;
  return `${t} · ${r} · ${b} · ${l} px (T · R · B · L)`;
}

function fmtRadius(node: LayoutNode): string {
  const cr = node.cornerRadius;
  if (typeof cr === "number") return fmtPx(cr);
  // Mixed corners
  const tl = node.topLeftRadius;
  const tr = node.topRightRadius;
  const bl = node.bottomLeftRadius;
  const br = node.bottomRightRadius;
  return `${fmtPx(tl)} · ${fmtPx(tr)} · ${fmtPx(br)} · ${fmtPx(bl)} (TL · TR · BR · BL)`;
}

function fmtConstraint(c: "MIN" | "MAX" | "STRETCH" | "CENTER" | "SCALE"): string {
  switch (c) {
    case "MIN":
      return "Début";
    case "MAX":
      return "Fin";
    case "STRETCH":
      return "Étiré";
    case "CENTER":
      return "Centré";
    case "SCALE":
      return "Échelle";
  }
}

function fmtSizingMode(m: "FIXED" | "AUTO"): string {
  return m === "FIXED" ? "Fixe" : "Auto (Hug)";
}

function fmtPrimaryAlign(m: "MIN" | "CENTER" | "MAX" | "SPACE_BETWEEN"): string {
  switch (m) {
    case "MIN":
      return "Début";
    case "CENTER":
      return "Centre";
    case "MAX":
      return "Fin";
    case "SPACE_BETWEEN":
      return "Espace équivalent";
  }
}

function fmtCounterAlign(m: "MIN" | "CENTER" | "MAX" | "BASELINE"): string {
  switch (m) {
    case "MIN":
      return "Début";
    case "CENTER":
      return "Centre";
    case "MAX":
      return "Fin";
    case "BASELINE":
      return "Baseline";
  }
}

function fmtStrokeAlign(a: "INSIDE" | "OUTSIDE" | "CENTER"): string {
  return a === "INSIDE" ? "Intérieur" : a === "OUTSIDE" ? "Extérieur" : "Centré";
}

function rgbHex(c: RGB): string {
  const h = (n: number) => {
    const v = Math.round(Math.max(0, Math.min(1, n)) * 255).toString(16).toUpperCase();
    return v.length === 1 ? "0" + v : v;
  };
  return `#${h(c.r)}${h(c.g)}${h(c.b)}`;
}

function rgbaSummary(c: RGBA): string {
  return c.a < 1 ? `${rgbHex(c)} ${Math.round(c.a * 100)}%` : rgbHex(c);
}

function paintSummary(p: Paint): string {
  if (p.type === "SOLID") {
    const bound = (p as SolidPaint).boundVariables?.color;
    if (bound) return "Variable";
    const c = p.color;
    const a = (p as SolidPaint).opacity ?? 1;
    return a < 1 ? `${rgbHex(c)} ${Math.round(a * 100)}%` : rgbHex(c);
  }
  if (p.type === "GRADIENT_LINEAR") return "Linear gradient";
  if (p.type === "GRADIENT_RADIAL") return "Radial gradient";
  if (p.type === "GRADIENT_ANGULAR") return "Angular gradient";
  if (p.type === "GRADIENT_DIAMOND") return "Diamond gradient";
  if (p.type === "IMAGE") return "Image";
  if (p.type === "VIDEO") return "Video";
  return p.type;
}

function fillsSummary(fills: ReadonlyArray<Paint> | typeof figma.mixed): string {
  if (fills === figma.mixed) return "Mixte";
  const visible = fills.filter((p) => p.visible !== false);
  if (visible.length === 0) return "Aucun";
  return visible.map(paintSummary).join(" + ");
}

function strokeSummary(node: LayoutNode): string {
  if (!node.strokes || node.strokes.length === 0) return "Aucun";
  const visible = node.strokes.filter((p) => p.visible !== false);
  if (visible.length === 0) return "Aucun";
  const w = node.strokeWeight;
  const weight = typeof w === "number" ? `${w} px` : "Mixte";
  const align = fmtStrokeAlign(node.strokeAlign);
  const color = visible.map(paintSummary).join(" + ");
  const dashed = node.dashPattern && node.dashPattern.length > 0 ? " · pointillés" : "";
  return `${weight} ${align} · ${color}${dashed}`;
}

function effectSummary(e: Effect): string {
  switch (e.type) {
    case "DROP_SHADOW":
      return `Drop shadow · ${rgbaSummary(e.color)} · offset ${e.offset.x}/${e.offset.y} · blur ${e.radius}${e.spread ? ` · spread ${e.spread}` : ""}`;
    case "INNER_SHADOW":
      return `Inner shadow · ${rgbaSummary(e.color)} · offset ${e.offset.x}/${e.offset.y} · blur ${e.radius}`;
    case "LAYER_BLUR":
      return `Layer blur · ${e.radius}`;
    case "BACKGROUND_BLUR":
      return `Background blur · ${e.radius}`;
    default:
      return (e as { type: string }).type;
  }
}

function fmtBlendMode(m: BlendMode): string {
  if (m === "NORMAL") return "Normal";
  if (m === "PASS_THROUGH") return "Pass through";
  return m
    .split("_")
    .map((s) => s.charAt(0) + s.slice(1).toLowerCase())
    .join(" ");
}

type LayoutRow = [string, AdminCellContent];

function dimensionRows(node: LayoutNode): LayoutRow[] {
  const rows: LayoutRow[] = [];
  rows.push(["Dimensions (W × H)", `${fmtPx(node.width)} × ${fmtPx(node.height)}`]);
  if (node.minWidth != null) rows.push(["Largeur minimale", fmtPx(node.minWidth)]);
  if (node.maxWidth != null) rows.push(["Largeur maximale", fmtPx(node.maxWidth)]);
  if (node.minHeight != null) rows.push(["Hauteur minimale", fmtPx(node.minHeight)]);
  if (node.maxHeight != null) rows.push(["Hauteur maximale", fmtPx(node.maxHeight)]);
  rows.push([
    "Contraintes (H · V)",
    `${fmtConstraint(node.constraints.horizontal)} · ${fmtConstraint(node.constraints.vertical)}`,
  ]);
  if (node.targetAspectRatio) {
    const ar = node.targetAspectRatio;
    rows.push(["Ratio cible", `${ar.x} : ${ar.y}`]);
  }
  return rows;
}

function autoLayoutRows(node: LayoutNode): LayoutRow[] {
  const rows: LayoutRow[] = [];
  rows.push(["Direction", node.layoutMode === "HORIZONTAL" ? "Horizontal" : "Vertical"]);
  rows.push(["Padding", fmtPaddingShorthand(node)]);
  const gap =
    node.primaryAxisAlignItems === "SPACE_BETWEEN" ? "Auto (espace équivalent)" : fmtPx(node.itemSpacing);
  rows.push(["Espacement", gap]);
  rows.push(["Sizing primaire", fmtSizingMode(node.primaryAxisSizingMode)]);
  rows.push(["Sizing secondaire", fmtSizingMode(node.counterAxisSizingMode)]);
  rows.push(["Alignement primaire", fmtPrimaryAlign(node.primaryAxisAlignItems)]);
  rows.push(["Alignement secondaire", fmtCounterAlign(node.counterAxisAlignItems)]);
  if (node.layoutWrap === "WRAP") {
    const cas = node.counterAxisSpacing;
    rows.push(["Wrap", `Oui${cas != null ? ` · gap entre lignes ${fmtPx(cas)}` : ""}`]);
  } else {
    rows.push(["Wrap", "Non"]);
  }
  rows.push(["Strokes inclus dans le layout", node.strokesIncludedInLayout ? "Oui" : "Non"]);
  return rows;
}

function visualRows(node: LayoutNode): LayoutRow[] {
  const rows: LayoutRow[] = [];
  rows.push(["Corner radius", fmtRadius(node)]);
  rows.push(["Stroke", strokeSummary(node)]);
  rows.push(["Fill", fillsSummary(node.fills)]);
  if (node.opacity < 1) rows.push(["Opacité", `${Math.round(node.opacity * 100)} %`]);
  if (node.blendMode !== "NORMAL" && node.blendMode !== "PASS_THROUGH") {
    rows.push(["Blend mode", fmtBlendMode(node.blendMode)]);
  }
  rows.push(["Clip content", node.clipsContent ? "Oui" : "Non"]);
  return rows;
}

function effectRows(node: LayoutNode): LayoutRow[] {
  const rows: LayoutRow[] = [];
  for (let i = 0; i < node.effects.length; i++) {
    const e = node.effects[i];
    if (e.visible === false) continue;
    rows.push([`Effet ${i + 1}`, effectSummary(e)]);
  }
  return rows;
}

function buildLayoutSubSections(node: LayoutNode, widths: number[]): FrameNode {
  const wrapper = figma.createFrame();
  wrapper.name = "LayoutBody";
  wrapper.layoutMode = "VERTICAL";
  wrapper.primaryAxisSizingMode = "AUTO";
  wrapper.counterAxisSizingMode = "AUTO";
  wrapper.layoutAlign = "STRETCH";
  wrapper.itemSpacing = 24;
  wrapper.fills = [];

  const tableFrom = (rows: LayoutRow[]): FrameNode =>
    makeAdminTable(LAYOUT_COL_HEADERS, widths, rows.map((r) => [r[0], r[1]] as AdminCellContent[]));

  wrapper.appendChild(buildSubSection("Dimensions", tableFrom(dimensionRows(node))));

  if (node.layoutMode !== "NONE") {
    wrapper.appendChild(buildSubSection("Auto-layout", tableFrom(autoLayoutRows(node))));
  }

  wrapper.appendChild(buildSubSection("Visuel", tableFrom(visualRows(node))));

  const effects = effectRows(node);
  if (effects.length > 0) {
    wrapper.appendChild(buildSubSection("Effets", tableFrom(effects)));
  }

  return wrapper;
}

function buildLayoutSection(target: DocTarget): SceneNode {
  const node = getBaseComponent(target);
  if (!node) return textFrame("Aucun composant à analyser.");
  return buildLayoutSubSections(node, LAYOUT_COL_WIDTHS);
}

function buildPdfLayoutPage(target: DocTarget): FrameNode {
  const page = makePdfPage();
  const header = makePdfHeader(target.name, "Layout");
  page.appendChild(header);
  header.x = PDF_MARGIN;
  header.y = PDF_MARGIN;

  const node = getBaseComponent(target);
  if (!node) return page;

  const body = buildLayoutSubSections(node, PDF_LAYOUT_COL_WIDTHS_A4);
  page.appendChild(body);
  body.x = PDF_MARGIN;
  body.y = PDF_MARGIN + header.height + PDF_BODY_GAP;
  return page;
}

// ─── Anatomie annotée ────────────────────────────────────────────────────────

const ANATOMY_VISUAL_RATIO = 0.55; // visual area takes ~55% of content width
const ANATOMY_VISUAL_H_MIN = 240;
const ANATOMY_VISUAL_PADDING = 24;
const ANATOMY_CALLOUT_GAP = 32; // space between visual right edge and the badge column
const ANATOMY_BADGE_SIZE = 24;
const ANATOMY_NAME_FONT_SIZE = 13;
const ANATOMY_NAME_LINE_HEIGHT = 18;
// Vibrant purple — picked to contrast strongly with primary-blue components
// so leader lines and badges never blend with the documented design.
const ANATOMY_ACCENT_COLOR = "#A020F0";
const ANATOMY_MAX_LAYERS = 12;
const ANATOMY_MAX_DEPTH = 4;
// Pin placement (badge + leader line) — used by buildPinnedVisualBlock.
const ANATOMY_PIN_LAYER_PADDING = 6; // min gap between badge and any layer bbox
const ANATOMY_PIN_BADGE_GAP = 8; // min gap between two badges (edge-to-edge)
const ANATOMY_PIN_RING_STEP = 12;
const ANATOMY_PIN_MAX_RINGS = 12;
const ANATOMY_PIN_DIRECTIONS = 16;
const ANATOMY_PIN_SEARCH_MARGIN = 80; // how far outside the component pins may extend
const ANATOMY_LEADER_WEIGHT = 1;

// Layer names that don't carry semantic info (auto-generated by Figma).
const GENERIC_LAYER_NAME_RE =
  /^(Frame|Group|Rectangle|Ellipse|Vector|Line|Polygon|Star|Component|Instance|Slice|Image)\s*\d*$/i;

function isMeaningfulLayerName(name: string): boolean {
  if (!name || name.length === 0) return false;
  if (name.startsWith(".") || name.startsWith("_")) return false;
  return !GENERIC_LAYER_NAME_RE.test(name);
}

function visibleChildCount(node: SceneNode): number {
  if (!("children" in node)) return 0;
  const cs = (node as ChildrenMixin & SceneNode).children;
  let n = 0;
  for (const c of cs) if (c.visible !== false) n++;
  return n;
}

// Returns true if `node` has any visible component-like reference (INSTANCE,
// nested COMPONENT or COMPONENT_SET) in its subtree, within `maxDepth` levels.
// Used to opt-out of single-child collapse: those references must remain
// documentation targets even when buried inside single-child wrappers.
function hasVisibleInstanceDescendant(node: SceneNode, maxDepth: number): boolean {
  if (maxDepth <= 0) return false;
  if (!("children" in node)) return false;
  const cs = (node as ChildrenMixin & SceneNode).children;
  for (const c of cs) {
    if (c.visible === false) continue;
    if (c.type === "INSTANCE" || c.type === "COMPONENT" || c.type === "COMPONENT_SET")
      return true;
    if (hasVisibleInstanceDescendant(c, maxDepth - 1)) return true;
  }
  return false;
}

function findNamedLayers(root: ComponentNode): SceneNode[] {
  const out: SceneNode[] = [];
  const walk = (node: SceneNode, depth: number): void => {
    if (depth > ANATOMY_MAX_DEPTH) return;
    if (!("children" in node)) return;
    const container = node as ChildrenMixin & SceneNode;
    for (const child of container.children) {
      if (child.visible === false) continue;
      const childMeaningful = isMeaningfulLayerName(child.name);
      if (childMeaningful) out.push(child);
      // Single-child collapse: when a meaningful-named layer wraps exactly
      // one visible layer, the inner content is redundant — keep only this
      // wrapper (the highest level) and stop descending here.
      if (childMeaningful && visibleChildCount(child) === 1) continue;
      walk(child, depth + 1);
    }
  };
  walk(root, 0);
  out.sort((a, b) => {
    const aBB = a.absoluteBoundingBox;
    const bBB = b.absoluteBoundingBox;
    if (!aBB || !bBB) return 0;
    return aBB.y - bBB.y || aBB.x - bBB.x;
  });
  return out.slice(0, ANATOMY_MAX_LAYERS);
}

// Drill into single-child wrappers to find the visually "representative" leaf
// of a layer. Used so the leader-line tip aims at e.g. the "Label" text inside
// a wrapper frame rather than the centre of the wrapper itself. Returns coords
// in the SAME local space as the input (i.e. relative to the instance root —
// caller is expected to pass `wrapperLocalX/Y` in instance-local coords).
function resolveLeafTarget(
  wrapper: SceneNode,
  wrapperLocalX: number,
  wrapperLocalY: number,
  wrapperW: number,
  wrapperH: number
): { x: number; y: number; w: number; h: number } {
  let cur: SceneNode = wrapper;
  let curX = wrapperLocalX;
  let curY = wrapperLocalY;
  let curW = wrapperW;
  let curH = wrapperH;
  for (let depth = 0; depth < 3; depth++) {
    if (!("children" in cur)) break;
    const cs = (cur as ChildrenMixin & SceneNode).children;
    let only: SceneNode | null = null;
    let visibles = 0;
    for (const c of cs) {
      if (c.visible === false) continue;
      visibles++;
      if (visibles > 1) break;
      only = c;
    }
    if (visibles !== 1 || !only) break;
    if (only.type === "INSTANCE" || only.type === "COMPONENT" || only.type === "COMPONENT_SET")
      break;
    const lm = only as unknown as LayoutMixin;
    curX += lm.x;
    curY += lm.y;
    curW = lm.width;
    curH = lm.height;
    cur = only;
  }
  return { x: curX, y: curY, w: curW, h: curH };
}

// AABB intersection with an outer padding (rects considered overlapping if
// they're closer than `padding` on any axis).
function rectsOverlap(
  a: { x: number; y: number; w: number; h: number },
  b: { x: number; y: number; w: number; h: number },
  padding: number
): boolean {
  return !(
    a.x + a.w + padding <= b.x ||
    b.x + b.w + padding <= a.x ||
    a.y + a.h + padding <= b.y ||
    b.y + b.h + padding <= a.y
  );
}

// Liang-Barsky line-rect intersection. Returns true when segment p1→p2 has any
// portion strictly inside `rect` (used to detect leader lines that cut across
// other documented layers).
function segmentCrossesRect(
  p1: { x: number; y: number },
  p2: { x: number; y: number },
  rect: { x: number; y: number; w: number; h: number }
): boolean {
  const dx = p2.x - p1.x;
  const dy = p2.y - p1.y;
  const xMin = rect.x;
  const xMax = rect.x + rect.w;
  const yMin = rect.y;
  const yMax = rect.y + rect.h;
  const p = [-dx, dx, -dy, dy];
  const q = [p1.x - xMin, xMax - p1.x, p1.y - yMin, yMax - p1.y];
  let t0 = 0;
  let t1 = 1;
  for (let i = 0; i < 4; i++) {
    if (p[i] === 0) {
      if (q[i] < 0) return false;
    } else {
      const t = q[i] / p[i];
      if (p[i] < 0) {
        if (t > t1) return false;
        if (t > t0) t0 = t;
      } else {
        if (t < t0) return false;
        if (t < t1) t1 = t;
      }
    }
  }
  return t1 > t0;
}

// Walks the segment `from → to` (where `to` lies inside `rect`) and returns the
// point where it first crosses the rect's border. Used so leader lines stop at
// the edge of the documented layer instead of piercing through to its center.
// Falls back to `to` when no edge crossing is found (e.g. `from` is also inside
// the rect, or the segment is degenerate).
function rayToRectEdge(
  from: { x: number; y: number },
  to: { x: number; y: number },
  rect: { x: number; y: number; w: number; h: number }
): { x: number; y: number } {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  if (Math.abs(dx) < 1e-9 && Math.abs(dy) < 1e-9) return to;
  const xMin = rect.x;
  const xMax = rect.x + rect.w;
  const yMin = rect.y;
  const yMax = rect.y + rect.h;
  let best = Infinity;
  const consider = (t: number, x: number, y: number) => {
    if (t < 0 || t > 1) return;
    if (x < xMin - 1e-6 || x > xMax + 1e-6) return;
    if (y < yMin - 1e-6 || y > yMax + 1e-6) return;
    if (t < best) best = t;
  };
  if (Math.abs(dx) > 1e-9) {
    let t = (xMin - from.x) / dx;
    consider(t, xMin, from.y + t * dy);
    t = (xMax - from.x) / dx;
    consider(t, xMax, from.y + t * dy);
  }
  if (Math.abs(dy) > 1e-9) {
    let t = (yMin - from.y) / dy;
    consider(t, from.x + t * dx, yMin);
    t = (yMax - from.y) / dy;
    consider(t, from.x + t * dx, yMax);
  }
  if (!isFinite(best)) return to;
  return { x: from.x + best * dx, y: from.y + best * dy };
}

function pointToSegmentDistance(
  pt: { x: number; y: number },
  a: { x: number; y: number },
  b: { x: number; y: number }
): number {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const len2 = dx * dx + dy * dy;
  if (len2 < 1e-9) {
    const ex = pt.x - a.x;
    const ey = pt.y - a.y;
    return Math.sqrt(ex * ex + ey * ey);
  }
  let t = ((pt.x - a.x) * dx + (pt.y - a.y) * dy) / len2;
  if (t < 0) t = 0;
  else if (t > 1) t = 1;
  const px = a.x + t * dx;
  const py = a.y + t * dy;
  const ex = pt.x - px;
  const ey = pt.y - py;
  return Math.sqrt(ex * ex + ey * ey);
}

// Build a 1px rectangle node oriented from (x1,y1) to (x2,y2). We use a
// rectangle rather than figma.createLine() because rectangle rotation via
// `relativeTransform` is unambiguous (top-left becomes the segment's start).
function makeLeaderLine(x1: number, y1: number, x2: number, y2: number): RectangleNode {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const len = Math.max(1, Math.sqrt(dx * dx + dy * dy));
  const rad = Math.atan2(dy, dx);
  const line = figma.createRectangle();
  line.name = "Leader";
  line.resize(len, ANATOMY_LEADER_WEIGHT);
  line.fills = [{ type: "SOLID", color: hex(ANATOMY_ACCENT_COLOR) }];
  line.strokes = [];
  // Offset by half the leader thickness perpendicular to its direction so the
  // rectangle's centerline sits on the (x1,y1)→(x2,y2) path.
  const perpX = -Math.sin(rad) * (ANATOMY_LEADER_WEIGHT / 2);
  const perpY = Math.cos(rad) * (ANATOMY_LEADER_WEIGHT / 2);
  line.relativeTransform = [
    [Math.cos(rad), -Math.sin(rad), x1 + perpX],
    [Math.sin(rad), Math.cos(rad), y1 + perpY],
  ];
  return line;
}

function makeAnnotationBadge(n: number, size: number): FrameNode {
  const f = figma.createFrame();
  f.name = `Badge ${n}`;
  f.layoutMode = "HORIZONTAL";
  f.primaryAxisSizingMode = "FIXED";
  f.counterAxisSizingMode = "FIXED";
  f.primaryAxisAlignItems = "CENTER";
  f.counterAxisAlignItems = "CENTER";
  f.resize(size, size);
  f.cornerRadius = size / 2;
  f.fills = [{ type: "SOLID", color: hex(ANATOMY_ACCENT_COLOR) }];
  f.strokes = [{ type: "SOLID", color: { r: 1, g: 1, b: 1 } }];
  f.strokeWeight = 2;
  f.strokeAlign = "OUTSIDE";

  const t = figma.createText();
  t.fontName = FONT.bodyMed;
  t.fontSize = size <= 20 ? 11 : 12;
  t.lineHeight = { value: size, unit: "PIXELS" };
  t.fills = [{ type: "SOLID", color: { r: 1, g: 1, b: 1 } }];
  t.characters = String(n);
  f.appendChild(t);
  return f;
}

// ─── Pin + legend block (shared between Anatomy and Variables liées) ────────

type PinAnchor = {
  key: string;
  // Bbox of the documented layer (instance-local coords, pre-scale). Used as
  // an obstacle when placing badges and leader lines.
  localX: number;
  localY: number;
  w: number;
  h: number;
  // Bbox of the leaf the leader line should aim at. When the documented layer
  // is a wrapper around a single visible leaf (typical case: a frame
  // containing a single "Label" text), this is the leaf's bbox; otherwise it
  // matches the layer bbox. Optional for back-compat with the Variables liées
  // caller which targets the bound node directly.
  targetX?: number;
  targetY?: number;
  targetW?: number;
  targetH?: number;
};

type PinLegendRow = {
  primary: string;
  secondary?: string;
};

// Single legend row: badge on the left + 1 or 2 stacked text lines on the
// right. Width is fixed at `rowW`, height auto-sizes to content. Frames are
// created with both axes FIXED + non-zero placeholder, then flipped to AUTO
// after appendChild — required to dodge Figma's 1px-collapse (cf. CLAUDE.md).
function makeLegendRow(num: number, content: PinLegendRow, rowW: number): FrameNode {
  const hasSecondary = !!content.secondary;
  const row = figma.createFrame();
  row.name = "LegendRow";
  row.layoutMode = "HORIZONTAL";
  row.primaryAxisSizingMode = "FIXED";
  row.counterAxisSizingMode = "FIXED";
  row.counterAxisAlignItems = hasSecondary ? "MIN" : "CENTER";
  row.itemSpacing = 8;
  row.fills = [];
  row.resize(rowW, hasSecondary ? 40 : ANATOMY_BADGE_SIZE);

  row.appendChild(makeAnnotationBadge(num, ANATOMY_BADGE_SIZE));

  const textContainer = figma.createFrame();
  textContainer.name = "LegendText";
  textContainer.layoutMode = "VERTICAL";
  textContainer.primaryAxisSizingMode = "FIXED";
  textContainer.counterAxisSizingMode = "FIXED";
  textContainer.itemSpacing = 2;
  textContainer.fills = [];
  textContainer.layoutGrow = 1;
  textContainer.resize(40, hasSecondary ? 36 : ANATOMY_NAME_LINE_HEIGHT);

  const t1 = figma.createText();
  t1.fontName = FONT.body;
  t1.fontSize = ANATOMY_NAME_FONT_SIZE;
  t1.lineHeight = { value: ANATOMY_NAME_LINE_HEIGHT, unit: "PIXELS" };
  t1.characters = content.primary;
  t1.fills = [{ type: "SOLID", color: COLOR.refTitlePrimary }];
  t1.textAutoResize = "HEIGHT";
  t1.layoutAlign = "STRETCH";
  textContainer.appendChild(t1);

  if (hasSecondary) {
    const t2 = figma.createText();
    t2.fontName = FONT.body;
    t2.fontSize = 11;
    t2.lineHeight = { value: 14, unit: "PIXELS" };
    t2.characters = content.secondary!;
    t2.fills = [{ type: "SOLID", color: COLOR.refMutedText }];
    t2.textAutoResize = "HEIGHT";
    t2.layoutAlign = "STRETCH";
    textContainer.appendChild(t2);
  }
  textContainer.primaryAxisSizingMode = "AUTO";

  row.appendChild(textContainer);
  row.counterAxisSizingMode = "AUTO";
  return row;
}

// Builds a "pinned visual block" — a frame with the cloned component on the
// left (visual) and a numbered legend on the right. Each documented layer is
// annotated by a circular badge connected to the layer's representative leaf
// by a thin leader line. Badges are placed greedily around the component
// avoiding overlap with any layer's bbox and with previously placed badges.
function buildPinnedVisualBlock(
  base: ComponentNode,
  booleanPayload: { [rawKey: string]: boolean },
  anchors: PinAnchor[],
  legendRows: PinLegendRow[],
  contentW: number,
  visualW: number,
  visualName: string = "PinnedVisual"
): SceneNode {
  const BADGE_SIZE = ANATOMY_BADGE_SIZE;
  const BADGE_R = BADGE_SIZE / 2;
  const LEGEND_ROW_GAP = 12;
  const LEGEND_ROW_H = ANATOMY_BADGE_SIZE;

  const calloutColX = visualW + ANATOMY_CALLOUT_GAP;
  const calloutW = contentW - calloutColX;

  // Instance + boolean overrides up-front; all dimensions derive from the
  // post-override size.
  const inst = base.createInstance();
  if (Object.keys(booleanPayload).length > 0) {
    try {
      inst.setProperties(booleanPayload);
    } catch {
      /* invalid combo — keep default state */
    }
  }
  const instW = inst.width;
  const instH = inst.height;

  // Fit the component into the visual area's content slot. Leaves at least
  // ANATOMY_VISUAL_PADDING on each side for badges that land outside the
  // component itself.
  const fitScale = Math.min(1, (visualW - ANATOMY_VISUAL_PADDING * 2) / instW);
  const finalInstW = instW * fitScale;
  const finalInstH = instH * fitScale;
  const compX = Math.round((visualW - finalInstW) / 2);

  // ── Phase A: project layer + target rects into the working coord space ─
  // Working space y=0 == component top edge; we resolve the final y offset
  // (visualOffsetY) after pin placement.
  type Rect = { x: number; y: number; w: number; h: number };
  const layerRects: Rect[] = [];
  const targetRects: Rect[] = [];
  for (const a of anchors) {
    layerRects.push({
      x: compX + a.localX * fitScale,
      y: a.localY * fitScale,
      w: a.w * fitScale,
      h: a.h * fitScale,
    });
    const hasTarget = typeof a.targetX === "number";
    const tx = hasTarget ? (a.targetX as number) : a.localX;
    const ty = hasTarget ? (a.targetY as number) : a.localY;
    const tw = hasTarget ? (a.targetW as number) : a.w;
    const th = hasTarget ? (a.targetH as number) : a.h;
    targetRects.push({
      x: compX + tx * fitScale,
      y: ty * fitScale,
      w: tw * fitScale,
      h: th * fitScale,
    });
  }

  // Search bounds: badges must fit horizontally inside [0, visualW] and may
  // extend up to ANATOMY_PIN_SEARCH_MARGIN above/below the component.
  const xMin = BADGE_R + 2;
  const xMax = visualW - BADGE_R - 2;
  const yMin = -ANATOMY_PIN_SEARCH_MARGIN;
  const yMax = finalInstH + ANATOMY_PIN_SEARCH_MARGIN;

  // ── Phase B: greedy badge placement ────────────────────────────────────
  type Placement = { cx: number; cy: number; tx: number; ty: number };
  const placements: Placement[] = [];
  const placedBadges: { cx: number; cy: number }[] = [];

  for (let i = 0; i < anchors.length; i++) {
    const tgt = targetRects[i];
    const targetCX = tgt.x + tgt.w / 2;
    const targetCY = tgt.y + tgt.h / 2;

    let best: { cx: number; cy: number; score: number } | null = null;

    for (let ring = 1; ring <= ANATOMY_PIN_MAX_RINGS; ring++) {
      const dist =
        BADGE_R + ANATOMY_PIN_LAYER_PADDING + ring * ANATOMY_PIN_RING_STEP;
      for (let d = 0; d < ANATOMY_PIN_DIRECTIONS; d++) {
        const angle = (d * 2 * Math.PI) / ANATOMY_PIN_DIRECTIONS;
        const cx = targetCX + dist * Math.cos(angle);
        const cy = targetCY + dist * Math.sin(angle);
        if (cx < xMin || cx > xMax) continue;
        if (cy < yMin || cy > yMax) continue;

        const badgeRect: Rect = {
          x: cx - BADGE_R,
          y: cy - BADGE_R,
          w: BADGE_SIZE,
          h: BADGE_SIZE,
        };

        // Hard reject: overlap with any layerRect (including own).
        let blocked = false;
        for (let j = 0; j < layerRects.length; j++) {
          if (rectsOverlap(badgeRect, layerRects[j], ANATOMY_PIN_LAYER_PADDING)) {
            blocked = true;
            break;
          }
        }
        if (blocked) continue;

        // Hard reject: badge collides with a previously placed badge.
        const minBadgeDist = BADGE_SIZE + ANATOMY_PIN_BADGE_GAP;
        const minBadgeDist2 = minBadgeDist * minBadgeDist;
        for (const pb of placedBadges) {
          const ddx = cx - pb.cx;
          const ddy = cy - pb.cy;
          if (ddx * ddx + ddy * ddy < minBadgeDist2) {
            blocked = true;
            break;
          }
        }
        if (blocked) continue;

        // Leader endpoints: from badge edge to target center.
        const dxToTarget = targetCX - cx;
        const dyToTarget = targetCY - cy;
        const len = Math.sqrt(dxToTarget * dxToTarget + dyToTarget * dyToTarget);
        const edgeX = cx + (BADGE_R / len) * dxToTarget;
        const edgeY = cy + (BADGE_R / len) * dyToTarget;

        let score = dist;
        // Penalty: leader passing through other documented layers.
        for (let j = 0; j < layerRects.length; j++) {
          if (j === i) continue;
          if (
            segmentCrossesRect(
              { x: edgeX, y: edgeY },
              { x: targetCX, y: targetCY },
              layerRects[j]
            )
          ) {
            score += 80;
          }
        }
        // Penalty: leader passing very close to another badge.
        for (const pb of placedBadges) {
          const d2b = pointToSegmentDistance(
            { x: pb.cx, y: pb.cy },
            { x: edgeX, y: edgeY },
            { x: targetCX, y: targetCY }
          );
          if (d2b < BADGE_R + 4) score += 30;
        }

        if (!best || score < best.score) best = { cx, cy, score };
      }
      // Early exit when current ring already produced a penalty-free hit.
      if (
        best &&
        best.score <=
          BADGE_R + ANATOMY_PIN_LAYER_PADDING + ring * ANATOMY_PIN_RING_STEP + 0.5
      )
        break;
    }

    if (!best) {
      // Last-resort: drop the badge directly above the target with the leader
      // pointing straight down. The frame will grow vertically to fit.
      const cx = Math.max(xMin, Math.min(xMax, targetCX));
      const cy = tgt.y - BADGE_R - ANATOMY_PIN_LAYER_PADDING;
      best = { cx, cy, score: Infinity };
    }

    placedBadges.push({ cx: best.cx, cy: best.cy });
    placements.push({ cx: best.cx, cy: best.cy, tx: targetCX, ty: targetCY });
  }

  // ── Phase C: derive visual extents (working space → final coords) ──────
  let minY = 0;
  let maxY = finalInstH;
  for (const p of placements) {
    if (p.cy - BADGE_R < minY) minY = p.cy - BADGE_R;
    if (p.cy + BADGE_R > maxY) maxY = p.cy + BADGE_R;
  }
  let padTop = ANATOMY_VISUAL_PADDING;
  let padBottom = ANATOMY_VISUAL_PADDING;
  let visualH = Math.round(maxY - minY + padTop + padBottom);
  // Floor to the min visual height by sharing the extra room above/below so
  // the component stays vertically centered when there are few pins.
  if (visualH < ANATOMY_VISUAL_H_MIN) {
    const extra = ANATOMY_VISUAL_H_MIN - visualH;
    padTop += extra / 2;
    padBottom += extra / 2;
    visualH = ANATOMY_VISUAL_H_MIN;
  }
  const visualOffsetY = padTop - minY; // working_y + offset = visual_y

  // Approximate legend height for body sizing (auto-layout finalizes it).
  const rowHeights = legendRows.map((r) => (r.secondary ? 40 : LEGEND_ROW_H));
  const legendH =
    rowHeights.reduce((a, b) => a + b, 0) +
    Math.max(0, legendRows.length - 1) * LEGEND_ROW_GAP;
  const bodyH = Math.max(visualH, legendH);

  // ── Phase D: assemble body + visual ────────────────────────────────────
  const body = figma.createFrame();
  body.name = "PinnedVisualBody";
  body.resize(contentW, bodyH);
  body.fills = [];
  body.clipsContent = false;

  const visual = figma.createFrame();
  visual.name = visualName;
  visual.resize(visualW, visualH);
  visual.fills = [{ type: "SOLID", color: COLOR.refMatrixCardBg }];
  visual.cornerRadius = 8;
  visual.clipsContent = true;
  body.appendChild(visual);
  visual.x = 0;
  visual.y = 0;

  visual.appendChild(inst);
  if (fitScale < 1) inst.rescale(fitScale);
  inst.x = Math.round(compX);
  inst.y = Math.round(visualOffsetY);

  // ── Phase E: leader lines first (under badges), then badges ────────────
  for (let i = 0; i < placements.length; i++) {
    const p = placements[i];
    const badgeCX = p.cx;
    const badgeCY = p.cy + visualOffsetY;
    const targetCX = p.tx;
    const targetCY = p.ty + visualOffsetY;

    const tRect = targetRects[i];
    const targetRectFinal = {
      x: tRect.x,
      y: tRect.y + visualOffsetY,
      w: tRect.w,
      h: tRect.h,
    };
    // Stop the leader at the target rect's border rather than its center.
    const tipPt = rayToRectEdge(
      { x: badgeCX, y: badgeCY },
      { x: targetCX, y: targetCY },
      targetRectFinal
    );

    const dx = tipPt.x - badgeCX;
    const dy = tipPt.y - badgeCY;
    const len = Math.sqrt(dx * dx + dy * dy);
    if (len > BADGE_R + 1) {
      const edgeX = badgeCX + (BADGE_R / len) * dx;
      const edgeY = badgeCY + (BADGE_R / len) * dy;
      const leader = makeLeaderLine(edgeX, edgeY, tipPt.x, tipPt.y);
      visual.appendChild(leader);
    }
  }
  for (let i = 0; i < placements.length; i++) {
    const p = placements[i];
    const badge = makeAnnotationBadge(i + 1, BADGE_SIZE);
    visual.appendChild(badge);
    badge.x = Math.round(p.cx - BADGE_R);
    badge.y = Math.round(p.cy - BADGE_R + visualOffsetY);
  }

  if (legendRows.length > 0) {
    const legend = figma.createFrame();
    legend.name = "PinnedLegend";
    legend.layoutMode = "VERTICAL";
    legend.primaryAxisSizingMode = "FIXED";
    legend.counterAxisSizingMode = "FIXED";
    legend.itemSpacing = LEGEND_ROW_GAP;
    legend.fills = [];
    legend.resize(calloutW, 200);
    for (let i = 0; i < legendRows.length; i++) {
      legend.appendChild(makeLegendRow(i + 1, legendRows[i], calloutW));
    }
    legend.primaryAxisSizingMode = "AUTO";
    body.appendChild(legend);
    legend.x = calloutColX;
    legend.y = 0;
  }

  return body;
}

function buildAnatomySectionForWidth(
  target: DocTarget,
  contentW: number,
  variantSel?: VariantSelection,
  includedLayers?: string[]
): SceneNode {
  const { base, booleanPayload } = getAnatomyBaseAndOverrides(target, variantSel);
  if (!base) return textFrame("Aucun composant à analyser.");

  // Walk the layer tree on a probe instance (with overrides applied) so the
  // detected layers reflect the user's combination. The probe is disposed
  // once we've snapshotted everything we need.
  const probe = base.createInstance();
  if (Object.keys(booleanPayload).length > 0) {
    try {
      probe.setProperties(booleanPayload);
    } catch {
      /* invalid combo */
    }
  }

  let layers: AnatomyLayer[];
  if (includedLayers !== undefined) {
    if (includedLayers.length === 0) {
      probe.remove();
      return textFrame("Aucun calque sélectionné pour l'anatomie.");
    }
    const inc = new Set(includedLayers);
    layers = findAllVisibleLayersWithPositions(probe).filter((l) => inc.has(l.key));
    layers.sort((a, b) => a.localY - b.localY || a.localX - b.localX);
    if (layers.length > ANATOMY_MAX_LAYERS) layers = layers.slice(0, ANATOMY_MAX_LAYERS);
  } else {
    layers = findNamedLayersOnInstance(probe);
  }

  if (layers.length === 0) {
    probe.remove();
    return textFrame("Aucun calque sélectionné pour l'anatomie.");
  }

  // Snapshot what we need before disposing the probe (node references become
  // stale once .remove() is called).
  const anchors: PinAnchor[] = layers.map((l) => ({
    key: l.key,
    localX: l.localX,
    localY: l.localY,
    w: l.w,
    h: l.h,
    targetX: l.targetX,
    targetY: l.targetY,
    targetW: l.targetW,
    targetH: l.targetH,
  }));
  const legendRows: PinLegendRow[] = layers.map((l) => ({ primary: l.node.name }));
  probe.remove();

  const visualW = Math.round(contentW * ANATOMY_VISUAL_RATIO);
  return buildPinnedVisualBlock(
    base,
    booleanPayload,
    anchors,
    legendRows,
    contentW,
    visualW,
    "AnatomyVisual"
  );
}

function buildAnatomySection(
  target: DocTarget,
  variantSel?: VariantSelection,
  includedLayers?: string[]
): SceneNode {
  return buildAnatomySectionForWidth(
    target,
    ADMIN_CONTENT_WIDTH_DEFAULT,
    variantSel,
    includedLayers
  );
}

function buildPdfAnatomyPage(
  target: DocTarget,
  variantSel?: VariantSelection,
  includedLayers?: string[]
): FrameNode {
  const page = makePdfPage();
  const header = makePdfHeader(target.name, "Anatomie");
  page.appendChild(header);
  header.x = PDF_MARGIN;
  header.y = PDF_MARGIN;

  const body = buildAnatomySectionForWidth(target, PDF_CONTENT_W, variantSel, includedLayers);
  page.appendChild(body);
  body.x = PDF_MARGIN;
  body.y = PDF_MARGIN + header.height + PDF_BODY_GAP;
  return page;
}

// Return the variant child of a COMPONENT_SET that matches the user's selection
// (axisName → variant value). Falls back to null if the selection is empty,
// references unknown axes, or doesn't match any variant.
function findVariantBySelection(
  set: ComponentSetNode,
  sel: VariantSelection
): ComponentNode | null {
  const keys = Object.keys(sel).filter((k) => sel[k]);
  if (keys.length === 0) return null;
  for (const child of set.children) {
    if (child.type !== "COMPONENT") continue;
    const vp = (child as ComponentNode).variantProperties;
    if (!vp) continue;
    let match = true;
    for (const k of keys) {
      if (vp[k] !== sel[k]) {
        match = false;
        break;
      }
    }
    if (match) return child as ComponentNode;
  }
  return null;
}

// Splits the anatomy selection into the VARIANT part (used to pick the
// component child) and the BOOLEAN part (applied to the instance via
// setProperties). The user's selection is keyed by stripped names; we look up
// each prop's type in `defs` to dispatch correctly. BOOLEAN values come in as
// "true" / "false" strings from the UI and are coerced here.
function getAnatomyBaseAndOverrides(
  target: DocTarget,
  variantSel?: VariantSelection
): { base: ComponentNode | null; booleanPayload: { [rawKey: string]: boolean } } {
  const defs = target.componentPropertyDefinitions;
  const variantPart: VariantSelection = {};
  const booleanPayload: { [rawKey: string]: boolean } = {};
  if (variantSel) {
    for (const name of Object.keys(variantSel)) {
      const value = variantSel[name];
      if (typeof value !== "string") continue;
      // Match by stripped name — variant prop keys have no #suffix, others do.
      for (const rawKey of Object.keys(defs)) {
        if (stripPropKey(rawKey) !== name) continue;
        const def = defs[rawKey];
        if (def.type === "VARIANT") variantPart[name] = value;
        else if (def.type === "BOOLEAN") booleanPayload[rawKey] = value === "true";
        break;
      }
    }
  }
  let base: ComponentNode | null = null;
  if (target.type === "COMPONENT_SET" && Object.keys(variantPart).length > 0) {
    base = findVariantBySelection(target, variantPart);
  }
  if (!base) base = getBaseComponent(target);
  return { base, booleanPayload };
}

type AnatomyLayer = {
  node: SceneNode;
  // Stable identifier: dot-joined path of child indexes from the instance root
  // (e.g. "0/1/2"). Survives boolean-driven visibility changes since indexes
  // refer to position in the children array, not the rendered order.
  key: string;
  localX: number;
  localY: number;
  w: number;
  h: number;
  // Leaf bbox the pin should aim at (see resolveLeafTarget). Same coord space
  // as localX/Y. Matches the wrapper bbox when no representative leaf exists.
  targetX: number;
  targetY: number;
  targetW: number;
  targetH: number;
};

// Walk an instance's children using local x/y (relative to the instance),
// honoring the same single-child-collapse rule as findNamedLayers. Coords
// here are in the instance's local space — multiply by fitScale to convert
// to the rendered scale, or walk after rescale to skip the multiplication.
function findNamedLayersOnInstance(inst: InstanceNode): AnatomyLayer[] {
  const out: AnatomyLayer[] = [];
  const recurse = (
    node: SceneNode,
    depth: number,
    dx: number,
    dy: number,
    parentKey: string
  ): void => {
    if (depth > ANATOMY_MAX_DEPTH) return;
    if (!("children" in node)) return;
    const container = node as ChildrenMixin & SceneNode;
    for (let i = 0; i < container.children.length; i++) {
      const child = container.children[i];
      if (child.visible === false) continue;
      const lm = child as unknown as LayoutMixin;
      const cx = dx + lm.x;
      const cy = dy + lm.y;
      const childKey = parentKey ? `${parentKey}/${i}` : String(i);
      const meaningful = isMeaningfulLayerName(child.name);
      // Component-like nodes (instances of other components, or nested
      // components/component sets) are always documentation-worthy — push them
      // regardless of whether their layer name passes the meaningful filter,
      // because they reference an external component.
      const isComponentLike =
        child.type === "INSTANCE" ||
        child.type === "COMPONENT" ||
        child.type === "COMPONENT_SET";
      if (meaningful || isComponentLike) {
        const tgt = resolveLeafTarget(child, cx, cy, lm.width, lm.height);
        out.push({
          node: child,
          key: childKey,
          localX: cx,
          localY: cy,
          w: lm.width,
          h: lm.height,
          targetX: tgt.x,
          targetY: tgt.y,
          targetW: tgt.w,
          targetH: tgt.h,
        });
      }
      // Stop descending into nested component-like nodes — their internals
      // belong to another component's documentation, not this one.
      if (isComponentLike) continue;
      // Single-child collapse: meaningful wrapper around exactly one layer.
      // EXCEPT when the subtree contains a nested instance — instances of
      // other components must always reach the layer list, even when buried
      // inside single-child wrappers.
      if (
        meaningful &&
        visibleChildCount(child) === 1 &&
        !hasVisibleInstanceDescendant(child, ANATOMY_MAX_DEPTH - depth)
      )
        continue;
      recurse(child, depth + 1, cx, cy, childKey);
    }
  };
  recurse(inst, 0, 0, 0, "");
  out.sort((a, b) => a.localY - b.localY || a.localX - b.localX);
  return out.slice(0, ANATOMY_MAX_LAYERS);
}

// Maximum tree size shown in the layer picker — generous enough for most
// real components. Beyond this, the picker truncates (the rendered anatomy
// is independently capped by ANATOMY_MAX_LAYERS).
const ANATOMY_TREE_MAX_DEPTH = 8;
const ANATOMY_TREE_MAX_NODES = 200;

type AnatomyTreeEntry = { key: string; name: string; type: string; depth: number };

// Walk every visible layer (depth-first, capped) so the UI can show the user
// the exact hierarchy of their instance. Stops descending into nested
// component-like nodes — their internals belong to another component's doc.
function walkAnatomyTree(inst: InstanceNode): AnatomyTreeEntry[] {
  const out: AnatomyTreeEntry[] = [];
  const recurse = (node: SceneNode, depth: number, parentKey: string): void => {
    if (depth > ANATOMY_TREE_MAX_DEPTH) return;
    if (out.length >= ANATOMY_TREE_MAX_NODES) return;
    if (!("children" in node)) return;
    const container = node as ChildrenMixin & SceneNode;
    for (let i = 0; i < container.children.length; i++) {
      if (out.length >= ANATOMY_TREE_MAX_NODES) return;
      const child = container.children[i];
      if (child.visible === false) continue;
      const key = parentKey ? `${parentKey}/${i}` : String(i);
      out.push({ key, name: child.name, type: child.type, depth });
      if (
        child.type === "INSTANCE" ||
        child.type === "COMPONENT" ||
        child.type === "COMPONENT_SET"
      )
        continue;
      recurse(child, depth + 1, key);
    }
  };
  recurse(inst, 0, "");
  return out;
}

// Walk all visible layers WITH position info (used for rendering when the
// user supplied an explicit include list — we then filter by key).
function findAllVisibleLayersWithPositions(inst: InstanceNode): AnatomyLayer[] {
  const out: AnatomyLayer[] = [];
  const recurse = (
    node: SceneNode,
    depth: number,
    dx: number,
    dy: number,
    parentKey: string
  ): void => {
    if (depth > ANATOMY_TREE_MAX_DEPTH) return;
    if (!("children" in node)) return;
    const container = node as ChildrenMixin & SceneNode;
    for (let i = 0; i < container.children.length; i++) {
      const child = container.children[i];
      if (child.visible === false) continue;
      const lm = child as unknown as LayoutMixin;
      const cx = dx + lm.x;
      const cy = dy + lm.y;
      const key = parentKey ? `${parentKey}/${i}` : String(i);
      const tgt = resolveLeafTarget(child, cx, cy, lm.width, lm.height);
      out.push({
        node: child,
        key,
        localX: cx,
        localY: cy,
        w: lm.width,
        h: lm.height,
        targetX: tgt.x,
        targetY: tgt.y,
        targetW: tgt.w,
        targetH: tgt.h,
      });
      if (
        child.type === "INSTANCE" ||
        child.type === "COMPONENT" ||
        child.type === "COMPONENT_SET"
      )
        continue;
      recurse(child, depth + 1, cx, cy, key);
    }
  };
  recurse(inst, 0, 0, 0, "");
  return out;
}

// ─── AI extractors (DSExtract port) ─────────────────────────────────────────
//
// Three independent extractors that collect everything the LLM needs to write
// per-prop descriptions and general narration for a component:
//   1. extractAiMetadata — variants, anatomy (2 levels deep), boundVariables
//      resolved to their effective values (hex / px / token name).
//   2. extractAiCSS       — getCSSAsync() per variant; the computed values that
//      Figma resolves natively (radii, colors, shadows…).
//   3. extractAiDocs      — walker over user-linked documentation frames with a
//      reading-order traversal, a node budget, and a PNG capture of each frame
//      for vision-capable models.
// buildAiPayload assembles them in parallel and is exposed via the "ai-extract"
// message handler (UI ↔ sandbox). All helpers are prefixed Ai* / ai* to keep
// them distinct from DocYourProps' own pipeline.

const AI_DOC_MAX_DEPTH = 6;
const AI_DOC_NODE_BUDGET = 400;
const AI_SCHEMA_CONCURRENCY = 30;
const AI_PROP_VALUE_MAX_CHARS = 200;
const AI_IMAGE_MAX_DIMENSION = 1024;
const AI_IMAGE_MAX_BYTES = 4 * 1024 * 1024;
const AI_ROW_TOLERANCE = 8;

type AiVariableSummary = {
  id?: string;
  name: string | null;
  type: string | null;
  value: string | number | boolean | null;
  alpha?: number;
  error?: string;
};

type AiBoundVariables = Record<string, AiVariableSummary | AiVariableSummary[]>;

type AiExtractedChild = {
  name: string;
  type: string;
  visible: boolean;
  fillStyleId: string | null;
  textStyleId: string | null;
  effectStyleId: string | null;
  boundVariables: AiBoundVariables | null;
  characters?: string;
  fontSize?: number;
  fontName?: FontName;
  children: AiExtractedChild[];
};

type AiExtractedVariant = {
  name: string;
  properties: Record<string, string>;
  width: number;
  height: number;
  layoutMode: string;
  padding: { top: number; right: number; bottom: number; left: number };
  itemSpacing: number;
  primaryAxisAlignItems: string;
  counterAxisAlignItems: string;
  boundVariables: AiBoundVariables | null;
  children: AiExtractedChild[];
};

type AiExtractedMetadata = {
  id: string;
  name: string;
  type: string;
  description: string;
  width: number;
  height: number;
  variantProperties: Record<string, { values: string[] }> | null;
  componentProperties: Record<string, { type: string; defaultValue: unknown }> | null;
  variants: AiExtractedVariant[];
};

type AiDocImage = {
  mediaType: string;
  base64: string;
  width: number;
  height: number;
  bytes: number;
};

type AiDocNode =
  | { kind: "text"; text: string; fontSize: number | null; level: "h1" | "h2" | "h3" | "body" }
  | { kind: "instance"; componentName: string | null; properties: Record<string, unknown> }
  | {
      kind: "schema";
      name: string;
      nodeType: string;
      width: number;
      height: number;
      css: Record<string, string> | null;
      cssError?: string;
    }
  | {
      kind: "container";
      name: string;
      type: string;
      layout: string;
      isRow: boolean;
      children: AiDocNode[];
    }
  | { kind: "truncated"; reason: string; name?: string; remaining?: number };

type AiDocFrame = {
  index: number;
  name: string;
  type: string;
  width: number;
  height: number;
  tree: AiDocNode;
  image?: AiDocImage | null;
  imageError?: string;
};

type AiExtractedDocs = {
  version: 2;
  frames: AiDocFrame[];
  textFallback: string[];
};

type AiPayload = {
  meta: { extractedAt: string; pageName: string; fileName: string };
  metadata: AiExtractedMetadata;
  css: Record<string, Record<string, string> | null>;
  documentation: AiExtractedDocs;
};

// Internal placeholders carry a transient `_node` reference that gets stripped
// before the payload is sent to the UI.
type AiSchemaPlaceholder = {
  kind: "schema";
  name: string;
  nodeType: string;
  width: number;
  height: number;
  css: Record<string, string> | null;
  cssError?: string;
  _node?: SceneNode;
};
type AiInstancePlaceholder = {
  kind: "instance";
  componentName: string | null;
  properties: Record<string, unknown>;
  _node?: InstanceNode;
};
type AiBudget = { remaining: number };

function aiChannelToHex(c: number): string {
  const n = Math.round(Math.max(0, Math.min(1, c)) * 255);
  const s = n.toString(16);
  return s.length < 2 ? "0" + s : s;
}

function aiRgbToHex(color: { r: number; g: number; b: number; a?: number }): string {
  const hex = "#" + aiChannelToHex(color.r) + aiChannelToHex(color.g) + aiChannelToHex(color.b);
  if (typeof color.a === "number" && color.a < 1) return hex + aiChannelToHex(color.a);
  return hex;
}

async function describeAiVariable(
  varId: string,
  consumerNode: SceneNode
): Promise<AiVariableSummary> {
  try {
    const v = await figma.variables.getVariableByIdAsync(varId);
    if (!v) return { id: varId, name: null, type: null, value: null };
    const out: AiVariableSummary = { name: v.name, type: v.resolvedType, value: null };
    const resolved = v.resolveForConsumer(consumerNode);
    if (resolved && resolved.value !== undefined && resolved.value !== null) {
      if (resolved.resolvedType === "COLOR" && typeof resolved.value === "object") {
        const col = resolved.value as { r: number; g: number; b: number; a?: number };
        out.value = aiRgbToHex(col);
        if (typeof col.a === "number") out.alpha = col.a;
      } else {
        out.value = resolved.value as string | number | boolean;
      }
    }
    return out;
  } catch (e) {
    return {
      id: varId,
      name: null,
      type: null,
      value: null,
      error: e instanceof Error ? e.message : String(e),
    };
  }
}

async function summarizeAiBoundVariables(
  bv: { [key: string]: VariableAlias | VariableAlias[] },
  consumerNode: SceneNode
): Promise<AiBoundVariables> {
  const result: AiBoundVariables = {};
  for (const key of Object.keys(bv)) {
    const binding = bv[key];
    try {
      if (Array.isArray(binding)) {
        result[key] = await Promise.all(
          binding.map((b) => describeAiVariable(b.id, consumerNode))
        );
      } else if (binding && binding.id) {
        result[key] = await describeAiVariable(binding.id, consumerNode);
      }
    } catch {
      /* skip a malformed binding silently */
    }
  }
  return result;
}

async function extractAiChildren(
  node: SceneNode,
  depth: number,
  maxDepth: number
): Promise<AiExtractedChild[]> {
  if (depth >= maxDepth || !("children" in node)) return [];
  const out: AiExtractedChild[] = [];
  for (const child of (node as ChildrenMixin & SceneNode).children) {
    const fill = (child as unknown as { fillStyleId?: unknown }).fillStyleId;
    const text = (child as unknown as { textStyleId?: unknown }).textStyleId;
    const effect = (child as unknown as { effectStyleId?: unknown }).effectStyleId;
    const bv = (child as unknown as { boundVariables?: { [key: string]: VariableAlias | VariableAlias[] } })
      .boundVariables;
    const rec: AiExtractedChild = {
      name: child.name,
      type: child.type,
      visible: child.visible,
      fillStyleId: typeof fill === "string" ? fill : null,
      textStyleId: typeof text === "string" ? text : null,
      effectStyleId: typeof effect === "string" ? effect : null,
      boundVariables: bv ? await summarizeAiBoundVariables(bv, child) : null,
      children: await extractAiChildren(child, depth + 1, maxDepth),
    };
    if (child.type === "TEXT") {
      const t = child as TextNode;
      rec.characters = t.characters;
      if (typeof t.fontSize === "number") rec.fontSize = t.fontSize;
      if (typeof t.fontName === "object" && t.fontName !== null && "family" in t.fontName) {
        rec.fontName = t.fontName as FontName;
      }
    }
    out.push(rec);
  }
  return out;
}

async function extractAiVariantInfo(c: ComponentNode): Promise<AiExtractedVariant> {
  const bv = c.boundVariables as
    | { [key: string]: VariableAlias | VariableAlias[] }
    | undefined;
  return {
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
    boundVariables: bv ? await summarizeAiBoundVariables(bv, c) : null,
    children: await extractAiChildren(c, 0, 2),
  };
}

async function extractAiMetadata(node: DocTarget): Promise<AiExtractedMetadata> {
  const isSet = node.type === "COMPONENT_SET";
  const components: ComponentNode[] = isSet
    ? ((node as ComponentSetNode).children as ComponentNode[])
    : [node as ComponentNode];
  const variants = await Promise.all(components.map((c) => extractAiVariantInfo(c)));
  return {
    id: node.id,
    name: node.name,
    type: node.type,
    description: node.description || "",
    width: Math.round(node.width),
    height: Math.round(node.height),
    variantProperties: isSet
      ? ((node as ComponentSetNode).variantGroupProperties as
          | Record<string, { values: string[] }>
          | null)
      : null,
    componentProperties: (() => {
      const defs = node.componentPropertyDefinitions || {};
      const result: Record<string, { type: string; defaultValue: unknown }> = {};
      let hasAny = false;
      for (const rawKey in defs) {
        const d = defs[rawKey];
        if (d.type === "VARIANT") continue;
        result[stripPropKey(rawKey)] = {
          type: d.type,
          defaultValue: (d as { defaultValue?: unknown }).defaultValue ?? null,
        };
        hasAny = true;
      }
      return hasAny ? result : null;
    })(),
    variants,
  };
}

async function extractAiCSS(
  node: DocTarget
): Promise<Record<string, Record<string, string> | null>> {
  const components: SceneNode[] =
    node.type === "COMPONENT_SET"
      ? ((node as ComponentSetNode).children as SceneNode[])
      : [node];
  const cssMap: Record<string, Record<string, string> | null> = {};
  await Promise.all(
    components.map(async (variant) => {
      try {
        const css = await (variant as ComponentNode).getCSSAsync();
        cssMap[variant.name] = css;
      } catch {
        cssMap[variant.name] = null;
      }
    })
  );
  return cssMap;
}

function aiSortByReadingOrder<T extends { x?: number; y?: number }>(nodes: readonly T[]): T[] {
  return nodes.slice().sort((a, b) => {
    const ay = typeof a.y === "number" ? a.y : 0;
    const by = typeof b.y === "number" ? b.y : 0;
    if (Math.abs(ay - by) < AI_ROW_TOLERANCE) {
      const ax = typeof a.x === "number" ? a.x : 0;
      const bx = typeof b.x === "number" ? b.x : 0;
      return ax - bx;
    }
    return ay - by;
  });
}

function aiTextLevel(fontSize: unknown): "h1" | "h2" | "h3" | "body" {
  if (typeof fontSize !== "number") return "body";
  if (fontSize >= 24) return "h1";
  if (fontSize >= 18) return "h2";
  if (fontSize >= 14) return "h3";
  return "body";
}

function aiIsRowLayout(node: SceneNode): boolean {
  if (!("layoutMode" in node) || (node as FrameNode).layoutMode !== "HORIZONTAL") return false;
  if (!("children" in node)) return false;
  const f = node as FrameNode;
  return f.children.length >= 2 && f.counterAxisAlignItems !== "CENTER";
}

function aiHasTextOrInstance(node: SceneNode): boolean {
  if (node.type === "TEXT" || node.type === "INSTANCE") return true;
  if (!("children" in node) || node.visible === false) return false;
  for (const child of (node as ChildrenMixin & SceneNode).children) {
    if (aiHasTextOrInstance(child)) return true;
  }
  return false;
}

function aiSummarizeInstanceProperties(instanceNode: InstanceNode): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  try {
    const props = instanceNode.componentProperties;
    if (!props) return out;
    for (const key of Object.keys(props)) {
      const entry = props[key];
      let v: unknown = entry && "value" in entry ? entry.value : entry;
      if (typeof v === "string" && v.length > AI_PROP_VALUE_MAX_CHARS) {
        v = v.slice(0, AI_PROP_VALUE_MAX_CHARS) + "…";
      }
      out[key] = v;
    }
  } catch {
    /* ignore */
  }
  return out;
}

function walkAiDocNode(
  node: SceneNode,
  depth: number,
  budget: AiBudget,
  schemaPlaceholders: AiSchemaPlaceholder[],
  instancePlaceholders: AiInstancePlaceholder[],
  textFallback: string[],
  visited: WeakSet<SceneNode>
): AiDocNode {
  if (budget.remaining <= 0) return { kind: "truncated", reason: "budget" };
  if (visited.has(node)) return { kind: "truncated", reason: "cycle" };
  visited.add(node);
  budget.remaining -= 1;

  if (node.type === "TEXT") {
    const t = node as TextNode;
    const text = typeof t.characters === "string" ? t.characters : "";
    if (text) textFallback.push(text);
    return {
      kind: "text",
      text,
      fontSize: typeof t.fontSize === "number" ? t.fontSize : null,
      level: aiTextLevel(t.fontSize),
    };
  }

  if (node.type === "INSTANCE") {
    const inst: AiInstancePlaceholder = {
      kind: "instance",
      componentName: null,
      properties: aiSummarizeInstanceProperties(node as InstanceNode),
      _node: node as InstanceNode,
    };
    instancePlaceholders.push(inst);
    return inst as unknown as AiDocNode;
  }

  const hasChildren =
    "children" in node && (node as ChildrenMixin & SceneNode).children.length > 0;
  const w = node.width || 0;
  const h = node.height || 0;
  const hasVisualPresence = w >= 4 && h >= 4;

  if (depth >= 1 && hasVisualPresence && !aiHasTextOrInstance(node)) {
    const placeholder: AiSchemaPlaceholder = {
      kind: "schema",
      name: node.name,
      nodeType: node.type,
      width: Math.round(w),
      height: Math.round(h),
      css: null,
      _node: node,
    };
    schemaPlaceholders.push(placeholder);
    return placeholder as unknown as AiDocNode;
  }

  if (depth >= AI_DOC_MAX_DEPTH) {
    return { kind: "truncated", reason: "depth", name: node.name };
  }

  const container: { kind: "container"; name: string; type: string; layout: string; isRow: boolean; children: AiDocNode[] } = {
    kind: "container",
    name: node.name,
    type: node.type,
    layout: ("layoutMode" in node ? (node as FrameNode).layoutMode : "NONE") || "NONE",
    isRow: aiIsRowLayout(node),
    children: [],
  };

  if (hasChildren) {
    const children = (node as ChildrenMixin & SceneNode).children;
    const isAutoLayout =
      "layoutMode" in node &&
      ((node as FrameNode).layoutMode === "HORIZONTAL" ||
        (node as FrameNode).layoutMode === "VERTICAL");
    const ordered = isAutoLayout
      ? (children as readonly SceneNode[])
      : aiSortByReadingOrder(
          children as readonly (SceneNode & { x?: number; y?: number })[]
        );
    for (let i = 0; i < ordered.length; i++) {
      const child = ordered[i] as SceneNode;
      if (child.visible === false) continue;
      container.children.push(
        walkAiDocNode(
          child,
          depth + 1,
          budget,
          schemaPlaceholders,
          instancePlaceholders,
          textFallback,
          visited
        )
      );
      if (budget.remaining <= 0) {
        const remaining = ordered.length - (i + 1);
        if (remaining > 0)
          container.children.push({ kind: "truncated", reason: "budget", remaining });
        break;
      }
    }
  }

  return container;
}

async function resolveAiSchemaCSS(placeholders: AiSchemaPlaceholder[]): Promise<void> {
  for (let i = 0; i < placeholders.length; i += AI_SCHEMA_CONCURRENCY) {
    const batch = placeholders.slice(i, i + AI_SCHEMA_CONCURRENCY);
    await Promise.all(
      batch.map(async (p) => {
        try {
          if (p._node && "getCSSAsync" in p._node) {
            p.css = await (p._node as ComponentNode).getCSSAsync();
          }
        } catch (e) {
          p.css = null;
          p.cssError = e instanceof Error ? e.message : String(e);
        }
        delete p._node;
      })
    );
  }
}

async function resolveAiInstanceNames(placeholders: AiInstancePlaceholder[]): Promise<void> {
  for (let i = 0; i < placeholders.length; i += AI_SCHEMA_CONCURRENCY) {
    const batch = placeholders.slice(i, i + AI_SCHEMA_CONCURRENCY);
    await Promise.all(
      batch.map(async (p) => {
        try {
          const node = p._node;
          if (!node) {
            p.componentName = "(unknown)";
            return;
          }
          const mc = await node.getMainComponentAsync();
          if (!mc) {
            p.componentName = "(detached)";
          } else if (mc.parent && mc.parent.type === "COMPONENT_SET") {
            p.componentName = mc.parent.name + " / " + mc.name;
          } else {
            p.componentName = mc.name;
          }
        } catch {
          p.componentName = "(unknown)";
        }
        delete p._node;
      })
    );
  }
}

async function captureAiFrameImages(
  frames: { _node?: SceneNode; image?: AiDocImage | null; imageError?: string }[]
): Promise<void> {
  await Promise.all(
    frames.map(async (f) => {
      const node = f._node;
      if (!node || !("exportAsync" in node)) {
        f.image = null;
        return;
      }
      try {
        const w = node.width || 1;
        const h = node.height || 1;
        const scale = Math.min(2, AI_IMAGE_MAX_DIMENSION / Math.max(w, h));
        const bytes = await (node as ExportMixin).exportAsync({
          format: "PNG",
          constraint: { type: "SCALE", value: scale > 0 ? scale : 1 },
        });
        if (bytes.byteLength > AI_IMAGE_MAX_BYTES) {
          f.image = null;
          f.imageError = "image trop lourde (" + bytes.byteLength + " B)";
          return;
        }
        f.image = {
          mediaType: "image/png",
          base64: figma.base64Encode(bytes),
          width: Math.round(w * scale),
          height: Math.round(h * scale),
          bytes: bytes.byteLength,
        };
      } catch (e) {
        f.image = null;
        f.imageError = e instanceof Error ? e.message : String(e);
      }
    })
  );
}

async function extractAiDocs(docFrames: SceneNode[]): Promise<AiExtractedDocs> {
  if (!docFrames || docFrames.length === 0) {
    return { version: 2, frames: [], textFallback: [] };
  }

  const budget: AiBudget = { remaining: AI_DOC_NODE_BUDGET };
  const schemaPlaceholders: AiSchemaPlaceholder[] = [];
  const instancePlaceholders: AiInstancePlaceholder[] = [];
  const textFallback: string[] = [];

  const ordered = aiSortByReadingOrder(
    docFrames as readonly (SceneNode & { x?: number; y?: number })[]
  );

  type WorkingFrame = AiDocFrame & { _node?: SceneNode };
  const frames: WorkingFrame[] = ordered.map((frame, index) => ({
    index,
    name: frame.name,
    type: frame.type,
    width: Math.round(frame.width),
    height: Math.round(frame.height),
    tree: walkAiDocNode(
      frame as SceneNode,
      0,
      budget,
      schemaPlaceholders,
      instancePlaceholders,
      textFallback,
      new WeakSet<SceneNode>()
    ),
    _node: frame as SceneNode,
  }));

  await Promise.all([
    resolveAiSchemaCSS(schemaPlaceholders),
    resolveAiInstanceNames(instancePlaceholders),
    captureAiFrameImages(frames),
  ]);

  for (const f of frames) delete f._node;

  return { version: 2, frames, textFallback };
}

async function buildAiPayload(
  componentNode: DocTarget,
  docFrames: SceneNode[]
): Promise<AiPayload> {
  const [metadata, css, documentation] = await Promise.all([
    extractAiMetadata(componentNode),
    extractAiCSS(componentNode),
    extractAiDocs(docFrames),
  ]);
  return {
    meta: {
      extractedAt: new Date().toISOString(),
      pageName: figma.currentPage.name,
      fileName: figma.root.name,
    },
    metadata,
    css,
    documentation,
  };
}

// ─── Variable usage walker (for Variables liées) ────────────────────────────

type VarUsage = {
  variableId: string;
  anchorKey: string;
  anchorLocalX: number;
  anchorLocalY: number;
  anchorW: number;
  anchorH: number;
};

// Recursively collect all variable IDs referenced in a polymorphic
// `boundVariables` value. Handles three shapes Figma uses:
//   - direct alias: { id: "...", type: "VARIABLE" }
//   - array of aliases: [{id}, {id}, ...]
//   - nested object: { r: alias, g: alias, ... } (gradients, effects, etc.)
function extractAliasIdsFromValue(val: unknown): string[] {
  const out: string[] = [];
  const recurseValue = (v: unknown): void => {
    if (!v) return;
    if (Array.isArray(v)) {
      for (const item of v) recurseValue(item);
      return;
    }
    if (typeof v !== "object") return;
    const obj = v as Record<string, unknown>;
    if (typeof obj.id === "string") {
      out.push(obj.id as string);
      return;
    }
    for (const k in obj) recurseValue(obj[k]);
  };
  recurseValue(val);
  return out;
}

// Walk all visible nodes in `inst` (and the root itself) and emit one VarUsage
// per (variableId, anchorNodeKey) tuple — deduped across fields. Mirrors the
// instance-walker convention from findAllVisibleLayersWithPositions: stops at
// nested component-like nodes, key is the path of child indexes.
function collectVariableUsagesOnInstance(inst: InstanceNode): VarUsage[] {
  const out: VarUsage[] = [];
  const seen = new Set<string>(); // dedupe by `${variableId}|${anchorKey}`

  const visit = (
    node: SceneNode,
    key: string,
    localX: number,
    localY: number,
    w: number,
    h: number
  ): void => {
    const bv = (node as { boundVariables?: Record<string, unknown> }).boundVariables;
    if (!bv) return;
    for (const field in bv) {
      const ids = extractAliasIdsFromValue(bv[field]);
      for (const id of ids) {
        const sig = `${id}|${key}`;
        if (seen.has(sig)) continue;
        seen.add(sig);
        out.push({
          variableId: id,
          anchorKey: key,
          anchorLocalX: localX,
          anchorLocalY: localY,
          anchorW: w,
          anchorH: h,
        });
      }
    }
  };

  // The instance root itself (e.g., its background fills can be variable-bound).
  visit(inst, "root", 0, 0, inst.width, inst.height);

  const recurse = (
    node: SceneNode,
    depth: number,
    dx: number,
    dy: number,
    parentKey: string
  ): void => {
    if (depth > ANATOMY_TREE_MAX_DEPTH) return;
    if (!("children" in node)) return;
    const container = node as ChildrenMixin & SceneNode;
    for (let i = 0; i < container.children.length; i++) {
      const child = container.children[i];
      if (child.visible === false) continue;
      const lm = child as unknown as LayoutMixin;
      const cx = dx + lm.x;
      const cy = dy + lm.y;
      const childKey = parentKey === "root" ? String(i) : `${parentKey}/${i}`;
      visit(child, childKey, cx, cy, lm.width, lm.height);
      // For tokens we DO descend into nested INSTANCE / COMPONENT / COMPONENT_SET:
      // a sub-component (e.g. an icon) carries its own bound variables on
      // its mirrored children, and the user expects to find them when they
      // include that sub-component in the search scope.
      recurse(child, depth + 1, cx, cy, childKey);
    }
  };
  recurse(inst, 0, 0, 0, "root");

  return out;
}

// ─── Text style usage walker (for Typography in Design tokens) ──────────────

type TextStyleUsage = {
  styleId: string;
  anchorKey: string;
  anchorLocalX: number;
  anchorLocalY: number;
  anchorW: number;
  anchorH: number;
};

// Walk the instance and emit one TextStyleUsage per (styleId, anchorKey).
// Only TEXT nodes contribute. Mixed-style text (`textStyleId === figma.mixed`)
// is skipped — it would require per-character resolution.
function collectTextStyleUsagesOnInstance(inst: InstanceNode): TextStyleUsage[] {
  const out: TextStyleUsage[] = [];
  const seen = new Set<string>();

  const visitText = (
    node: TextNode,
    key: string,
    x: number,
    y: number,
    w: number,
    h: number
  ): void => {
    const styleId = node.textStyleId;
    if (typeof styleId !== "string" || styleId === "") return;
    const sig = `${styleId}|${key}`;
    if (seen.has(sig)) return;
    seen.add(sig);
    out.push({
      styleId,
      anchorKey: key,
      anchorLocalX: x,
      anchorLocalY: y,
      anchorW: w,
      anchorH: h,
    });
  };

  const recurse = (
    node: SceneNode,
    depth: number,
    dx: number,
    dy: number,
    parentKey: string
  ): void => {
    if (depth > ANATOMY_TREE_MAX_DEPTH) return;
    if (!("children" in node)) return;
    const container = node as ChildrenMixin & SceneNode;
    for (let i = 0; i < container.children.length; i++) {
      const child = container.children[i];
      if (child.visible === false) continue;
      const lm = child as unknown as LayoutMixin;
      const cx = dx + lm.x;
      const cy = dy + lm.y;
      const childKey = parentKey === "root" ? String(i) : `${parentKey}/${i}`;
      if (child.type === "TEXT") {
        visitText(child as TextNode, childKey, cx, cy, lm.width, lm.height);
      }
      // Same as the variable walker — descend through nested INSTANCEs so
      // text styles applied inside sub-components are surfaced.
      recurse(child, depth + 1, cx, cy, childKey);
    }
  };
  recurse(inst, 0, 0, 0, "root");

  return out;
}

// Compute the layer picker payload for a given target + selection: the full
// hierarchical tree of visible layers, plus the keys auto-selected by the
// smart heuristic (used as the default checkbox state).
function previewAnatomyLayers(
  target: DocTarget,
  variantSel?: VariantSelection
): { tree: AnatomyTreeEntry[]; autoSelected: string[] } {
  const { base, booleanPayload } = getAnatomyBaseAndOverrides(target, variantSel);
  if (!base) return { tree: [], autoSelected: [] };
  const inst = base.createInstance();
  if (Object.keys(booleanPayload).length > 0) {
    try {
      inst.setProperties(booleanPayload);
    } catch {
      // Ignore invalid combos.
    }
  }
  const tree = walkAnatomyTree(inst);
  const autoSelected = findNamedLayersOnInstance(inst).map((l) => l.key);
  inst.remove();
  return { tree, autoSelected };
}

// Same as previewAnatomyLayers but the auto-selected set is the layers where
// at least one design token usage was found (color variable or text style).
// The instance root ("root" key) is never included — it isn't shown in the
// picker tree, but its tokens are always documented anyway.
function previewTokensLayers(
  target: DocTarget,
  variantSel?: VariantSelection
): { tree: AnatomyTreeEntry[]; autoSelected: string[] } {
  const { base, booleanPayload } = getAnatomyBaseAndOverrides(target, variantSel);
  if (!base) return { tree: [], autoSelected: [] };
  const inst = base.createInstance();
  if (Object.keys(booleanPayload).length > 0) {
    try {
      inst.setProperties(booleanPayload);
    } catch {
      /* ignore */
    }
  }
  const tree = walkAnatomyTree(inst);
  // The picker tree stops at INSTANCE / COMPONENT / COMPONENT_SET (clean UX),
  // but the token walkers descend through them. Map each deep usage to the
  // nearest ancestor that IS in the picker tree, so checking an icon's row
  // pre-selects the icon (which then pulls in its inner usages).
  const treeKeys = new Set(tree.map((t) => t.key));
  const seen = new Set<string>();
  for (const u of collectVariableUsagesOnInstance(inst)) {
    const anc = nearestPickerAncestor(u.anchorKey, treeKeys);
    if (anc) seen.add(anc);
  }
  for (const u of collectTextStyleUsagesOnInstance(inst)) {
    const anc = nearestPickerAncestor(u.anchorKey, treeKeys);
    if (anc) seen.add(anc);
  }
  const autoSelected = Array.from(seen);
  inst.remove();
  return { tree, autoSelected };
}

// ─────────────────────────────────────────────────────────────────────────────

type VariantsSectionResult = { node: SceneNode; comboCount: number };

async function buildVariantsSection(
  target: DocTarget,
  groupBy: string[],
  excludeRules: ExclusionRule[],
  propLocks: PropLocks,
  layout: AdminCardLayout,
  visualBg: string
): Promise<VariantsSectionResult> {
  const defs = target.componentPropertyDefinitions;
  const allAxes = await eligibleAxes(defs);
  if (allAxes.length === 0) {
    return {
      node: textFrame(
        "Aucune propriété de type VARIANT, BOOLEAN ou INSTANCE_SWAP exploitable comme axe."
      ),
      comboCount: 0,
    };
  }

  const base = getBaseComponent(target);
  if (!base) return { node: textFrame("Composant de base introuvable."), comboCount: 0 };

  allAxes.sort((a, b) => b.options.length - a.options.length);

  // Validate combinations BEFORE creating any instance:
  // - COMPONENT_SET: lookup variant child via index → skip non-existent
  // - COMPONENT: every BOOLEAN/INSTANCE_SWAP combo is valid
  // Also drops combos matching any exclusion rule, and applies prop locks.
  const { combos, totalEnumerated, excluded } = cachedEnumerateValidCombinations(
    target,
    allAxes,
    excludeRules,
    propLocks
  );

  // Sort labels to match component panel order (visual consistency)
  const propOrder = orderedPropKeys(target);
  const propOrderMap = new Map<string, number>(propOrder.map((n, i) => [n, i]));
  for (const c of combos) {
    c.labels.sort(
      (a, b) =>
        (propOrderMap.get(a.axisName) ?? 99) -
        (propOrderMap.get(b.axisName) ?? 99)
    );
  }

  const validGroupBy = groupBy.filter((name) =>
    allAxes.some((a) => a.name === name)
  );

  // Boolean-like axes get a switch glyph (BOOLEAN type or yes/no, on/off, true/false labels).
  const boolishAxes = new Set<string>();
  for (const a of allAxes) {
    if (a.propType === "BOOLEAN" || isBoolishOptions(a.options)) boolishAxes.add(a.name);
  }

  // Build all cards in async-batched fashion (yields UI thread every CARD_BATCH_SIZE)
  const cards = await buildAllAdminCards(combos, base, layout, boolishAxes, visualBg);

  // Assemble layout from pre-built cards (sync, fast)
  const contentNode = buildAdminLayoutFromCards(combos, cards, validGroupBy, 0, layout);

  // The caption (axes / sort / locks / skipped) used to live here; the section
  // now exposes only the combo count, surfaced as a tag next to the title by
  // the caller (see buildPropsAndMatrixContent).
  void totalEnumerated;
  void excluded;
  return { node: contentNode, comboCount: combos.length };
}

const MAX_CARDS_PER_ROW = 4;
function buildFlatGridFromCards(cards: FrameNode[], cardW: number): FrameNode {
  // Target ~1024px wide so 4 cards of the 240px minimum fit (4×240 + 3×16 = 1008).
  // Cap at MAX_CARDS_PER_ROW so we never exceed 4 columns even if cards are tiny.
  const cardsPerRow = Math.min(
    MAX_CARDS_PER_ROW,
    Math.max(1, Math.floor((1024 + 16) / (cardW + 16)))
  );
  const gridW = cardsPerRow * cardW + (cardsPerRow - 1) * 16;

  const grid = figma.createFrame();
  grid.layoutMode = "HORIZONTAL";
  grid.layoutWrap = "WRAP";
  grid.primaryAxisSizingMode = "FIXED";
  grid.counterAxisSizingMode = "FIXED";
  grid.resize(gridW, 200);
  grid.itemSpacing = 16;
  grid.counterAxisSpacing = 16;
  grid.fills = [];

  for (const card of cards) grid.appendChild(card);
  grid.counterAxisSizingMode = "AUTO";

  return grid;
}

function buildLayoutFromCards(
  combos: IndexedCombination[],
  cards: FrameNode[],
  groupBy: string[],
  cardW: number,
  depth: number
): FrameNode {
  if (groupBy.length === 0 || combos.length === 0) {
    return buildFlatGridFromCards(cards, cardW);
  }

  const [first, ...rest] = groupBy;
  const groups = new Map<
    string,
    { combos: IndexedCombination[]; cards: FrameNode[] }
  >();
  for (let i = 0; i < combos.length; i++) {
    const value = combos[i].labelMap.get(first) ?? "—";
    let g = groups.get(value);
    if (!g) {
      g = { combos: [], cards: [] };
      groups.set(value, g);
    }
    g.combos.push(combos[i]);
    g.cards.push(cards[i]);
  }

  const wrapper = figma.createFrame();
  wrapper.layoutMode = "VERTICAL";
  wrapper.primaryAxisSizingMode = "AUTO";
  wrapper.counterAxisSizingMode = "AUTO";
  wrapper.itemSpacing = depth === 0 ? 32 : 24;
  wrapper.fills = [];

  for (const [value, g] of groups) {
    if (g.cards.length === 0) continue;

    const sub = figma.createFrame();
    sub.layoutMode = "VERTICAL";
    sub.primaryAxisSizingMode = "AUTO";
    sub.counterAxisSizingMode = "AUTO";
    sub.itemSpacing = depth === 0 ? 16 : 12;
    sub.paddingLeft = depth > 0 ? 16 : 0;
    sub.fills = [];

    const header = figma.createText();
    header.fontName = { family: "Inter", style: "Semi Bold" };
    header.fontSize = depth === 0 ? 16 : depth === 1 ? 13 : 11;
    if (depth >= 2) {
      header.characters = `${first} : ${value}`.toUpperCase();
      header.letterSpacing = { value: 4, unit: "PERCENT" };
      header.fills = [{ type: "SOLID", color: COLOR.textMuted }];
    } else {
      header.characters = `${first} : ${value}`;
      header.fills = [
        {
          type: "SOLID",
          color: depth === 0 ? COLOR.textPrimary : COLOR.textBody,
        },
      ];
    }
    sub.appendChild(header);
    sub.appendChild(buildLayoutFromCards(g.combos, g.cards, rest, cardW, depth + 1));
    wrapper.appendChild(sub);
  }

  return wrapper;
}

// Resolve every INSTANCE_SWAP prop's preferredValues to a list of component
// names, so the props table can show meaningful labels instead of the literal
// "Instance". Returns rawKey → ordered, deduped names. Props with empty or
// unresolvable preferredValues are absent from the map (caller falls back).
async function resolveInstanceSwapNames(
  defs: ComponentPropertyDefinitions
): Promise<Map<string, string[]>> {
  const out = new Map<string, string[]>();
  const tasks: Promise<void>[] = [];
  for (const key of Object.keys(defs)) {
    const def = defs[key];
    if (def.type !== "INSTANCE_SWAP") continue;
    const pv = def.preferredValues ?? [];
    if (pv.length === 0) continue;
    const rawKey = key;
    tasks.push(
      Promise.all(
        pv.map(async (item) => {
          try {
            if (item.type === "COMPONENT") {
              const c = await figma.importComponentByKeyAsync(item.key);
              return c.name;
            }
            const cs = await figma.importComponentSetByKeyAsync(item.key);
            return cs.name;
          } catch {
            return null;
          }
        })
      ).then((names) => {
        const seen = new Set<string>();
        const list: string[] = [];
        for (const n of names) {
          if (n && !seen.has(n)) {
            seen.add(n);
            list.push(n);
          }
        }
        if (list.length > 0) out.set(rawKey, list);
      })
    );
  }
  await Promise.all(tasks);
  return out;
}

async function eligibleAxes(defs: ComponentPropertyDefinitions): Promise<VariantAxis[]> {
  const axes: VariantAxis[] = [];
  for (const key of Object.keys(defs)) {
    const def = defs[key];
    let options: AxisOption[] | null = null;
    if (def.type === "VARIANT") {
      options = (def.variantOptions ?? []).map((v) => ({ label: v, value: v }));
    } else if (def.type === "BOOLEAN") {
      options = [
        { label: "true", value: true },
        { label: "false", value: false },
      ];
    } else if (def.type === "INSTANCE_SWAP") {
      const pv = def.preferredValues ?? [];
      if (pv.length >= 2) {
        const resolved: AxisOption[] = [];
        for (const item of pv) {
          try {
            if (item.type === "COMPONENT") {
              const c = await figma.importComponentByKeyAsync(item.key);
              resolved.push({ label: c.name, value: c.id });
            } else {
              const cs = await figma.importComponentSetByKeyAsync(item.key);
              const firstChild = cs.children.find(
                (ch) => ch.type === "COMPONENT"
              ) as ComponentNode | undefined;
              if (firstChild) resolved.push({ label: cs.name, value: firstChild.id });
            }
          } catch {
            // skip unresolvable
          }
        }
        if (resolved.length >= 2) options = resolved;
      }
    }
    if (options && options.length >= 2) {
      axes.push({
        rawKey: key,
        name: stripPropKey(key),
        propType: def.type,
        options,
      });
    }
  }
  return axes;
}

function getBaseComponent(target: DocTarget): ComponentNode | null {
  if (target.type === "COMPONENT_SET") {
    const firstVariant = target.children.find((c) => c.type === "COMPONENT") as
      | ComponentNode
      | undefined;
    return firstVariant ?? null;
  }
  return target;
}

// Walks `root.children` using the slash-separated path of indexes that the
// pickers emit (e.g. "0/1/2"). Returns the matching node, or null if any
// segment is out of range. The "root" key resolves to the root itself.
function resolveLayerByKey(root: SceneNode, key: string): SceneNode | null {
  if (!key || key === "root") return root;
  const parts = key.split("/");
  let cur: SceneNode = root;
  for (const part of parts) {
    const idx = Number(part);
    if (!Number.isFinite(idx) || idx < 0) return null;
    if (!("children" in cur)) return null;
    const c = (cur as ChildrenMixin & SceneNode).children[idx];
    if (!c) return null;
    cur = c;
  }
  return cur;
}

function computeVisualSize(target: DocTarget): { w: number; h: number } {
  let w = 0;
  let h = 0;
  if (target.type === "COMPONENT_SET") {
    for (const c of target.children) {
      if (c.type === "COMPONENT") {
        w = Math.max(w, c.width);
        h = Math.max(h, c.height);
      }
    }
  } else {
    w = target.width;
    h = target.height;
  }
  const padding = 32;
  return {
    w: Math.round(w + padding),
    h: Math.round(h + padding),
  };
}

// ─── Boolean-like axis detection ───────────────────────────────────────────
// A VARIANT axis can use "yes/no", "on/off", "true/false" (any casing) — those
// pairs render as a switch instead of a text value, just like real BOOLEAN props.
const BOOLISH_PAIRS: ReadonlyArray<readonly [string, string]> = [
  ["true", "false"],
  ["on", "off"],
  ["yes", "no"],
];
function isBoolishOptions(options: AxisOption[]): boolean {
  if (options.length !== 2) return false;
  const labels = options.map((o) => String(o.label).toLowerCase()).sort();
  return BOOLISH_PAIRS.some(([a, b]) => {
    const sorted = [a, b].sort();
    return labels[0] === sorted[0] && labels[1] === sorted[1];
  });
}
function isBoolishOnValue(value: string): boolean {
  const v = String(value).toLowerCase();
  return v === "true" || v === "on" || v === "yes";
}

// ─── Card height analytics ─────────────────────────────────────────────────
// Mini-card structure is fixed (paddings 8/12 + text ~16px or switch 20px) →
// max height is paddingTop(8) + max(text16, switch20) + paddingBottom(8) = 36.
// Hardcoded to skip the prototype-measure dance.
const MINI_CARD_HEIGHT = 36;

// ─── Per-variant applicability ─────────────────────────────────────────────
// A BOOLEAN/INSTANCE_SWAP/TEXT property only "applies" to a variant if at least
// one descendant binds it (via `componentPropertyReferences`). When a prop has
// no binding on a variant, toggling its value changes nothing visually — so we
// dedupe combos differing only on those, and relabel the prop as "—".
function collectBoundPropKeys(root: SceneNode): Set<string> {
  const bound = new Set<string>();
  const walk = (node: BaseNode): void => {
    const refs = (node as { componentPropertyReferences?: { [k: string]: string } | null })
      .componentPropertyReferences;
    if (refs) {
      for (const k in refs) {
        const key = refs[k];
        if (key) bound.add(key);
      }
    }
    if ("children" in node) {
      for (const c of (node as ChildrenMixin).children) walk(c);
    }
  };
  walk(root);
  return bound;
}

// Map: variantId (or "" for COMPONENT) → set of axisName that affect that variant
type ApplicabilityMap = Map<string, Set<string>>;
function computeApplicableAxes(
  target: DocTarget,
  allAxes: VariantAxis[]
): ApplicabilityMap {
  const result: ApplicabilityMap = new Map();

  const applicableFor = (root: SceneNode): Set<string> => {
    const bound = collectBoundPropKeys(root);
    const set = new Set<string>();
    for (const axis of allAxes) {
      // VARIANT props always "apply" — they ARE the variant identity
      if (axis.propType === "VARIANT") set.add(axis.name);
      else if (bound.has(axis.rawKey)) set.add(axis.name);
    }
    return set;
  };

  if (target.type === "COMPONENT_SET") {
    for (const child of target.children) {
      if (child.type !== "COMPONENT") continue;
      result.set(child.id, applicableFor(child));
    }
  } else {
    result.set("", applicableFor(target));
  }

  return result;
}

// ─── Variant indexing for COMPONENT_SET ────────────────────────────────────
function canonicalVariantKey(vp: { [k: string]: string }): string {
  return Object.keys(vp)
    .sort()
    .map((k) => `${k}=${vp[k]}`)
    .join("|");
}

function buildVariantIndex(target: ComponentSetNode): VariantIndex {
  const idx: VariantIndex = new Map();
  for (const child of target.children) {
    if (child.type !== "COMPONENT") continue;
    const vp = child.variantProperties;
    if (!vp) continue;
    idx.set(canonicalVariantKey(vp), child);
  }
  return idx;
}

// ─── Valid combination enumeration ─────────────────────────────────────────
// For COMPONENT_SET: skips combos whose variant doesn't exist BEFORE creating
// any instance (vs. the old try/catch + remove approach).
// For COMPONENT: every BOOLEAN/INSTANCE_SWAP combo is valid by construction.
function enumerateValidCombinations(
  target: DocTarget,
  allAxes: VariantAxis[],
  excludeRules: ExclusionRule[] = [],
  propLocks: PropLocks = {}
): { combos: IndexedCombination[]; totalEnumerated: number; excluded: number } {
  const variantAxes = allAxes.filter((a) => a.propType === "VARIANT");
  const variantIndex =
    target.type === "COMPONENT_SET" ? buildVariantIndex(target) : null;
  const applicableByVariant = computeApplicableAxes(target, allAxes);

  // Apply propLocks: locked axes are filtered to only their allowed labels.
  // Empty array = axis stays free. Locks pointing to labels that no longer
  // exist are silently ignored.
  const effectiveAxes: VariantAxis[] = allAxes.map((axis) => {
    const allowed = propLocks[axis.name];
    if (!allowed || allowed.length === 0) return axis;
    const allowedSet = new Set(allowed);
    const filtered = axis.options.filter((o) => allowedSet.has(o.label));
    return filtered.length > 0 ? { ...axis, options: filtered } : axis;
  });

  // Pre-normalize rules: keep only non-empty ones (drop entries with empty value),
  // skip rules that have zero conditions (they would exclude everything).
  const normalizedRules: ExclusionRule[] = [];
  for (const rule of excludeRules) {
    const r: ExclusionRule = {};
    for (const k of Object.keys(rule)) {
      if (rule[k] !== "" && rule[k] != null) r[k] = rule[k];
    }
    if (Object.keys(r).length > 0) normalizedRules.push(r);
  }

  const totalEnumerated = totalCombinationCount(effectiveAxes);
  const valid: IndexedCombination[] = [];
  let excluded = 0;
  // For dedup: variantId → set of effective keys (only includes applicable axes)
  const seenByVariant = new Map<string, Set<string>>();

  for (const combo of enumerateCombinations(effectiveAxes)) {
    let variantSource: ComponentNode | null = null;
    if (variantIndex && variantAxes.length > 0) {
      const variantPayload: { [k: string]: string } = {};
      for (const axis of variantAxes) {
        // For VARIANT: rawKey === axis name (no #hash); value is always string
        variantPayload[axis.name] = String(combo.payload[axis.rawKey]);
      }
      const found = variantIndex.get(canonicalVariantKey(variantPayload));
      if (!found) continue;
      variantSource = found;
    }

    const variantId = variantSource ? variantSource.id : "";
    const applicable =
      applicableByVariant.get(variantId) ?? new Set<string>();

    // Effective key: only includes axes that actually affect this variant.
    // Two combos that differ only on non-applicable axes collapse to the same key.
    const effectiveKey = allAxes
      .filter((a) => applicable.has(a.name))
      .map((a) => `${a.name}=${combo.payload[a.rawKey]}`)
      .join("|");

    let seen = seenByVariant.get(variantId);
    if (!seen) {
      seen = new Set();
      seenByVariant.set(variantId, seen);
    }
    if (seen.has(effectiveKey)) continue; // duplicate — same visual output as a kept combo
    seen.add(effectiveKey);

    // Relabel non-applicable axes as "—" so the card shows clearly that the
    // prop has no effect on this variant.
    const labels = combo.labels.map((lbl) =>
      applicable.has(lbl.axisName)
        ? lbl
        : { axisName: lbl.axisName, valueLabel: "—" }
    );
    const labelMap = new Map<string, string>();
    for (const lbl of labels) labelMap.set(lbl.axisName, lbl.valueLabel);

    // Apply exclusion rules using the relabeled map: rules referencing a
    // non-applicable axis won't match (its value is "—", not what the user set).
    if (normalizedRules.length > 0) {
      const isExcluded = normalizedRules.some((rule) =>
        Object.keys(rule).every((axisName) => labelMap.get(axisName) === rule[axisName])
      );
      if (isExcluded) {
        excluded++;
        continue;
      }
    }

    // Build setProperties payload from the ORIGINAL payload — even non-applicable
    // props can be set without error (Figma just ignores them for visual output).
    // VARIANT props are skipped when we already locked the variant via variantSource.
    const setPropsPayload: { [k: string]: string | boolean } = {};
    for (const axis of allAxes) {
      if (variantSource && axis.propType === "VARIANT") continue;
      // Only apply props that affect this variant — avoids spurious setProperties
      // calls and any hypothetical surprises with INSTANCE_SWAP on disabled slots.
      if (!applicable.has(axis.name)) continue;
      setPropsPayload[axis.rawKey] = combo.payload[axis.rawKey];
    }

    valid.push({
      payload: combo.payload,
      labels,
      labelMap,
      variantSource,
      setPropsPayload,
    });
  }

  return { combos: valid, totalEnumerated, excluded };
}

// Lazy cartesian product — yields combos one at a time so callers can filter
// without ever materializing the full array. Saves allocations on huge sets.
function* enumerateCombinations(axes: VariantAxis[]): Generator<Combination> {
  if (axes.length === 0) {
    yield { payload: {}, labels: [] };
    return;
  }
  const idx = new Array(axes.length).fill(0);
  const total = axes.reduce((acc, a) => acc * a.options.length, 1);
  for (let i = 0; i < total; i++) {
    const payload: { [k: string]: string | boolean } = {};
    const labels: { axisName: string; valueLabel: string }[] = [];
    for (let a = 0; a < axes.length; a++) {
      const axis = axes[a];
      const opt = axis.options[idx[a]];
      payload[axis.rawKey] = opt.value;
      labels.push({ axisName: axis.name, valueLabel: opt.label });
    }
    yield { payload, labels };
    // Increment indices like an odometer
    for (let a = axes.length - 1; a >= 0; a--) {
      if (++idx[a] < axes[a].options.length) break;
      idx[a] = 0;
    }
  }
}

function totalCombinationCount(axes: VariantAxis[]): number {
  return axes.reduce((acc, a) => acc * a.options.length, 1);
}

// ─── Admin-style combination card (Pnv compact reference) ─────────────────
// Card adapts to component size: visual area is sized to fit the largest
// instance (max width × max height + breathing room), and the card stretches
// to enclose visual + vertical list of prop rows. Min card width 120.
type AdminCardLayout = {
  cardW: number;       // outer width of one card
  visualW: number;     // inner visual area width (= cardW - 2*padding)
  visualH: number;     // inner visual area height
  contentW: number;    // sheet content width = ADMIN_CARDS_PER_ROW cards + gaps
  sheetW: number;      // sheet outer width = contentW + 2*sheet padding
};

function computeAdminCardLayout(target: DocTarget): AdminCardLayout {
  let maxW = 0;
  let maxH = 0;
  if (target.type === "COMPONENT_SET") {
    for (const c of target.children) {
      if (c.type === "COMPONENT") {
        maxW = Math.max(maxW, c.width);
        maxH = Math.max(maxH, c.height);
      }
    }
  } else {
    maxW = target.width;
    maxH = target.height;
  }
  const desiredVisualW = Math.round(maxW + ADMIN_VISUAL_PADDING);
  const cardW = Math.max(
    ADMIN_CARD_MIN_W,
    desiredVisualW + ADMIN_CARD_PADDING * 2
  );
  const visualW = cardW - ADMIN_CARD_PADDING * 2;
  const visualH = Math.max(ADMIN_VISUAL_MIN_H, Math.round(maxH + ADMIN_VISUAL_PADDING));

  const rowW = ADMIN_CARDS_PER_ROW * cardW + (ADMIN_CARDS_PER_ROW - 1) * ADMIN_GRID_GAP;
  const contentW = Math.max(ADMIN_CONTENT_WIDTH_DEFAULT, rowW);
  const sheetW = contentW + ADMIN_SHEET_PADDING * 2;
  return { cardW, visualW, visualH, contentW, sheetW };
}

// Admin card layout for a fixed content width (used by PDF pages where the
// page width is constrained). Cards-per-row is *derived* from contentW + the
// component's natural minimum card width — opposite of the canvas variant
// where the sheet grows to fit ADMIN_CARDS_PER_ROW cards.
function computeAdminCardLayoutForFixedWidth(
  target: DocTarget,
  contentW: number
): AdminCardLayout {
  let maxW = 0;
  let maxH = 0;
  if (target.type === "COMPONENT_SET") {
    for (const c of target.children) {
      if (c.type === "COMPONENT") {
        maxW = Math.max(maxW, c.width);
        maxH = Math.max(maxH, c.height);
      }
    }
  } else {
    maxW = target.width;
    maxH = target.height;
  }
  const minCardW = Math.max(
    ADMIN_CARD_MIN_W,
    Math.round(maxW + ADMIN_VISUAL_PADDING) + ADMIN_CARD_PADDING * 2
  );
  // Pick the largest cards-per-row that fits, capped at ADMIN_CARDS_PER_ROW.
  let cardsPerRow = 1;
  for (let n = ADMIN_CARDS_PER_ROW; n >= 1; n--) {
    const total = n * minCardW + (n - 1) * ADMIN_GRID_GAP;
    if (total <= contentW) {
      cardsPerRow = n;
      break;
    }
  }
  const cardW = Math.floor(
    (contentW - (cardsPerRow - 1) * ADMIN_GRID_GAP) / cardsPerRow
  );
  const visualW = cardW - ADMIN_CARD_PADDING * 2;
  const visualH = Math.max(ADMIN_VISUAL_MIN_H, Math.round(maxH + ADMIN_VISUAL_PADDING));
  return { cardW, visualW, visualH, contentW, sheetW: contentW + ADMIN_SHEET_PADDING * 2 };
}

function makeAdminCombinationCard(
  combo: IndexedCombination,
  base: ComponentNode,
  layout: AdminCardLayout,
  boolishAxes: Set<string>,
  visualBg: string
): FrameNode {
  const inst = combo.variantSource
    ? combo.variantSource.createInstance()
    : base.createInstance();

  if (Object.keys(combo.setPropsPayload).length > 0) {
    try {
      inst.setProperties(combo.setPropsPayload);
    } catch {
      // Defensive: BOOLEAN should always succeed; INSTANCE_SWAP can fail
      // if a referenced component is unavailable. Keep the card.
    }
  }

  const labelCount = combo.labels.length;
  const propsAreaH =
    labelCount === 0
      ? 0
      : labelCount * ADMIN_PROP_ROW_HEIGHT + (labelCount - 1) * ADMIN_PROP_ROW_GAP;
  const cardH =
    ADMIN_CARD_PADDING * 2 +
    layout.visualH +
    (labelCount > 0 ? ADMIN_CARD_GAP + propsAreaH : 0);

  const card = figma.createFrame();
  card.name = labelCount
    ? combo.labels.map((l) => `${l.axisName}=${l.valueLabel}`).join(" · ")
    : "Variante";
  card.layoutMode = "VERTICAL";
  card.primaryAxisSizingMode = "FIXED";
  card.counterAxisSizingMode = "FIXED";
  card.resize(layout.cardW, cardH);
  card.paddingTop = ADMIN_CARD_PADDING;
  card.paddingBottom = ADMIN_CARD_PADDING;
  card.paddingLeft = ADMIN_CARD_PADDING;
  card.paddingRight = ADMIN_CARD_PADDING;
  card.itemSpacing = ADMIN_CARD_GAP;
  card.counterAxisAlignItems = "CENTER";
  card.fills = [{ type: "SOLID", color: COLOR.refMatrixCardBg }];
  card.cornerRadius = 12;
  card.clipsContent = true;

  const visual = figma.createFrame();
  visual.name = "Visual";
  visual.resize(layout.visualW, layout.visualH);
  visual.fills = [{ type: "SOLID", color: hex(visualBg) }];
  visual.cornerRadius = 8;
  visual.clipsContent = true;
  visual.appendChild(inst);
  inst.x = Math.round((layout.visualW - inst.width) / 2);
  inst.y = Math.round((layout.visualH - inst.height) / 2);
  card.appendChild(visual);

  if (labelCount > 0) {
    const propsArea = figma.createFrame();
    propsArea.name = "Props";
    propsArea.layoutMode = "VERTICAL";
    propsArea.primaryAxisSizingMode = "FIXED";
    propsArea.counterAxisSizingMode = "FIXED";
    propsArea.resize(layout.visualW, propsAreaH);
    propsArea.itemSpacing = ADMIN_PROP_ROW_GAP;
    propsArea.fills = [];

    for (const lbl of combo.labels) {
      // For "—" (non-applicable on this variant), force text rendering — a
      // switch in "off" state would be misleading.
      const renderAsBool =
        boolishAxes.has(lbl.axisName) && lbl.valueLabel !== "—";
      propsArea.appendChild(
        makeAdminPropRow(lbl.axisName, lbl.valueLabel, renderAsBool, layout.visualW)
      );
    }
    card.appendChild(propsArea);
  }

  return card;
}

function makeAdminPropRow(
  name: string,
  value: string,
  isBool: boolean,
  width: number
): FrameNode {
  const row = figma.createFrame();
  row.name = `${name}=${value}`;
  row.layoutMode = "HORIZONTAL";
  row.primaryAxisSizingMode = "FIXED";
  row.counterAxisSizingMode = "FIXED";
  row.resize(width, ADMIN_PROP_ROW_HEIGHT);
  row.paddingTop = 8;
  row.paddingBottom = 8;
  row.paddingLeft = 15;
  row.paddingRight = 15;
  row.itemSpacing = 8;
  // SPACE_BETWEEN pushes name to the left and value/switch to the right
  // without layoutGrow on text nodes — combining layoutGrow with
  // textAutoResize="HEIGHT" inside a fully FIXED row can produce 1px-tall
  // text nodes during Figma's first layout pass.
  row.primaryAxisAlignItems = "SPACE_BETWEEN";
  row.counterAxisAlignItems = "CENTER";
  row.cornerRadius = 6;
  row.fills = [{ type: "SOLID", color: COLOR.refMatrixRowBg }];

  // Boolean props are prefixed with "Has a " per spec.
  const displayName = isBool ? `Has a ${name}` : name;

  const nameText = figma.createText();
  nameText.fontName = FONT.body;
  nameText.fontSize = 14;
  nameText.lineHeight = { value: 24, unit: "PIXELS" };
  nameText.characters = displayName;
  nameText.fills = [{ type: "SOLID", color: COLOR.refMatrixRowName }];
  row.appendChild(nameText);

  if (isBool) {
    row.appendChild(makeAdminSwitch(isBoolishOnValue(value)));
  } else {
    const valText = figma.createText();
    valText.fontName = FONT.bodyMed;
    valText.fontSize = 14;
    valText.lineHeight = { value: 24, unit: "PIXELS" };
    valText.characters = value;
    valText.fills = [{ type: "SOLID", color: COLOR.refMatrixRowValue }];
    valText.textAlignHorizontal = "RIGHT";
    row.appendChild(valText);
  }
  return row;
}

// Switch glyph per Pnv spec: 28×16 pill, blue when on / grey when off,
// 10×10 white thumb at left=4 (off) or left=14 (on).
function makeAdminSwitch(isOn: boolean): FrameNode {
  const wrap = figma.createFrame();
  wrap.name = "Switch";
  wrap.resize(28, 16);
  wrap.cornerRadius = 11;
  wrap.fills = [
    {
      type: "SOLID",
      color: isOn ? COLOR.refMatrixSwitchOn : COLOR.refMatrixSwitchOff,
    },
  ];
  wrap.clipsContent = false;

  const thumb = figma.createEllipse();
  thumb.resize(10, 10);
  thumb.fills = [{ type: "SOLID", color: COLOR.refMatrixSwitchThumb }];
  thumb.x = isOn ? 14 : 4;
  thumb.y = 3;
  wrap.appendChild(thumb);
  return wrap;
}

async function buildAllAdminCards(
  combos: IndexedCombination[],
  base: ComponentNode,
  layout: AdminCardLayout,
  boolishAxes: Set<string>,
  visualBg: string
): Promise<FrameNode[]> {
  const cards: FrameNode[] = [];
  for (let i = 0; i < combos.length; i += CARD_BATCH_SIZE) {
    const end = Math.min(i + CARD_BATCH_SIZE, combos.length);
    for (let j = i; j < end; j++) {
      cards.push(makeAdminCombinationCard(combos[j], base, layout, boolishAxes, visualBg));
    }
    // Live progress for the UI button (no toast spam needed — the UI updates
    // the inline button label).
    figma.ui.postMessage({
      type: "progress",
      phase: "matrix",
      current: end,
      total: combos.length,
    });
    if (end < combos.length) {
      await new Promise<void>((r) => setTimeout(r, 0));
    }
  }
  return cards;
}

// Flat grid of admin cards with WRAP, sized to the sheet content width.
// Cards have FIXED width = layout.cardW (max 3 per row).
// Bug guard: WRAP frames must be created with counter=FIXED + non-zero height,
// then flipped to AUTO after children are appended — otherwise Figma's WRAP
// reflow can collapse the grid (and sometimes children) to 1px.
function buildAdminFlatGrid(cards: FrameNode[], layout: AdminCardLayout): FrameNode {
  const grid = figma.createFrame();
  grid.name = "CardGrid";
  grid.layoutMode = "HORIZONTAL";
  grid.layoutWrap = "WRAP";
  grid.primaryAxisSizingMode = "FIXED";
  grid.counterAxisSizingMode = "FIXED";
  grid.layoutAlign = "STRETCH";
  grid.resize(layout.contentW, 200);
  grid.itemSpacing = ADMIN_GRID_GAP;
  grid.counterAxisSpacing = ADMIN_GRID_GAP;
  grid.fills = [];
  for (const card of cards) grid.appendChild(card);
  grid.counterAxisSizingMode = "AUTO";
  return grid;
}

// Admin variant of buildLayoutFromCards. Same grouping logic, but admin
// typography (Colfax/Roboto with Inter fallback, ref color palette).
function buildAdminLayoutFromCards(
  combos: IndexedCombination[],
  cards: FrameNode[],
  groupBy: string[],
  depth: number,
  layout: AdminCardLayout
): FrameNode {
  if (groupBy.length === 0 || combos.length === 0) {
    return buildAdminFlatGrid(cards, layout);
  }

  const [first, ...rest] = groupBy;
  const groups = new Map<
    string,
    { combos: IndexedCombination[]; cards: FrameNode[] }
  >();
  for (let i = 0; i < combos.length; i++) {
    const value = combos[i].labelMap.get(first) ?? "—";
    let g = groups.get(value);
    if (!g) {
      g = { combos: [], cards: [] };
      groups.set(value, g);
    }
    g.combos.push(combos[i]);
    g.cards.push(cards[i]);
  }

  const wrapper = figma.createFrame();
  wrapper.layoutMode = "VERTICAL";
  wrapper.primaryAxisSizingMode = "AUTO";
  wrapper.counterAxisSizingMode = "AUTO";
  wrapper.layoutAlign = "STRETCH";
  wrapper.itemSpacing = depth === 0 ? 24 : 16;
  wrapper.fills = [];

  for (const [value, g] of groups) {
    if (g.cards.length === 0) continue;

    const sub = figma.createFrame();
    sub.layoutMode = "VERTICAL";
    sub.primaryAxisSizingMode = "AUTO";
    sub.counterAxisSizingMode = "AUTO";
    sub.layoutAlign = "STRETCH";
    sub.itemSpacing = 12;
    sub.fills = [];

    const header = figma.createText();
    header.fontName = FONT.titleMed;
    header.fontSize = depth === 0 ? 16 : 14;
    header.lineHeight = { value: 19, unit: "PIXELS" };
    header.characters = `${first} = ${value}`;
    header.fills = [{ type: "SOLID", color: COLOR.refTitlePrimary }];
    sub.appendChild(header);

    sub.appendChild(buildAdminLayoutFromCards(g.combos, g.cards, rest, depth + 1, layout));
    wrapper.appendChild(sub);
  }

  return wrapper;
}

function makeCombinationCard(
  combo: IndexedCombination,
  base: ComponentNode,
  cardW: number,
  visualH: number,
  miniH: number,
  boolishAxes: Set<string>
): FrameNode {
  // Pre-validated combination: variantSource (if any) is already known to exist.
  // For COMPONENT_SET we instantiate the exact variant child — no setProperties
  // for VARIANT props. For COMPONENT we clone the base.
  const inst = combo.variantSource
    ? combo.variantSource.createInstance()
    : base.createInstance();

  if (Object.keys(combo.setPropsPayload).length > 0) {
    try {
      inst.setProperties(combo.setPropsPayload);
    } catch {
      // Defensive: BOOLEAN should always succeed; INSTANCE_SWAP can fail
      // if a referenced component is unavailable. Keep the card.
    }
  }

  // Compute card height analytically — no AUTO/FIXED flipping.
  const labelCount = combo.labels.length;
  const propsAreaH =
    labelCount === 0
      ? 14 + 14 + 16
      : 14 + 14 + labelCount * miniH + Math.max(0, labelCount - 1) * 6;
  const cardH = visualH + 1 + propsAreaH;

  const card = figma.createFrame();
  card.name = labelCount
    ? combo.labels.map((l) => `${l.axisName}=${l.valueLabel}`).join(" · ")
    : "Variante";
  card.layoutMode = "VERTICAL";
  card.primaryAxisSizingMode = "FIXED";
  card.counterAxisSizingMode = "FIXED";
  card.resize(cardW, cardH);
  card.itemSpacing = 0;
  card.fills = [{ type: "SOLID", color: COLOR.bg }];
  card.strokes = [{ type: "SOLID", color: COLOR.border }];
  card.strokeWeight = 1;
  card.strokeAlign = "INSIDE";
  card.cornerRadius = 12;
  card.clipsContent = true;

  const visual = figma.createFrame();
  visual.name = "Visual";
  visual.resize(cardW, visualH);
  visual.fills = [{ type: "SOLID", color: COLOR.bgSubtle }];
  visual.clipsContent = true;
  visual.appendChild(inst);
  inst.x = Math.round((cardW - inst.width) / 2);
  inst.y = Math.round((visualH - inst.height) / 2);
  card.appendChild(visual);

  const divider = figma.createFrame();
  divider.name = "Divider";
  divider.resize(cardW, 1);
  divider.fills = [{ type: "SOLID", color: COLOR.border }];
  card.appendChild(divider);

  const propsArea = figma.createFrame();
  propsArea.name = "Props";
  propsArea.layoutMode = "VERTICAL";
  propsArea.primaryAxisSizingMode = "FIXED";
  propsArea.counterAxisSizingMode = "FIXED";
  propsArea.resize(cardW, propsAreaH);
  propsArea.itemSpacing = 6;
  propsArea.paddingTop = 14;
  propsArea.paddingBottom = 14;
  propsArea.paddingLeft = 14;
  propsArea.paddingRight = 14;
  propsArea.fills = [];
  propsArea.clipsContent = true;

  if (labelCount === 0) {
    const t = figma.createText();
    t.fontName = { family: "Inter", style: "Regular" };
    t.fontSize = 11;
    t.characters = "Aucun axe variable";
    t.fills = [{ type: "SOLID", color: COLOR.textMuted }];
    propsArea.appendChild(t);
  } else {
    for (const lbl of combo.labels) {
      // For "—" (non-applicable on this variant), force text rendering — a
      // switch in "off" state would be misleading.
      const renderAsBoolish =
        boolishAxes.has(lbl.axisName) && lbl.valueLabel !== "—";
      const mini = makePropMiniCard(lbl.axisName, lbl.valueLabel, renderAsBoolish);
      // Lock to measured height so propsArea is fully predictable
      mini.layoutAlign = "STRETCH";
      mini.counterAxisSizingMode = "FIXED";
      mini.resize(mini.width, miniH);
      propsArea.appendChild(mini);
    }
  }

  card.appendChild(propsArea);
  return card;
}

// Async batched card builder — yields the UI thread between batches so Figma
// stays interactive on big component sets.
async function buildAllCards(
  combos: IndexedCombination[],
  base: ComponentNode,
  cardW: number,
  visualH: number,
  miniH: number,
  boolishAxes: Set<string>
): Promise<FrameNode[]> {
  const cards: FrameNode[] = [];
  for (let i = 0; i < combos.length; i += CARD_BATCH_SIZE) {
    const end = Math.min(i + CARD_BATCH_SIZE, combos.length);
    for (let j = i; j < end; j++) {
      cards.push(
        makeCombinationCard(combos[j], base, cardW, visualH, miniH, boolishAxes)
      );
    }
    figma.ui.postMessage({
      type: "progress",
      phase: "matrix",
      current: end,
      total: combos.length,
    });
    if (end < combos.length) {
      await new Promise<void>((r) => setTimeout(r, 0));
    }
  }
  return cards;
}

function makePropMiniCard(
  name: string,
  value: string,
  isBoolish: boolean
): FrameNode {
  const isOn = isBoolish && isBoolishOnValue(value);

  const c = figma.createFrame();
  c.name = `${name}=${value}`;
  c.layoutMode = "HORIZONTAL";
  c.primaryAxisSizingMode = "FIXED";
  c.counterAxisSizingMode = "AUTO";
  c.layoutAlign = "STRETCH";
  c.primaryAxisAlignItems = "SPACE_BETWEEN";
  c.counterAxisAlignItems = "CENTER";
  c.itemSpacing = 12;
  c.paddingTop = 8;
  c.paddingBottom = 8;
  c.paddingLeft = 12;
  c.paddingRight = 12;
  c.cornerRadius = 6;
  c.fills = [{ type: "SOLID", color: COLOR.bgChip }];

  const nameText = figma.createText();
  nameText.fontName = { family: "Inter", style: "Semi Bold" };
  nameText.fontSize = 10;
  nameText.characters = name.toUpperCase();
  nameText.letterSpacing = { value: 4, unit: "PERCENT" };
  nameText.fills = [{ type: "SOLID", color: COLOR.textMuted }];
  c.appendChild(nameText);

  if (isBoolish) {
    c.appendChild(makeSwitchNode(isOn));
  } else {
    const valText = figma.createText();
    valText.fontName = { family: "Inter", style: "Semi Bold" };
    valText.fontSize = 11;
    valText.characters = value;
    // "—" means the prop has no effect on this variant — render muted.
    const isInapplicable = value === "—";
    valText.fills = [
      { type: "SOLID", color: isInapplicable ? COLOR.textMuted : COLOR.textPrimary },
    ];
    c.appendChild(valText);
  }

  return c;
}

function makeSwitchNode(isOn: boolean): FrameNode {
  const track = figma.createFrame();
  track.resize(34, 20);
  track.cornerRadius = 10;
  track.fills = [
    {
      type: "SOLID",
      color: isOn ? { r: 0.05, g: 0.6, b: 1 } : COLOR.dividerStrong,
    },
  ];

  const thumb = figma.createEllipse();
  thumb.resize(14, 14);
  thumb.fills = [{ type: "SOLID", color: COLOR.bg }];
  thumb.x = isOn ? 17 : 3;
  thumb.y = 3;
  track.appendChild(thumb);

  return track;
}

function makeElegantTable(
  headers: string[],
  widths: number[],
  rows: string[][]
): FrameNode {
  const table = figma.createFrame();
  table.layoutMode = "VERTICAL";
  table.primaryAxisSizingMode = "AUTO";
  table.counterAxisSizingMode = "AUTO";
  table.itemSpacing = 0;
  table.fills = [];

  const totalW = widths.reduce((a, b) => a + b, 0);
  table.appendChild(makeElegantRow(headers, widths, "header"));
  table.appendChild(thinDivider(totalW, COLOR.dividerStrong));
  for (let i = 0; i < rows.length; i++) {
    table.appendChild(makeElegantRow(rows[i], widths, "data"));
    if (i < rows.length - 1) {
      table.appendChild(thinDivider(totalW, COLOR.divider));
    }
  }
  return table;
}

function makeElegantRow(
  cells: string[],
  widths: number[],
  variant: "header" | "data"
): FrameNode {
  const row = figma.createFrame();
  row.layoutMode = "HORIZONTAL";
  row.primaryAxisSizingMode = "AUTO";
  row.counterAxisSizingMode = "AUTO";
  row.itemSpacing = 0;
  row.fills = [];
  for (let i = 0; i < cells.length; i++) {
    const cell = makeElegantCell(cells[i], widths[i], variant);
    cell.layoutAlign = "STRETCH";
    row.appendChild(cell);
  }
  return row;
}

function makeElegantCell(
  text: string,
  width: number,
  variant: "header" | "data"
): FrameNode {
  const cell = figma.createFrame();
  cell.layoutMode = "VERTICAL";
  cell.primaryAxisSizingMode = "AUTO";
  cell.counterAxisSizingMode = "FIXED";
  cell.resize(width, 1);
  cell.primaryAxisAlignItems = "CENTER";
  cell.paddingTop = variant === "header" ? 10 : 14;
  cell.paddingBottom = variant === "header" ? 10 : 14;
  cell.paddingLeft = 0;
  cell.paddingRight = 16;
  cell.fills = [];

  const t = figma.createText();
  if (variant === "header") {
    t.fontName = { family: "Inter", style: "Semi Bold" };
    t.fontSize = 10;
    t.characters = text.toUpperCase();
    t.letterSpacing = { value: 8, unit: "PERCENT" };
    t.fills = [{ type: "SOLID", color: COLOR.textMuted }];
  } else {
    t.fontName = { family: "Inter", style: "Regular" };
    t.fontSize = 13;
    t.characters = text || "—";
    t.fills = [{ type: "SOLID", color: COLOR.textBody }];
    t.lineHeight = { value: 140, unit: "PERCENT" };
  }
  t.textAutoResize = "HEIGHT";
  t.resize(width - 16, t.height);
  cell.appendChild(t);
  return cell;
}

function thinDivider(width: number, color: RGB): FrameNode {
  const d = figma.createFrame();
  d.resize(width, 1);
  d.fills = [{ type: "SOLID", color }];
  return d;
}

// ─── Admin-style table (osmose.proginov.com reference) ────────────────────
// Header row → bg #F2F2F2, height 48, text 14/Medium/#242424.
// Body row   → bg #F7F7F7, padding 12/16, text 12/Regular/#616161, border-bottom #E6E6E6.
// Cells accept either a string (rendered as styled text) or a SceneNode (chip,
// bullet list, etc.) so callers can mix layouts inside the table.

type AdminCellContent = string | SceneNode;

function makeAdminTable(
  headers: string[],
  widths: number[],
  rows: AdminCellContent[][]
): FrameNode {
  const totalW = widths.reduce((a, b) => a + b, 0);
  const table = figma.createFrame();
  table.name = "PropsTable";
  table.layoutMode = "VERTICAL";
  table.primaryAxisSizingMode = "AUTO";
  table.counterAxisSizingMode = "AUTO";
  table.itemSpacing = 0;
  table.cornerRadius = 8;
  table.clipsContent = true;
  table.fills = [];

  table.appendChild(makeAdminHeaderRow(headers, widths, totalW));
  for (let i = 0; i < rows.length; i++) {
    table.appendChild(makeAdminBodyRow(rows[i], widths, totalW));
  }
  return table;
}

function makeAdminHeaderRow(
  cells: string[],
  widths: number[],
  totalW: number
): FrameNode {
  const row = figma.createFrame();
  row.name = "PropsHeadTable";
  row.layoutMode = "HORIZONTAL";
  row.primaryAxisSizingMode = "FIXED";
  row.counterAxisSizingMode = "FIXED";
  row.resize(totalW, 48);
  row.itemSpacing = 0;
  row.fills = [];

  for (let i = 0; i < cells.length; i++) {
    const cell = figma.createFrame();
    cell.name = "HeadCell";
    cell.layoutMode = "HORIZONTAL";
    cell.primaryAxisSizingMode = "FIXED";
    cell.counterAxisSizingMode = "FIXED";
    cell.resize(widths[i], 48);
    cell.paddingTop = 16;
    cell.paddingBottom = 16;
    cell.paddingLeft = 16;
    cell.paddingRight = 16;
    cell.itemSpacing = 8;
    cell.counterAxisAlignItems = "CENTER";
    cell.fills = [{ type: "SOLID", color: COLOR.refHeaderCellBg }];

    const t = figma.createText();
    t.fontName = FONT.bodyMed;
    t.fontSize = 14;
    t.lineHeight = { value: 16, unit: "PIXELS" };
    t.characters = cells[i];
    t.fills = [{ type: "SOLID", color: COLOR.refCellTextStrong }];
    t.layoutGrow = 1;
    t.textAutoResize = "HEIGHT";
    t.resize(widths[i] - 32, 16);
    cell.appendChild(t);

    row.appendChild(cell);
  }
  return row;
}

function makeAdminBodyRow(
  cells: AdminCellContent[],
  widths: number[],
  totalW: number
): FrameNode {
  const row = figma.createFrame();
  row.name = "PropsLineTable";
  row.layoutMode = "HORIZONTAL";
  row.primaryAxisSizingMode = "AUTO";
  row.counterAxisSizingMode = "AUTO";
  row.itemSpacing = 0;
  row.fills = [];
  row.strokes = [{ type: "SOLID", color: COLOR.refRowDivider }];
  row.strokeWeight = 1;
  row.strokeAlign = "INSIDE";
  row.strokeBottomWeight = 1;
  row.strokeTopWeight = 0;
  row.strokeLeftWeight = 0;
  row.strokeRightWeight = 0;

  for (let i = 0; i < cells.length; i++) {
    row.appendChild(makeAdminBodyCell(cells[i], widths[i]));
  }
  return row;
}

function makeAdminBodyCell(content: AdminCellContent, width: number): FrameNode {
  // VERTICAL layout (matches the elegant cell pattern, which is known to work
  // with auto-height): primary = height (AUTO grows with content), counter =
  // width (FIXED at `width` via resize). layoutAlign STRETCH equalizes heights
  // across the row.
  const cell = figma.createFrame();
  cell.name = "BodyCell";
  cell.layoutMode = "VERTICAL";
  cell.primaryAxisSizingMode = "AUTO";
  cell.counterAxisSizingMode = "FIXED";
  cell.resize(width, 1);
  cell.layoutAlign = "STRETCH";
  cell.paddingTop = 12;
  cell.paddingBottom = 12;
  cell.paddingLeft = 16;
  cell.paddingRight = 16;
  cell.itemSpacing = 8;
  cell.fills = [{ type: "SOLID", color: COLOR.refBodyCellBg }];

  if (typeof content === "string") {
    const t = figma.createText();
    t.fontName = FONT.body;
    t.fontSize = 12;
    t.lineHeight = { value: 14, unit: "PIXELS" };
    t.characters = content || "—";
    t.fills = [{ type: "SOLID", color: COLOR.refBodyText }];
    t.textAutoResize = "HEIGHT";
    t.resize(width - 32, t.height);
    cell.appendChild(t);
  } else {
    cell.appendChild(content);
  }
  return cell;
}

// Coloured chip used in the "Type" column. Reuses the brand tag palettes so
// type colors stay consistent with the inline section tags (BLUE/GREEN/etc.).
function makeTypeChip(type: ComponentPropertyType): FrameNode {
  let palette: TagPalette;
  let label: string;
  switch (type) {
    case "BOOLEAN":
      palette = TAG_PALETTE_GREEN;
      label = "Boolean";
      break;
    case "VARIANT":
      palette = TAG_PALETTE_PURPLE;
      label = "Variant";
      break;
    case "TEXT":
      palette = TAG_PALETTE_ORANGE;
      label = "Text";
      break;
    case "INSTANCE_SWAP":
      palette = TAG_PALETTE_CYAN;
      label = "Instance";
      break;
    default:
      palette = TAG_PALETTE_BLUE;
      label = String(type);
  }
  return makeTag(label, palette);
}

// Vertical bullet list — values render uniformly (default value not emphasized).
function makeBulletList(items: string[]): FrameNode {
  const list = figma.createFrame();
  list.name = "Values";
  list.layoutMode = "VERTICAL";
  list.primaryAxisSizingMode = "AUTO";
  list.counterAxisSizingMode = "AUTO";
  list.itemSpacing = 4;
  list.fills = [];

  if (items.length === 0) {
    const t = figma.createText();
    t.fontName = FONT.body;
    t.fontSize = 12;
    t.lineHeight = { value: 14, unit: "PIXELS" };
    t.characters = "—";
    t.fills = [{ type: "SOLID", color: COLOR.refBodyText }];
    list.appendChild(t);
    return list;
  }

  for (let i = 0; i < items.length; i++) {
    const row = figma.createFrame();
    row.layoutMode = "HORIZONTAL";
    row.primaryAxisSizingMode = "AUTO";
    row.counterAxisSizingMode = "AUTO";
    row.counterAxisAlignItems = "MIN";
    row.itemSpacing = 6;
    row.fills = [];

    const bullet = figma.createText();
    bullet.fontName = FONT.body;
    bullet.fontSize = 12;
    bullet.lineHeight = { value: 14, unit: "PIXELS" };
    bullet.characters = "•";
    bullet.fills = [{ type: "SOLID", color: COLOR.refBodyText }];
    row.appendChild(bullet);

    const t = figma.createText();
    t.fontName = FONT.body;
    t.fontSize = 12;
    t.lineHeight = { value: 14, unit: "PIXELS" };
    t.characters = items[i];
    t.fills = [{ type: "SOLID", color: COLOR.refBodyText }];
    row.appendChild(t);

    list.appendChild(row);
  }
  return list;
}

function valuesAsItems(
  p: PropInfo,
  instanceSwapNames?: Map<string, string[]>
): string[] {
  switch (p.type) {
    case "BOOLEAN":
      return ["true", "false"];
    case "TEXT":
      return [`"${String(p.defaultValue)}"`];
    case "VARIANT":
      return p.variantOptions ?? [];
    case "INSTANCE_SWAP": {
      const resolved = instanceSwapNames?.get(p.rawKey);
      return resolved && resolved.length > 0 ? resolved : ["Instance"];
    }
    default:
      return [];
  }
}

function textFrame(text: string): FrameNode {
  const frame = figma.createFrame();
  frame.layoutMode = "VERTICAL";
  frame.primaryAxisSizingMode = "AUTO";
  frame.counterAxisSizingMode = "AUTO";
  frame.paddingTop = 20;
  frame.paddingBottom = 20;
  frame.paddingLeft = 24;
  frame.paddingRight = 24;
  frame.cornerRadius = 10;
  frame.fills = [{ type: "SOLID", color: COLOR.bgSubtle }];
  const t = figma.createText();
  t.fontName = { family: "Inter", style: "Regular" };
  t.fontSize = 13;
  t.characters = text;
  t.fills = [{ type: "SOLID", color: COLOR.textSecondary }];
  frame.appendChild(t);
  return frame;
}

function prettyVarType(t: VariableResolvedDataType): string {
  switch (t) {
    case "COLOR":
      return "Couleur";
    case "FLOAT":
      return "Nombre";
    case "STRING":
      return "Chaîne";
    case "BOOLEAN":
      return "Booléen";
    default:
      return t;
  }
}
