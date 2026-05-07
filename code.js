"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
const PROP_COL_WIDTHS = [220, 160, 360];
const PROP_COL_HEADERS = ["Propriété", "Type", "Valeurs possibles"];
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
const PDF_PROP_COL_WIDTHS_A4 = [150, 120, 245]; // sum = 515
const PDF_TOKEN_COL_WIDTHS_A4 = [240, 110, 165]; // sum = 515
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
};
let lastSheets = [];
let combosCache = null;
function cachedEnumerateValidCombinations(target, allAxes, excludeRules = [], propLocks = {}) {
    const rulesKey = JSON.stringify([excludeRules, propLocks]);
    if (combosCache && combosCache.targetId === target.id && combosCache.rulesKey === rulesKey) {
        return combosCache.result;
    }
    const result = enumerateValidCombinations(target, allAxes, excludeRules, propLocks);
    combosCache = { targetId: target.id, rulesKey, result };
    return result;
}
const CONFIG_KEY_PREFIX = "docplugin:config:";
function loadSavedConfig(targetId) {
    return __awaiter(this, void 0, void 0, function* () {
        var _a;
        try {
            const raw = yield figma.clientStorage.getAsync(CONFIG_KEY_PREFIX + targetId);
            return (_a = raw) !== null && _a !== void 0 ? _a : null;
        }
        catch (_b) {
            return null;
        }
    });
}
function saveConfig(targetId, options) {
    return __awaiter(this, void 0, void 0, function* () {
        var _a, _b, _c;
        const config = {
            options: { props: options.props, tokens: options.tokens, variants: options.variants },
            groupBy: (_a = options.groupBy) !== null && _a !== void 0 ? _a : [],
            excludeRules: (_b = options.excludeRules) !== null && _b !== void 0 ? _b : [],
            propLocks: (_c = options.propLocks) !== null && _c !== void 0 ? _c : {},
        };
        try {
            yield figma.clientStorage.setAsync(CONFIG_KEY_PREFIX + targetId, config);
        }
        catch (_d) {
            // Best-effort — don't surface errors to the user.
        }
    });
}
figma.showUI(__html__, { width: 360, height: 540 });
figma.on("selectionchange", () => {
    combosCache = null; // stale once the target changes
    void sendSelection();
});
void sendSelection();
figma.ui.onmessage = (msg) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b;
    const defaultOptions = { props: true, tokens: true, variants: true };
    if (msg.type === "generate-doc") {
        const target = resolveTarget();
        if (!target) {
            figma.notify("Sélectionnez un composant.", { error: true });
            return;
        }
        const opts = (_a = msg.options) !== null && _a !== void 0 ? _a : defaultOptions;
        try {
            yield generateDoc(target, opts);
            void saveConfig(target.id, opts);
            figma.notify("Documentation créée");
        }
        catch (e) {
            figma.notify(`Erreur: ${e.message}`, { error: true });
        }
    }
    else if (msg.type === "export-pdf") {
        const target = resolveTarget();
        if (!target) {
            figma.notify("Sélectionnez un composant.", { error: true });
            return;
        }
        const opts = (_b = msg.options) !== null && _b !== void 0 ? _b : defaultOptions;
        try {
            yield exportAsPdf(target, opts);
            void saveConfig(target.id, opts);
        }
        catch (e) {
            figma.notify(`Erreur PDF : ${e.message}`, { error: true });
        }
    }
    else if (msg.type === "close") {
        figma.closePlugin();
    }
});
function resolveTarget() {
    const sel = figma.currentPage.selection;
    if (sel.length !== 1)
        return null;
    const node = sel[0];
    if (node.type === "COMPONENT_SET")
        return node;
    if (node.type === "COMPONENT") {
        if (node.parent && node.parent.type === "COMPONENT_SET")
            return node.parent;
        return node;
    }
    if (node.type === "INSTANCE") {
        const main = node.mainComponent;
        if (main) {
            if (main.parent && main.parent.type === "COMPONENT_SET")
                return main.parent;
            return main;
        }
    }
    return null;
}
function sendSelection() {
    return __awaiter(this, void 0, void 0, function* () {
        const target = resolveTarget();
        let payload = null;
        if (target) {
            let preview = null;
            try {
                const bytes = yield target.exportAsync({
                    format: "PNG",
                    constraint: { type: "SCALE", value: 2 },
                });
                preview = figma.base64Encode(bytes);
            }
            catch (_a) {
                preview = null;
            }
            const props = extractProps(target).map((p) => ({
                name: p.name,
                type: p.type,
                values: formatValuesDisplay(p),
            }));
            const axes = yield eligibleAxes(target.componentPropertyDefinitions);
            // Real count = post-dedup, post-existence (matches what generation will produce)
            const combinationCount = axes.length > 0 ? cachedEnumerateValidCombinations(target, axes).combos.length : 0;
            const axisValues = {};
            for (const a of axes)
                axisValues[a.name] = a.options.map((o) => o.label);
            const savedConfig = yield loadSavedConfig(target.id);
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
    });
}
// Returns prop display-names in the order Figma shows them in the component panel.
// For COMPONENT_SET, variantProperties keys on the first variant give the correct
// VARIANT ordering; non-VARIANT props follow in their defs insertion order.
function orderedPropKeys(target) {
    const defs = target.componentPropertyDefinitions;
    if (target.type === "COMPONENT_SET") {
        const first = target.children.find((c) => c.type === "COMPONENT");
        if (first === null || first === void 0 ? void 0 : first.variantProperties) {
            const variantNames = Object.keys(first.variantProperties);
            const nonVariantNames = Object.keys(defs)
                .filter((k) => defs[k].type !== "VARIANT")
                .map((k) => stripPropKey(k));
            return [...variantNames, ...nonVariantNames];
        }
    }
    return Object.keys(defs).map((k) => stripPropKey(k));
}
function extractProps(target) {
    const defs = target.componentPropertyDefinitions;
    const byName = new Map();
    for (const key of Object.keys(defs)) {
        const def = defs[key];
        const info = {
            name: stripPropKey(key),
            rawKey: key,
            type: def.type,
            defaultValue: def.defaultValue,
        };
        if (def.type === "VARIANT")
            info.variantOptions = def.variantOptions;
        byName.set(info.name, info);
    }
    return orderedPropKeys(target)
        .filter((n) => byName.has(n))
        .map((n) => byName.get(n));
}
function stripPropKey(key) {
    const i = key.indexOf("#");
    return i >= 0 ? key.slice(0, i) : key;
}
function formatValuesDisplay(p) {
    var _a;
    switch (p.type) {
        case "BOOLEAN":
            return `true / false (défaut : ${p.defaultValue})`;
        case "TEXT":
            return `Texte libre (défaut : "${p.defaultValue}")`;
        case "VARIANT":
            return `${((_a = p.variantOptions) !== null && _a !== void 0 ? _a : []).join(", ")} (défaut : ${p.defaultValue})`;
        case "INSTANCE_SWAP":
            return "Instance de composant";
        default:
            return "";
    }
}
function buildSheets(target, options) {
    return __awaiter(this, void 0, void 0, function* () {
        var _a, _b, _c;
        const sheets = [];
        if (options.props && options.variants) {
            const content = yield buildPropsAndMatrixContent(target, (_a = options.groupBy) !== null && _a !== void 0 ? _a : [], (_b = options.excludeRules) !== null && _b !== void 0 ? _b : [], (_c = options.propLocks) !== null && _c !== void 0 ? _c : {});
            sheets.push(makeSheet(target, "Propriétés", content));
        }
        else if (options.props) {
            sheets.push(makeSheet(target, "Propriétés", buildPropsSection(target)));
        }
        if (options.tokens) {
            sheets.push(makeSheet(target, "Variables liées", yield buildTokensSection(target)));
        }
        return sheets;
    });
}
// Find sheets previously generated for this target (tagged via setPluginData),
// remove them, and return the leftmost one's position so the new sheets can
// take its place. Scoped to currentPage for perf — generation always lands here.
function removeExistingSheets(target) {
    const existing = figma.currentPage.findAll((n) => n.getPluginData("docplugin:component") === target.id);
    if (existing.length === 0)
        return null;
    let minX = Infinity;
    let minY = 0;
    for (const sheet of existing) {
        if (sheet.x < minX) {
            minX = sheet.x;
            minY = sheet.y;
        }
    }
    for (const sheet of existing)
        sheet.remove();
    return { x: minX, y: minY };
}
function generateDoc(target, options) {
    return __awaiter(this, void 0, void 0, function* () {
        yield loadFonts();
        // If a previous doc exists for this target, replace it in place at the same position.
        const oldPos = removeExistingSheets(target);
        const sheets = yield buildSheets(target, options);
        if (sheets.length === 0)
            return;
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
    });
}
function exportAsPdf(target, options) {
    return __awaiter(this, void 0, void 0, function* () {
        var _a, _b;
        yield loadFonts();
        const pdfPages = [];
        if (options.props)
            pdfPages.push(buildPdfPropsPage(target));
        if (options.variants)
            pdfPages.push(...(yield buildPdfCombinationsPages(target, (_a = options.excludeRules) !== null && _a !== void 0 ? _a : [], (_b = options.propLocks) !== null && _b !== void 0 ? _b : {})));
        if (options.tokens)
            pdfPages.push(...yield buildPdfTokensPage(target));
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
        const jpegs = yield Promise.all(pdfPages.map((page) => __awaiter(this, void 0, void 0, function* () {
            const bytes = yield page.exportAsync({
                format: "JPG",
                constraint: { type: "SCALE", value: 2 },
            });
            return {
                base64: figma.base64Encode(bytes),
                width: PDF_W * 2,
                height: PDF_H * 2,
            };
        })));
        container.remove();
        figma.ui.postMessage({ type: "pdf-export", jpegs, filename: "documentation.pdf" });
        figma.notify("PDF prêt au téléchargement");
    });
}
function loadFonts() {
    return __awaiter(this, void 0, void 0, function* () {
        yield figma.loadFontAsync({ family: "Inter", style: "Regular" });
        yield figma.loadFontAsync({ family: "Inter", style: "Semi Bold" });
    });
}
// ─── PDF page builders ───────────────────────────────────────────────────────
function makePdfPage() {
    const page = figma.createFrame();
    page.name = "PDF page";
    page.resize(PDF_W, PDF_H);
    page.fills = [{ type: "SOLID", color: COLOR.bg }];
    return page;
}
function makePdfHeader(componentName, sectionTitle) {
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
function buildPdfPropsPage(target) {
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
        const table = makeElegantTable(PROP_COL_HEADERS, PDF_PROP_COL_WIDTHS_A4, props.map((p) => [p.name, p.type, formatValuesDisplay(p)]));
        page.appendChild(table);
        table.x = PDF_MARGIN;
        table.y = contentY;
    }
    return page;
}
function buildPdfCombinationsPages(target, excludeRules, propLocks) {
    return __awaiter(this, void 0, void 0, function* () {
        const defs = target.componentPropertyDefinitions;
        const allAxes = yield eligibleAxes(defs);
        const emptyPage = () => {
            const p = makePdfPage();
            const h = makePdfHeader(target.name, "Combinaisons");
            p.appendChild(h);
            h.x = PDF_MARGIN;
            h.y = PDF_MARGIN;
            return p;
        };
        if (allAxes.length === 0)
            return [emptyPage()];
        const base = getBaseComponent(target);
        if (!base)
            return [emptyPage()];
        allAxes.sort((a, b) => b.options.length - a.options.length);
        const { combos } = cachedEnumerateValidCombinations(target, allAxes, excludeRules, propLocks);
        if (combos.length === 0)
            return [emptyPage()];
        const propOrder = orderedPropKeys(target);
        const propOrderMap = new Map(propOrder.map((n, i) => [n, i]));
        for (const c of combos) {
            c.labels.sort((a, b) => {
                var _a, _b;
                return ((_a = propOrderMap.get(a.axisName)) !== null && _a !== void 0 ? _a : 99) -
                    ((_b = propOrderMap.get(b.axisName)) !== null && _b !== void 0 ? _b : 99);
            });
        }
        const visualSize = computeVisualSize(target);
        const pdfCardW = Math.min(Math.max(240, visualSize.w), PDF_CONTENT_W);
        const pdfVisualH = visualSize.h;
        const pdfCardsPerRow = Math.max(1, Math.floor((PDF_CONTENT_W + PDF_CARD_GAP) / (pdfCardW + PDF_CARD_GAP)));
        const boolishAxes = new Set();
        for (const a of allAxes) {
            if (a.propType === "BOOLEAN" || isBoolishOptions(a.options))
                boolishAxes.add(a.name);
        }
        const miniH = MINI_CARD_HEIGHT;
        const validCards = yield buildAllCards(combos, base, pdfCardW, pdfVisualH, miniH, boolishAxes);
        // Card height is now actually computed (analytical) — read from first card
        // for page-break math. All cards have identical height since they share
        // structure (visual + divider + propsArea sized analytically).
        const cardH = validCards[0].height;
        const contentStartY = PDF_MARGIN + 71;
        const contentMaxY = PDF_H - PDF_MARGIN - 16;
        const rowsPerPage = Math.max(1, Math.floor((contentMaxY - contentStartY) / (cardH + PDF_CARD_GAP)));
        const cardsPerPage = rowsPerPage * pdfCardsPerRow;
        const totalPages = Math.ceil(validCards.length / cardsPerPage);
        const pages = [];
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
    });
}
function buildPdfTokensPage(target) {
    return __awaiter(this, void 0, void 0, function* () {
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
        const ids = new Set();
        for (const n of nodes)
            collectBoundVariableIds(n, ids);
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
        const items = [];
        for (const id of ids) {
            try {
                const v = yield figma.variables.getVariableByIdAsync(id);
                if (!v)
                    continue;
                let collName = "—";
                try {
                    const coll = yield figma.variables.getVariableCollectionByIdAsync(v.variableCollectionId);
                    collName = coll ? coll.name : "—";
                }
                catch ( /* ignore */_a) { /* ignore */ }
                items.push({ name: v.name, type: prettyVarType(v.resolvedType), collection: collName });
            }
            catch ( /* ignore */_b) { /* ignore */ }
        }
        items.sort((a, b) => a.name.localeCompare(b.name));
        if (items.length > 0) {
            const table = makeElegantTable(TOKEN_COL_HEADERS, PDF_TOKEN_COL_WIDTHS_A4, items.map((i) => [i.name, i.type, i.collection]));
            page.appendChild(table);
            table.x = PDF_MARGIN;
            table.y = contentY;
        }
        return [page];
    });
}
// ─────────────────────────────────────────────────────────────────────────────
function makeSheet(target, title, content) {
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
function makeSheetHeader(componentName, categoryTitle) {
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
function buildPropsSection(target) {
    const props = extractProps(target);
    if (props.length === 0)
        return textFrame("Aucune propriété détectée.");
    return makeElegantTable(PROP_COL_HEADERS, PROP_COL_WIDTHS, props.map((p) => [p.name, p.type, formatValuesDisplay(p)]));
}
function buildPropsAndMatrixContent(target, groupBy, excludeRules, propLocks) {
    return __awaiter(this, void 0, void 0, function* () {
        const wrapper = figma.createFrame();
        wrapper.layoutMode = "VERTICAL";
        wrapper.primaryAxisSizingMode = "AUTO";
        wrapper.counterAxisSizingMode = "AUTO";
        wrapper.itemSpacing = 48;
        wrapper.fills = [];
        wrapper.appendChild(buildPropsSection(target));
        wrapper.appendChild(buildSubSection("Combinaisons", yield buildVariantsSection(target, groupBy, excludeRules, propLocks)));
        return wrapper;
    });
}
function buildSubSection(label, content) {
    const section = figma.createFrame();
    section.layoutMode = "VERTICAL";
    section.primaryAxisSizingMode = "AUTO";
    section.counterAxisSizingMode = "AUTO";
    section.itemSpacing = 20;
    section.fills = [];
    const h = figma.createText();
    h.fontName = { family: "Inter", style: "Semi Bold" };
    h.fontSize = 20;
    h.characters = label;
    h.fills = [{ type: "SOLID", color: COLOR.textPrimary }];
    section.appendChild(h);
    section.appendChild(content);
    return section;
}
function buildTokensSection(target) {
    return __awaiter(this, void 0, void 0, function* () {
        const nodes = getInspectableNodes(target);
        const ids = new Set();
        for (const n of nodes)
            collectBoundVariableIds(n, ids);
        if (ids.size === 0)
            return textFrame("Aucune variable liée détectée.");
        const items = [];
        for (const id of ids) {
            try {
                const v = yield figma.variables.getVariableByIdAsync(id);
                if (!v)
                    continue;
                let collName = "—";
                try {
                    const coll = yield figma.variables.getVariableCollectionByIdAsync(v.variableCollectionId);
                    collName = coll ? coll.name : "—";
                }
                catch (_a) {
                    // collection unavailable
                }
                items.push({
                    name: v.name,
                    type: prettyVarType(v.resolvedType),
                    collection: collName,
                });
            }
            catch (_b) {
                // variable unavailable
            }
        }
        if (items.length === 0) {
            return textFrame("Variables liées détectées mais non résolvables (librairie non chargée).");
        }
        items.sort((a, b) => a.name.localeCompare(b.name));
        return makeElegantTable(TOKEN_COL_HEADERS, TOKEN_COL_WIDTHS, items.map((i) => [i.name, i.type, i.collection]));
    });
}
function buildVariantsSection(target, groupBy, excludeRules, propLocks) {
    return __awaiter(this, void 0, void 0, function* () {
        const defs = target.componentPropertyDefinitions;
        const allAxes = yield eligibleAxes(defs);
        if (allAxes.length === 0) {
            return textFrame("Aucune propriété de type VARIANT, BOOLEAN ou INSTANCE_SWAP exploitable comme axe.");
        }
        const base = getBaseComponent(target);
        if (!base)
            return textFrame("Composant de base introuvable.");
        allAxes.sort((a, b) => b.options.length - a.options.length);
        // Validate combinations BEFORE creating any instance:
        // - COMPONENT_SET: lookup variant child via index → skip non-existent
        // - COMPONENT: every BOOLEAN/INSTANCE_SWAP combo is valid
        // Also drops combos matching any exclusion rule, and applies prop locks.
        const { combos, totalEnumerated, excluded } = cachedEnumerateValidCombinations(target, allAxes, excludeRules, propLocks);
        // Sort labels to match component panel order (visual consistency)
        const propOrder = orderedPropKeys(target);
        const propOrderMap = new Map(propOrder.map((n, i) => [n, i]));
        for (const c of combos) {
            c.labels.sort((a, b) => {
                var _a, _b;
                return ((_a = propOrderMap.get(a.axisName)) !== null && _a !== void 0 ? _a : 99) -
                    ((_b = propOrderMap.get(b.axisName)) !== null && _b !== void 0 ? _b : 99);
            });
        }
        const visualSize = computeVisualSize(target);
        const cardW = Math.max(240, visualSize.w);
        const visualH = visualSize.h;
        const validGroupBy = groupBy.filter((name) => allAxes.some((a) => a.name === name));
        // Detect axes whose option pair is boolean-like (true/false, on/off, yes/no
        // — case-insensitive). Their mini-cards render with a switch.
        const boolishAxes = new Set();
        for (const a of allAxes) {
            if (a.propType === "BOOLEAN" || isBoolishOptions(a.options))
                boolishAxes.add(a.name);
        }
        // Build all cards in async-batched fashion (yields UI thread every CARD_BATCH_SIZE)
        const miniH = MINI_CARD_HEIGHT;
        const cards = yield buildAllCards(combos, base, cardW, visualH, miniH, boolishAxes);
        // Assemble layout from pre-built cards (sync, fast)
        const contentNode = buildLayoutFromCards(combos, cards, validGroupBy, cardW, 0);
        const skipped = totalEnumerated - combos.length - excluded;
        const captionParts = [];
        captionParts.push(`${combos.length} combinaison${combos.length > 1 ? "s" : ""}`);
        if (skipped > 0)
            captionParts.push(`(${skipped} n'existent pas)`);
        if (excluded > 0)
            captionParts.push(`(${excluded} exclues)`);
        captionParts.push(`Axes : ${allAxes.map((a) => `${a.name} (${a.propType.toLowerCase()})`).join(", ")}`);
        if (validGroupBy.length > 0) {
            captionParts.push(`Tri : ${validGroupBy.join(" › ")}`);
        }
        const lockedNames = Object.keys(propLocks).filter((n) => allAxes.some((a) => a.name === n));
        if (lockedNames.length > 0) {
            captionParts.push(`Verrouillés : ${lockedNames.map((n) => `${n}=${propLocks[n]}`).join(", ")}`);
        }
        const wrapper = figma.createFrame();
        wrapper.layoutMode = "VERTICAL";
        wrapper.primaryAxisSizingMode = "AUTO";
        wrapper.counterAxisSizingMode = "AUTO";
        wrapper.itemSpacing = 16;
        wrapper.fills = [];
        const caption = figma.createText();
        caption.fontName = { family: "Inter", style: "Regular" };
        caption.fontSize = 11;
        caption.characters = captionParts.join(" · ");
        caption.fills = [{ type: "SOLID", color: COLOR.textSecondary }];
        wrapper.appendChild(caption);
        wrapper.appendChild(contentNode);
        return wrapper;
    });
}
const MAX_CARDS_PER_ROW = 4;
function buildFlatGridFromCards(cards, cardW) {
    // Target ~1024px wide so 4 cards of the 240px minimum fit (4×240 + 3×16 = 1008).
    // Cap at MAX_CARDS_PER_ROW so we never exceed 4 columns even if cards are tiny.
    const cardsPerRow = Math.min(MAX_CARDS_PER_ROW, Math.max(1, Math.floor((1024 + 16) / (cardW + 16))));
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
    for (const card of cards)
        grid.appendChild(card);
    grid.counterAxisSizingMode = "AUTO";
    return grid;
}
function buildLayoutFromCards(combos, cards, groupBy, cardW, depth) {
    var _a;
    if (groupBy.length === 0 || combos.length === 0) {
        return buildFlatGridFromCards(cards, cardW);
    }
    const [first, ...rest] = groupBy;
    const groups = new Map();
    for (let i = 0; i < combos.length; i++) {
        const value = (_a = combos[i].labelMap.get(first)) !== null && _a !== void 0 ? _a : "—";
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
        if (g.cards.length === 0)
            continue;
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
        }
        else {
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
function eligibleAxes(defs) {
    return __awaiter(this, void 0, void 0, function* () {
        var _a, _b;
        const axes = [];
        for (const key of Object.keys(defs)) {
            const def = defs[key];
            let options = null;
            if (def.type === "VARIANT") {
                options = ((_a = def.variantOptions) !== null && _a !== void 0 ? _a : []).map((v) => ({ label: v, value: v }));
            }
            else if (def.type === "BOOLEAN") {
                options = [
                    { label: "true", value: true },
                    { label: "false", value: false },
                ];
            }
            else if (def.type === "INSTANCE_SWAP") {
                const pv = (_b = def.preferredValues) !== null && _b !== void 0 ? _b : [];
                if (pv.length >= 2) {
                    const resolved = [];
                    for (const item of pv) {
                        try {
                            if (item.type === "COMPONENT") {
                                const c = yield figma.importComponentByKeyAsync(item.key);
                                resolved.push({ label: c.name, value: c.id });
                            }
                            else {
                                const cs = yield figma.importComponentSetByKeyAsync(item.key);
                                const firstChild = cs.children.find((ch) => ch.type === "COMPONENT");
                                if (firstChild)
                                    resolved.push({ label: cs.name, value: firstChild.id });
                            }
                        }
                        catch (_c) {
                            // skip unresolvable
                        }
                    }
                    if (resolved.length >= 2)
                        options = resolved;
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
    });
}
function getBaseComponent(target) {
    if (target.type === "COMPONENT_SET") {
        const firstVariant = target.children.find((c) => c.type === "COMPONENT");
        return firstVariant !== null && firstVariant !== void 0 ? firstVariant : null;
    }
    return target;
}
function computeVisualSize(target) {
    let w = 0;
    let h = 0;
    if (target.type === "COMPONENT_SET") {
        for (const c of target.children) {
            if (c.type === "COMPONENT") {
                w = Math.max(w, c.width);
                h = Math.max(h, c.height);
            }
        }
    }
    else {
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
const BOOLISH_PAIRS = [
    ["true", "false"],
    ["on", "off"],
    ["yes", "no"],
];
function isBoolishOptions(options) {
    if (options.length !== 2)
        return false;
    const labels = options.map((o) => String(o.label).toLowerCase()).sort();
    return BOOLISH_PAIRS.some(([a, b]) => {
        const sorted = [a, b].sort();
        return labels[0] === sorted[0] && labels[1] === sorted[1];
    });
}
function isBoolishOnValue(value) {
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
function collectBoundPropKeys(root) {
    const bound = new Set();
    const walk = (node) => {
        const refs = node
            .componentPropertyReferences;
        if (refs) {
            for (const k in refs) {
                const key = refs[k];
                if (key)
                    bound.add(key);
            }
        }
        if ("children" in node) {
            for (const c of node.children)
                walk(c);
        }
    };
    walk(root);
    return bound;
}
function computeApplicableAxes(target, allAxes) {
    const result = new Map();
    const applicableFor = (root) => {
        const bound = collectBoundPropKeys(root);
        const set = new Set();
        for (const axis of allAxes) {
            // VARIANT props always "apply" — they ARE the variant identity
            if (axis.propType === "VARIANT")
                set.add(axis.name);
            else if (bound.has(axis.rawKey))
                set.add(axis.name);
        }
        return set;
    };
    if (target.type === "COMPONENT_SET") {
        for (const child of target.children) {
            if (child.type !== "COMPONENT")
                continue;
            result.set(child.id, applicableFor(child));
        }
    }
    else {
        result.set("", applicableFor(target));
    }
    return result;
}
// ─── Variant indexing for COMPONENT_SET ────────────────────────────────────
function canonicalVariantKey(vp) {
    return Object.keys(vp)
        .sort()
        .map((k) => `${k}=${vp[k]}`)
        .join("|");
}
function buildVariantIndex(target) {
    const idx = new Map();
    for (const child of target.children) {
        if (child.type !== "COMPONENT")
            continue;
        const vp = child.variantProperties;
        if (!vp)
            continue;
        idx.set(canonicalVariantKey(vp), child);
    }
    return idx;
}
// ─── Valid combination enumeration ─────────────────────────────────────────
// For COMPONENT_SET: skips combos whose variant doesn't exist BEFORE creating
// any instance (vs. the old try/catch + remove approach).
// For COMPONENT: every BOOLEAN/INSTANCE_SWAP combo is valid by construction.
function enumerateValidCombinations(target, allAxes, excludeRules = [], propLocks = {}) {
    var _a;
    const variantAxes = allAxes.filter((a) => a.propType === "VARIANT");
    const variantIndex = target.type === "COMPONENT_SET" ? buildVariantIndex(target) : null;
    const applicableByVariant = computeApplicableAxes(target, allAxes);
    // Apply propLocks: locked axes have their options narrowed to a single entry,
    // collapsing them in the cartesian product (combo payload still carries the
    // locked value, so setProperties + the mini-card render normally).
    const effectiveAxes = allAxes.map((axis) => {
        const lockedLabel = propLocks[axis.name];
        if (!lockedLabel)
            return axis;
        const opt = axis.options.find((o) => o.label === lockedLabel);
        return opt ? Object.assign(Object.assign({}, axis), { options: [opt] }) : axis; // ignore invalid lock
    });
    // Pre-normalize rules: keep only non-empty ones (drop entries with empty value),
    // skip rules that have zero conditions (they would exclude everything).
    const normalizedRules = [];
    for (const rule of excludeRules) {
        const r = {};
        for (const k of Object.keys(rule)) {
            if (rule[k] !== "" && rule[k] != null)
                r[k] = rule[k];
        }
        if (Object.keys(r).length > 0)
            normalizedRules.push(r);
    }
    const totalEnumerated = totalCombinationCount(effectiveAxes);
    const valid = [];
    let excluded = 0;
    // For dedup: variantId → set of effective keys (only includes applicable axes)
    const seenByVariant = new Map();
    for (const combo of enumerateCombinations(effectiveAxes)) {
        let variantSource = null;
        if (variantIndex && variantAxes.length > 0) {
            const variantPayload = {};
            for (const axis of variantAxes) {
                // For VARIANT: rawKey === axis name (no #hash); value is always string
                variantPayload[axis.name] = String(combo.payload[axis.rawKey]);
            }
            const found = variantIndex.get(canonicalVariantKey(variantPayload));
            if (!found)
                continue;
            variantSource = found;
        }
        const variantId = variantSource ? variantSource.id : "";
        const applicable = (_a = applicableByVariant.get(variantId)) !== null && _a !== void 0 ? _a : new Set();
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
        if (seen.has(effectiveKey))
            continue; // duplicate — same visual output as a kept combo
        seen.add(effectiveKey);
        // Relabel non-applicable axes as "—" so the card shows clearly that the
        // prop has no effect on this variant.
        const labels = combo.labels.map((lbl) => applicable.has(lbl.axisName)
            ? lbl
            : { axisName: lbl.axisName, valueLabel: "—" });
        const labelMap = new Map();
        for (const lbl of labels)
            labelMap.set(lbl.axisName, lbl.valueLabel);
        // Apply exclusion rules using the relabeled map: rules referencing a
        // non-applicable axis won't match (its value is "—", not what the user set).
        if (normalizedRules.length > 0) {
            const isExcluded = normalizedRules.some((rule) => Object.keys(rule).every((axisName) => labelMap.get(axisName) === rule[axisName]));
            if (isExcluded) {
                excluded++;
                continue;
            }
        }
        // Build setProperties payload from the ORIGINAL payload — even non-applicable
        // props can be set without error (Figma just ignores them for visual output).
        // VARIANT props are skipped when we already locked the variant via variantSource.
        const setPropsPayload = {};
        for (const axis of allAxes) {
            if (variantSource && axis.propType === "VARIANT")
                continue;
            // Only apply props that affect this variant — avoids spurious setProperties
            // calls and any hypothetical surprises with INSTANCE_SWAP on disabled slots.
            if (!applicable.has(axis.name))
                continue;
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
function* enumerateCombinations(axes) {
    if (axes.length === 0) {
        yield { payload: {}, labels: [] };
        return;
    }
    const idx = new Array(axes.length).fill(0);
    const total = axes.reduce((acc, a) => acc * a.options.length, 1);
    for (let i = 0; i < total; i++) {
        const payload = {};
        const labels = [];
        for (let a = 0; a < axes.length; a++) {
            const axis = axes[a];
            const opt = axis.options[idx[a]];
            payload[axis.rawKey] = opt.value;
            labels.push({ axisName: axis.name, valueLabel: opt.label });
        }
        yield { payload, labels };
        // Increment indices like an odometer
        for (let a = axes.length - 1; a >= 0; a--) {
            if (++idx[a] < axes[a].options.length)
                break;
            idx[a] = 0;
        }
    }
}
function totalCombinationCount(axes) {
    return axes.reduce((acc, a) => acc * a.options.length, 1);
}
function makeCombinationCard(combo, base, cardW, visualH, miniH, boolishAxes) {
    // Pre-validated combination: variantSource (if any) is already known to exist.
    // For COMPONENT_SET we instantiate the exact variant child — no setProperties
    // for VARIANT props. For COMPONENT we clone the base.
    const inst = combo.variantSource
        ? combo.variantSource.createInstance()
        : base.createInstance();
    if (Object.keys(combo.setPropsPayload).length > 0) {
        try {
            inst.setProperties(combo.setPropsPayload);
        }
        catch (_a) {
            // Defensive: BOOLEAN should always succeed; INSTANCE_SWAP can fail
            // if a referenced component is unavailable. Keep the card.
        }
    }
    // Compute card height analytically — no AUTO/FIXED flipping.
    const labelCount = combo.labels.length;
    const propsAreaH = labelCount === 0
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
    }
    else {
        for (const lbl of combo.labels) {
            // For "—" (non-applicable on this variant), force text rendering — a
            // switch in "off" state would be misleading.
            const renderAsBoolish = boolishAxes.has(lbl.axisName) && lbl.valueLabel !== "—";
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
function buildAllCards(combos, base, cardW, visualH, miniH, boolishAxes) {
    return __awaiter(this, void 0, void 0, function* () {
        const cards = [];
        for (let i = 0; i < combos.length; i += CARD_BATCH_SIZE) {
            const end = Math.min(i + CARD_BATCH_SIZE, combos.length);
            for (let j = i; j < end; j++) {
                cards.push(makeCombinationCard(combos[j], base, cardW, visualH, miniH, boolishAxes));
            }
            if (end < combos.length) {
                figma.notify(`Génération… ${end}/${combos.length}`, { timeout: 800 });
                yield new Promise((r) => setTimeout(r, 0));
            }
        }
        return cards;
    });
}
function makePropMiniCard(name, value, isBoolish) {
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
    }
    else {
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
function makeSwitchNode(isOn) {
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
function makeElegantTable(headers, widths, rows) {
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
function makeElegantRow(cells, widths, variant) {
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
function makeElegantCell(text, width, variant) {
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
    }
    else {
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
function thinDivider(width, color) {
    const d = figma.createFrame();
    d.resize(width, 1);
    d.fills = [{ type: "SOLID", color }];
    return d;
}
function getInspectableNodes(target) {
    if (target.type === "COMPONENT_SET") {
        const result = [target];
        const first = target.children.find((c) => c.type === "COMPONENT");
        if (first) {
            result.push(first);
            result.push(...first.findAll(() => true));
        }
        return result;
    }
    return [target, ...target.findAll(() => true)];
}
function collectBoundVariableIds(node, ids) {
    const bv = node.boundVariables;
    if (bv) {
        for (const field in bv) {
            const val = bv[field];
            if (!val)
                continue;
            if (Array.isArray(val)) {
                for (const a of val)
                    extractAliasId(a, ids);
            }
            else if (typeof val === "object") {
                const obj = val;
                if (typeof obj.id === "string") {
                    ids.add(obj.id);
                }
                else {
                    for (const k in obj) {
                        const inner = obj[k];
                        if (Array.isArray(inner)) {
                            for (const a of inner)
                                extractAliasId(a, ids);
                        }
                        else {
                            extractAliasId(inner, ids);
                        }
                    }
                }
            }
        }
    }
}
function extractAliasId(value, ids) {
    if (value && typeof value === "object") {
        const id = value.id;
        if (typeof id === "string")
            ids.add(id);
    }
}
function textFrame(text) {
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
function prettyVarType(t) {
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
