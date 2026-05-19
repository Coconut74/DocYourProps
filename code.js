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
const PROP_COL_WIDTHS = [142, 212, 141, 141];
const PROP_COL_HEADERS = ["Propriété", "Description", "Type", "Valeurs"];
const PROP_DESCRIPTION_PLACEHOLDER = "À compléter";
// Read an AI-generated description for `propDisplayName` (the kebab-cased
// display name produced by `displayPropName`) from the propDescriptions map.
// Tries the display name first, then the raw prop key (without the "Has a "
// boolean prefix added by `displayPropName`). Falls back to the placeholder.
function pickPropDescription(propRawName, propDisplayName, propDescriptions) {
    if (!propDescriptions)
        return PROP_DESCRIPTION_PLACEHOLDER;
    const fromDisplay = propDescriptions[propDisplayName];
    if (typeof fromDisplay === "string" && fromDisplay.trim().length > 0)
        return fromDisplay;
    const fromRaw = propDescriptions[propRawName];
    if (typeof fromRaw === "string" && fromRaw.trim().length > 0)
        return fromRaw;
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
function hex(h) {
    const v = h.replace("#", "");
    return {
        r: parseInt(v.slice(0, 2), 16) / 255,
        g: parseInt(v.slice(2, 4), 16) / 255,
        b: parseInt(v.slice(4, 6), 16) / 255,
    };
}
const VISUAL_BG_DEFAULT = "#FFFFFF";
const HEX_RE = /^#?[0-9a-fA-F]{6}$/;
function normalizeHex(input) {
    if (typeof input !== "string" || !HEX_RE.test(input))
        return VISUAL_BG_DEFAULT;
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
const FONT = {
    title: { family: "Inter", style: "Regular" },
    titleMed: { family: "Inter", style: "Semi Bold" },
    body: { family: "Inter", style: "Regular" },
    bodyMed: { family: "Inter", style: "Semi Bold" },
    bodyBold: { family: "Inter", style: "Bold" },
};
let lastSheets = [];
// Generation warnings buffer — collected during generation/export and surfaced
// in the post-generation toast. Avoids the previously-silent try/catch sites
// that would drop variables / variants / fonts without telling the user.
let generationWarnings = [];
function resetGenerationWarnings() {
    generationWarnings = [];
}
function pushGenerationWarning(msg) {
    generationWarnings.push(msg);
}
function summarizeWarnings() {
    var _a;
    if (generationWarnings.length === 0)
        return "";
    // Group identical messages with a count suffix.
    const counts = new Map();
    for (const w of generationWarnings)
        counts.set(w, ((_a = counts.get(w)) !== null && _a !== void 0 ? _a : 0) + 1);
    const parts = [];
    for (const [msg, n] of counts)
        parts.push(n > 1 ? `${msg} (×${n})` : msg);
    return parts.join(" · ");
}
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
const CONFIG_KEY_PREFIX = "docyourprops:config:";
function loadSavedConfig(targetId) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            const raw = yield figma.clientStorage.getAsync(CONFIG_KEY_PREFIX + targetId);
            if (!raw)
                return null;
            return migratePropLocks(raw);
        }
        catch (_a) {
            return null;
        }
    });
}
// Migrate old single-string propLocks ({ axis: "M" }) to multi-value
// ({ axis: ["M"] }). Keeps configs saved before the multi-select rollout usable.
function migratePropLocks(config) {
    const locks = config.propLocks;
    if (!locks || typeof locks !== "object")
        return config;
    let needsMigration = false;
    for (const k of Object.keys(locks)) {
        if (typeof locks[k] === "string") {
            needsMigration = true;
            break;
        }
    }
    if (!needsMigration)
        return config;
    const migrated = {};
    for (const k of Object.keys(locks)) {
        const v = locks[k];
        if (typeof v === "string")
            migrated[k] = v ? [v] : [];
        else if (Array.isArray(v))
            migrated[k] = v.filter((x) => typeof x === "string");
    }
    return Object.assign(Object.assign({}, config), { propLocks: migrated });
}
function saveConfig(targetId, options) {
    return __awaiter(this, void 0, void 0, function* () {
        var _a, _b, _c, _d, _e;
        const config = {
            options: {
                props: options.props,
                tokens: options.tokens,
                variants: options.variants,
                layout: options.layout,
                anatomy: options.anatomy,
                exemple: options.exemple,
            },
            groupBy: (_a = options.groupBy) !== null && _a !== void 0 ? _a : [],
            excludeRules: (_b = options.excludeRules) !== null && _b !== void 0 ? _b : [],
            propLocks: (_c = options.propLocks) !== null && _c !== void 0 ? _c : {},
            matrixVisualBg: options.matrixVisualBg,
            anatomyVariant: (_d = options.anatomyVariant) !== null && _d !== void 0 ? _d : {},
            anatomyIncludedLayers: options.anatomyIncludedLayers,
            tokenVariant: (_e = options.tokenVariant) !== null && _e !== void 0 ? _e : {},
            tokenIncludedLayers: options.tokenIncludedLayers,
            anatomyConfigured: options.anatomyConfigured === true,
            tokensConfigured: options.tokensConfigured === true,
            includeSlots: options.includeSlots === true,
        };
        try {
            yield figma.clientStorage.setAsync(CONFIG_KEY_PREFIX + targetId, config);
        }
        catch (_f) {
            // Best-effort — don't surface errors to the user.
        }
    });
}
figma.showUI(__html__, { width: 488, height: 860 });
const ONBOARDED_KEY = "docyourprops:onboarded";
// Global LLM config (endpoint, model, apiKey). Shared across all components —
// not scoped per-target like CONFIG_KEY_PREFIX.
const LLM_CONFIG_KEY = "docyourcomp:llm-config";
function loadLlmConfig() {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            const raw = yield figma.clientStorage.getAsync(LLM_CONFIG_KEY);
            if (raw && typeof raw === "object")
                return raw;
        }
        catch (_a) {
            /* ignore */
        }
        return null;
    });
}
// Per-component AI artifacts: linked doc frame IDs + LLM-generated descriptions.
const AI_DESCRIPTIONS_KEY_PREFIX = "docyourcomp:ai-descriptions:";
function loadAiDescriptions(targetId) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            const raw = yield figma.clientStorage.getAsync(AI_DESCRIPTIONS_KEY_PREFIX + targetId);
            if (raw && typeof raw === "object")
                return raw;
        }
        catch (_a) {
            /* ignore */
        }
        return null;
    });
}
function saveAiDescriptions(targetId, data) {
    return __awaiter(this, void 0, void 0, function* () {
        yield figma.clientStorage.setAsync(AI_DESCRIPTIONS_KEY_PREFIX + targetId, data);
    });
}
// Global corpus of `.md` documents the user imported into the Chat tab — fed
// to the LLM as the only source of truth for Q&A.
const CHAT_DOCS_KEY = "docyourcomp:chat-docs";
function loadChatDocs() {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            const raw = yield figma.clientStorage.getAsync(CHAT_DOCS_KEY);
            if (Array.isArray(raw))
                return raw;
        }
        catch (_a) {
            /* ignore */
        }
        return [];
    });
}
// Listen-mode state: while true, selectionchange feeds the UI a doc-frame
// candidate instead of triggering the normal sendSelection() pipeline.
let aiListenForDocFrames = false;
let aiListenTargetId = null;
function sendDocFrameCandidate() {
    return __awaiter(this, void 0, void 0, function* () {
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
        let preview = null;
        try {
            const bytes = yield node.exportAsync({
                format: "PNG",
                constraint: { type: "SCALE", value: 0.5 },
            });
            preview = figma.base64Encode(bytes);
        }
        catch (_a) {
            preview = null;
        }
        figma.ui.postMessage({
            type: "ai-link-doc-candidate",
            data: { id: node.id, name: node.name, type: node.type, preview },
        });
    });
}
function sendInit() {
    return __awaiter(this, void 0, void 0, function* () {
        let onboarded = true;
        try {
            const v = yield figma.clientStorage.getAsync(ONBOARDED_KEY);
            onboarded = v === true;
        }
        catch (_a) {
            /* fail silently — better to skip onboarding than spam the user */
        }
        figma.ui.postMessage({ type: "init", onboarded });
    });
}
figma.on("selectionchange", () => {
    combosCache = null; // stale once the target changes
    // The Analyse tab tracks the raw selection independently of the
    // component-scoped `selection` broadcast — keep it live even in listen mode.
    void sendAnalyseSelection();
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
void sendAnalyseSelection();
figma.ui.onmessage = (msg) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k;
    if (msg.type === "capture-screen") {
        const sel = figma.currentPage.selection;
        if (sel.length !== 1) {
            figma.ui.postMessage({
                type: "screen-capture-error",
                message: sel.length === 0
                    ? "Sélectionne un écran (frame ou section de haut niveau)."
                    : "Sélectionne un seul écran à la fois.",
            });
            return;
        }
        const node = sel[0];
        if (!isAnalysableScreen(node)) {
            figma.ui.postMessage({
                type: "screen-capture-error",
                message: "L'élément sélectionné n'est pas un écran : choisis une frame ou une section de haut niveau.",
            });
            return;
        }
        try {
            const res = yield extractAiDocs([node]);
            const image = res.frames.length > 0 ? (_a = res.frames[0].image) !== null && _a !== void 0 ? _a : null : null;
            // The screenshot is sent separately; strip the per-frame images so the
            // structure half stays a lean text payload.
            for (const f of res.frames) {
                delete f.image;
                delete f.imageError;
            }
            const components = yield collectScreenComponents(node);
            let screenCss = null;
            try {
                if ("getCSSAsync" in node) {
                    screenCss = yield node.getCSSAsync();
                }
            }
            catch (_l) {
                screenCss = null;
            }
            figma.ui.postMessage({
                type: "screen-captured",
                data: {
                    node: {
                        id: node.id,
                        name: node.name,
                        type: node.type,
                        width: "width" in node ? node.width : 0,
                        height: "height" in node ? node.height : 0,
                    },
                    structure: res,
                    image,
                    textFallback: res.textFallback,
                    editableTexts: collectScreenTextLayers(node),
                    components,
                    screenCss,
                },
            });
        }
        catch (e) {
            figma.ui.postMessage({
                type: "screen-capture-error",
                message: e instanceof Error ? e.message : String(e),
            });
        }
        return;
    }
    if (msg.type === "apply-fix") {
        const seq = (_b = msg.seq) !== null && _b !== void 0 ? _b : 0;
        const fail = (code, message) => figma.ui.postMessage({ type: "fix-error", seq, ok: false, code, message });
        const fix = msg.fix;
        if (!msg.screenId || !msg.nodeKey || !fix || typeof fix.type !== "string") {
            fail("failed", "Requête de correction invalide.");
            return;
        }
        const root = yield figma.getNodeByIdAsync(msg.screenId);
        if (!root || !("type" in root)) {
            fail("screen-not-found", "L'écran analysé est introuvable. Relance l'analyse.");
            return;
        }
        const target = resolveLayerByKey(root, msg.nodeKey);
        if (!target) {
            fail("node-not-found", "Le calque ciblé est introuvable — l'écran a été modifié depuis l'analyse. Relance l'analyse.");
            return;
        }
        // Locked guard: target or any ancestor up to the analyzed root.
        let cur = target;
        while (cur) {
            if ("locked" in cur && cur.locked) {
                fail("locked", "Le calque (ou un parent) est verrouillé.");
                return;
            }
            if (cur.id === root.id)
                break;
            cur = cur.parent;
        }
        const trunc = (s) => s.length > 60 ? s.slice(0, 60) + "…" : s;
        try {
            let summary = "";
            if (fix.type === "setText") {
                if (target.type !== "TEXT") {
                    fail("type-mismatch", "Le calque ciblé n'est pas un texte.");
                    return;
                }
                const before = target.characters || "";
                const value = String((_c = fix.value) !== null && _c !== void 0 ? _c : "");
                yield applyTextLayerOverride(target, value);
                summary =
                    'Texte mis à jour : « ' +
                        trunc(before) +
                        ' » → « ' +
                        trunc(value) +
                        ' »';
            }
            else if (fix.type === "setProps") {
                if (target.type !== "INSTANCE") {
                    fail("type-mismatch", "Le calque ciblé n'est pas une instance de composant.");
                    return;
                }
                const props = fix.props && typeof fix.props === "object" ? fix.props : {};
                if (Object.keys(props).length === 0) {
                    fail("failed", "Aucune propriété à appliquer.");
                    return;
                }
                const res = yield applyNestedInstanceProps(target, props);
                if (res.applied === 0) {
                    fail("failed", "La propriété n'a pas pu être modifiée (nom ou valeur non reconnu sur ce composant)" +
                        (res.details ? " — " + res.details : "") +
                        ". Vérifie le variant/propriété attendu.");
                    return;
                }
                summary =
                    "Propriétés mises à jour (" +
                        res.applied +
                        "/" +
                        res.requested +
                        ") : " +
                        Object.keys(props)
                            .map((k) => k + " = " + String(props[k]))
                            .join(", ");
            }
            else {
                fail("unsupported", "Type de correction non pris en charge.");
                return;
            }
            figma.currentPage.selection = [target];
            figma.viewport.scrollAndZoomIntoView([target]);
            figma.ui.postMessage({ type: "fix-applied", seq, ok: true, summary });
        }
        catch (e) {
            fail("failed", e instanceof Error ? e.message : String(e));
        }
        return;
    }
    if (msg.type === "ai-extract") {
        const target = yield resolveTarget();
        if (!target) {
            figma.ui.postMessage({
                type: "ai-extract-error",
                message: "Sélectionne un composant.",
            });
            return;
        }
        const docFrameIds = Array.isArray(msg.docFrameIds) ? msg.docFrameIds : [];
        const docFrames = [];
        for (const id of docFrameIds) {
            const node = yield figma.getNodeByIdAsync(id);
            if (node &&
                (node.type === "FRAME" || node.type === "SECTION" || node.type === "GROUP")) {
                docFrames.push(node);
            }
        }
        try {
            const payload = yield buildAiPayload(target, docFrames);
            figma.ui.postMessage({ type: "ai-extract-ready", data: payload });
        }
        catch (e) {
            figma.ui.postMessage({
                type: "ai-extract-error",
                message: e instanceof Error ? e.message : String(e),
            });
        }
        return;
    }
    if (msg.type === "detect-repetition") {
        const target = yield resolveTarget();
        if (!target) {
            figma.ui.postMessage({
                type: "repetition-error",
                message: "Sélectionne un composant.",
            });
            return;
        }
        try {
            const { base, booleanPayload } = getAnatomyBaseAndOverrides(target, msg.anatomyVariant);
            if (!base) {
                figma.ui.postMessage({
                    type: "repetition-error",
                    message: "Aucun composant à analyser.",
                });
                return;
            }
            const probe = base.createInstance();
            if (Object.keys(booleanPayload).length > 0) {
                try {
                    probe.setProperties(booleanPayload);
                }
                catch (_m) {
                    /* invalid combo — keep default state */
                }
            }
            const result = detectRepeatedSiblingGroups(probe);
            const groups = buildRepetitionPayload(probe, result.groups, target.name);
            probe.remove();
            figma.ui.postMessage({ type: "repetition-detected", groups });
        }
        catch (e) {
            figma.ui.postMessage({
                type: "repetition-error",
                message: e instanceof Error ? e.message : String(e),
            });
        }
        return;
    }
    if (msg.type === "detect-anchor-candidates") {
        const target = yield resolveTarget();
        if (!target) {
            figma.ui.postMessage({
                type: "anchor-candidates-error",
                message: "Sélectionne un composant.",
            });
            return;
        }
        try {
            const out = {
                anatomy: { items: [], image: null },
                tokens: { items: [], image: null },
            };
            const snapImage = (probe) => __awaiter(void 0, void 0, void 0, function* () {
                try {
                    const s = Math.min(1, AI_IMAGE_MAX_DIMENSION /
                        Math.max(1, probe.width, probe.height));
                    const bytes = yield probe.exportAsync({
                        format: "PNG",
                        constraint: { type: "SCALE", value: s },
                    });
                    if (bytes.byteLength > AI_IMAGE_MAX_BYTES)
                        return null;
                    return {
                        mediaType: "image/png",
                        base64: figma.base64Encode(bytes),
                        scale: s,
                        compW: Math.round(probe.width),
                        compH: Math.round(probe.height),
                    };
                }
                catch (_a) {
                    return null;
                }
            });
            const an = getAnatomyBaseAndOverrides(target, msg.anatomyVariant);
            if (an.base) {
                const probe = an.base.createInstance();
                if (Object.keys(an.booleanPayload).length > 0) {
                    try {
                        probe.setProperties(an.booleanPayload);
                    }
                    catch (_o) {
                        /* keep default */
                    }
                }
                const rep = resolveRepetition(probe, {});
                let layers;
                const inc = Array.isArray(msg.anatomyIncludedLayers)
                    ? new Set(msg.anatomyIncludedLayers)
                    : null;
                if (inc) {
                    layers = findAllVisibleLayersWithPositions(probe)
                        .filter((l) => inc.has(l.key) && !rep.isRedundant(l.key))
                        .slice(0, ANATOMY_MAX_LAYERS);
                }
                else {
                    layers = findNamedLayersOnInstance(probe, rep);
                }
                if (!msg.includeSlots) {
                    layers = layers.filter((l) => !isSlotLayerName(l.node.name));
                }
                for (const l of layers) {
                    const cands = collectAnchorCandidates(probe, l.key);
                    if (cands.length > 1)
                        out.anatomy.items.push({ anchorKey: l.key, candidates: cands });
                }
                if (out.anatomy.items.length > 0)
                    out.anatomy.image = yield snapImage(probe);
                probe.remove();
            }
            const tk = getAnatomyBaseAndOverrides(target, msg.tokenVariant);
            if (tk.base) {
                const probe = tk.base.createInstance();
                if (Object.keys(tk.booleanPayload).length > 0) {
                    try {
                        probe.setProperties(tk.booleanPayload);
                    }
                    catch (_p) {
                        /* keep default */
                    }
                }
                const rep = resolveRepetition(probe, {});
                const incSet = Array.isArray(msg.tokenIncludedLayers)
                    ? new Set(msg.tokenIncludedLayers)
                    : null;
                const keys = [];
                const seen = new Set();
                const consider = (k) => {
                    if (k === "root" || seen.has(k))
                        return;
                    if (rep.isRedundant(k))
                        return;
                    if (incSet && !isAnchorInScope(k, incSet))
                        return;
                    seen.add(k);
                    keys.push(k);
                };
                for (const u of collectVariableUsagesOnInstance(probe))
                    consider(u.anchorKey);
                for (const u of collectTextStyleUsagesOnInstance(probe))
                    consider(u.anchorKey);
                for (const k of keys) {
                    const cands = collectAnchorCandidates(probe, k);
                    if (cands.length > 1)
                        out.tokens.items.push({ anchorKey: k, candidates: cands });
                }
                if (out.tokens.items.length > 0)
                    out.tokens.image = yield snapImage(probe);
                probe.remove();
            }
            figma.ui.postMessage({ type: "anchor-candidates", data: out });
        }
        catch (e) {
            figma.ui.postMessage({
                type: "anchor-candidates-error",
                message: e instanceof Error ? e.message : String(e),
            });
        }
        return;
    }
    if (msg.type === "get-llm-config") {
        const cfg = yield loadLlmConfig();
        figma.ui.postMessage({ type: "llm-config", data: cfg });
        return;
    }
    if (msg.type === "save-llm-config") {
        try {
            yield figma.clientStorage.setAsync(LLM_CONFIG_KEY, msg.data || {});
            figma.ui.postMessage({ type: "llm-config-saved", ok: true });
        }
        catch (e) {
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
        const t = yield resolveTarget();
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
                const locked = yield figma.getNodeByIdAsync(aiListenTargetId);
                if (locked && "type" in locked) {
                    figma.currentPage.selection = [locked];
                }
            }
            catch (_q) {
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
        const data = yield loadAiDescriptions(msg.targetId);
        figma.ui.postMessage({ type: "ai-descriptions", data });
        return;
    }
    if (msg.type === "save-ai-descriptions") {
        if (!msg.targetId) {
            figma.ui.postMessage({ type: "ai-descriptions-saved", ok: false, message: "No targetId" });
            return;
        }
        try {
            yield saveAiDescriptions(msg.targetId, msg.data || {});
            figma.ui.postMessage({ type: "ai-descriptions-saved", ok: true });
        }
        catch (e) {
            figma.ui.postMessage({
                type: "ai-descriptions-saved",
                ok: false,
                message: e instanceof Error ? e.message : String(e),
            });
        }
        return;
    }
    if (msg.type === "get-chat-docs") {
        const docs = yield loadChatDocs();
        figma.ui.postMessage({ type: "chat-docs", data: docs });
        return;
    }
    if (msg.type === "save-chat-docs") {
        try {
            const data = Array.isArray(msg.data) ? msg.data : [];
            yield figma.clientStorage.setAsync(CHAT_DOCS_KEY, data);
            figma.ui.postMessage({ type: "chat-docs-saved", ok: true });
        }
        catch (e) {
            figma.ui.postMessage({
                type: "chat-docs-saved",
                ok: false,
                message: e instanceof Error ? e.message : String(e),
            });
        }
        return;
    }
    const defaultOptions = {
        props: true,
        tokens: true,
        variants: true,
        layout: false,
        anatomy: false,
        exemple: false,
        anatomyVariant: {},
        tokenVariant: {},
    };
    if (msg.type === "fetch-anatomy-layers") {
        const target = yield resolveTarget();
        const layers = target ? previewAnatomyLayers(target, msg.anatomyVariant) : [];
        figma.ui.postMessage({ type: "anatomy-layers", layers, seq: (_d = msg.seq) !== null && _d !== void 0 ? _d : 0 });
        return;
    }
    if (msg.type === "fetch-tokens-layers") {
        const target = yield resolveTarget();
        const layers = target ? previewTokensLayers(target, msg.tokenVariant) : { tree: [], autoSelected: [] };
        figma.ui.postMessage({ type: "tokens-layers", layers, seq: (_e = msg.seq) !== null && _e !== void 0 ? _e : 0 });
        return;
    }
    if (msg.type === "generate-doc") {
        const target = yield resolveTarget();
        if (!target) {
            figma.notify("Sélectionnez un composant.", { error: true });
            figma.ui.postMessage({ type: "generation-error" });
            return;
        }
        const opts = (_f = msg.options) !== null && _f !== void 0 ? _f : defaultOptions;
        const ai = yield loadAiDescriptions(target.id);
        if (ai) {
            if (ai.propDescriptions)
                opts.propDescriptions = ai.propDescriptions;
            if (ai.generalDescription)
                opts.generalDescription = ai.generalDescription;
            if (ai.repetitionGroups)
                opts.repetitionGroups = ai.repetitionGroups;
            if (ai.anchorTargets)
                opts.anchorTargets = ai.anchorTargets;
            if (ai.exemples)
                opts.exemples = ai.exemples;
        }
        resetGenerationWarnings();
        try {
            yield generateDoc(target, opts);
            void saveConfig(target.id, opts);
            const summary = summarizeWarnings();
            const message = summary
                ? `Documentation créée — ${generationWarnings.length} avertissement(s) : ${summary}`
                : "Documentation créée";
            figma.notify(message, { timeout: summary ? 4500 : 1800 });
            const doc = yield buildDocAsObject(target, opts);
            const markdownContent = buildMarkdown(doc);
            const safeName = target.name.replace(/[\\/:*?"<>|]/g, "_");
            figma.ui.postMessage({ type: "generation-done", markdown: markdownContent, componentName: safeName });
        }
        catch (e) {
            figma.notify(`Erreur: ${e.message}`, { error: true });
            figma.ui.postMessage({ type: "generation-error" });
        }
    }
    else if (msg.type === "export-pdf") {
        const target = yield resolveTarget();
        if (!target) {
            figma.notify("Sélectionnez un composant.", { error: true });
            figma.ui.postMessage({ type: "pdf-error" });
            return;
        }
        const opts = (_g = msg.options) !== null && _g !== void 0 ? _g : defaultOptions;
        const ai = yield loadAiDescriptions(target.id);
        if (ai) {
            if (ai.propDescriptions)
                opts.propDescriptions = ai.propDescriptions;
            if (ai.generalDescription)
                opts.generalDescription = ai.generalDescription;
            if (ai.repetitionGroups)
                opts.repetitionGroups = ai.repetitionGroups;
            if (ai.anchorTargets)
                opts.anchorTargets = ai.anchorTargets;
            if (ai.exemples)
                opts.exemples = ai.exemples;
        }
        resetGenerationWarnings();
        try {
            yield exportAsPdf(target, opts);
            void saveConfig(target.id, opts);
            // Note: the `pdf-export` event already drives the UI to restore the
            // button state — no separate done event needed here. The PDF "ready"
            // notification is emitted from inside exportAsPdf.
            const summary = summarizeWarnings();
            if (summary) {
                figma.notify(`PDF prêt — ${generationWarnings.length} avertissement(s) : ${summary}`, { timeout: 4500 });
            }
        }
        catch (e) {
            figma.notify(`Erreur PDF : ${e.message}`, { error: true });
            figma.ui.postMessage({ type: "pdf-error" });
        }
    }
    else if (msg.type === "export-markdown" || msg.type === "export-json") {
        const target = yield resolveTarget();
        if (!target) {
            figma.notify("Sélectionnez un composant.", { error: true });
            figma.ui.postMessage({ type: "export-error" });
            return;
        }
        const opts = (_h = msg.options) !== null && _h !== void 0 ? _h : defaultOptions;
        const ai = yield loadAiDescriptions(target.id);
        if (ai) {
            if (ai.propDescriptions)
                opts.propDescriptions = ai.propDescriptions;
            if (ai.generalDescription)
                opts.generalDescription = ai.generalDescription;
            if (ai.repetitionGroups)
                opts.repetitionGroups = ai.repetitionGroups;
            if (ai.anchorTargets)
                opts.anchorTargets = ai.anchorTargets;
            if (ai.exemples)
                opts.exemples = ai.exemples;
        }
        resetGenerationWarnings();
        try {
            const doc = yield buildDocAsObject(target, opts);
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
            }
            else {
                const content = JSON.stringify(doc, null, 2);
                figma.ui.postMessage({
                    type: "download",
                    content,
                    filename: `${safeName}.json`,
                    mime: "application/json;charset=utf-8",
                });
                figma.notify("JSON prêt au téléchargement");
            }
        }
        catch (e) {
            figma.notify(`Erreur export : ${e.message}`, { error: true });
            figma.ui.postMessage({ type: "export-error" });
        }
    }
    else if (msg.type === "clear-config") {
        const target = yield resolveTarget();
        if (target) {
            try {
                yield figma.clientStorage.deleteAsync(CONFIG_KEY_PREFIX + target.id);
            }
            catch (_r) {
                /* best effort */
            }
        }
    }
    else if (msg.type === "set-onboarded") {
        try {
            yield figma.clientStorage.setAsync(ONBOARDED_KEY, true);
        }
        catch (_s) {
            /* best effort */
        }
    }
    else if (msg.type === "regen-section") {
        const target = yield resolveTarget();
        if (!target || typeof msg.section !== "string")
            return;
        const opts = (_j = msg.options) !== null && _j !== void 0 ? _j : defaultOptions;
        resetGenerationWarnings();
        try {
            yield regenSection(target, msg.section, opts);
            void saveConfig(target.id, opts);
            const summary = summarizeWarnings();
            figma.notify(summary
                ? `Section regénérée — ${generationWarnings.length} avertissement(s) : ${summary}`
                : "Section regénérée", { timeout: summary ? 4500 : 1800 });
            figma.ui.postMessage({ type: "generation-done" });
        }
        catch (e) {
            figma.notify(`Erreur: ${e.message}`, { error: true });
            figma.ui.postMessage({ type: "generation-error" });
        }
    }
    else if (msg.type === "fetch-doc-index") {
        // Scan the current page for all generated sheets and group them by the
        // component they document. Returns the list to the UI for navigation.
        const sheets = figma.currentPage.findAll((n) => n.getPluginData("docyourprops:component") !== "");
        const byTarget = new Map();
        for (const s of sheets) {
            const tid = s.getPluginData("docyourprops:component");
            const section = s.getPluginData("docyourprops:section");
            const entry = (_k = byTarget.get(tid)) !== null && _k !== void 0 ? _k : { sections: new Set(), sheets: [] };
            if (section)
                entry.sections.add(section);
            entry.sheets.push(s);
            byTarget.set(tid, entry);
        }
        const items = [];
        for (const [tid, entry] of byTarget.entries()) {
            let name = "Composant supprimé";
            let missing = true;
            try {
                const node = yield figma.getNodeByIdAsync(tid);
                if (node && node.removed !== true) {
                    name = node.name;
                    missing = false;
                }
            }
            catch (_t) {
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
            if (a.missing !== b.missing)
                return a.missing ? 1 : -1;
            return a.name.localeCompare(b.name);
        });
        const currentTarget = yield resolveTarget();
        figma.ui.postMessage({
            type: "doc-index",
            items,
            currentTargetId: currentTarget ? currentTarget.id : null,
        });
    }
    else if (msg.type === "locate-component-doc") {
        if (typeof msg.targetId !== "string")
            return;
        const sheets = figma.currentPage.findAll((n) => n.getPluginData("docyourprops:component") === msg.targetId);
        if (sheets.length === 0) {
            figma.notify("Aucune doc trouvée pour ce composant.", { error: true });
            return;
        }
        figma.viewport.scrollAndZoomIntoView(sheets);
    }
    else if (msg.type === "select-component") {
        if (typeof msg.targetId !== "string")
            return;
        let node = null;
        try {
            node = yield figma.getNodeByIdAsync(msg.targetId);
        }
        catch (_u) {
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
            let p = node;
            while (p && p.type !== "PAGE")
                p = p.parent;
            return p && p.type === "PAGE" ? p : null;
        })();
        if (page && page.id !== figma.currentPage.id) {
            try {
                yield figma.setCurrentPageAsync(page);
            }
            catch (_v) {
                // ignore — fall back to current page scrollAndZoom
            }
        }
        figma.currentPage.selection = [node];
        figma.viewport.scrollAndZoomIntoView([node]);
    }
    else if (msg.type === "select-layer") {
        const target = yield resolveTarget();
        if (!target || typeof msg.key !== "string")
            return;
        const root = getBaseComponent(target);
        if (!root)
            return;
        const node = resolveLayerByKey(root, msg.key);
        if (!node) {
            figma.notify("Calque introuvable.", { error: true });
            return;
        }
        figma.currentPage.selection = [node];
        figma.viewport.scrollAndZoomIntoView([node]);
    }
    else if (msg.type === "close") {
        figma.closePlugin();
    }
});
function resolveTarget() {
    return __awaiter(this, void 0, void 0, function* () {
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
            const main = yield node.getMainComponentAsync();
            if (main) {
                if (main.parent && main.parent.type === "COMPONENT_SET")
                    return main.parent;
                return main;
            }
        }
        return null;
    });
}
// Diagnose why resolveTarget returned null so the UI can show a precise hint.
function diagnoseEmptySelection() {
    const sel = figma.currentPage.selection;
    if (sel.length === 0)
        return { reason: "no-selection" };
    if (sel.length > 1)
        return { reason: "multi-selection", count: sel.length };
    return { reason: "wrong-type", nodeType: sel[0].type };
}
function sendSelection() {
    return __awaiter(this, void 0, void 0, function* () {
        const target = yield resolveTarget();
        let payload = null;
        let emptyReason = null;
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
            // Discover which section sheets already exist on the page for this target —
            // used by the UI to show a "regen" button per section.
            const existingSections = [];
            for (const n of figma.currentPage.findAll((x) => x.getPluginData("docyourprops:component") === target.id)) {
                const section = n.getPluginData("docyourprops:section");
                if (section && existingSections.indexOf(section) === -1)
                    existingSections.push(section);
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
        }
        else {
            emptyReason = diagnoseEmptySelection();
        }
        figma.ui.postMessage({ type: "selection", target: payload, emptyReason });
    });
}
// True when `node` is a top-level screen the Analyse tab accepts: a FRAME or
// SECTION sitting directly on a PAGE (rejects nested layers / small groups).
function isAnalysableScreen(node) {
    return ((node.type === "FRAME" || node.type === "SECTION") &&
        node.parent != null &&
        node.parent.type === "PAGE");
}
// Lightweight broadcast so the Analyse tab can enable/disable its run button
// and show the selected screen, independently of the component-scoped
// `selection` message.
function sendAnalyseSelection() {
    return __awaiter(this, void 0, void 0, function* () {
        const sel = figma.currentPage.selection;
        let node = null;
        if (sel.length === 1 && isAnalysableScreen(sel[0])) {
            const n = sel[0];
            node = {
                id: n.id,
                name: n.name,
                type: n.type,
                width: "width" in n ? n.width : 0,
                height: "height" in n ? n.height : 0,
            };
        }
        figma.ui.postMessage({ type: "analyse-selection", node });
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
            return "true / false";
        case "TEXT":
            return "Texte libre";
        case "VARIANT":
            return ((_a = p.variantOptions) !== null && _a !== void 0 ? _a : []).join(", ");
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
        const visualBg = normalizeHex(options.matrixVisualBg);
        const instanceSwapNames = options.props
            ? yield resolveInstanceSwapNames(target.componentPropertyDefinitions)
            : undefined;
        if (options.props && options.variants) {
            const layout = computeAdminCardLayout(target);
            const content = yield buildPropsAndMatrixContent(target, (_a = options.groupBy) !== null && _a !== void 0 ? _a : [], (_b = options.excludeRules) !== null && _b !== void 0 ? _b : [], (_c = options.propLocks) !== null && _c !== void 0 ? _c : {}, layout, visualBg, instanceSwapNames, options.propDescriptions);
            sheets.push(makeAdminSheet(target, "Propriétés", content, layout.sheetW));
        }
        else if (options.props) {
            sheets.push(makeAdminSheet(target, "Propriétés", buildPropsSection(target, ADMIN_CONTENT_WIDTH_DEFAULT, instanceSwapNames, options.propDescriptions)));
        }
        if (options.layout) {
            sheets.push(makeAdminSheet(target, "Layout", buildLayoutSection(target)));
        }
        if (options.anatomy) {
            sheets.push(makeAdminSheet(target, "Anatomie", buildAnatomySection(target, options.anatomyVariant, options.anatomyIncludedLayers, options)));
        }
        if (options.tokens) {
            sheets.push(makeAdminSheet(target, "Design tokens", yield buildTokensSection(target, options.tokenVariant, options.tokenIncludedLayers, options)));
        }
        if (options.exemple) {
            sheets.push(makeAdminSheet(target, "Exemple", yield buildExemplesSection(target, ADMIN_CONTENT_WIDTH_DEFAULT, options.exemples)));
        }
        return sheets;
    });
}
// Find sheets previously generated for this target (tagged via setPluginData),
// remove them, and return the leftmost one's position so the new sheets can
// take its place. Scoped to currentPage for perf — generation always lands here.
function removeExistingSheets(target) {
    const existing = figma.currentPage.findAll((n) => n.getPluginData("docyourprops:component") === target.id);
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
            sheet.setPluginData("docyourprops:component", target.id);
            x += sheet.width + SHEET_GAP;
        }
        figma.currentPage.selection = sheets;
        figma.viewport.scrollAndZoomIntoView(sheets);
    });
}
// Build a single-section variant of `options` so we can reuse `buildSheets`
// to produce just the requested section's sheet (1-element array).
function singleSectionOptions(section, options) {
    const o = Object.assign(Object.assign({}, options), { props: section === "Propriétés", layout: section === "Layout", anatomy: section === "Anatomie", tokens: section === "Design tokens", exemple: section === "Exemple" });
    // For "Propriétés", keep variants in sync with the user's intent — the
    // matrix lives inside the props sheet and the original options.variants
    // already encodes whether to draw it.
    if (section !== "Propriétés")
        o.variants = false;
    return o;
}
// Regenerate one section in place: find the existing tagged sheet (if any),
// build a fresh one with the same options, and place it at the same X/Y.
// Other sections are left untouched.
function regenSection(target, section, options) {
    return __awaiter(this, void 0, void 0, function* () {
        yield loadFonts();
        const allExisting = figma.currentPage.findAll((n) => n.getPluginData("docyourprops:component") === target.id);
        const existingForSection = allExisting.find((s) => s.getPluginData("docyourprops:section") === section);
        const sectionSheets = yield buildSheets(target, singleSectionOptions(section, options));
        const newSheet = sectionSheets[0];
        if (!newSheet) {
            if (existingForSection) {
                figma.notify("Cette section ne génère pas de contenu pour la combinaison choisie.", {
                    error: true,
                });
            }
            return;
        }
        let placeX;
        let placeY;
        if (existingForSection) {
            placeX = existingForSection.x;
            placeY = existingForSection.y;
            existingForSection.remove();
        }
        else if (allExisting.length > 0) {
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
        }
        else {
            placeX = target.x + target.width + 80;
            placeY = target.y;
        }
        figma.currentPage.appendChild(newSheet);
        newSheet.x = placeX;
        newSheet.y = placeY;
        newSheet.setPluginData("docyourprops:component", target.id);
        figma.currentPage.selection = [newSheet];
        figma.viewport.scrollAndZoomIntoView([newSheet]);
    });
}
function exportAsPdf(target, options) {
    return __awaiter(this, void 0, void 0, function* () {
        var _a, _b;
        yield loadFonts();
        const pdfPages = [];
        const instanceSwapNames = options.props
            ? yield resolveInstanceSwapNames(target.componentPropertyDefinitions)
            : undefined;
        if (options.props)
            pdfPages.push(buildPdfPropsPage(target, instanceSwapNames, options.propDescriptions));
        if (options.layout)
            pdfPages.push(buildPdfLayoutPage(target));
        if (options.anatomy)
            pdfPages.push(buildPdfAnatomyPage(target, options.anatomyVariant, options.anatomyIncludedLayers, options));
        if (options.variants)
            pdfPages.push(...(yield buildPdfCombinationsPages(target, (_a = options.excludeRules) !== null && _a !== void 0 ? _a : [], (_b = options.propLocks) !== null && _b !== void 0 ? _b : {}, normalizeHex(options.matrixVisualBg))));
        if (options.tokens)
            pdfPages.push(...(yield buildPdfTokensPage(target, options.tokenVariant, options.tokenIncludedLayers, options)));
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
function tryLoadFont(font) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            yield figma.loadFontAsync(font);
            return true;
        }
        catch (_a) {
            return false;
        }
    });
}
function loadFonts() {
    return __awaiter(this, void 0, void 0, function* () {
        // Inter is the safe baseline — must succeed.
        yield figma.loadFontAsync({ family: "Inter", style: "Regular" });
        yield figma.loadFontAsync({ family: "Inter", style: "Semi Bold" });
        // Try the reference fonts (Colfax for titles, Roboto for table body).
        // Each weight is independent: a half-loaded family still beats Inter.
        const colfaxRegular = yield tryLoadFont({ family: "Colfax", style: "Regular" });
        const colfaxMedium = yield tryLoadFont({ family: "Colfax", style: "Medium" });
        const robotoRegular = yield tryLoadFont({ family: "Roboto", style: "Regular" });
        const robotoMedium = yield tryLoadFont({ family: "Roboto", style: "Medium" });
        const robotoBold = yield tryLoadFont({ family: "Roboto", style: "Bold" });
        const interBold = yield tryLoadFont({ family: "Inter", style: "Bold" });
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
// PDF page header — same admin layout as the on-canvas sheet (breadcrumb +
// title + bottom divider), constrained to PDF_CONTENT_W. An optional tag
// renders next to the title (used for the combo count on the matrix pages).
function makePdfHeader(componentName, sectionTitle, tag) {
    return makeAdminSheetHeader(componentName, sectionTitle, PDF_CONTENT_W, tag);
}
// Gap between the admin header (which has a built-in 16px paddingBottom on
// its title row + divider) and the page body content.
const PDF_BODY_GAP = 24;
function buildPdfPropsPage(target, instanceSwapNames, propDescriptions) {
    const page = makePdfPage();
    const header = makePdfHeader(target.name, "Propriétés");
    page.appendChild(header);
    header.x = PDF_MARGIN;
    header.y = PDF_MARGIN;
    const contentY = PDF_MARGIN + header.height + PDF_BODY_GAP;
    const props = extractProps(target);
    if (props.length > 0) {
        const table = makeAdminTable(PROP_COL_HEADERS, PDF_PROP_COL_WIDTHS_A4, props.map((p) => {
            const display = displayPropName(p);
            return [
                display,
                pickPropDescription(p.name, display, propDescriptions),
                makeTypeChip(p.type),
                makeBulletList(valuesAsItems(p, instanceSwapNames)),
            ];
        }));
        page.appendChild(table);
        table.x = PDF_MARGIN;
        table.y = contentY;
    }
    return page;
}
function buildPdfCombinationsPages(target, excludeRules, propLocks, visualBg) {
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
        // Same admin card style as on-canvas, but cards-per-row is derived from the
        // fixed PDF content width (515) instead of fixed at 3.
        const layout = computeAdminCardLayoutForFixedWidth(target, PDF_CONTENT_W);
        const cardsPerRow = Math.max(1, Math.floor((layout.contentW + ADMIN_GRID_GAP) / (layout.cardW + ADMIN_GRID_GAP)));
        const boolishAxes = new Set();
        for (const a of allAxes) {
            if (a.propType === "BOOLEAN" || isBoolishOptions(a.options))
                boolishAxes.add(a.name);
        }
        const validCards = yield buildAllAdminCards(combos, base, layout, boolishAxes, visualBg);
        if (validCards.length === 0)
            return [emptyPage()];
        // Card height is identical for every card (shared visualH + propsAreaH).
        const cardH = validCards[0].height;
        const contentMaxY = PDF_H - PDF_MARGIN - 16;
        const tagLabel = `${combos.length} combinaison${combos.length > 1 ? "s" : ""}`;
        const pages = [];
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
    });
}
function buildPdfTokensPage(target, variantSel, includedLayers, opts) {
    return __awaiter(this, void 0, void 0, function* () {
        const page = makePdfPage();
        const header = makePdfHeader(target.name, "Design tokens");
        page.appendChild(header);
        header.x = PDF_MARGIN;
        header.y = PDF_MARGIN;
        const contentY = PDF_MARGIN + header.height + PDF_BODY_GAP;
        const body = yield buildTokensSectionForWidth(target, PDF_CONTENT_W, variantSel, includedLayers, opts);
        page.appendChild(body);
        body.x = PDF_MARGIN;
        body.y = contentY;
        return [page];
    });
}
// Format a LayoutRow value (string or SceneNode) into a flat string for export.
function flattenLayoutValue(v) {
    if (typeof v === "string")
        return v;
    // A SceneNode — use its .name as best-effort label, or "(node)" if missing.
    const node = v;
    return node.name || "(node)";
}
function buildDocAsObject(target, options) {
    return __awaiter(this, void 0, void 0, function* () {
        var _a, _b;
        const base = getBaseComponent(target);
        const baseW = base ? base.width : 0;
        const baseH = base ? base.height : 0;
        const props = extractProps(target);
        const axes = yield eligibleAxes(target.componentPropertyDefinitions);
        const combinationCount = axes.length > 0 ? cachedEnumerateValidCombinations(target, axes).combos.length : 0;
        const instanceSwapNames = options.props
            ? yield resolveInstanceSwapNames(target.componentPropertyDefinitions)
            : undefined;
        const doc = {
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
            const sections = {};
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
            const { base: probedBase, booleanPayload } = getAnatomyBaseAndOverrides(target, options.anatomyVariant);
            if (probedBase) {
                const probe = probedBase.createInstance();
                if (Object.keys(booleanPayload).length > 0) {
                    try {
                        probe.setProperties(booleanPayload);
                    }
                    catch (_c) {
                        /* keep default state */
                    }
                }
                const rep = resolveRepetition(probe, options);
                let layers;
                if (options.anatomyIncludedLayers !== undefined) {
                    const inc = new Set(options.anatomyIncludedLayers);
                    layers = findAllVisibleLayersWithPositions(probe).filter((l) => inc.has(l.key) && !rep.isRedundant(l.key));
                    if (layers.length > ANATOMY_MAX_LAYERS)
                        layers = layers.slice(0, ANATOMY_MAX_LAYERS);
                }
                else {
                    layers = findNamedLayersOnInstance(probe, rep);
                }
                if (!options.includeSlots) {
                    layers = layers.filter((l) => !isSlotLayerName(l.node.name));
                }
                doc.anatomy = layers.map((l) => l.node.name).filter((n) => n.length > 0);
                probe.remove();
            }
        }
        if (options.tokens && base) {
            const { base: tBase, booleanPayload: tBool } = getAnatomyBaseAndOverrides(target, options.tokenVariant);
            if (tBase) {
                const probe = tBase.createInstance();
                if (Object.keys(tBool).length > 0) {
                    try {
                        probe.setProperties(tBool);
                    }
                    catch (_d) {
                        /* keep default state */
                    }
                }
                const rep = resolveRepetition(probe, options);
                let varUsages = collectVariableUsagesOnInstance(probe);
                let styleUsages = collectTextStyleUsagesOnInstance(probe);
                probe.remove();
                varUsages = varUsages.filter((u) => u.anchorKey === "root" || !rep.isRedundant(u.anchorKey));
                styleUsages = styleUsages.filter((u) => u.anchorKey === "root" || !rep.isRedundant(u.anchorKey));
                if (options.tokenIncludedLayers !== undefined) {
                    const inc = new Set(options.tokenIncludedLayers);
                    varUsages = varUsages.filter((u) => isAnchorInScope(u.anchorKey, inc));
                    styleUsages = styleUsages.filter((u) => isAnchorInScope(u.anchorKey, inc));
                }
                const varIds = new Set();
                for (const u of varUsages)
                    varIds.add(u.variableId);
                const varInfo = yield resolveVariableInfo(varIds);
                const styleIds = new Set();
                for (const u of styleUsages)
                    styleIds.add(u.styleId);
                const styleInfo = yield resolveTextStyleInfo(styleIds);
                // Dedupe by id (count usages).
                const colorMap = new Map();
                for (const u of varUsages) {
                    const info = varInfo.get(u.variableId);
                    if (!info || info.type !== "COLOR")
                        continue;
                    const cur = (_a = colorMap.get(u.variableId)) !== null && _a !== void 0 ? _a : {
                        name: info.name,
                        collection: info.collection,
                        count: 0,
                    };
                    cur.count++;
                    colorMap.set(u.variableId, cur);
                }
                const typoMap = new Map();
                for (const u of styleUsages) {
                    const info = styleInfo.get(u.styleId);
                    if (!info)
                        continue;
                    const cur = (_b = typoMap.get(u.styleId)) !== null && _b !== void 0 ? _b : { name: info.name, spec: info.spec, count: 0 };
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
    });
}
function escapeMdCell(s) {
    return s.replace(/\|/g, "\\|").replace(/\r?\n/g, " ");
}
function buildMarkdown(doc) {
    const lines = [];
    lines.push(`# ${doc.component.name}`);
    const meta = [
        doc.component.kind === "COMPONENT_SET" ? "Set de variants" : "Composant",
        `${doc.component.propCount} prop${doc.component.propCount !== 1 ? "s" : ""}`,
    ];
    if (doc.component.combinationCount > 0) {
        meta.push(`${doc.component.combinationCount} combinaison${doc.component.combinationCount !== 1 ? "s" : ""}`);
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
            lines.push(`| ${escapeMdCell(p.name)} | ${p.type} | ${escapeMdCell(p.description)} | ${escapeMdCell(values)} |`);
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
// ─── Admin-style sheet (osmose.proginov.com reference) ────────────────────
function makeAdminSheet(target, title, content, sheetWidth = ADMIN_SHEET_WIDTH_DEFAULT) {
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
function makeBreadcrumbIcon() {
    const svg = `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M7.23114 18.4368H3.84808L8.22284 5.56299H11.4968L7.23114 18.4368Z" fill="#0C4790"/><path d="M15.8862 18.4368H12.5038L16.8793 5.56299H20.1518L15.8862 18.4368Z" fill="#0C4790"/></svg>`;
    const node = figma.createNodeFromSvg(svg);
    node.name = "Icon";
    return node;
}
function makeAdminSheetHeader(componentName, categoryTitle, contentWidth = ADMIN_CONTENT_WIDTH_DEFAULT, tag) {
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
    }
    else {
        title.layoutAlign = "STRETCH";
        titleWrap.appendChild(title);
    }
    header.appendChild(titleWrap);
    return header;
}
// A prop is "boolean-like" if it's a real BOOLEAN, or a VARIANT with two
// values matching true/false, on/off, yes/no (any casing). Such props get a
// "Has a " prefix in display contexts.
function isPropBoolish(p) {
    var _a;
    if (p.type === "BOOLEAN")
        return true;
    if (p.type === "VARIANT") {
        const opts = ((_a = p.variantOptions) !== null && _a !== void 0 ? _a : []).map((v) => ({ label: v, value: v }));
        return isBoolishOptions(opts);
    }
    return false;
}
function displayPropName(p) {
    return isPropBoolish(p) ? `Has a ${p.name}` : p.name;
}
// Scale a fixed widths list to a target total while preserving proportions.
// Last column absorbs the rounding remainder so the sum is exact.
function scaleWidths(widths, targetTotal) {
    const total = widths.reduce((a, b) => a + b, 0);
    if (total === targetTotal)
        return widths.slice();
    const scaled = [];
    let acc = 0;
    for (let i = 0; i < widths.length - 1; i++) {
        const w = Math.round((widths[i] * targetTotal) / total);
        scaled.push(w);
        acc += w;
    }
    scaled.push(targetTotal - acc);
    return scaled;
}
function buildPropsSection(target, contentWidth = ADMIN_CONTENT_WIDTH_DEFAULT, instanceSwapNames, propDescriptions) {
    const props = extractProps(target);
    if (props.length === 0)
        return textFrame("Aucune propriété détectée.");
    const widths = scaleWidths(PROP_COL_WIDTHS, contentWidth);
    return makeAdminTable(PROP_COL_HEADERS, widths, props.map((p) => {
        const display = displayPropName(p);
        return [
            display,
            pickPropDescription(p.name, display, propDescriptions),
            makeTypeChip(p.type),
            makeBulletList(valuesAsItems(p, instanceSwapNames)),
        ];
    }));
}
function buildPropsAndMatrixContent(target, groupBy, excludeRules, propLocks, layout, visualBg, instanceSwapNames, propDescriptions) {
    return __awaiter(this, void 0, void 0, function* () {
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
        wrapper.appendChild(buildSubSection("Props list", buildPropsSection(target, layout.contentW, instanceSwapNames, propDescriptions)));
        const variants = yield buildVariantsSection(target, groupBy, excludeRules, propLocks, layout, visualBg);
        const visualTag = variants.comboCount > 0
            ? makeTag(`${variants.comboCount} combinaison${variants.comboCount > 1 ? "s" : ""}`)
            : undefined;
        wrapper.appendChild(buildSubSection("Props visual", variants.node, visualTag));
        return wrapper;
    });
}
function buildSubSection(label, content, tag) {
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
    }
    else {
        section.appendChild(h);
    }
    section.appendChild(content);
    return section;
}
const TAG_PALETTE_BLUE = { bg: "#E6F2FD", fg: "#085FAC" };
const TAG_PALETTE_GREEN = { bg: "#ECF7E8", fg: "#35821B" };
const TAG_PALETTE_PURPLE = { bg: "#F2EFFC", fg: "#614CA2" };
const TAG_PALETTE_ORANGE = { bg: "#FEF0E7", fg: "#B05112" };
const TAG_PALETTE_CYAN = { bg: "#E6F9FF", fg: "#10718D" };
function makeTag(label, palette = TAG_PALETTE_BLUE) {
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
// Resolve metadata (name, type, collection) for each unique variable id.
// Skips ids that don't resolve (library not loaded). Result map uses the
// variable id as key.
function resolveVariableInfo(ids) {
    return __awaiter(this, void 0, void 0, function* () {
        const out = new Map();
        for (const id of ids) {
            try {
                const v = yield figma.variables.getVariableByIdAsync(id);
                if (!v)
                    continue;
                let collName = "—";
                try {
                    const coll = yield figma.variables.getVariableCollectionByIdAsync(v.variableCollectionId);
                    if (coll)
                        collName = coll.name;
                }
                catch (_a) {
                    /* ignore */
                }
                out.set(id, { id, name: v.name, type: v.resolvedType, collection: collName });
            }
            catch (_b) {
                pushGenerationWarning("variable non résolvable");
            }
        }
        return out;
    });
}
// Resolve TextStyle metadata for unique ids. Skips ids that don't resolve to
// a TEXT-typed style (lib not loaded, removed, etc.).
function resolveTextStyleInfo(ids) {
    return __awaiter(this, void 0, void 0, function* () {
        const out = new Map();
        for (const id of ids) {
            try {
                const s = yield figma.getStyleByIdAsync(id);
                if (!s || s.type !== "TEXT")
                    continue;
                const ts = s;
                const fn = ts.fontName;
                const family = typeof fn === "object" ? fn.family : "Mixed";
                const style = typeof fn === "object" ? fn.style : "";
                const size = typeof ts.fontSize === "number" ? `${ts.fontSize} px` : "Mixed";
                const spec = `${family}${style ? " " + style : ""} · ${size}`;
                out.set(id, { id, name: ts.name, spec });
            }
            catch (_a) {
                pushGenerationWarning("style de texte non résolvable");
            }
        }
        return out;
    });
}
// True if `anchorKey` is in `set`, OR any of its ancestor keys is. The "root"
// anchor is special-cased: it's always in scope (always documented).
function isAnchorInScope(anchorKey, set) {
    if (anchorKey === "root")
        return true;
    let cur = anchorKey;
    while (true) {
        if (set.has(cur))
            return true;
        const slash = cur.lastIndexOf("/");
        if (slash === -1)
            return false;
        cur = cur.substring(0, slash);
    }
}
// Walk up `anchorKey`'s ancestor chain and return the first key present in
// the picker `treeKeys` set. Used to surface deep token usages (inside nested
// instances) as auto-selections on the visible parent in the picker tree.
function nearestPickerAncestor(anchorKey, treeKeys) {
    if (anchorKey === "root")
        return null;
    let cur = anchorKey;
    while (true) {
        if (treeKeys.has(cur))
            return cur;
        const slash = cur.lastIndexOf("/");
        if (slash === -1)
            return null;
        cur = cur.substring(0, slash);
    }
}
function buildTokensSectionForWidth(target, contentW, variantSel, includedLayers, opts) {
    return __awaiter(this, void 0, void 0, function* () {
        // Reuse the anatomy variant resolver — for COMPONENT_SET, picks the
        // matching child variant; applies BOOLEAN overrides on the probe.
        const { base, booleanPayload } = getAnatomyBaseAndOverrides(target, variantSel);
        if (!base)
            return textFrame("Aucun composant à analyser.");
        // Walk a probe instance to collect both variable usages (for COLOR tokens)
        // and text-style usages (for typography). The probe is removed once we've
        // snapshotted everything.
        const probe = base.createInstance();
        if (Object.keys(booleanPayload).length > 0) {
            try {
                probe.setProperties(booleanPayload);
            }
            catch (_a) {
                /* invalid combo — keep default state */
            }
        }
        const rep = resolveRepetition(probe, opts);
        let varUsages = collectVariableUsagesOnInstance(probe);
        let styleUsages = collectTextStyleUsagesOnInstance(probe);
        // Resolve LLM-chosen target boxes (Fix B) while the probe is still alive.
        const anchorTargetBoxes = new Map();
        if (opts && opts.anchorTargets) {
            for (const ak of Object.keys(opts.anchorTargets)) {
                const b = boxForKeyOnInstance(probe, opts.anchorTargets[ak]);
                if (b)
                    anchorTargetBoxes.set(ak, b);
            }
        }
        probe.remove();
        // Collapse repeated identical siblings: a token bound on N clones (e.g. each
        // Breadcrumb item) is documented once via the representative. The instance
        // root ("root") has no siblings and is always kept.
        varUsages = varUsages.filter((u) => u.anchorKey === "root" || !rep.isRedundant(u.anchorKey));
        styleUsages = styleUsages.filter((u) => u.anchorKey === "root" || !rep.isRedundant(u.anchorKey));
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
        const uniqueVarIds = new Set();
        for (const u of varUsages)
            uniqueVarIds.add(u.variableId);
        const varInfo = yield resolveVariableInfo(uniqueVarIds);
        const colorUsages = varUsages.filter((u) => {
            const info = varInfo.get(u.variableId);
            return info && info.type === "COLOR";
        });
        // Resolve text style metadata for unique ids.
        const uniqueStyleIds = new Set();
        for (const u of styleUsages)
            uniqueStyleIds.add(u.styleId);
        const styleInfo = yield resolveTextStyleInfo(uniqueStyleIds);
        const validStyleUsages = styleUsages.filter((u) => styleInfo.has(u.styleId));
        if (colorUsages.length === 0 && validStyleUsages.length === 0) {
            if (varUsages.length > 0 || styleUsages.length > 0) {
                return textFrame("Design tokens détectés mais non résolvables (librairie non chargée).");
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
        const tokenAnchorTarget = (u) => {
            var _a;
            const b = anchorTargetBoxes.get(u.anchorKey);
            return b
                ? {
                    targetX: b.x,
                    targetY: b.y,
                    targetW: b.w,
                    targetH: b.h,
                    targetKey: (_a = opts === null || opts === void 0 ? void 0 : opts.anchorTargets) === null || _a === void 0 ? void 0 : _a[u.anchorKey],
                }
                : {
                    targetX: u.anchorTargetX,
                    targetY: u.anchorTargetY,
                    targetW: u.anchorTargetW,
                    targetH: u.anchorTargetH,
                };
        };
        if (colorUsages.length > 0) {
            const anchors = colorUsages.map((u) => (Object.assign({ key: u.anchorKey, localX: u.anchorLocalX, localY: u.anchorLocalY, w: u.anchorW, h: u.anchorH }, tokenAnchorTarget(u))));
            const legendRows = colorUsages.map((u) => {
                const info = varInfo.get(u.variableId);
                return { primary: info.name, secondary: info.collection };
            });
            const block = buildPinnedVisualBlock(base, booleanPayload, anchors, legendRows, contentW, visualW, "TokensVisual·COLOR");
            wrapper.appendChild(buildSubSection("Couleurs", block));
        }
        if (validStyleUsages.length > 0) {
            const anchors = validStyleUsages.map((u) => {
                var _a;
                const b = anchorTargetBoxes.get(u.anchorKey);
                return Object.assign({ key: u.anchorKey, localX: u.anchorLocalX, localY: u.anchorLocalY, w: u.anchorW, h: u.anchorH }, (b
                    ? {
                        targetX: b.x,
                        targetY: b.y,
                        targetW: b.w,
                        targetH: b.h,
                        targetKey: (_a = opts === null || opts === void 0 ? void 0 : opts.anchorTargets) === null || _a === void 0 ? void 0 : _a[u.anchorKey],
                    }
                    : {}));
            });
            const legendRows = validStyleUsages.map((u) => {
                const info = styleInfo.get(u.styleId);
                return { primary: info.name, secondary: info.spec };
            });
            const block = buildPinnedVisualBlock(base, booleanPayload, anchors, legendRows, contentW, visualW, "TokensVisual·TYPOGRAPHY");
            wrapper.appendChild(buildSubSection("Typographie", block));
        }
        return wrapper;
    });
}
function buildTokensSection(target, variantSel, includedLayers, opts) {
    return __awaiter(this, void 0, void 0, function* () {
        return buildTokensSectionForWidth(target, ADMIN_CONTENT_WIDTH_DEFAULT, variantSel, includedLayers, opts);
    });
}
// ─── Layout section ──────────────────────────────────────────────────────────
const LAYOUT_COL_WIDTHS = [220, 416]; // sum = 636 (admin content width)
const LAYOUT_COL_HEADERS = ["Propriété", "Valeur"];
const PDF_LAYOUT_COL_WIDTHS_A4 = [180, 335]; // sum = 515
function fmtPx(n) {
    const r = Math.round(n * 100) / 100;
    return `${r} px`;
}
function fmtPaddingShorthand(node) {
    const t = node.paddingTop;
    const r = node.paddingRight;
    const b = node.paddingBottom;
    const l = node.paddingLeft;
    if (t === r && r === b && b === l)
        return fmtPx(t);
    if (t === b && r === l)
        return `${fmtPx(t)} · ${fmtPx(r)} (V · H)`;
    return `${t} · ${r} · ${b} · ${l} px (T · R · B · L)`;
}
function fmtRadius(node) {
    const cr = node.cornerRadius;
    if (typeof cr === "number")
        return fmtPx(cr);
    // Mixed corners
    const tl = node.topLeftRadius;
    const tr = node.topRightRadius;
    const bl = node.bottomLeftRadius;
    const br = node.bottomRightRadius;
    return `${fmtPx(tl)} · ${fmtPx(tr)} · ${fmtPx(br)} · ${fmtPx(bl)} (TL · TR · BR · BL)`;
}
function fmtConstraint(c) {
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
function fmtSizingMode(m) {
    return m === "FIXED" ? "Fixe" : "Auto (Hug)";
}
function fmtPrimaryAlign(m) {
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
function fmtCounterAlign(m) {
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
function fmtStrokeAlign(a) {
    return a === "INSIDE" ? "Intérieur" : a === "OUTSIDE" ? "Extérieur" : "Centré";
}
function rgbHex(c) {
    const h = (n) => {
        const v = Math.round(Math.max(0, Math.min(1, n)) * 255).toString(16).toUpperCase();
        return v.length === 1 ? "0" + v : v;
    };
    return `#${h(c.r)}${h(c.g)}${h(c.b)}`;
}
function rgbaSummary(c) {
    return c.a < 1 ? `${rgbHex(c)} ${Math.round(c.a * 100)}%` : rgbHex(c);
}
function paintSummary(p) {
    var _a, _b;
    if (p.type === "SOLID") {
        const bound = (_a = p.boundVariables) === null || _a === void 0 ? void 0 : _a.color;
        if (bound)
            return "Variable";
        const c = p.color;
        const a = (_b = p.opacity) !== null && _b !== void 0 ? _b : 1;
        return a < 1 ? `${rgbHex(c)} ${Math.round(a * 100)}%` : rgbHex(c);
    }
    if (p.type === "GRADIENT_LINEAR")
        return "Linear gradient";
    if (p.type === "GRADIENT_RADIAL")
        return "Radial gradient";
    if (p.type === "GRADIENT_ANGULAR")
        return "Angular gradient";
    if (p.type === "GRADIENT_DIAMOND")
        return "Diamond gradient";
    if (p.type === "IMAGE")
        return "Image";
    if (p.type === "VIDEO")
        return "Video";
    return p.type;
}
function fillsSummary(fills) {
    if (fills === figma.mixed)
        return "Mixte";
    const visible = fills.filter((p) => p.visible !== false);
    if (visible.length === 0)
        return "Aucun";
    return visible.map(paintSummary).join(" + ");
}
function strokeSummary(node) {
    if (!node.strokes || node.strokes.length === 0)
        return "Aucun";
    const visible = node.strokes.filter((p) => p.visible !== false);
    if (visible.length === 0)
        return "Aucun";
    const w = node.strokeWeight;
    const weight = typeof w === "number" ? `${w} px` : "Mixte";
    const align = fmtStrokeAlign(node.strokeAlign);
    const color = visible.map(paintSummary).join(" + ");
    const dashed = node.dashPattern && node.dashPattern.length > 0 ? " · pointillés" : "";
    return `${weight} ${align} · ${color}${dashed}`;
}
function effectSummary(e) {
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
            return e.type;
    }
}
function fmtBlendMode(m) {
    if (m === "NORMAL")
        return "Normal";
    if (m === "PASS_THROUGH")
        return "Pass through";
    return m
        .split("_")
        .map((s) => s.charAt(0) + s.slice(1).toLowerCase())
        .join(" ");
}
function dimensionRows(node) {
    const rows = [];
    rows.push(["Dimensions (W × H)", `${fmtPx(node.width)} × ${fmtPx(node.height)}`]);
    if (node.minWidth != null)
        rows.push(["Largeur minimale", fmtPx(node.minWidth)]);
    if (node.maxWidth != null)
        rows.push(["Largeur maximale", fmtPx(node.maxWidth)]);
    if (node.minHeight != null)
        rows.push(["Hauteur minimale", fmtPx(node.minHeight)]);
    if (node.maxHeight != null)
        rows.push(["Hauteur maximale", fmtPx(node.maxHeight)]);
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
function autoLayoutRows(node) {
    const rows = [];
    rows.push(["Direction", node.layoutMode === "HORIZONTAL" ? "Horizontal" : "Vertical"]);
    rows.push(["Padding", fmtPaddingShorthand(node)]);
    const gap = node.primaryAxisAlignItems === "SPACE_BETWEEN" ? "Auto (espace équivalent)" : fmtPx(node.itemSpacing);
    rows.push(["Espacement", gap]);
    rows.push(["Sizing primaire", fmtSizingMode(node.primaryAxisSizingMode)]);
    rows.push(["Sizing secondaire", fmtSizingMode(node.counterAxisSizingMode)]);
    rows.push(["Alignement primaire", fmtPrimaryAlign(node.primaryAxisAlignItems)]);
    rows.push(["Alignement secondaire", fmtCounterAlign(node.counterAxisAlignItems)]);
    if (node.layoutWrap === "WRAP") {
        const cas = node.counterAxisSpacing;
        rows.push(["Wrap", `Oui${cas != null ? ` · gap entre lignes ${fmtPx(cas)}` : ""}`]);
    }
    else {
        rows.push(["Wrap", "Non"]);
    }
    rows.push(["Strokes inclus dans le layout", node.strokesIncludedInLayout ? "Oui" : "Non"]);
    return rows;
}
function visualRows(node) {
    const rows = [];
    rows.push(["Corner radius", fmtRadius(node)]);
    rows.push(["Stroke", strokeSummary(node)]);
    rows.push(["Fill", fillsSummary(node.fills)]);
    if (node.opacity < 1)
        rows.push(["Opacité", `${Math.round(node.opacity * 100)} %`]);
    if (node.blendMode !== "NORMAL" && node.blendMode !== "PASS_THROUGH") {
        rows.push(["Blend mode", fmtBlendMode(node.blendMode)]);
    }
    rows.push(["Clip content", node.clipsContent ? "Oui" : "Non"]);
    return rows;
}
function effectRows(node) {
    const rows = [];
    for (let i = 0; i < node.effects.length; i++) {
        const e = node.effects[i];
        if (e.visible === false)
            continue;
        rows.push([`Effet ${i + 1}`, effectSummary(e)]);
    }
    return rows;
}
function buildLayoutSubSections(node, widths) {
    const wrapper = figma.createFrame();
    wrapper.name = "LayoutBody";
    wrapper.layoutMode = "VERTICAL";
    wrapper.primaryAxisSizingMode = "AUTO";
    wrapper.counterAxisSizingMode = "AUTO";
    wrapper.layoutAlign = "STRETCH";
    wrapper.itemSpacing = 24;
    wrapper.fills = [];
    const tableFrom = (rows) => makeAdminTable(LAYOUT_COL_HEADERS, widths, rows.map((r) => [r[0], r[1]]));
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
function buildLayoutSection(target) {
    const node = getBaseComponent(target);
    if (!node)
        return textFrame("Aucun composant à analyser.");
    return buildLayoutSubSections(node, LAYOUT_COL_WIDTHS);
}
function buildPdfLayoutPage(target) {
    const page = makePdfPage();
    const header = makePdfHeader(target.name, "Layout");
    page.appendChild(header);
    header.x = PDF_MARGIN;
    header.y = PDF_MARGIN;
    const node = getBaseComponent(target);
    if (!node)
        return page;
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
const ANATOMY_BADGE_SIZE = 18;
const ANATOMY_NAME_FONT_SIZE = 13;
const ANATOMY_NAME_LINE_HEIGHT = 18;
// Vibrant purple — picked to contrast strongly with primary-blue components
// so leader lines and badges never blend with the documented design.
const ANATOMY_ACCENT_COLOR = "#A020F0";
const ANATOMY_MAX_LAYERS = 12;
const ANATOMY_MAX_DEPTH = 4;
// Pin placement (badge + leader line) — used by buildPinnedVisualBlock.
const ANATOMY_PIN_LAYER_PADDING = 18; // min gap badge↔layer; also pushes badges
// out so leaders have a visible, clean elbow instead of a tangled stub.
const ANATOMY_PIN_BADGE_GAP = 14; // min gap between two badges (edge-to-edge)
const ANATOMY_PIN_RING_STEP = 14;
const ANATOMY_PIN_MAX_RINGS = 16;
const ANATOMY_PIN_DIRECTIONS = 16;
const ANATOMY_PIN_SEARCH_MARGIN = 120; // how far outside the component pins may extend
const ANATOMY_LEADER_WEIGHT = 1.5;
const ANATOMY_LEADER_DOT_R = 3.5;
// Layer names that don't carry semantic info (auto-generated by Figma).
const GENERIC_LAYER_NAME_RE = /^(Frame|Group|Rectangle|Ellipse|Vector|Line|Polygon|Star|Component|Instance|Slice|Image)\s*\d*$/i;
function isMeaningfulLayerName(name) {
    if (!name || name.length === 0)
        return false;
    if (name.startsWith(".") || name.startsWith("_"))
        return false;
    return !GENERIC_LAYER_NAME_RE.test(name);
}
// "Slot" layers = INSTANCE_SWAP placeholders (Figma names them "Slot" by
// convention). Their pins are noise by default.
function isSlotLayerName(name) {
    return /^slot\b/i.test((name || "").trim());
}
function visibleChildCount(node) {
    if (!("children" in node))
        return 0;
    const cs = node.children;
    let n = 0;
    for (const c of cs)
        if (c.visible !== false)
            n++;
    return n;
}
// Returns true if `node` has any visible component-like reference (INSTANCE,
// nested COMPONENT or COMPONENT_SET) in its subtree, within `maxDepth` levels.
// Used to opt-out of single-child collapse: those references must remain
// documentation targets even when buried inside single-child wrappers.
function hasVisibleInstanceDescendant(node, maxDepth) {
    if (maxDepth <= 0)
        return false;
    if (!("children" in node))
        return false;
    const cs = node.children;
    for (const c of cs) {
        if (c.visible === false)
            continue;
        if (c.type === "INSTANCE" || c.type === "COMPONENT" || c.type === "COMPONENT_SET")
            return true;
        if (hasVisibleInstanceDescendant(c, maxDepth - 1))
            return true;
    }
    return false;
}
function findNamedLayers(root) {
    const out = [];
    const walk = (node, depth) => {
        if (depth > ANATOMY_MAX_DEPTH)
            return;
        if (!("children" in node))
            return;
        const container = node;
        for (const child of container.children) {
            if (child.visible === false)
                continue;
            const childMeaningful = isMeaningfulLayerName(child.name);
            if (childMeaningful)
                out.push(child);
            // Single-child collapse: when a meaningful-named layer wraps exactly
            // one visible layer, the inner content is redundant — keep only this
            // wrapper (the highest level) and stop descending here.
            if (childMeaningful && visibleChildCount(child) === 1)
                continue;
            walk(child, depth + 1);
        }
    };
    walk(root, 0);
    out.sort((a, b) => {
        const aBB = a.absoluteBoundingBox;
        const bBB = b.absoluteBoundingBox;
        if (!aBB || !bBB)
            return 0;
        return aBB.y - bBB.y || aBB.x - bBB.x;
    });
    return out.slice(0, ANATOMY_MAX_LAYERS);
}
// ─── Paint-aware leaf selection (Fix A) ─────────────────────────────────────
// Pure geometry can't tell that the right 80% of a full-width auto-layout row
// is transparent — so "largest visible child" lands the leader in empty
// space. These helpers steer drilling toward children that actually paint
// something (fill / stroke / text / instance), skipping transparent
// spacers/stretch wrappers.
const CONTENT_PROBE_BUDGET = 4;
function isVisiblePaintList(p) {
    if (p === figma.mixed)
        return true;
    if (!Array.isArray(p))
        return false;
    return p.some((paint) => !!paint &&
        paint.visible !== false &&
        (typeof paint.opacity !== "number" ||
            paint.opacity > 0));
}
function nodeIsContent(n) {
    if (n.visible === false)
        return false;
    if (n.type === "TEXT")
        return (n.characters || "").trim().length > 0;
    if (n.type === "INSTANCE" ||
        n.type === "COMPONENT" ||
        n.type === "COMPONENT_SET")
        return true;
    const g = n;
    return isVisiblePaintList(g.fills) || isVisiblePaintList(g.strokes);
}
// True when the node itself, or any descendant within a small budget, paints
// real content. Lets us skip an empty stretch wrapper while still descending
// into a transparent wrapper that *contains* the icon/label.
function hasVisibleContent(n, budget) {
    if (n.visible === false)
        return false;
    if (nodeIsContent(n))
        return true;
    if (budget <= 0 || !("children" in n))
        return false;
    for (const c of n.children) {
        if (hasVisibleContent(c, budget - 1))
            return true;
    }
    return false;
}
// A node that *itself* paints visible content and is not just a container
// wrapping other content (a painted frame holding the real icon/label is a
// container, not a leaf — we recurse into it instead).
function isLeafContentNode(n) {
    if (n.visible === false)
        return false;
    if (n.type === "TEXT")
        return (n.characters || "").trim().length > 0;
    if (n.type === "INSTANCE" ||
        n.type === "COMPONENT" ||
        n.type === "COMPONENT_SET")
        return true;
    const g = n;
    const painted = isVisiblePaintList(g.fills) || isVisiblePaintList(g.strokes);
    if (!painted)
        return false;
    if ("children" in n) {
        for (const c of n.children) {
            if (hasVisibleContent(c, 2))
                return false;
        }
    }
    return true;
}
// Tight union box of the descendant leaves that actually paint something
// (icon + label cluster), in the given origin space. Background-like leaves
// (≥ 80% of the node's area — full-bleed rects / stretch wrappers) are
// dropped so the leader aims at the real content, not the geometric centre
// of a transparent full-width row. Falls back to the node box when nothing
// qualifies.
// Tight box of what a node actually RENDERS (ink: glyphs, painted pixels —
// honours text alignment / partial fill / a text frame larger than its
// text), expressed in the SAME instance-local space as the accumulated
// walk (i.e. relative to `root`'s top-left). null when nothing is rendered
// or coords aren't available → caller keeps the geometric box.
function tightLocalBox(n, root) {
    const rb = n
        .absoluteRenderBounds;
    const ab = root
        .absoluteBoundingBox;
    if (!rb || !ab)
        return null;
    return { x: rb.x - ab.x, y: rb.y - ab.y, w: rb.width, h: rb.height };
}
function contentBoundsOf(node, ox, oy, nw, nh, root) {
    const nodeArea = Math.max(1, nw * nh);
    const boxes = [];
    const leafBox = (n, x, y) => {
        const tb = tightLocalBox(n, root);
        if (tb && tb.w > 0 && tb.h > 0)
            return tb;
        const lm = n;
        return { x, y, w: lm.width, h: lm.height };
    };
    const visit = (n, x, y, depth) => {
        if (n.visible === false)
            return;
        if (isLeafContentNode(n)) {
            boxes.push(leafBox(n, x, y));
            return;
        }
        if (depth > 0 && "children" in n) {
            for (const c of n.children) {
                const clm = c;
                visit(c, x + clm.x, y + clm.y, depth - 1);
            }
        }
    };
    if ("children" in node) {
        for (const c of node.children) {
            const clm = c;
            visit(c, ox + clm.x, oy + clm.y, CONTENT_PROBE_BUDGET);
        }
    }
    else if (isLeafContentNode(node)) {
        boxes.push(leafBox(node, ox, oy));
    }
    if (boxes.length === 0)
        return { x: ox, y: oy, w: nw, h: nh };
    const nonBg = boxes.filter((b) => b.w * b.h < 0.8 * nodeArea);
    const use = nonBg.length > 0 ? nonBg : boxes;
    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;
    for (const b of use) {
        if (b.x < minX)
            minX = b.x;
        if (b.y < minY)
            minY = b.y;
        if (b.x + b.w > maxX)
            maxX = b.x + b.w;
        if (b.y + b.h > maxY)
            maxY = b.y + b.h;
    }
    return {
        x: minX,
        y: minY,
        w: Math.max(1, maxX - minX),
        h: Math.max(1, maxY - minY),
    };
}
// Leader target for a documented layer: the tight content cluster inside it
// (icon + label), not a wrapper's geometric centre. Returns coords in the
// SAME local space as the input.
function resolveLeafTarget(wrapper, wrapperLocalX, wrapperLocalY, wrapperW, wrapperH, root) {
    return contentBoundsOf(wrapper, wrapperLocalX, wrapperLocalY, wrapperW, wrapperH, root);
}
// Post-rescale leader retargeting (Fix: scale/auto-layout drift). Given the
// LIVE rescaled instance and an anchor key, walk to the documented node by
// its child-index path (reading actual rescaled positions), then return its
// tight content bounds. Returns null for the instance root / bad path.
function liveTargetRect(inst, key) {
    if (!key || key === "root")
        return null;
    let cur = inst;
    let x = 0;
    let y = 0;
    for (const seg of key.split("/")) {
        if (!("children" in cur))
            return null;
        const idx = parseInt(seg, 10);
        if (!Number.isFinite(idx))
            return null;
        const ch = cur
            .children[idx];
        if (!ch)
            return null;
        const lm = ch;
        x += lm.x;
        y += lm.y;
        cur = ch;
    }
    const clm0 = cur;
    return contentBoundsOf(cur, x, y, clm0.width, clm0.height, inst);
}
// ─── Fix B: LLM-chosen anchor target ────────────────────────────────────────
// Resolve an absolute child-index key (instance-local) to its box on a live
// probe — no leaf drilling: the LLM already picked the exact node. Returns
// null for root / unresolvable paths.
function boxForKeyOnInstance(root, key) {
    if (!key || key === "root")
        return null;
    let cur = root;
    let x = 0;
    let y = 0;
    for (const seg of key.split("/")) {
        if (!("children" in cur))
            return null;
        const idx = parseInt(seg, 10);
        if (!Number.isFinite(idx))
            return null;
        const ch = cur
            .children[idx];
        if (!ch)
            return null;
        const lm = ch;
        x += lm.x;
        y += lm.y;
        cur = ch;
    }
    const tb = tightLocalBox(cur, root);
    if (tb && tb.w > 0 && tb.h > 0)
        return tb;
    const clm = cur;
    return { x, y, w: clm.width, h: clm.height };
}
// Walk the documented node's subtree (bounded) emitting candidates with keys
// in the SAME absolute child-index scheme as anchor keys, so the LLM's pick
// is resolvable via boxForKeyOnInstance.
function collectAnchorCandidates(root, anchorKey) {
    const out = [];
    if (!anchorKey || anchorKey === "root")
        return out;
    // Locate the documented node + its absolute offset.
    let cur = root;
    let baseX = 0;
    let baseY = 0;
    for (const seg of anchorKey.split("/")) {
        if (!("children" in cur))
            return out;
        const idx = parseInt(seg, 10);
        if (!Number.isFinite(idx))
            return out;
        const ch = cur
            .children[idx];
        if (!ch)
            return out;
        const lm = ch;
        baseX += lm.x;
        baseY += lm.y;
        cur = ch;
    }
    const push = (n, key, x, y) => {
        const lm = n;
        const g = n;
        // Prefer the tight render box (where the text/ink actually is) so the
        // box the LLM reasons about matches what it sees in the image.
        const tb = tightLocalBox(n, root);
        const box = tb && tb.w > 0 && tb.h > 0
            ? tb
            : { x, y, w: lm.width, h: lm.height };
        const desc = {
            key,
            name: n.name,
            type: n.type,
            x: Math.round(box.x),
            y: Math.round(box.y),
            w: Math.round(box.w),
            h: Math.round(box.h),
            paint: isVisiblePaintList(g.fills),
            stroke: isVisiblePaintList(g.strokes),
        };
        if (n.type === "TEXT") {
            const t = (n.characters || "").trim();
            if (t)
                desc.text = t.slice(0, 40);
        }
        out.push(desc);
    };
    push(cur, anchorKey, baseX, baseY);
    const recurse = (n, key, x, y, depth) => {
        if (depth <= 0 || out.length >= 20 || !("children" in n))
            return;
        const cs = n.children;
        for (let i = 0; i < cs.length; i++) {
            const c = cs[i];
            if (c.visible === false)
                continue;
            if (out.length >= 20)
                break;
            const lm = c;
            const cx = x + lm.x;
            const cy = y + lm.y;
            const ck = `${key}/${i}`;
            push(c, ck, cx, cy);
            recurse(c, ck, cx, cy, depth - 1);
        }
    };
    recurse(cur, anchorKey, baseX, baseY, 4);
    return out;
}
// AABB intersection with an outer padding (rects considered overlapping if
// they're closer than `padding` on any axis).
function rectsOverlap(a, b, padding) {
    return !(a.x + a.w + padding <= b.x ||
        b.x + b.w + padding <= a.x ||
        a.y + a.h + padding <= b.y ||
        b.y + b.h + padding <= a.y);
}
// Liang-Barsky line-rect intersection. Returns true when segment p1→p2 has any
// portion strictly inside `rect` (used to detect leader lines that cut across
// other documented layers).
function segmentCrossesRect(p1, p2, rect) {
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
            if (q[i] < 0)
                return false;
        }
        else {
            const t = q[i] / p[i];
            if (p[i] < 0) {
                if (t > t1)
                    return false;
                if (t > t0)
                    t0 = t;
            }
            else {
                if (t < t0)
                    return false;
                if (t < t1)
                    t1 = t;
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
function rayToRectEdge(from, to, rect) {
    const dx = to.x - from.x;
    const dy = to.y - from.y;
    if (Math.abs(dx) < 1e-9 && Math.abs(dy) < 1e-9)
        return to;
    const xMin = rect.x;
    const xMax = rect.x + rect.w;
    const yMin = rect.y;
    const yMax = rect.y + rect.h;
    let best = Infinity;
    const consider = (t, x, y) => {
        if (t < 0 || t > 1)
            return;
        if (x < xMin - 1e-6 || x > xMax + 1e-6)
            return;
        if (y < yMin - 1e-6 || y > yMax + 1e-6)
            return;
        if (t < best)
            best = t;
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
    if (!isFinite(best))
        return to;
    return { x: from.x + best * dx, y: from.y + best * dy };
}
function pointToSegmentDistance(pt, a, b) {
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const len2 = dx * dx + dy * dy;
    if (len2 < 1e-9) {
        const ex = pt.x - a.x;
        const ey = pt.y - a.y;
        return Math.sqrt(ex * ex + ey * ey);
    }
    let t = ((pt.x - a.x) * dx + (pt.y - a.y) * dy) / len2;
    if (t < 0)
        t = 0;
    else if (t > 1)
        t = 1;
    const px = a.x + t * dx;
    const py = a.y + t * dy;
    const ex = pt.x - px;
    const ey = pt.y - py;
    return Math.sqrt(ex * ex + ey * ey);
}
// Build a 1px rectangle node oriented from (x1,y1) to (x2,y2). We use a
// rectangle rather than figma.createLine() because rectangle rotation via
// `relativeTransform` is unambiguous (top-left becomes the segment's start).
function makeLeaderLine(x1, y1, x2, y2) {
    const dx = x2 - x1;
    const dy = y2 - y1;
    const len = Math.max(1, Math.sqrt(dx * dx + dy * dy));
    const rad = Math.atan2(dy, dx);
    const line = figma.createRectangle();
    line.name = "Leader";
    line.resize(len, ANATOMY_LEADER_WEIGHT);
    line.cornerRadius = ANATOMY_LEADER_WEIGHT / 2;
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
// Small filled dot at the leader tip (the end that points at the element),
// with a white halo so it stays legible on top of the documented design.
function makeLeaderDot(cx, cy) {
    const r = ANATOMY_LEADER_DOT_R;
    const dot = figma.createEllipse();
    dot.name = "LeaderDot";
    dot.resize(r * 2, r * 2);
    dot.x = cx - r;
    dot.y = cy - r;
    dot.fills = [{ type: "SOLID", color: hex(ANATOMY_ACCENT_COLOR) }];
    dot.strokes = [];
    return dot;
}
function makeAnnotationBadge(n, size) {
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
    f.strokes = [];
    f.effects = [
        {
            type: "DROP_SHADOW",
            color: { r: 0, g: 0, b: 0, a: 0.25 },
            offset: { x: 0, y: 2 },
            radius: 4,
            spread: 0,
            visible: true,
            blendMode: "NORMAL",
        },
    ];
    const t = figma.createText();
    t.fontName = FONT.bodyMed;
    t.fontSize = size <= 18 ? 10 : size <= 22 ? 11 : 12;
    t.lineHeight = { value: size, unit: "PIXELS" };
    t.fills = [{ type: "SOLID", color: { r: 1, g: 1, b: 1 } }];
    t.characters = String(n);
    f.appendChild(t);
    return f;
}
// Single legend row: badge on the left + 1 or 2 stacked text lines on the
// right. Width is fixed at `rowW`, height auto-sizes to content. Frames are
// created with both axes FIXED + non-zero placeholder, then flipped to AUTO
// after appendChild — required to dodge Figma's 1px-collapse (cf. CLAUDE.md).
function makeLegendRow(num, content, rowW) {
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
        t2.characters = content.secondary;
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
function buildPinnedVisualBlock(base, booleanPayload, anchors, legendRows, contentW, visualW, visualName = "PinnedVisual") {
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
        }
        catch (_a) {
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
    const layerRects = [];
    const targetRects = [];
    for (const a of anchors) {
        layerRects.push({
            x: compX + a.localX * fitScale,
            y: a.localY * fitScale,
            w: a.w * fitScale,
            h: a.h * fitScale,
        });
        const hasTarget = typeof a.targetX === "number";
        const tx = hasTarget ? a.targetX : a.localX;
        const ty = hasTarget ? a.targetY : a.localY;
        const tw = hasTarget ? a.targetW : a.w;
        const th = hasTarget ? a.targetH : a.h;
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
    const placements = [];
    const placedBadges = [];
    for (let i = 0; i < anchors.length; i++) {
        const tgt = targetRects[i];
        const targetCX = tgt.x + tgt.w / 2;
        const targetCY = tgt.y + tgt.h / 2;
        let best = null;
        for (let ring = 1; ring <= ANATOMY_PIN_MAX_RINGS; ring++) {
            const dist = BADGE_R + ANATOMY_PIN_LAYER_PADDING + ring * ANATOMY_PIN_RING_STEP;
            for (let d = 0; d < ANATOMY_PIN_DIRECTIONS; d++) {
                const angle = (d * 2 * Math.PI) / ANATOMY_PIN_DIRECTIONS;
                const cx = targetCX + dist * Math.cos(angle);
                const cy = targetCY + dist * Math.sin(angle);
                if (cx < xMin || cx > xMax)
                    continue;
                if (cy < yMin || cy > yMax)
                    continue;
                const badgeRect = {
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
                if (blocked)
                    continue;
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
                if (blocked)
                    continue;
                // Leader endpoints: from badge edge to target center.
                const dxToTarget = targetCX - cx;
                const dyToTarget = targetCY - cy;
                const len = Math.sqrt(dxToTarget * dxToTarget + dyToTarget * dyToTarget);
                const edgeX = cx + (BADGE_R / len) * dxToTarget;
                const edgeY = cy + (BADGE_R / len) * dyToTarget;
                let score = dist;
                // Penalty: leader passing through other documented layers.
                for (let j = 0; j < layerRects.length; j++) {
                    if (j === i)
                        continue;
                    if (segmentCrossesRect({ x: edgeX, y: edgeY }, { x: targetCX, y: targetCY }, layerRects[j])) {
                        score += 80;
                    }
                }
                // Penalty: leader passing very close to another badge.
                for (const pb of placedBadges) {
                    const d2b = pointToSegmentDistance({ x: pb.cx, y: pb.cy }, { x: edgeX, y: edgeY }, { x: targetCX, y: targetCY });
                    if (d2b < BADGE_R + 4)
                        score += 30;
                }
                if (!best || score < best.score)
                    best = { cx, cy, score };
            }
            // Early exit when current ring already produced a penalty-free hit.
            if (best &&
                best.score <=
                    BADGE_R + ANATOMY_PIN_LAYER_PADDING + ring * ANATOMY_PIN_RING_STEP + 0.5)
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
        if (p.cy - BADGE_R < minY)
            minY = p.cy - BADGE_R;
        if (p.cy + BADGE_R > maxY)
            maxY = p.cy + BADGE_R;
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
    const legendH = rowHeights.reduce((a, b) => a + b, 0) +
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
    if (fitScale < 1)
        inst.rescale(fitScale);
    inst.x = Math.round(compX);
    inst.y = Math.round(visualOffsetY);
    // ── Phase E: leader lines first (under badges), then badges ────────────
    for (let i = 0; i < placements.length; i++) {
        const p = placements[i];
        const badgeCX = p.cx;
        const badgeCY = p.cy + visualOffsetY;
        // Re-derive the target from the LIVE rescaled instance so the leader hits
        // the real element exactly (eliminates fitScale/rounding/auto-layout
        // rescale drift). Falls back to the pre-rescale projected rect.
        // When the LLM picked an explicit target (Fix B), resolve THAT node's
        // live box (no heuristic drill); otherwise re-derive via the paint-aware
        // heuristic from the documented anchor.
        const live = anchors[i].targetKey
            ? boxForKeyOnInstance(inst, anchors[i].targetKey)
            : liveTargetRect(inst, anchors[i].key);
        const targetRectFinal = live
            ? { x: inst.x + live.x, y: inst.y + live.y, w: live.w, h: live.h }
            : {
                x: targetRects[i].x,
                y: targetRects[i].y + visualOffsetY,
                w: targetRects[i].w,
                h: targetRects[i].h,
            };
        const targetCX = targetRectFinal.x + targetRectFinal.w / 2;
        const targetCY = targetRectFinal.y + targetRectFinal.h / 2;
        // Stop the leader at the target rect's border rather than its center.
        const tipPt = rayToRectEdge({ x: badgeCX, y: badgeCY }, { x: targetCX, y: targetCY }, targetRectFinal);
        const dx = tipPt.x - badgeCX;
        const dy = tipPt.y - badgeCY;
        const len = Math.sqrt(dx * dx + dy * dy);
        if (len > BADGE_R + 1) {
            // Orthogonal elbow: exit the badge along the dominant axis, one bend.
            const horizFirst = Math.abs(dx) >= Math.abs(dy);
            let sx;
            let sy;
            let cx2;
            let cy2;
            if (horizFirst) {
                sx = badgeCX + (dx >= 0 ? BADGE_R : -BADGE_R);
                sy = badgeCY;
                cx2 = tipPt.x;
                cy2 = badgeCY;
            }
            else {
                sx = badgeCX;
                sy = badgeCY + (dy >= 0 ? BADGE_R : -BADGE_R);
                cx2 = badgeCX;
                cy2 = tipPt.y;
            }
            // Pull the dot just OUTSIDE the element edge along the final segment so
            // it kisses the border instead of sitting on the glyphs/content.
            let ex = tipPt.x;
            let ey = tipPt.y;
            let ax = tipPt.x - cx2;
            let ay = tipPt.y - cy2;
            let al = Math.sqrt(ax * ax + ay * ay);
            if (al < 1e-6) {
                ax = tipPt.x - badgeCX;
                ay = tipPt.y - badgeCY;
                al = Math.max(1e-6, Math.sqrt(ax * ax + ay * ay));
            }
            const back = ANATOMY_LEADER_DOT_R + 1;
            ex = tipPt.x - (ax / al) * back;
            ey = tipPt.y - (ay / al) * back;
            const seg = (x1, y1, x2, y2) => {
                if (Math.abs(x2 - x1) + Math.abs(y2 - y1) < 1)
                    return;
                visual.appendChild(makeLeaderLine(x1, y1, x2, y2));
            };
            seg(sx, sy, cx2, cy2);
            seg(cx2, cy2, ex, ey);
            visual.appendChild(makeLeaderDot(ex, ey));
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
function buildAnatomySectionForWidth(target, contentW, variantSel, includedLayers, opts) {
    const { base, booleanPayload } = getAnatomyBaseAndOverrides(target, variantSel);
    if (!base)
        return textFrame("Aucun composant à analyser.");
    // Walk the layer tree on a probe instance (with overrides applied) so the
    // detected layers reflect the user's combination. The probe is disposed
    // once we've snapshotted everything we need.
    const probe = base.createInstance();
    if (Object.keys(booleanPayload).length > 0) {
        try {
            probe.setProperties(booleanPayload);
        }
        catch (_a) {
            /* invalid combo */
        }
    }
    const rep = resolveRepetition(probe, opts);
    let layers;
    if (includedLayers !== undefined) {
        if (includedLayers.length === 0) {
            probe.remove();
            return textFrame("Aucun calque sélectionné pour l'anatomie.");
        }
        const inc = new Set(includedLayers);
        layers = findAllVisibleLayersWithPositions(probe).filter((l) => inc.has(l.key) && !rep.isRedundant(l.key));
        layers.sort((a, b) => a.localY - b.localY || a.localX - b.localX);
        if (layers.length > ANATOMY_MAX_LAYERS)
            layers = layers.slice(0, ANATOMY_MAX_LAYERS);
    }
    else {
        layers = findNamedLayersOnInstance(probe, rep);
    }
    if (!(opts && opts.includeSlots)) {
        layers = layers.filter((l) => !isSlotLayerName(l.node.name));
    }
    if (layers.length === 0) {
        probe.remove();
        return textFrame("Aucun calque sélectionné pour l'anatomie.");
    }
    // Snapshot what we need before disposing the probe (node references become
    // stale once .remove() is called).
    const ovr = opts && opts.anchorTargets ? opts.anchorTargets : null;
    const anchors = layers.map((l) => {
        let tx = l.targetX;
        let ty = l.targetY;
        let tw = l.targetW;
        let th = l.targetH;
        let targetKey;
        if (ovr && typeof ovr[l.key] === "string") {
            const b = boxForKeyOnInstance(probe, ovr[l.key]);
            if (b) {
                tx = b.x;
                ty = b.y;
                tw = b.w;
                th = b.h;
                targetKey = ovr[l.key];
            }
        }
        return {
            key: l.key,
            localX: l.localX,
            localY: l.localY,
            w: l.w,
            h: l.h,
            targetX: tx,
            targetY: ty,
            targetW: tw,
            targetH: th,
            targetKey,
        };
    });
    const legendRows = layers.map((l) => ({ primary: l.node.name }));
    probe.remove();
    const visualW = Math.round(contentW * ANATOMY_VISUAL_RATIO);
    return buildPinnedVisualBlock(base, booleanPayload, anchors, legendRows, contentW, visualW, "AnatomyVisual");
}
function buildAnatomySection(target, variantSel, includedLayers, opts) {
    return buildAnatomySectionForWidth(target, ADMIN_CONTENT_WIDTH_DEFAULT, variantSel, includedLayers, opts);
}
// ─── Exemple : instances configurées dans un canvas ─────────────────────────
const EXEMPLE_VISUAL_PADDING = 32;
const EXEMPLE_GAP = 40;
// Always render 4 examples — and they must be diversified.
const EXEMPLE_COUNT = 4;
const EXEMPLE_MAX = EXEMPLE_COUNT;
// French sample strings of increasing length — used by the mechanical fallback
// to exercise short labels through to multi-line dense content.
const EXEMPLE_SAMPLE_TEXTS = [
    "Texte court",
    "Un libellé de longueur moyenne pour cet exemple",
    "Une phrase plus longue qui illustre le comportement du composant quand le contenu s'étend sur plusieurs mots et doit passer à la ligne.",
    "Un contenu volontairement très long : il sert à vérifier le retour à la ligne, la troncature éventuelle et la robustesse de la mise en page du composant face à un texte dense occupant plusieurs lignes successives.",
];
// Map an LLM/mechanical scenario onto a fresh instance. Keys are stripped prop
// names (or exact raw keys); values are coerced per prop type. INSTANCE_SWAP is
// left untouched. Applied as one setProperties call, falling back to per-key
// application so a single bad value doesn't void the whole scenario.
function applyExempleProps(inst, scenario, byName, byRawKey, skipVariant) {
    var _a, _b, _c;
    const payload = {};
    for (const k of Object.keys(scenario)) {
        const info = (_b = (_a = byName.get(k)) !== null && _a !== void 0 ? _a : byName.get(stripPropKey(k))) !== null && _b !== void 0 ? _b : byRawKey.get(k);
        if (!info)
            continue;
        const v = scenario[k];
        if (info.type === "INSTANCE_SWAP")
            continue;
        // VARIANT already locked-in by instantiating the matching variant child
        // (validated against the real combinations) — don't re-apply it here.
        if (info.type === "VARIANT" && skipVariant)
            continue;
        if (info.type === "BOOLEAN") {
            const b = v === true ||
                (typeof v === "string" && /^(true|oui|yes|1|on)$/i.test(v.trim()));
            payload[info.rawKey] = b;
        }
        else if (info.type === "VARIANT") {
            const s = String(v);
            const opts = (_c = info.variantOptions) !== null && _c !== void 0 ? _c : [];
            if (opts.length === 0 || opts.indexOf(s) !== -1)
                payload[info.rawKey] = s;
        }
        else if (info.type === "TEXT") {
            payload[info.rawKey] = String(v);
        }
    }
    const keys = Object.keys(payload);
    if (keys.length === 0)
        return;
    try {
        inst.setProperties(payload);
    }
    catch (_d) {
        for (const rk of keys) {
            try {
                inst.setProperties({ [rk]: payload[rk] });
            }
            catch (_e) {
                /* skip this prop, keep the instance */
            }
        }
    }
}
// Fallback when no LLM scenarios are available: vary the first VARIANT axis
// (or toggle BOOLEANs) and fill TEXT props with sample strings of growing
// length so the sheet still demonstrates real prop variations + text behavior.
function buildMechanicalExemples(props) {
    const variantAxis = props.find((p) => { var _a, _b; return p.type === "VARIANT" && ((_b = (_a = p.variantOptions) === null || _a === void 0 ? void 0 : _a.length) !== null && _b !== void 0 ? _b : 0) >= 2; });
    const booleanProps = props.filter((p) => p.type === "BOOLEAN");
    const textProps = props.filter((p) => p.type === "TEXT");
    // Always EXEMPLE_COUNT scenarios, diversified: rotate the variant axis,
    // flip each boolean on an independent bit, and rotate the sample texts.
    const out = [];
    for (let i = 0; i < EXEMPLE_COUNT; i++) {
        const scenario = {};
        if (variantAxis) {
            scenario[variantAxis.name] =
                variantAxis.variantOptions[i % variantAxis.variantOptions.length];
        }
        booleanProps.forEach((bp, j) => {
            scenario[bp.name] = ((i >> j) & 1) === 0;
        });
        textProps.forEach((tp, j) => {
            scenario[tp.name] =
                EXEMPLE_SAMPLE_TEXTS[(i + j) % EXEMPLE_SAMPLE_TEXTS.length];
        });
        out.push({ props: scenario });
    }
    return out;
}
// Build the "Exemple" sheet body: a single canvas (same visual styling as the
// Anatomy visual area) with one configured instance per usage scenario,
// stacked vertically and centered. LLM scenarios when available, otherwise the
// mechanical fallback.
function buildExemplesSection(target, contentW, exemples) {
    return __awaiter(this, void 0, void 0, function* () {
        var _a, _b, _c, _d;
        const base = getBaseComponent(target);
        if (!base)
            return textFrame("Aucun composant à analyser.");
        const props = extractProps(target);
        const byName = new Map();
        const byRawKey = new Map();
        for (const p of props) {
            byName.set(p.name, p);
            byRawKey.set(p.rawKey, p);
        }
        const list = exemples && exemples.length > 0
            ? exemples.slice(0, EXEMPLE_MAX)
            : buildMechanicalExemples(props);
        if (list.length === 0)
            return textFrame("Aucun exemple à générer.");
        const swapResolver = yield buildSwapResolver(target.componentPropertyDefinitions);
        const isSet = target.type === "COMPONENT_SET";
        const innerW = contentW - EXEMPLE_VISUAL_PADDING * 2;
        const placed = [];
        for (const ex of list) {
            const scenario = ex.props || {};
            // Resolve the VARIANT axes the scenario pins down (valid option values
            // only). For a COMPONENT_SET, the full VARIANT combination must map to an
            // existing variant child — otherwise the scenario describes a state that
            // isn't supposed to exist, so we drop it entirely rather than render a
            // mismatched instance.
            const variantSel = {};
            for (const k of Object.keys(scenario)) {
                const info = (_b = (_a = byName.get(k)) !== null && _a !== void 0 ? _a : byName.get(stripPropKey(k))) !== null && _b !== void 0 ? _b : byRawKey.get(k);
                if (info && info.type === "VARIANT") {
                    const s = String(scenario[k]);
                    const opts = (_c = info.variantOptions) !== null && _c !== void 0 ? _c : [];
                    if (opts.length === 0 || opts.indexOf(s) !== -1)
                        variantSel[info.name] = s;
                }
            }
            let source = base;
            const usedVariantChild = isSet && Object.keys(variantSel).length > 0;
            if (usedVariantChild) {
                source = findVariantBySelection(target, variantSel);
                if (!source)
                    continue; // impossible combination → skip this exemple
            }
            const inst = source.createInstance();
            if (ex.title)
                inst.name = ex.title;
            applyExempleProps(inst, scenario, byName, byRawKey, usedVariantChild);
            // INSTANCE_SWAP choices (name → component id).
            if (ex.swaps) {
                const swapPayload = {};
                for (const propName of Object.keys(ex.swaps)) {
                    const r = (_d = swapResolver.get(propName)) !== null && _d !== void 0 ? _d : swapResolver.get(stripPropKey(propName));
                    if (!r)
                        continue;
                    const id = r.byName.get(ex.swaps[propName]);
                    if (id)
                        swapPayload[r.rawKey] = id;
                }
                if (Object.keys(swapPayload).length > 0) {
                    try {
                        inst.setProperties(swapPayload);
                    }
                    catch (_e) {
                        /* keep instance with default swaps */
                    }
                }
            }
            // Nested component-instance overrides (a HelperText inside a Field, …).
            if (ex.nested) {
                for (const nestedKey of Object.keys(ex.nested)) {
                    const n = resolveLayerByKey(inst, nestedKey);
                    if (n && n.type === "INSTANCE") {
                        yield applyNestedInstanceProps(n, ex.nested[nestedKey]);
                    }
                }
            }
            // Internal TEXT layer overrides (key → new content). Applied last so an
            // explicit text override wins over a nested-instance text property.
            if (ex.texts) {
                for (const layerKey of Object.keys(ex.texts)) {
                    const node = resolveLayerByKey(inst, layerKey);
                    if (node && node.type === "TEXT") {
                        yield applyTextLayerOverride(node, ex.texts[layerKey]);
                    }
                }
            }
            const scale = Math.min(1, innerW / inst.width);
            placed.push({
                inst,
                w: inst.width * scale,
                h: inst.height * scale,
                scale,
            });
        }
        if (placed.length === 0)
            return textFrame("Aucun exemple valide à générer.");
        let contentH = EXEMPLE_VISUAL_PADDING * 2;
        for (let i = 0; i < placed.length; i++) {
            contentH += placed[i].h;
            if (i < placed.length - 1)
                contentH += EXEMPLE_GAP;
        }
        const totalH = Math.max(Math.round(contentH), ANATOMY_VISUAL_H_MIN);
        const visual = figma.createFrame();
        visual.name = "ExemplesVisual";
        visual.resize(contentW, totalH);
        visual.fills = [{ type: "SOLID", color: COLOR.refMatrixCardBg }];
        visual.cornerRadius = 8;
        visual.clipsContent = true;
        // Center the stack vertically when the canvas was floored to its minimum.
        let y = EXEMPLE_VISUAL_PADDING + Math.max(0, (totalH - contentH) / 2);
        for (const p of placed) {
            visual.appendChild(p.inst);
            if (p.scale < 1)
                p.inst.rescale(p.scale);
            p.inst.x = Math.round((contentW - p.w) / 2);
            p.inst.y = Math.round(y);
            y += p.h + EXEMPLE_GAP;
        }
        return visual;
    });
}
function buildPdfAnatomyPage(target, variantSel, includedLayers, opts) {
    const page = makePdfPage();
    const header = makePdfHeader(target.name, "Anatomie");
    page.appendChild(header);
    header.x = PDF_MARGIN;
    header.y = PDF_MARGIN;
    const body = buildAnatomySectionForWidth(target, PDF_CONTENT_W, variantSel, includedLayers, opts);
    page.appendChild(body);
    body.x = PDF_MARGIN;
    body.y = PDF_MARGIN + header.height + PDF_BODY_GAP;
    return page;
}
// Return the variant child of a COMPONENT_SET that matches the user's selection
// (axisName → variant value). Falls back to null if the selection is empty,
// references unknown axes, or doesn't match any variant.
function findVariantBySelection(set, sel) {
    const keys = Object.keys(sel).filter((k) => sel[k]);
    if (keys.length === 0)
        return null;
    for (const child of set.children) {
        if (child.type !== "COMPONENT")
            continue;
        const vp = child.variantProperties;
        if (!vp)
            continue;
        let match = true;
        for (const k of keys) {
            if (vp[k] !== sel[k]) {
                match = false;
                break;
            }
        }
        if (match)
            return child;
    }
    return null;
}
// Splits the anatomy selection into the VARIANT part (used to pick the
// component child) and the BOOLEAN part (applied to the instance via
// setProperties). The user's selection is keyed by stripped names; we look up
// each prop's type in `defs` to dispatch correctly. BOOLEAN values come in as
// "true" / "false" strings from the UI and are coerced here.
function getAnatomyBaseAndOverrides(target, variantSel) {
    const defs = target.componentPropertyDefinitions;
    const variantPart = {};
    const booleanPayload = {};
    if (variantSel) {
        for (const name of Object.keys(variantSel)) {
            const value = variantSel[name];
            if (typeof value !== "string")
                continue;
            // Match by stripped name — variant prop keys have no #suffix, others do.
            for (const rawKey of Object.keys(defs)) {
                if (stripPropKey(rawKey) !== name)
                    continue;
                const def = defs[rawKey];
                if (def.type === "VARIANT")
                    variantPart[name] = value;
                else if (def.type === "BOOLEAN")
                    booleanPayload[rawKey] = value === "true";
                break;
            }
        }
    }
    let base = null;
    if (target.type === "COMPONENT_SET" && Object.keys(variantPart).length > 0) {
        base = findVariantBySelection(target, variantPart);
    }
    if (!base)
        base = getBaseComponent(target);
    return { base, booleanPayload };
}
// Walk an instance's children using local x/y (relative to the instance),
// honoring the same single-child-collapse rule as findNamedLayers. Coords
// here are in the instance's local space — multiply by fitScale to convert
// to the rendered scale, or walk after rescale to skip the multiplication.
function findNamedLayersOnInstance(inst, rep) {
    const out = [];
    const recurse = (node, depth, dx, dy, parentKey) => {
        if (depth > ANATOMY_MAX_DEPTH)
            return;
        if (!("children" in node))
            return;
        const container = node;
        for (let i = 0; i < container.children.length; i++) {
            const child = container.children[i];
            if (child.visible === false)
                continue;
            const lm = child;
            const cx = dx + lm.x;
            const cy = dy + lm.y;
            const childKey = parentKey ? `${parentKey}/${i}` : String(i);
            const meaningful = isMeaningfulLayerName(child.name);
            // Component-like nodes (instances of other components, or nested
            // components/component sets) are always documentation-worthy — push them
            // regardless of whether their layer name passes the meaningful filter,
            // because they reference an external component.
            const isComponentLike = child.type === "INSTANCE" ||
                child.type === "COMPONENT" ||
                child.type === "COMPONENT_SET";
            if (meaningful || isComponentLike) {
                const tgt = resolveLeafTarget(child, cx, cy, lm.width, lm.height, inst);
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
            if (isComponentLike)
                continue;
            // Single-child collapse: meaningful wrapper around exactly one layer.
            // EXCEPT when the subtree contains a nested instance — instances of
            // other components must always reach the layer list, even when buried
            // inside single-child wrappers.
            if (meaningful &&
                visibleChildCount(child) === 1 &&
                !hasVisibleInstanceDescendant(child, ANATOMY_MAX_DEPTH - depth))
                continue;
            recurse(child, depth + 1, cx, cy, childKey);
        }
    };
    recurse(inst, 0, 0, 0, "");
    // Drop redundant repeated siblings BEFORE the cap so it isn't wasted on
    // clones (e.g. 12 Breadcrumb items would otherwise hide real layers).
    const deduped = rep ? out.filter((l) => !rep.isRedundant(l.key)) : out;
    deduped.sort((a, b) => a.localY - b.localY || a.localX - b.localX);
    return deduped.slice(0, ANATOMY_MAX_LAYERS);
}
// Maximum tree size shown in the layer picker — generous enough for most
// real components. Beyond this, the picker truncates (the rendered anatomy
// is independently capped by ANATOMY_MAX_LAYERS).
const ANATOMY_TREE_MAX_DEPTH = 8;
const ANATOMY_TREE_MAX_NODES = 200;
// Walk every visible layer (depth-first, capped) so the UI can show the user
// the exact hierarchy of their instance. Stops descending into nested
// component-like nodes — their internals belong to another component's doc.
function walkAnatomyTree(inst) {
    const out = [];
    const recurse = (node, depth, parentKey) => {
        if (depth > ANATOMY_TREE_MAX_DEPTH)
            return;
        if (out.length >= ANATOMY_TREE_MAX_NODES)
            return;
        if (!("children" in node))
            return;
        const container = node;
        for (let i = 0; i < container.children.length; i++) {
            if (out.length >= ANATOMY_TREE_MAX_NODES)
                return;
            const child = container.children[i];
            if (child.visible === false)
                continue;
            const key = parentKey ? `${parentKey}/${i}` : String(i);
            out.push({ key, name: child.name, type: child.type, depth });
            if (child.type === "INSTANCE" ||
                child.type === "COMPONENT" ||
                child.type === "COMPONENT_SET")
                continue;
            recurse(child, depth + 1, key);
        }
    };
    recurse(inst, 0, "");
    return out;
}
// Walk all visible layers WITH position info (used for rendering when the
// user supplied an explicit include list — we then filter by key).
function findAllVisibleLayersWithPositions(inst) {
    const out = [];
    const recurse = (node, depth, dx, dy, parentKey) => {
        if (depth > ANATOMY_TREE_MAX_DEPTH)
            return;
        if (!("children" in node))
            return;
        const container = node;
        for (let i = 0; i < container.children.length; i++) {
            const child = container.children[i];
            if (child.visible === false)
                continue;
            const lm = child;
            const cx = dx + lm.x;
            const cy = dy + lm.y;
            const key = parentKey ? `${parentKey}/${i}` : String(i);
            const tgt = resolveLeafTarget(child, cx, cy, lm.width, lm.height, inst);
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
            if (child.type === "INSTANCE" ||
                child.type === "COMPONENT" ||
                child.type === "COMPONENT_SET")
                continue;
            recurse(child, depth + 1, cx, cy, key);
        }
    };
    recurse(inst, 0, 0, 0, "");
    return out;
}
const REPETITION_MIN_GROUP = 2;
function makeRepetitionResult(groups) {
    const redundantRoots = [];
    for (const g of groups) {
        for (const m of g.memberKeys) {
            if (m === g.repKey)
                continue;
            redundantRoots.push({ root: m, repKey: g.repKey });
        }
    }
    const coveredBy = (key) => {
        if (key === "" || key === "root")
            return null;
        for (const r of redundantRoots) {
            if (key === r.root || key.startsWith(r.root + "/"))
                return r;
        }
        return null;
    };
    return {
        groups,
        isRedundant: (key) => coveredBy(key) !== null,
        representativeOf: (key) => {
            const c = coveredBy(key);
            return c ? c.repKey + key.slice(c.root.length) : null;
        },
    };
}
// Structural pass: bucket visible siblings by a conservative signature
// (name + type + visible child count + rounded size). Buckets of >= 2 are a
// repetition group. Descends into representatives / non-grouped children only
// (a redundant sibling's subtree is already covered by the representative).
// Walks through component-like nodes and caps at ANATOMY_TREE_MAX_DEPTH so
// keys stay aligned with BOTH consumers (anatomy auto-walker only queries a
// prefix-subset of these keys, which is safe).
function detectRepeatedSiblingGroups(inst) {
    const groups = [];
    const recurse = (node, depth, parentKey) => {
        if (depth > ANATOMY_TREE_MAX_DEPTH)
            return;
        if (!("children" in node))
            return;
        const container = node;
        const buckets = new Map();
        const ordered = [];
        for (let i = 0; i < container.children.length; i++) {
            const child = container.children[i];
            if (child.visible === false)
                continue;
            const lm = child;
            const key = parentKey ? `${parentKey}/${i}` : String(i);
            const sig = child.name +
                "|" +
                child.type +
                "|" +
                visibleChildCount(child) +
                "|" +
                Math.round(lm.width) +
                "x" +
                Math.round(lm.height);
            let b = buckets.get(sig);
            if (!b) {
                b = [];
                buckets.set(sig, b);
                ordered.push(sig);
            }
            b.push({ key, node: child });
        }
        const redundantHere = new Set();
        for (const sig of ordered) {
            const members = buckets.get(sig);
            if (members.length < REPETITION_MIN_GROUP)
                continue;
            const first = members[0];
            groups.push({
                parentKey,
                name: first.node.name,
                type: first.node.type,
                count: members.length,
                memberKeys: members.map((m) => m.key),
                repKey: first.key,
            });
            for (let j = 1; j < members.length; j++)
                redundantHere.add(members[j].key);
        }
        for (let i = 0; i < container.children.length; i++) {
            const child = container.children[i];
            if (child.visible === false)
                continue;
            const key = parentKey ? `${parentKey}/${i}` : String(i);
            if (redundantHere.has(key))
                continue;
            recurse(child, depth + 1, key);
        }
    };
    recurse(inst, 0, "");
    return makeRepetitionResult(groups);
}
// Single predicate object for both sections: when the request carries an
// LLM-confirmed override (even an empty array → "collapse nothing", i.e. a
// full veto), trust it verbatim (supports merging differently-named siblings);
// otherwise run the inline structural detection. `undefined` → structural.
function resolveRepetition(inst, opts) {
    const confirmed = opts ? opts.repetitionGroups : undefined;
    if (confirmed !== undefined) {
        const groups = confirmed
            .filter((g) => g &&
            Array.isArray(g.memberKeys) &&
            g.memberKeys.length >= REPETITION_MIN_GROUP &&
            typeof g.repKey === "string")
            .map((g) => ({
            parentKey: typeof g.parentKey === "string" ? g.parentKey : "",
            name: "",
            type: "",
            count: g.memberKeys.length,
            memberKeys: g.memberKeys.slice(),
            repKey: g.repKey,
        }));
        return makeRepetitionResult(groups);
    }
    return detectRepeatedSiblingGroups(inst);
}
// key → node index using the SAME child-index path scheme as the detector,
// so a group's parentKey / repKey can be resolved to live nodes.
function buildKeyNodeIndex(inst) {
    const map = new Map();
    const recurse = (node, depth, parentKey) => {
        if (depth > ANATOMY_TREE_MAX_DEPTH)
            return;
        if (!("children" in node))
            return;
        const c = node;
        for (let i = 0; i < c.children.length; i++) {
            const child = c.children[i];
            if (child.visible === false)
                continue;
            const key = parentKey ? `${parentKey}/${i}` : String(i);
            map.set(key, child);
            recurse(child, depth + 1, key);
        }
    };
    recurse(inst, 0, "");
    return map;
}
// Compact, content-light payload for the optional LLM verification step.
function buildRepetitionPayload(inst, groups, rootName) {
    const idx = buildKeyNodeIndex(inst);
    return groups.map((g) => {
        const parentNode = g.parentKey === "" ? null : idx.get(g.parentKey) || null;
        const repNode = idx.get(g.repKey) || null;
        const sample = [];
        if (repNode && "children" in repNode) {
            const stack = [
                ...repNode.children,
            ];
            while (stack.length > 0 && sample.length < 8) {
                const n = stack.shift();
                if (n.visible === false)
                    continue;
                sample.push(n.name);
                if ("children" in n)
                    stack.push(...n.children);
            }
        }
        return {
            parentKey: g.parentKey,
            parentName: parentNode ? parentNode.name : rootName,
            childName: g.name,
            type: g.type,
            count: g.count,
            sampleSubtree: sample,
            repKey: g.repKey,
            memberKeys: g.memberKeys,
        };
    });
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
function aiChannelToHex(c) {
    const n = Math.round(Math.max(0, Math.min(1, c)) * 255);
    const s = n.toString(16);
    return s.length < 2 ? "0" + s : s;
}
function aiRgbToHex(color) {
    const hex = "#" + aiChannelToHex(color.r) + aiChannelToHex(color.g) + aiChannelToHex(color.b);
    if (typeof color.a === "number" && color.a < 1)
        return hex + aiChannelToHex(color.a);
    return hex;
}
function describeAiVariable(varId, consumerNode) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            const v = yield figma.variables.getVariableByIdAsync(varId);
            if (!v)
                return { id: varId, name: null, type: null, value: null };
            const out = { name: v.name, type: v.resolvedType, value: null };
            const resolved = v.resolveForConsumer(consumerNode);
            if (resolved && resolved.value !== undefined && resolved.value !== null) {
                if (resolved.resolvedType === "COLOR" && typeof resolved.value === "object") {
                    const col = resolved.value;
                    out.value = aiRgbToHex(col);
                    if (typeof col.a === "number")
                        out.alpha = col.a;
                }
                else {
                    out.value = resolved.value;
                }
            }
            return out;
        }
        catch (e) {
            return {
                id: varId,
                name: null,
                type: null,
                value: null,
                error: e instanceof Error ? e.message : String(e),
            };
        }
    });
}
function summarizeAiBoundVariables(bv, consumerNode) {
    return __awaiter(this, void 0, void 0, function* () {
        const result = {};
        for (const key of Object.keys(bv)) {
            const binding = bv[key];
            try {
                if (Array.isArray(binding)) {
                    result[key] = yield Promise.all(binding.map((b) => describeAiVariable(b.id, consumerNode)));
                }
                else if (binding && binding.id) {
                    result[key] = yield describeAiVariable(binding.id, consumerNode);
                }
            }
            catch (_a) {
                /* skip a malformed binding silently */
            }
        }
        return result;
    });
}
function extractAiChildren(node, depth, maxDepth) {
    return __awaiter(this, void 0, void 0, function* () {
        if (depth >= maxDepth || !("children" in node))
            return [];
        const out = [];
        for (const child of node.children) {
            const fill = child.fillStyleId;
            const text = child.textStyleId;
            const effect = child.effectStyleId;
            const bv = child
                .boundVariables;
            const rec = {
                name: child.name,
                type: child.type,
                visible: child.visible,
                fillStyleId: typeof fill === "string" ? fill : null,
                textStyleId: typeof text === "string" ? text : null,
                effectStyleId: typeof effect === "string" ? effect : null,
                boundVariables: bv ? yield summarizeAiBoundVariables(bv, child) : null,
                children: yield extractAiChildren(child, depth + 1, maxDepth),
            };
            if (child.type === "TEXT") {
                const t = child;
                rec.characters = t.characters;
                if (typeof t.fontSize === "number")
                    rec.fontSize = t.fontSize;
                if (typeof t.fontName === "object" && t.fontName !== null && "family" in t.fontName) {
                    rec.fontName = t.fontName;
                }
            }
            out.push(rec);
        }
        return out;
    });
}
function extractAiVariantInfo(c) {
    return __awaiter(this, void 0, void 0, function* () {
        const bv = c.boundVariables;
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
            boundVariables: bv ? yield summarizeAiBoundVariables(bv, c) : null,
            children: yield extractAiChildren(c, 0, 2),
        };
    });
}
function extractAiMetadata(node) {
    return __awaiter(this, void 0, void 0, function* () {
        const isSet = node.type === "COMPONENT_SET";
        const components = isSet
            ? node.children
            : [node];
        const variants = yield Promise.all(components.map((c) => extractAiVariantInfo(c)));
        return {
            id: node.id,
            name: node.name,
            type: node.type,
            description: node.description || "",
            width: Math.round(node.width),
            height: Math.round(node.height),
            variantProperties: isSet
                ? node.variantGroupProperties
                : null,
            componentProperties: (() => {
                var _a;
                const defs = node.componentPropertyDefinitions || {};
                const result = {};
                let hasAny = false;
                for (const rawKey in defs) {
                    const d = defs[rawKey];
                    if (d.type === "VARIANT")
                        continue;
                    result[stripPropKey(rawKey)] = {
                        type: d.type,
                        defaultValue: (_a = d.defaultValue) !== null && _a !== void 0 ? _a : null,
                    };
                    hasAny = true;
                }
                return hasAny ? result : null;
            })(),
            variants,
        };
    });
}
function extractAiCSS(node) {
    return __awaiter(this, void 0, void 0, function* () {
        const components = node.type === "COMPONENT_SET"
            ? node.children
            : [node];
        const cssMap = {};
        yield Promise.all(components.map((variant) => __awaiter(this, void 0, void 0, function* () {
            try {
                const css = yield variant.getCSSAsync();
                cssMap[variant.name] = css;
            }
            catch (_a) {
                cssMap[variant.name] = null;
            }
        })));
        return cssMap;
    });
}
function aiSortByReadingOrder(nodes) {
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
function aiTextLevel(fontSize) {
    if (typeof fontSize !== "number")
        return "body";
    if (fontSize >= 24)
        return "h1";
    if (fontSize >= 18)
        return "h2";
    if (fontSize >= 14)
        return "h3";
    return "body";
}
function aiIsRowLayout(node) {
    if (!("layoutMode" in node) || node.layoutMode !== "HORIZONTAL")
        return false;
    if (!("children" in node))
        return false;
    const f = node;
    return f.children.length >= 2 && f.counterAxisAlignItems !== "CENTER";
}
function aiHasTextOrInstance(node) {
    if (node.type === "TEXT" || node.type === "INSTANCE")
        return true;
    if (!("children" in node) || node.visible === false)
        return false;
    for (const child of node.children) {
        if (aiHasTextOrInstance(child))
            return true;
    }
    return false;
}
function aiSummarizeInstanceProperties(instanceNode) {
    const out = {};
    try {
        const props = instanceNode.componentProperties;
        if (!props)
            return out;
        for (const key of Object.keys(props)) {
            const entry = props[key];
            let v = entry && "value" in entry ? entry.value : entry;
            if (typeof v === "string" && v.length > AI_PROP_VALUE_MAX_CHARS) {
                v = v.slice(0, AI_PROP_VALUE_MAX_CHARS) + "…";
            }
            out[key] = v;
        }
    }
    catch (_a) {
        /* ignore */
    }
    return out;
}
function walkAiDocNode(node, depth, budget, schemaPlaceholders, instancePlaceholders, textFallback, visited, nodeKey = "") {
    if (budget.remaining <= 0)
        return { kind: "truncated", reason: "budget" };
    if (visited.has(node))
        return { kind: "truncated", reason: "cycle" };
    visited.add(node);
    budget.remaining -= 1;
    if (node.type === "TEXT") {
        const t = node;
        const text = typeof t.characters === "string" ? t.characters : "";
        if (text)
            textFallback.push(text);
        return {
            kind: "text",
            nodeKey,
            text,
            fontSize: typeof t.fontSize === "number" ? t.fontSize : null,
            level: aiTextLevel(t.fontSize),
        };
    }
    if (node.type === "INSTANCE") {
        const inst = {
            kind: "instance",
            nodeKey,
            componentName: null,
            properties: aiSummarizeInstanceProperties(node),
            _node: node,
        };
        instancePlaceholders.push(inst);
        return inst;
    }
    const hasChildren = "children" in node && node.children.length > 0;
    const w = node.width || 0;
    const h = node.height || 0;
    const hasVisualPresence = w >= 4 && h >= 4;
    if (depth >= 1 && hasVisualPresence && !aiHasTextOrInstance(node)) {
        const placeholder = {
            kind: "schema",
            name: node.name,
            nodeType: node.type,
            width: Math.round(w),
            height: Math.round(h),
            css: null,
            _node: node,
        };
        schemaPlaceholders.push(placeholder);
        return placeholder;
    }
    if (depth >= AI_DOC_MAX_DEPTH) {
        return { kind: "truncated", reason: "depth", name: node.name };
    }
    const container = {
        kind: "container",
        name: node.name,
        type: node.type,
        layout: ("layoutMode" in node ? node.layoutMode : "NONE") || "NONE",
        isRow: aiIsRowLayout(node),
        children: [],
    };
    if (hasChildren) {
        const children = node.children;
        const isAutoLayout = "layoutMode" in node &&
            (node.layoutMode === "HORIZONTAL" ||
                node.layoutMode === "VERTICAL");
        const ordered = isAutoLayout
            ? children
            : aiSortByReadingOrder(children);
        const rawChildren = children;
        for (let i = 0; i < ordered.length; i++) {
            const child = ordered[i];
            if (child.visible === false)
                continue;
            // Key from the RAW child index (not the reading-order/loop index) so it
            // resolves through resolveLayerByKey, which walks raw children[idx].
            const rawIdx = rawChildren.indexOf(child);
            const childKey = rawIdx < 0 ? "" : nodeKey ? nodeKey + "/" + rawIdx : String(rawIdx);
            container.children.push(walkAiDocNode(child, depth + 1, budget, schemaPlaceholders, instancePlaceholders, textFallback, visited, childKey));
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
function resolveAiSchemaCSS(placeholders) {
    return __awaiter(this, void 0, void 0, function* () {
        for (let i = 0; i < placeholders.length; i += AI_SCHEMA_CONCURRENCY) {
            const batch = placeholders.slice(i, i + AI_SCHEMA_CONCURRENCY);
            yield Promise.all(batch.map((p) => __awaiter(this, void 0, void 0, function* () {
                try {
                    if (p._node && "getCSSAsync" in p._node) {
                        p.css = yield p._node.getCSSAsync();
                    }
                }
                catch (e) {
                    p.css = null;
                    p.cssError = e instanceof Error ? e.message : String(e);
                }
                delete p._node;
            })));
        }
    });
}
function resolveAiInstanceNames(placeholders) {
    return __awaiter(this, void 0, void 0, function* () {
        for (let i = 0; i < placeholders.length; i += AI_SCHEMA_CONCURRENCY) {
            const batch = placeholders.slice(i, i + AI_SCHEMA_CONCURRENCY);
            yield Promise.all(batch.map((p) => __awaiter(this, void 0, void 0, function* () {
                try {
                    const node = p._node;
                    if (!node) {
                        p.componentName = "(unknown)";
                        return;
                    }
                    const mc = yield node.getMainComponentAsync();
                    if (!mc) {
                        p.componentName = "(detached)";
                    }
                    else if (mc.parent && mc.parent.type === "COMPONENT_SET") {
                        p.componentName = mc.parent.name + " / " + mc.name;
                    }
                    else {
                        p.componentName = mc.name;
                    }
                }
                catch (_a) {
                    p.componentName = "(unknown)";
                }
                delete p._node;
            })));
        }
    });
}
function captureAiFrameImages(frames) {
    return __awaiter(this, void 0, void 0, function* () {
        yield Promise.all(frames.map((f) => __awaiter(this, void 0, void 0, function* () {
            const node = f._node;
            if (!node || !("exportAsync" in node)) {
                f.image = null;
                return;
            }
            try {
                const w = node.width || 1;
                const h = node.height || 1;
                const scale = Math.min(2, AI_IMAGE_MAX_DIMENSION / Math.max(w, h));
                const bytes = yield node.exportAsync({
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
            }
            catch (e) {
                f.image = null;
                f.imageError = e instanceof Error ? e.message : String(e);
            }
        })));
    });
}
function extractAiDocs(docFrames) {
    return __awaiter(this, void 0, void 0, function* () {
        if (!docFrames || docFrames.length === 0) {
            return { version: 2, frames: [], textFallback: [] };
        }
        const budget = { remaining: AI_DOC_NODE_BUDGET };
        const schemaPlaceholders = [];
        const instancePlaceholders = [];
        const textFallback = [];
        const ordered = aiSortByReadingOrder(docFrames);
        const frames = ordered.map((frame, index) => ({
            index,
            name: frame.name,
            type: frame.type,
            width: Math.round(frame.width),
            height: Math.round(frame.height),
            tree: walkAiDocNode(frame, 0, budget, schemaPlaceholders, instancePlaceholders, textFallback, new WeakSet()),
            _node: frame,
        }));
        yield Promise.all([
            resolveAiSchemaCSS(schemaPlaceholders),
            resolveAiInstanceNames(instancePlaceholders),
            captureAiFrameImages(frames),
        ]);
        for (const f of frames)
            delete f._node;
        return { version: 2, frames, textFallback };
    });
}
function buildAiPayload(componentNode, docFrames) {
    return __awaiter(this, void 0, void 0, function* () {
        const [metadata, css, documentation, exempleContext] = yield Promise.all([
            extractAiMetadata(componentNode),
            extractAiCSS(componentNode),
            extractAiDocs(docFrames),
            buildExempleContext(componentNode),
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
            exempleContext,
        };
    });
}
const EXEMPLE_TEXT_LAYERS_MAX = 50;
const EXEMPLE_TEXT_DEPTH_MAX = 12;
// Walk a probe instance collecting every visible TEXT layer with a stable
// index-path key (same scheme as resolveLayerByKey, so the key resolves back
// on a fresh instance). Descends through nested instances/components too —
// labels are frequently wrapped.
function collectInstanceTextLayers(root) {
    const out = [];
    const recurse = (node, depth, parentKey) => {
        if (depth > EXEMPLE_TEXT_DEPTH_MAX)
            return;
        if (!("children" in node))
            return;
        const cont = node;
        for (let i = 0; i < cont.children.length; i++) {
            if (out.length >= EXEMPLE_TEXT_LAYERS_MAX)
                return;
            const c = cont.children[i];
            if (c.visible === false)
                continue;
            const key = parentKey ? `${parentKey}/${i}` : String(i);
            if (c.type === "TEXT") {
                out.push({ key, name: c.name, text: c.characters });
            }
            if ("children" in c)
                recurse(c, depth + 1, key);
        }
    };
    recurse(root, 0, "");
    return out;
}
const SCREEN_TEXT_LAYERS_MAX = 120;
const SCREEN_TEXT_DEPTH_MAX = 24;
// Flat list of every visible TEXT layer of an analyzed screen, descending
// through nested instances/components (most screen copy lives inside button /
// field instances). Keys use the raw-child-index scheme so they resolve back
// via resolveLayerByKey on a fresh getNodeByIdAsync(screenId). `path` gives the
// LLM human context (ancestor names) to disambiguate similar texts.
function collectScreenTextLayers(root) {
    const out = [];
    const recurse = (node, depth, parentKey, parentPath) => {
        if (depth > SCREEN_TEXT_DEPTH_MAX)
            return;
        if (!("children" in node))
            return;
        const cont = node;
        for (let i = 0; i < cont.children.length; i++) {
            if (out.length >= SCREEN_TEXT_LAYERS_MAX)
                return;
            const c = cont.children[i];
            if (c.visible === false)
                continue;
            const key = parentKey ? `${parentKey}/${i}` : String(i);
            const path = parentPath ? `${parentPath} › ${c.name}` : c.name;
            if (c.type === "TEXT") {
                const t = c.characters || "";
                out.push({
                    key,
                    name: c.name,
                    path,
                    text: t.length > 240 ? t.slice(0, 240) + "…" : t,
                });
            }
            if ("children" in c)
                recurse(c, depth + 1, key, path);
        }
    };
    recurse(root, 0, "", "");
    return out;
}
const SCREEN_COMPONENTS_MAX = 80;
// Full inventory of every component INSTANCE on the analyzed screen (descends
// into nested instances), with a resolvable key + its current properties and
// VARIANT options. Gives the LLM a complete component list independent of the
// structure-walk budget/truncation, and exact nodeKey/prop names for setProps.
function collectScreenComponents(root) {
    return __awaiter(this, void 0, void 0, function* () {
        const out = [];
        const recurse = (node, depth, parentKey) => __awaiter(this, void 0, void 0, function* () {
            if (depth > SCREEN_TEXT_DEPTH_MAX)
                return;
            if (!("children" in node))
                return;
            const cont = node;
            for (let i = 0; i < cont.children.length; i++) {
                if (out.length >= SCREEN_COMPONENTS_MAX)
                    return;
                const c = cont.children[i];
                if (c.visible === false)
                    continue;
                const key = parentKey ? `${parentKey}/${i}` : String(i);
                if (c.type === "INSTANCE") {
                    const inst = c;
                    let component = inst.name;
                    let defs = null;
                    try {
                        const mc = yield inst.getMainComponentAsync();
                        if (mc) {
                            const inSet = mc.parent && mc.parent.type === "COMPONENT_SET";
                            component = inSet ? mc.parent.name : mc.name;
                            defs = inSet
                                ? mc.parent.componentPropertyDefinitions
                                : mc.componentPropertyDefinitions;
                        }
                    }
                    catch (_a) {
                        /* keep layer name as fallback */
                    }
                    const cp = inst.componentProperties || {};
                    const props = Object.keys(cp).map((rk) => {
                        const entry = cp[rk];
                        const opts = defs && defs[rk] && defs[rk].variantOptions
                            ? defs[rk].variantOptions
                            : undefined;
                        return {
                            name: stripPropKey(rk),
                            type: entry.type,
                            value: String(entry.value),
                            options: opts,
                        };
                    });
                    out.push({ key, name: inst.name, component, props });
                }
                if ("children" in c)
                    yield recurse(c, depth + 1, key);
            }
        });
        yield recurse(root, 0, "");
        return out;
    });
}
const EXEMPLE_NESTED_MAX = 16;
// Walk a probe instance collecting nested component INSTANCEs (e.g. a
// HelperText instance inside a Field) with their stable index-path key and a
// snapshot of their component-property types. Descends into nested instances
// too. Snapshots are taken before the probe is disposed.
function collectNestedInstances(root) {
    return __awaiter(this, void 0, void 0, function* () {
        const out = [];
        const recurse = (node, depth, parentKey) => __awaiter(this, void 0, void 0, function* () {
            if (depth > EXEMPLE_TEXT_DEPTH_MAX)
                return;
            if (!("children" in node))
                return;
            const cont = node;
            for (let i = 0; i < cont.children.length; i++) {
                if (out.length >= EXEMPLE_NESTED_MAX)
                    return;
                const c = cont.children[i];
                if (c.visible === false)
                    continue;
                const key = parentKey ? `${parentKey}/${i}` : String(i);
                if (c.type === "INSTANCE") {
                    const inst = c;
                    const cpRaw = inst.componentProperties || {};
                    const cp = {};
                    for (const pk of Object.keys(cpRaw)) {
                        cp[pk] = { type: cpRaw[pk].type };
                    }
                    let mc = null;
                    try {
                        mc = yield inst.getMainComponentAsync();
                    }
                    catch (_a) {
                        mc = null;
                    }
                    out.push({ key, name: inst.name, mc, cp });
                }
                if ("children" in c)
                    yield recurse(c, depth + 1, key);
            }
        });
        yield recurse(root, 0, "");
        return out;
    });
}
function buildNestedInstanceInfos(snaps) {
    return __awaiter(this, void 0, void 0, function* () {
        var _a, _b;
        const res = [];
        for (const s of snaps) {
            const mc = s.mc;
            if (!mc)
                continue;
            const inSet = mc.parent && mc.parent.type === "COMPONENT_SET";
            const componentName = inSet ? mc.parent.name : mc.name;
            const defsHost = inSet
                ? mc.parent
                : mc;
            const defs = defsHost.componentPropertyDefinitions;
            const swapNames = yield resolveInstanceSwapNames(defs);
            const props = [];
            for (const pk of Object.keys(s.cp)) {
                const type = s.cp[pk].type;
                const name = stripPropKey(pk);
                if (type === "VARIANT") {
                    const d = (_a = defs[pk]) !== null && _a !== void 0 ? _a : defs[name];
                    props.push({ name, type, options: d === null || d === void 0 ? void 0 : d.variantOptions });
                }
                else if (type === "INSTANCE_SWAP") {
                    const opts = (_b = swapNames.get(pk)) !== null && _b !== void 0 ? _b : swapNames.get(name);
                    props.push({ name, type, options: opts });
                }
                else {
                    props.push({ name, type });
                }
            }
            if (props.length > 0) {
                res.push({ key: s.key, name: s.name, component: componentName, props });
            }
        }
        return res;
    });
}
// Apply LLM-chosen overrides on a nested component instance. Maps the
// sub-component's stripped prop names to its raw keys, coerces per type,
// normalizes VARIANT values to an exact option, resolves INSTANCE_SWAP
// candidate names to component ids, and reports how many props really changed
// (so callers can surface an honest success/failure).
function applyNestedInstanceProps(node, scenario) {
    return __awaiter(this, void 0, void 0, function* () {
        var _a, _b;
        const cp = node.componentProperties || {};
        const byName = new Map();
        for (const rk of Object.keys(cp)) {
            byName.set(stripPropKey(rk), {
                rawKey: rk,
                type: cp[rk].type,
            });
        }
        const mc = yield node.getMainComponentAsync();
        const defsHost = mc && mc.parent && mc.parent.type === "COMPONENT_SET"
            ? mc.parent
            : mc;
        const defs = defsHost ? defsHost.componentPropertyDefinitions : null;
        let swapResolver = null;
        const payload = {};
        const requestedKeys = Object.keys(scenario).filter((propName) => { var _a; return Boolean((_a = byName.get(propName)) !== null && _a !== void 0 ? _a : byName.get(stripPropKey(propName))); });
        for (const propName of Object.keys(scenario)) {
            const info = (_a = byName.get(propName)) !== null && _a !== void 0 ? _a : byName.get(stripPropKey(propName));
            if (!info)
                continue;
            const v = scenario[propName];
            if (info.type === "BOOLEAN") {
                payload[info.rawKey] =
                    v === true ||
                        (typeof v === "string" && /^(true|oui|yes|1|on)$/i.test(v.trim()));
            }
            else if (info.type === "INSTANCE_SWAP") {
                if (!swapResolver && defsHost) {
                    swapResolver = yield buildSwapResolver(defsHost.componentPropertyDefinitions);
                }
                const r = swapResolver
                    ? (_b = swapResolver.get(propName)) !== null && _b !== void 0 ? _b : swapResolver.get(info.rawKey)
                    : undefined;
                if (r) {
                    const id = r.byName.get(String(v));
                    if (id)
                        payload[info.rawKey] = id;
                }
            }
            else if (info.type === "VARIANT") {
                // Normalize to an exact variant option (case/space-insensitive) so a
                // near-miss value from the LLM still flips the variant.
                const want = String(v).trim().toLowerCase();
                const opts = (defs && defs[info.rawKey] && defs[info.rawKey].variantOptions) || [];
                const exact = opts.find((o) => o.trim().toLowerCase() === want);
                payload[info.rawKey] = exact !== null && exact !== void 0 ? exact : String(v);
            }
            else {
                payload[info.rawKey] = String(v); // TEXT
            }
        }
        const keys = Object.keys(payload);
        if (keys.length === 0) {
            return { requested: requestedKeys.length, applied: 0, details: "" };
        }
        try {
            node.setProperties(payload);
        }
        catch (_c) {
            for (const rk of keys) {
                try {
                    node.setProperties({ [rk]: payload[rk] });
                }
                catch (_d) {
                    /* skip this prop, keep the nested instance */
                }
            }
        }
        // Honest verification: re-read and count props that now equal the request.
        const after = node.componentProperties || {};
        let applied = 0;
        const miss = [];
        for (const rk of keys) {
            const got = after[rk] && "value" in after[rk]
                ? after[rk].value
                : undefined;
            if (String(got) === String(payload[rk]))
                applied++;
            else
                miss.push(stripPropKey(rk) + "→" + String(payload[rk]));
        }
        return {
            requested: keys.length,
            applied,
            details: miss.length ? "non appliqué : " + miss.join(", ") : "",
        };
    });
}
function buildExempleContext(target) {
    return __awaiter(this, void 0, void 0, function* () {
        var _a;
        const base = getBaseComponent(target);
        if (!base)
            return { textLayers: [], swaps: [], nestedInstances: [] };
        let textLayers = [];
        let nestedSnaps = [];
        try {
            const probe = base.createInstance();
            textLayers = collectInstanceTextLayers(probe);
            nestedSnaps = yield collectNestedInstances(probe);
            probe.remove();
        }
        catch (_b) {
            textLayers = [];
            nestedSnaps = [];
        }
        const [swapNames, nestedInstances] = yield Promise.all([
            resolveInstanceSwapNames(target.componentPropertyDefinitions),
            buildNestedInstanceInfos(nestedSnaps),
        ]);
        const swaps = [];
        for (const rawKey of swapNames.keys()) {
            const options = (_a = swapNames.get(rawKey)) !== null && _a !== void 0 ? _a : [];
            if (options.length > 0) {
                swaps.push({ name: stripPropKey(rawKey), options });
            }
        }
        return { textLayers, swaps, nestedInstances };
    });
}
// Resolve INSTANCE_SWAP candidate display names to component ids, keyed by
// stripped prop name. Mirrors the resolution eligibleAxes does for the matrix.
function buildSwapResolver(defs) {
    return __awaiter(this, void 0, void 0, function* () {
        var _a;
        const out = new Map();
        const tasks = [];
        for (const key of Object.keys(defs)) {
            const def = defs[key];
            if (def.type !== "INSTANCE_SWAP")
                continue;
            const pv = (_a = def.preferredValues) !== null && _a !== void 0 ? _a : [];
            if (pv.length === 0)
                continue;
            const byName = new Map();
            tasks.push(Promise.all(pv.map((item) => __awaiter(this, void 0, void 0, function* () {
                try {
                    if (item.type === "COMPONENT") {
                        const c = yield figma.importComponentByKeyAsync(item.key);
                        byName.set(c.name, c.id);
                    }
                    else {
                        const cs = yield figma.importComponentSetByKeyAsync(item.key);
                        const first = cs.children.find((ch) => ch.type === "COMPONENT");
                        if (first)
                            byName.set(cs.name, first.id);
                    }
                }
                catch (_a) {
                    /* skip unresolvable candidate */
                }
            }))).then(() => {
                if (byName.size > 0)
                    out.set(stripPropKey(key), { rawKey: key, byName });
            }));
        }
        yield Promise.all(tasks);
        return out;
    });
}
// Load every font used by a TEXT node (handles mixed-font ranges) then replace
// its content. Best-effort: a failure leaves the layer untouched.
function applyTextLayerOverride(node, text) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            const fonts = [];
            if (node.fontName === figma.mixed) {
                const len = node.characters.length || 1;
                for (let i = 0; i < len; i++) {
                    const f = node.getRangeFontName(i, i + 1);
                    if (f !== figma.mixed)
                        fonts.push(f);
                }
            }
            else {
                fonts.push(node.fontName);
            }
            for (const f of fonts) {
                try {
                    yield figma.loadFontAsync(f);
                }
                catch (_a) {
                    /* ignore individual font failure */
                }
            }
            node.characters = text;
        }
        catch (_b) {
            /* leave layer unchanged */
        }
    });
}
// Recursively collect all variable IDs referenced in a polymorphic
// `boundVariables` value. Handles three shapes Figma uses:
//   - direct alias: { id: "...", type: "VARIABLE" }
//   - array of aliases: [{id}, {id}, ...]
//   - nested object: { r: alias, g: alias, ... } (gradients, effects, etc.)
function extractAliasIdsFromValue(val) {
    const out = [];
    const recurseValue = (v) => {
        if (!v)
            return;
        if (Array.isArray(v)) {
            for (const item of v)
                recurseValue(item);
            return;
        }
        if (typeof v !== "object")
            return;
        const obj = v;
        if (typeof obj.id === "string") {
            out.push(obj.id);
            return;
        }
        for (const k in obj)
            recurseValue(obj[k]);
    };
    recurseValue(val);
    return out;
}
// Walk all visible nodes in `inst` (and the root itself) and emit one VarUsage
// per (variableId, anchorNodeKey) tuple — deduped across fields. Mirrors the
// instance-walker convention from findAllVisibleLayersWithPositions: stops at
// nested component-like nodes, key is the path of child indexes.
function collectVariableUsagesOnInstance(inst) {
    const out = [];
    const seen = new Set(); // dedupe by `${variableId}|${anchorKey}`
    const visit = (node, key, localX, localY, w, h) => {
        const bv = node.boundVariables;
        if (!bv)
            return;
        for (const field in bv) {
            const ids = extractAliasIdsFromValue(bv[field]);
            for (const id of ids) {
                const sig = `${id}|${key}`;
                if (seen.has(sig))
                    continue;
                seen.add(sig);
                // Root background bindings refer to the whole component → keep own
                // box; otherwise drill to the representative leaf of the bound node.
                const t = key === "root"
                    ? { x: localX, y: localY, w, h }
                    : resolveLeafTarget(node, localX, localY, w, h, inst);
                out.push({
                    variableId: id,
                    anchorKey: key,
                    anchorLocalX: localX,
                    anchorLocalY: localY,
                    anchorW: w,
                    anchorH: h,
                    anchorTargetX: t.x,
                    anchorTargetY: t.y,
                    anchorTargetW: t.w,
                    anchorTargetH: t.h,
                });
            }
        }
    };
    // The instance root itself (e.g., its background fills can be variable-bound).
    visit(inst, "root", 0, 0, inst.width, inst.height);
    const recurse = (node, depth, dx, dy, parentKey) => {
        if (depth > ANATOMY_TREE_MAX_DEPTH)
            return;
        if (!("children" in node))
            return;
        const container = node;
        for (let i = 0; i < container.children.length; i++) {
            const child = container.children[i];
            if (child.visible === false)
                continue;
            const lm = child;
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
// Walk the instance and emit one TextStyleUsage per (styleId, anchorKey).
// Only TEXT nodes contribute. Mixed-style text (`textStyleId === figma.mixed`)
// is skipped — it would require per-character resolution.
function collectTextStyleUsagesOnInstance(inst) {
    const out = [];
    const seen = new Set();
    const visitText = (node, key, x, y, w, h) => {
        const styleId = node.textStyleId;
        if (typeof styleId !== "string" || styleId === "")
            return;
        const sig = `${styleId}|${key}`;
        if (seen.has(sig))
            return;
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
    const recurse = (node, depth, dx, dy, parentKey) => {
        if (depth > ANATOMY_TREE_MAX_DEPTH)
            return;
        if (!("children" in node))
            return;
        const container = node;
        for (let i = 0; i < container.children.length; i++) {
            const child = container.children[i];
            if (child.visible === false)
                continue;
            const lm = child;
            const cx = dx + lm.x;
            const cy = dy + lm.y;
            const childKey = parentKey === "root" ? String(i) : `${parentKey}/${i}`;
            if (child.type === "TEXT") {
                visitText(child, childKey, cx, cy, lm.width, lm.height);
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
function previewAnatomyLayers(target, variantSel) {
    const { base, booleanPayload } = getAnatomyBaseAndOverrides(target, variantSel);
    if (!base)
        return { tree: [], autoSelected: [] };
    const inst = base.createInstance();
    if (Object.keys(booleanPayload).length > 0) {
        try {
            inst.setProperties(booleanPayload);
        }
        catch (_a) {
            // Ignore invalid combos.
        }
    }
    // Structural-only here (no LLM available in this fast sync sandbox call):
    // hide redundant repeated siblings so the user can't make a dead selection
    // that generation would silently drop. The LLM refinement only further-
    // merges at generation time; a veto would just re-expose an item (extra
    // row in output), never break a selection.
    const rep = detectRepeatedSiblingGroups(inst);
    const tree = walkAnatomyTree(inst).filter((t) => !rep.isRedundant(t.key));
    const autoSelected = findNamedLayersOnInstance(inst, rep).map((l) => l.key);
    inst.remove();
    return { tree, autoSelected };
}
// Same as previewAnatomyLayers but the auto-selected set is the layers where
// at least one design token usage was found (color variable or text style).
// The instance root ("root" key) is never included — it isn't shown in the
// picker tree, but its tokens are always documented anyway.
function previewTokensLayers(target, variantSel) {
    const { base, booleanPayload } = getAnatomyBaseAndOverrides(target, variantSel);
    if (!base)
        return { tree: [], autoSelected: [] };
    const inst = base.createInstance();
    if (Object.keys(booleanPayload).length > 0) {
        try {
            inst.setProperties(booleanPayload);
        }
        catch (_a) {
            /* ignore */
        }
    }
    // Structural-only dedup (no LLM here): hide redundant repeated siblings so
    // the picker matches the deduped output and selections stay live.
    const rep = detectRepeatedSiblingGroups(inst);
    const tree = walkAnatomyTree(inst).filter((t) => !rep.isRedundant(t.key));
    // The picker tree stops at INSTANCE / COMPONENT / COMPONENT_SET (clean UX),
    // but the token walkers descend through them. Map each deep usage to the
    // nearest ancestor that IS in the picker tree, so checking an icon's row
    // pre-selects the icon (which then pulls in its inner usages).
    const treeKeys = new Set(tree.map((t) => t.key));
    const seen = new Set();
    for (const u of collectVariableUsagesOnInstance(inst)) {
        if (u.anchorKey !== "root" && rep.isRedundant(u.anchorKey))
            continue;
        const anc = nearestPickerAncestor(u.anchorKey, treeKeys);
        if (anc)
            seen.add(anc);
    }
    for (const u of collectTextStyleUsagesOnInstance(inst)) {
        if (u.anchorKey !== "root" && rep.isRedundant(u.anchorKey))
            continue;
        const anc = nearestPickerAncestor(u.anchorKey, treeKeys);
        if (anc)
            seen.add(anc);
    }
    const autoSelected = Array.from(seen);
    inst.remove();
    return { tree, autoSelected };
}
function buildVariantsSection(target, groupBy, excludeRules, propLocks, layout, visualBg) {
    return __awaiter(this, void 0, void 0, function* () {
        const defs = target.componentPropertyDefinitions;
        const allAxes = yield eligibleAxes(defs);
        if (allAxes.length === 0) {
            return {
                node: textFrame("Aucune propriété de type VARIANT, BOOLEAN ou INSTANCE_SWAP exploitable comme axe."),
                comboCount: 0,
            };
        }
        const base = getBaseComponent(target);
        if (!base)
            return { node: textFrame("Composant de base introuvable."), comboCount: 0 };
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
        const validGroupBy = groupBy.filter((name) => allAxes.some((a) => a.name === name));
        // Boolean-like axes get a switch glyph (BOOLEAN type or yes/no, on/off, true/false labels).
        const boolishAxes = new Set();
        for (const a of allAxes) {
            if (a.propType === "BOOLEAN" || isBoolishOptions(a.options))
                boolishAxes.add(a.name);
        }
        // Build all cards in async-batched fashion (yields UI thread every CARD_BATCH_SIZE)
        const cards = yield buildAllAdminCards(combos, base, layout, boolishAxes, visualBg);
        // Assemble layout from pre-built cards (sync, fast)
        const contentNode = buildAdminLayoutFromCards(combos, cards, validGroupBy, 0, layout);
        // The caption (axes / sort / locks / skipped) used to live here; the section
        // now exposes only the combo count, surfaced as a tag next to the title by
        // the caller (see buildPropsAndMatrixContent).
        void totalEnumerated;
        void excluded;
        return { node: contentNode, comboCount: combos.length };
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
// Resolve every INSTANCE_SWAP prop's preferredValues to a list of component
// names, so the props table can show meaningful labels instead of the literal
// "Instance". Returns rawKey → ordered, deduped names. Props with empty or
// unresolvable preferredValues are absent from the map (caller falls back).
function resolveInstanceSwapNames(defs) {
    return __awaiter(this, void 0, void 0, function* () {
        var _a;
        const out = new Map();
        const tasks = [];
        for (const key of Object.keys(defs)) {
            const def = defs[key];
            if (def.type !== "INSTANCE_SWAP")
                continue;
            const pv = (_a = def.preferredValues) !== null && _a !== void 0 ? _a : [];
            if (pv.length === 0)
                continue;
            const rawKey = key;
            tasks.push(Promise.all(pv.map((item) => __awaiter(this, void 0, void 0, function* () {
                try {
                    if (item.type === "COMPONENT") {
                        const c = yield figma.importComponentByKeyAsync(item.key);
                        return c.name;
                    }
                    const cs = yield figma.importComponentSetByKeyAsync(item.key);
                    return cs.name;
                }
                catch (_a) {
                    return null;
                }
            }))).then((names) => {
                const seen = new Set();
                const list = [];
                for (const n of names) {
                    if (n && !seen.has(n)) {
                        seen.add(n);
                        list.push(n);
                    }
                }
                if (list.length > 0)
                    out.set(rawKey, list);
            }));
        }
        yield Promise.all(tasks);
        return out;
    });
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
// Walks `root.children` using the slash-separated path of indexes that the
// pickers emit (e.g. "0/1/2"). Returns the matching node, or null if any
// segment is out of range. The "root" key resolves to the root itself.
function resolveLayerByKey(root, key) {
    if (!key || key === "root")
        return root;
    const parts = key.split("/");
    let cur = root;
    for (const part of parts) {
        const idx = Number(part);
        if (!Number.isFinite(idx) || idx < 0)
            return null;
        if (!("children" in cur))
            return null;
        const c = cur.children[idx];
        if (!c)
            return null;
        cur = c;
    }
    return cur;
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
    // Apply propLocks: locked axes are filtered to only their allowed labels.
    // Empty array = axis stays free. Locks pointing to labels that no longer
    // exist are silently ignored.
    const effectiveAxes = allAxes.map((axis) => {
        const allowed = propLocks[axis.name];
        if (!allowed || allowed.length === 0)
            return axis;
        const allowedSet = new Set(allowed);
        const filtered = axis.options.filter((o) => allowedSet.has(o.label));
        return filtered.length > 0 ? Object.assign(Object.assign({}, axis), { options: filtered }) : axis;
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
function computeAdminCardLayout(target) {
    let maxW = 0;
    let maxH = 0;
    if (target.type === "COMPONENT_SET") {
        for (const c of target.children) {
            if (c.type === "COMPONENT") {
                maxW = Math.max(maxW, c.width);
                maxH = Math.max(maxH, c.height);
            }
        }
    }
    else {
        maxW = target.width;
        maxH = target.height;
    }
    const desiredVisualW = Math.round(maxW + ADMIN_VISUAL_PADDING);
    const cardW = Math.max(ADMIN_CARD_MIN_W, desiredVisualW + ADMIN_CARD_PADDING * 2);
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
function computeAdminCardLayoutForFixedWidth(target, contentW) {
    let maxW = 0;
    let maxH = 0;
    if (target.type === "COMPONENT_SET") {
        for (const c of target.children) {
            if (c.type === "COMPONENT") {
                maxW = Math.max(maxW, c.width);
                maxH = Math.max(maxH, c.height);
            }
        }
    }
    else {
        maxW = target.width;
        maxH = target.height;
    }
    const minCardW = Math.max(ADMIN_CARD_MIN_W, Math.round(maxW + ADMIN_VISUAL_PADDING) + ADMIN_CARD_PADDING * 2);
    // Pick the largest cards-per-row that fits, capped at ADMIN_CARDS_PER_ROW.
    let cardsPerRow = 1;
    for (let n = ADMIN_CARDS_PER_ROW; n >= 1; n--) {
        const total = n * minCardW + (n - 1) * ADMIN_GRID_GAP;
        if (total <= contentW) {
            cardsPerRow = n;
            break;
        }
    }
    const cardW = Math.floor((contentW - (cardsPerRow - 1) * ADMIN_GRID_GAP) / cardsPerRow);
    const visualW = cardW - ADMIN_CARD_PADDING * 2;
    const visualH = Math.max(ADMIN_VISUAL_MIN_H, Math.round(maxH + ADMIN_VISUAL_PADDING));
    return { cardW, visualW, visualH, contentW, sheetW: contentW + ADMIN_SHEET_PADDING * 2 };
}
function makeAdminCombinationCard(combo, base, layout, boolishAxes, visualBg) {
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
    const labelCount = combo.labels.length;
    const propsAreaH = labelCount === 0
        ? 0
        : labelCount * ADMIN_PROP_ROW_HEIGHT + (labelCount - 1) * ADMIN_PROP_ROW_GAP;
    const cardH = ADMIN_CARD_PADDING * 2 +
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
            const renderAsBool = boolishAxes.has(lbl.axisName) && lbl.valueLabel !== "—";
            propsArea.appendChild(makeAdminPropRow(lbl.axisName, lbl.valueLabel, renderAsBool, layout.visualW));
        }
        card.appendChild(propsArea);
    }
    return card;
}
function makeAdminPropRow(name, value, isBool, width) {
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
    }
    else {
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
function makeAdminSwitch(isOn) {
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
function buildAllAdminCards(combos, base, layout, boolishAxes, visualBg) {
    return __awaiter(this, void 0, void 0, function* () {
        const cards = [];
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
                yield new Promise((r) => setTimeout(r, 0));
            }
        }
        return cards;
    });
}
// Flat grid of admin cards with WRAP, sized to the sheet content width.
// Cards have FIXED width = layout.cardW (max 3 per row).
// Bug guard: WRAP frames must be created with counter=FIXED + non-zero height,
// then flipped to AUTO after children are appended — otherwise Figma's WRAP
// reflow can collapse the grid (and sometimes children) to 1px.
function buildAdminFlatGrid(cards, layout) {
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
    for (const card of cards)
        grid.appendChild(card);
    grid.counterAxisSizingMode = "AUTO";
    return grid;
}
// Admin variant of buildLayoutFromCards. Same grouping logic, but admin
// typography (Colfax/Roboto with Inter fallback, ref color palette).
function buildAdminLayoutFromCards(combos, cards, groupBy, depth, layout) {
    var _a;
    if (groupBy.length === 0 || combos.length === 0) {
        return buildAdminFlatGrid(cards, layout);
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
    wrapper.layoutAlign = "STRETCH";
    wrapper.itemSpacing = depth === 0 ? 24 : 16;
    wrapper.fills = [];
    for (const [value, g] of groups) {
        if (g.cards.length === 0)
            continue;
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
            figma.ui.postMessage({
                type: "progress",
                phase: "matrix",
                current: end,
                total: combos.length,
            });
            if (end < combos.length) {
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
function makeAdminTable(headers, widths, rows) {
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
function makeAdminHeaderRow(cells, widths, totalW) {
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
function makeAdminBodyRow(cells, widths, totalW) {
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
function makeAdminBodyCell(content, width) {
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
    }
    else {
        cell.appendChild(content);
    }
    return cell;
}
// Coloured chip used in the "Type" column. Reuses the brand tag palettes so
// type colors stay consistent with the inline section tags (BLUE/GREEN/etc.).
function makeTypeChip(type) {
    let palette;
    let label;
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
function makeBulletList(items) {
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
function valuesAsItems(p, instanceSwapNames) {
    var _a;
    switch (p.type) {
        case "BOOLEAN":
            return ["true", "false"];
        case "TEXT":
            return [`"${String(p.defaultValue)}"`];
        case "VARIANT":
            return (_a = p.variantOptions) !== null && _a !== void 0 ? _a : [];
        case "INSTANCE_SWAP": {
            const resolved = instanceSwapNames === null || instanceSwapNames === void 0 ? void 0 : instanceSwapNames.get(p.rawKey);
            return resolved && resolved.length > 0 ? resolved : ["Instance"];
        }
        default:
            return [];
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
