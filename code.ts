type DocTarget = ComponentNode | ComponentSetNode;

// An exclusion rule = AND of conditions { axisName → expected valueLabel }.
// A combo is excluded if it matches ANY rule (rules are OR'd).
type ExclusionRule = { [axisName: string]: string };

// Lock an axis to a single value: removes it from the cartesian product (the
// combo payload still contains the locked value, so the mini-card shows it).
type PropLocks = { [axisName: string]: string };

type DocOptions = {
  props: boolean;
  tokens: boolean;
  variants: boolean;
  groupBy?: string[];
  excludeRules?: ExclusionRule[];
  propLocks?: PropLocks;
};

// Persisted per-component config — restored when the user reselects a component.
type SavedConfig = {
  options: { props: boolean; tokens: boolean; variants: boolean };
  groupBy: string[];
  excludeRules: ExclusionRule[];
  propLocks: PropLocks;
};

type PropInfo = {
  name: string;
  rawKey: string;
  type: ComponentPropertyType;
  defaultValue: string | boolean;
  variantOptions?: string[];
};

type SelectionPayload = {
  name: string;
  kind: "COMPONENT" | "COMPONENT_SET";
  props: { name: string; type: string; values: string }[];
  previewBase64: string | null;
  axes: string[];
  axisValues: { [axisName: string]: string[] };
  combinationCount: number;
  savedConfig: SavedConfig | null;
} | null;

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

const PROP_COL_WIDTHS = [126, 260, 125, 125];
const PROP_COL_HEADERS = ["Propriété", "Description", "Type", "Valeurs"];
const PROP_DESCRIPTION_PLACEHOLDER = "À compléter";

const ADMIN_SHEET_WIDTH_DEFAULT = 700;
const ADMIN_SHEET_PADDING = 32;
const ADMIN_CONTENT_WIDTH_DEFAULT = ADMIN_SHEET_WIDTH_DEFAULT - ADMIN_SHEET_PADDING * 2; // 636

// Admin combination card layout (osmose.proginov.com reference).
// Card adapts to component size — see computeAdminCardLayout().
const ADMIN_CARD_MIN_W = 120;
const ADMIN_CARD_PADDING = 8;
const ADMIN_CARD_GAP = 8;
const ADMIN_GRID_GAP = 16;
const ADMIN_CARDS_PER_ROW = 3;
const ADMIN_VISUAL_PADDING = 16;
const ADMIN_VISUAL_MIN_H = 60;
const ADMIN_PROP_ROW_HEIGHT = 32;
const ADMIN_PROP_ROW_GAP = 4;
const TOKEN_COL_WIDTHS = [320, 140, 200];
const TOKEN_COL_HEADERS = ["Variable", "Type", "Collection"];

const SHEET_GAP = 32;
const CARD_BATCH_SIZE = 50;

// A4 at 72ppi — matches PDF point coordinates (1pt = 1px here)
const PDF_W = 595;
const PDF_H = 842;
const PDF_MARGIN = 40;
const PDF_CONTENT_W = PDF_W - PDF_MARGIN * 2; // 515
const PDF_CARD_GAP = 12;
const PDF_PROP_COL_WIDTHS_A4 = [100, 175, 100, 140]; // sum = 515 (Propriété, Description, Type, Valeurs)
const PDF_TOKEN_COL_WIDTHS_A4 = [240, 110, 165]; // sum = 515

function hex(h: string): RGB {
  const v = h.replace("#", "");
  return {
    r: parseInt(v.slice(0, 2), 16) / 255,
    g: parseInt(v.slice(2, 4), 16) / 255,
    b: parseInt(v.slice(4, 6), 16) / 255,
  };
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
  refChipBoolBg: hex("#E6F4FF"),
  refChipBoolText: hex("#007DEB"),
  refChipVariantBg: hex("#E0EFFF"),
  refChipVariantText: hex("#0C4790"),
  refChipTextBg: hex("#EFEFEF"),
  refChipTextText: hex("#616161"),
  refChipSwapBg: hex("#EAF4F0"),
  refChipSwapText: hex("#1E7F5C"),
};

// Fallback-aware font cache. Filled by loadFonts() so render code can call
// FONT.titleHeavy etc. synchronously without re-checking availability.
type FontWeight = "regular" | "medium";
const FONT: {
  title: FontName; // "Colfax" or fallback Inter Regular — used for sheet title 32px / breadcrumb / section names
  titleMed: FontName; // "Colfax" Medium / Inter Semi Bold — used for titles + section headings
  body: FontName; // "Roboto" / Inter Regular — used for table body text
  bodyMed: FontName; // "Roboto" Medium / Inter Semi Bold — used for table headers
} = {
  title: { family: "Inter", style: "Regular" },
  titleMed: { family: "Inter", style: "Semi Bold" },
  body: { family: "Inter", style: "Regular" },
  bodyMed: { family: "Inter", style: "Semi Bold" },
};

let lastSheets: FrameNode[] = [];

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

const CONFIG_KEY_PREFIX = "docplugin:config:";

async function loadSavedConfig(targetId: string): Promise<SavedConfig | null> {
  try {
    const raw = await figma.clientStorage.getAsync(CONFIG_KEY_PREFIX + targetId);
    return (raw as SavedConfig | undefined) ?? null;
  } catch {
    return null;
  }
}

async function saveConfig(targetId: string, options: DocOptions): Promise<void> {
  const config: SavedConfig = {
    options: { props: options.props, tokens: options.tokens, variants: options.variants },
    groupBy: options.groupBy ?? [],
    excludeRules: options.excludeRules ?? [],
    propLocks: options.propLocks ?? {},
  };
  try {
    await figma.clientStorage.setAsync(CONFIG_KEY_PREFIX + targetId, config);
  } catch {
    // Best-effort — don't surface errors to the user.
  }
}

figma.showUI(__html__, { width: 360, height: 540 });

figma.on("selectionchange", () => {
  combosCache = null; // stale once the target changes
  void sendSelection();
});
void sendSelection();

figma.ui.onmessage = async (msg: { type: string; options?: DocOptions }) => {
  const defaultOptions: DocOptions = { props: true, tokens: true, variants: true };
  if (msg.type === "generate-doc") {
    const target = await resolveTarget();
    if (!target) {
      figma.notify("Sélectionnez un composant.", { error: true });
      return;
    }
    const opts = msg.options ?? defaultOptions;
    try {
      await generateDoc(target, opts);
      void saveConfig(target.id, opts);
      figma.notify("Documentation créée");
    } catch (e) {
      figma.notify(`Erreur: ${(e as Error).message}`, { error: true });
    }
  } else if (msg.type === "export-pdf") {
    const target = await resolveTarget();
    if (!target) {
      figma.notify("Sélectionnez un composant.", { error: true });
      return;
    }
    const opts = msg.options ?? defaultOptions;
    try {
      await exportAsPdf(target, opts);
      void saveConfig(target.id, opts);
    } catch (e) {
      figma.notify(`Erreur PDF : ${(e as Error).message}`, { error: true });
    }
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

async function sendSelection(): Promise<void> {
  const target = await resolveTarget();
  let payload: SelectionPayload = null;

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
    payload = {
      name: target.name,
      kind: target.type,
      props,
      previewBase64: preview,
      axes: axes.map((a) => a.name),
      axisValues,
      combinationCount,
      savedConfig,
    };
  }

  figma.ui.postMessage({ type: "selection", target: payload });
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

  if (options.props && options.variants) {
    const layout = computeAdminCardLayout(target);
    const content = await buildPropsAndMatrixContent(
      target,
      options.groupBy ?? [],
      options.excludeRules ?? [],
      options.propLocks ?? {},
      layout
    );
    sheets.push(makeAdminSheet(target, "Propriétés", content, layout.sheetW));
  } else if (options.props) {
    sheets.push(makeAdminSheet(target, "Propriétés", buildPropsSection(target)));
  }

  if (options.tokens) {
    sheets.push(makeSheet(target, "Variables liées", await buildTokensSection(target)));
  }

  return sheets;
}

// Find sheets previously generated for this target (tagged via setPluginData),
// remove them, and return the leftmost one's position so the new sheets can
// take its place. Scoped to currentPage for perf — generation always lands here.
function removeExistingSheets(target: DocTarget): { x: number; y: number } | null {
  const existing = figma.currentPage.findAll(
    (n) => n.getPluginData("docplugin:component") === target.id
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
    sheet.setPluginData("docplugin:component", target.id);
    x += sheet.width + SHEET_GAP;
  }

  figma.currentPage.selection = sheets;
  figma.viewport.scrollAndZoomIntoView(sheets);
}

async function exportAsPdf(target: DocTarget, options: DocOptions): Promise<void> {
  await loadFonts();

  const pdfPages: FrameNode[] = [];
  if (options.props) pdfPages.push(buildPdfPropsPage(target));
  if (options.variants)
    pdfPages.push(
      ...(await buildPdfCombinationsPages(
        target,
        options.excludeRules ?? [],
        options.propLocks ?? {}
      ))
    );
  if (options.tokens) pdfPages.push(...await buildPdfTokensPage(target));

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
}

// ─── PDF page builders ───────────────────────────────────────────────────────

function makePdfPage(): FrameNode {
  const page = figma.createFrame();
  page.name = "PDF page";
  page.resize(PDF_W, PDF_H);
  page.fills = [{ type: "SOLID", color: COLOR.bg }];
  return page;
}

function makePdfHeader(componentName: string, sectionTitle: string): FrameNode {
  const header = figma.createFrame();
  header.layoutMode = "VERTICAL";
  header.primaryAxisSizingMode = "FIXED";
  header.counterAxisSizingMode = "FIXED";
  header.resize(PDF_CONTENT_W, 100);
  header.itemSpacing = 4;
  header.fills = [];

  const nameText = figma.createText();
  nameText.fontName = { family: "Inter", style: "Regular" };
  nameText.fontSize = 10;
  nameText.characters = componentName;
  nameText.fills = [{ type: "SOLID", color: COLOR.textMuted }];
  nameText.letterSpacing = { value: 2, unit: "PERCENT" };
  nameText.textAutoResize = "HEIGHT";
  nameText.resize(PDF_CONTENT_W, 14);
  header.appendChild(nameText);

  const titleText = figma.createText();
  titleText.fontName = { family: "Inter", style: "Semi Bold" };
  titleText.fontSize = 22;
  titleText.characters = sectionTitle;
  titleText.fills = [{ type: "SOLID", color: COLOR.textPrimary }];
  titleText.lineHeight = { value: 110, unit: "PERCENT" };
  titleText.textAutoResize = "HEIGHT";
  titleText.resize(PDF_CONTENT_W, 26);
  header.appendChild(titleText);

  header.primaryAxisSizingMode = "AUTO";
  return header;
}

function buildPdfPropsPage(target: DocTarget): FrameNode {
  const page = makePdfPage();

  const header = makePdfHeader(target.name, "Propriétés");
  page.appendChild(header);
  header.x = PDF_MARGIN;
  header.y = PDF_MARGIN;

  const div = thinDivider(PDF_CONTENT_W, COLOR.dividerStrong);
  page.appendChild(div);
  div.x = PDF_MARGIN;
  div.y = PDF_MARGIN + header.height + 14;

  const contentY = div.y + 1 + 12;
  const props = extractProps(target);
  if (props.length > 0) {
    const table = makeElegantTable(
      PROP_COL_HEADERS,
      PDF_PROP_COL_WIDTHS_A4,
      props.map((p) => [p.name, PROP_DESCRIPTION_PLACEHOLDER, p.type, formatValuesDisplay(p)])
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
  propLocks: PropLocks
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

  const visualSize = computeVisualSize(target);
  const pdfCardW = Math.min(Math.max(240, visualSize.w), PDF_CONTENT_W);
  const pdfVisualH = visualSize.h;
  const pdfCardsPerRow = Math.max(
    1,
    Math.floor((PDF_CONTENT_W + PDF_CARD_GAP) / (pdfCardW + PDF_CARD_GAP))
  );

  const boolishAxes = new Set<string>();
  for (const a of allAxes) {
    if (a.propType === "BOOLEAN" || isBoolishOptions(a.options)) boolishAxes.add(a.name);
  }

  const miniH = MINI_CARD_HEIGHT;
  const validCards = await buildAllCards(
    combos,
    base,
    pdfCardW,
    pdfVisualH,
    miniH,
    boolishAxes
  );

  // Card height is now actually computed (analytical) — read from first card
  // for page-break math. All cards have identical height since they share
  // structure (visual + divider + propsArea sized analytically).
  const cardH = validCards[0].height;
  const contentStartY = PDF_MARGIN + 71;
  const contentMaxY = PDF_H - PDF_MARGIN - 16;
  const rowsPerPage = Math.max(1, Math.floor((contentMaxY - contentStartY) / (cardH + PDF_CARD_GAP)));
  const cardsPerPage = rowsPerPage * pdfCardsPerRow;
  const totalPages = Math.ceil(validCards.length / cardsPerPage);

  const pages: FrameNode[] = [];

  for (let pageIdx = 0; pageIdx < totalPages; pageIdx++) {
    const batch = validCards.slice(pageIdx * cardsPerPage, (pageIdx + 1) * cardsPerPage);
    const page = makePdfPage();

    const title = totalPages > 1
      ? `Combinaisons (${pageIdx + 1}/${totalPages})`
      : "Combinaisons";
    const header = makePdfHeader(target.name, title);
    page.appendChild(header);
    header.x = PDF_MARGIN;
    header.y = PDF_MARGIN;

    const div = thinDivider(PDF_CONTENT_W, COLOR.dividerStrong);
    page.appendChild(div);
    div.x = PDF_MARGIN;
    div.y = PDF_MARGIN + header.height + 14;

    let currentY = div.y + 1 + 12;

    for (let r = 0; r < batch.length; r += pdfCardsPerRow) {
      const rowCards = batch.slice(r, r + pdfCardsPerRow);
      let cardX = PDF_MARGIN;
      for (const card of rowCards) {
        page.appendChild(card);
        card.x = cardX;
        card.y = currentY;
        cardX += pdfCardW + PDF_CARD_GAP;
      }
      currentY += cardH + PDF_CARD_GAP;
    }

    pages.push(page);
  }

  return pages;
}

async function buildPdfTokensPage(target: DocTarget): Promise<FrameNode[]> {
  const page = makePdfPage();

  const header = makePdfHeader(target.name, "Variables liées");
  page.appendChild(header);
  header.x = PDF_MARGIN;
  header.y = PDF_MARGIN;

  const div = thinDivider(PDF_CONTENT_W, COLOR.dividerStrong);
  page.appendChild(div);
  div.x = PDF_MARGIN;
  div.y = PDF_MARGIN + header.height + 14;

  const contentY = div.y + 1 + 12;

  const nodes = getInspectableNodes(target);
  const ids = new Set<string>();
  for (const n of nodes) collectBoundVariableIds(n, ids);

  if (ids.size === 0) {
    const t = figma.createText();
    t.fontName = { family: "Inter", style: "Regular" };
    t.fontSize = 12;
    t.characters = "Aucune variable liée détectée.";
    t.fills = [{ type: "SOLID", color: COLOR.textSecondary }];
    page.appendChild(t);
    t.x = PDF_MARGIN;
    t.y = contentY;
    return [page];
  }

  const items: { name: string; type: string; collection: string }[] = [];
  for (const id of ids) {
    try {
      const v = await figma.variables.getVariableByIdAsync(id);
      if (!v) continue;
      let collName = "—";
      try {
        const coll = await figma.variables.getVariableCollectionByIdAsync(v.variableCollectionId);
        collName = coll ? coll.name : "—";
      } catch { /* ignore */ }
      items.push({ name: v.name, type: prettyVarType(v.resolvedType), collection: collName });
    } catch { /* ignore */ }
  }

  items.sort((a, b) => a.name.localeCompare(b.name));

  if (items.length > 0) {
    const table = makeElegantTable(
      TOKEN_COL_HEADERS,
      PDF_TOKEN_COL_WIDTHS_A4,
      items.map((i) => [i.name, i.type, i.collection])
    );
    page.appendChild(table);
    table.x = PDF_MARGIN;
    table.y = contentY;
  }

  return [page];
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
  return sheet;
}

// 24px square containing a small "menu-slash" glyph in brand color, mimicking
// the reference. Drawn with a vector node so it survives PNG/JPEG export.
function makeBreadcrumbIcon(): FrameNode {
  const wrap = figma.createFrame();
  wrap.name = "Icon";
  wrap.resize(24, 24);
  wrap.fills = [];
  wrap.clipsContent = false;

  // Tilted slash 24x24 — 3 dots stacked on a diagonal, simple geometric glyph.
  for (let i = 0; i < 3; i++) {
    const dot = figma.createEllipse();
    dot.resize(4, 4);
    dot.x = 6 + i * 4;
    dot.y = 14 - i * 4;
    dot.fills = [{ type: "SOLID", color: COLOR.refBrand }];
    wrap.appendChild(dot);
  }
  return wrap;
}

function makeAdminSheetHeader(
  componentName: string,
  categoryTitle: string,
  contentWidth: number = ADMIN_CONTENT_WIDTH_DEFAULT
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
  title.layoutAlign = "STRETCH";
  titleWrap.appendChild(title);

  header.appendChild(titleWrap);

  return header;
}

function buildPropsSection(target: DocTarget): SceneNode {
  const props = extractProps(target);
  if (props.length === 0) return textFrame("Aucune propriété détectée.");
  return makeAdminTable(
    PROP_COL_HEADERS,
    PROP_COL_WIDTHS,
    props.map(
      (p) =>
        [
          p.name,
          PROP_DESCRIPTION_PLACEHOLDER,
          makeTypeChip(p.type),
          makeBulletList(valuesAsItems(p)),
        ] as AdminCellContent[]
    )
  );
}

async function buildPropsAndMatrixContent(
  target: DocTarget,
  groupBy: string[],
  excludeRules: ExclusionRule[],
  propLocks: PropLocks,
  layout: AdminCardLayout
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

  wrapper.appendChild(buildSubSection("Props list", buildPropsSection(target)));
  wrapper.appendChild(
    buildSubSection(
      "Props visual",
      await buildVariantsSection(target, groupBy, excludeRules, propLocks, layout)
    )
  );
  return wrapper;
}

function buildSubSection(label: string, content: SceneNode): FrameNode {
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
  section.appendChild(h);

  section.appendChild(content);
  return section;
}

async function buildTokensSection(target: DocTarget): Promise<SceneNode> {
  const nodes = getInspectableNodes(target);
  const ids = new Set<string>();
  for (const n of nodes) collectBoundVariableIds(n, ids);

  if (ids.size === 0) return textFrame("Aucune variable liée détectée.");

  const items: { name: string; type: string; collection: string }[] = [];
  for (const id of ids) {
    try {
      const v = await figma.variables.getVariableByIdAsync(id);
      if (!v) continue;
      let collName = "—";
      try {
        const coll = await figma.variables.getVariableCollectionByIdAsync(
          v.variableCollectionId
        );
        collName = coll ? coll.name : "—";
      } catch {
        // collection unavailable
      }
      items.push({
        name: v.name,
        type: prettyVarType(v.resolvedType),
        collection: collName,
      });
    } catch {
      // variable unavailable
    }
  }

  if (items.length === 0) {
    return textFrame("Variables liées détectées mais non résolvables (librairie non chargée).");
  }

  items.sort((a, b) => a.name.localeCompare(b.name));

  return makeElegantTable(
    TOKEN_COL_HEADERS,
    TOKEN_COL_WIDTHS,
    items.map((i) => [i.name, i.type, i.collection])
  );
}

async function buildVariantsSection(
  target: DocTarget,
  groupBy: string[],
  excludeRules: ExclusionRule[],
  propLocks: PropLocks,
  layout: AdminCardLayout
): Promise<SceneNode> {
  const defs = target.componentPropertyDefinitions;
  const allAxes = await eligibleAxes(defs);
  if (allAxes.length === 0) {
    return textFrame(
      "Aucune propriété de type VARIANT, BOOLEAN ou INSTANCE_SWAP exploitable comme axe."
    );
  }

  const base = getBaseComponent(target);
  if (!base) return textFrame("Composant de base introuvable.");

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
  const cards = await buildAllAdminCards(combos, base, layout, boolishAxes);

  // Assemble layout from pre-built cards (sync, fast)
  const contentNode = buildAdminLayoutFromCards(combos, cards, validGroupBy, 0, layout);

  const skipped = totalEnumerated - combos.length - excluded;
  const captionParts: string[] = [];
  captionParts.push(`${combos.length} combinaison${combos.length > 1 ? "s" : ""}`);
  if (skipped > 0) captionParts.push(`(${skipped} n'existent pas)`);
  if (excluded > 0) captionParts.push(`(${excluded} exclues)`);
  captionParts.push(
    `Axes : ${allAxes.map((a) => `${a.name} (${a.propType.toLowerCase()})`).join(", ")}`
  );
  if (validGroupBy.length > 0) {
    captionParts.push(`Tri : ${validGroupBy.join(" › ")}`);
  }
  const lockedNames = Object.keys(propLocks).filter((n) =>
    allAxes.some((a) => a.name === n)
  );
  if (lockedNames.length > 0) {
    captionParts.push(
      `Verrouillés : ${lockedNames.map((n) => `${n}=${propLocks[n]}`).join(", ")}`
    );
  }

  const wrapper = figma.createFrame();
  wrapper.layoutMode = "VERTICAL";
  wrapper.primaryAxisSizingMode = "AUTO";
  wrapper.counterAxisSizingMode = "AUTO";
  wrapper.layoutAlign = "STRETCH";
  wrapper.itemSpacing = 16;
  wrapper.fills = [];

  const caption = figma.createText();
  caption.fontName = FONT.body;
  caption.fontSize = 12;
  caption.lineHeight = { value: 14, unit: "PIXELS" };
  caption.characters = captionParts.join(" · ");
  caption.fills = [{ type: "SOLID", color: COLOR.refBodyText }];
  wrapper.appendChild(caption);
  wrapper.appendChild(contentNode);
  return wrapper;
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

  // Apply propLocks: locked axes have their options narrowed to a single entry,
  // collapsing them in the cartesian product (combo payload still carries the
  // locked value, so setProperties + the mini-card render normally).
  const effectiveAxes: VariantAxis[] = allAxes.map((axis) => {
    const lockedLabel = propLocks[axis.name];
    if (!lockedLabel) return axis;
    const opt = axis.options.find((o) => o.label === lockedLabel);
    return opt ? { ...axis, options: [opt] } : axis; // ignore invalid lock
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

function makeAdminCombinationCard(
  combo: IndexedCombination,
  base: ComponentNode,
  layout: AdminCardLayout,
  boolishAxes: Set<string>
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
  visual.fills = [{ type: "SOLID", color: COLOR.refSheetBg }];
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
  row.counterAxisAlignItems = "CENTER";
  row.cornerRadius = 6;
  row.fills = [{ type: "SOLID", color: COLOR.refMatrixRowBg }];

  // Boolean props are prefixed with "has a " per spec.
  const displayName = isBool ? `has a ${name}` : name;

  const nameText = figma.createText();
  nameText.fontName = FONT.body;
  nameText.fontSize = 14;
  nameText.lineHeight = { value: 24, unit: "PIXELS" };
  nameText.characters = displayName;
  nameText.fills = [{ type: "SOLID", color: COLOR.refMatrixRowName }];
  nameText.layoutGrow = 1;
  nameText.textAutoResize = "HEIGHT";
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
    valText.layoutGrow = 1;
    valText.textAutoResize = "HEIGHT";
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
  boolishAxes: Set<string>
): Promise<FrameNode[]> {
  const cards: FrameNode[] = [];
  for (let i = 0; i < combos.length; i += CARD_BATCH_SIZE) {
    const end = Math.min(i + CARD_BATCH_SIZE, combos.length);
    for (let j = i; j < end; j++) {
      cards.push(makeAdminCombinationCard(combos[j], base, layout, boolishAxes));
    }
    if (end < combos.length) {
      figma.notify(`Génération… ${end}/${combos.length}`, { timeout: 800 });
      await new Promise<void>((r) => setTimeout(r, 0));
    }
  }
  return cards;
}

// Flat grid of admin cards with WRAP, sized to the sheet content width.
// Cards have FIXED width = layout.cardW (max 3 per row).
function buildAdminFlatGrid(cards: FrameNode[], layout: AdminCardLayout): FrameNode {
  const grid = figma.createFrame();
  grid.name = "CardGrid";
  grid.layoutMode = "HORIZONTAL";
  grid.layoutWrap = "WRAP";
  grid.primaryAxisSizingMode = "FIXED";
  grid.counterAxisSizingMode = "AUTO";
  grid.layoutAlign = "STRETCH";
  grid.resize(layout.contentW, 1);
  grid.itemSpacing = ADMIN_GRID_GAP;
  grid.counterAxisSpacing = ADMIN_GRID_GAP;
  grid.fills = [];
  for (const card of cards) grid.appendChild(card);
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
    if (end < combos.length) {
      figma.notify(`Génération… ${end}/${combos.length}`, { timeout: 800 });
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

// Coloured chip used in the "Type" column.
function makeTypeChip(type: ComponentPropertyType): FrameNode {
  let bg: RGB;
  let fg: RGB;
  let label: string;
  switch (type) {
    case "BOOLEAN":
      bg = COLOR.refChipBoolBg;
      fg = COLOR.refChipBoolText;
      label = "Boolean";
      break;
    case "VARIANT":
      bg = COLOR.refChipVariantBg;
      fg = COLOR.refChipVariantText;
      label = "Variant";
      break;
    case "TEXT":
      bg = COLOR.refChipTextBg;
      fg = COLOR.refChipTextText;
      label = "Text";
      break;
    case "INSTANCE_SWAP":
      bg = COLOR.refChipSwapBg;
      fg = COLOR.refChipSwapText;
      label = "Instance";
      break;
    default:
      bg = COLOR.refChipTextBg;
      fg = COLOR.refChipTextText;
      label = String(type);
  }

  const chip = figma.createFrame();
  chip.name = `Chip:${label}`;
  chip.layoutMode = "HORIZONTAL";
  chip.primaryAxisSizingMode = "AUTO";
  chip.counterAxisSizingMode = "AUTO";
  chip.paddingTop = 4;
  chip.paddingBottom = 4;
  chip.paddingLeft = 8;
  chip.paddingRight = 8;
  chip.cornerRadius = 4;
  chip.fills = [{ type: "SOLID", color: bg }];

  const t = figma.createText();
  t.fontName = FONT.bodyMed;
  t.fontSize = 11;
  t.lineHeight = { value: 14, unit: "PIXELS" };
  t.characters = label;
  t.fills = [{ type: "SOLID", color: fg }];
  chip.appendChild(t);

  return chip;
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

function valuesAsItems(p: PropInfo): string[] {
  switch (p.type) {
    case "BOOLEAN":
      return ["true", "false"];
    case "TEXT":
      return [`"${String(p.defaultValue)}"`];
    case "VARIANT":
      return p.variantOptions ?? [];
    case "INSTANCE_SWAP":
      return ["Instance"];
    default:
      return [];
  }
}

function getInspectableNodes(target: DocTarget): SceneNode[] {
  if (target.type === "COMPONENT_SET") {
    const result: SceneNode[] = [target];
    const first = target.children.find((c) => c.type === "COMPONENT") as
      | ComponentNode
      | undefined;
    if (first) {
      result.push(first);
      result.push(...first.findAll(() => true));
    }
    return result;
  }
  return [target, ...target.findAll(() => true)];
}

function collectBoundVariableIds(node: SceneNode, ids: Set<string>): void {
  const bv = (node as { boundVariables?: Record<string, unknown> }).boundVariables;
  if (bv) {
    for (const field in bv) {
      const val = bv[field];
      if (!val) continue;
      if (Array.isArray(val)) {
        for (const a of val) extractAliasId(a, ids);
      } else if (typeof val === "object") {
        const obj = val as Record<string, unknown>;
        if (typeof obj.id === "string") {
          ids.add(obj.id);
        } else {
          for (const k in obj) {
            const inner = obj[k];
            if (Array.isArray(inner)) {
              for (const a of inner) extractAliasId(a, ids);
            } else {
              extractAliasId(inner, ids);
            }
          }
        }
      }
    }
  }
}

function extractAliasId(value: unknown, ids: Set<string>): void {
  if (value && typeof value === "object") {
    const id = (value as { id?: unknown }).id;
    if (typeof id === "string") ids.add(id);
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
