figma.showUI(__html__, { width: 520, height: 640, title: "DS Extractor" });

sendSelectionInfo();

figma.on('selectionchange', sendSelectionInfo);

const CONFIG_KEY = 'ds-extractor-config';
const DOCS_KEY = 'ds-extractor-docs';

figma.ui.onmessage = async (msg) => {
  if (msg.type === 'get-config') {
    try {
      const cfg = await figma.clientStorage.getAsync(CONFIG_KEY);
      figma.ui.postMessage({ type: 'config', data: cfg || null });
    } catch (e) {
      figma.ui.postMessage({ type: 'config', data: null });
    }
    return;
  }
  if (msg.type === 'save-config') {
    try {
      await figma.clientStorage.setAsync(CONFIG_KEY, msg.data);
      figma.ui.postMessage({ type: 'config-saved', ok: true });
    } catch (e) {
      figma.ui.postMessage({ type: 'config-saved', ok: false, message: e && e.message ? e.message : String(e) });
    }
    return;
  }
  if (msg.type === 'get-docs') {
    try {
      const docs = await figma.clientStorage.getAsync(DOCS_KEY);
      figma.ui.postMessage({ type: 'docs', data: Array.isArray(docs) ? docs : [] });
    } catch (e) {
      figma.ui.postMessage({ type: 'docs', data: [] });
    }
    return;
  }
  if (msg.type === 'save-docs') {
    try {
      await figma.clientStorage.setAsync(DOCS_KEY, msg.data || []);
      figma.ui.postMessage({ type: 'docs-saved', ok: true });
    } catch (e) {
      figma.ui.postMessage({ type: 'docs-saved', ok: false, message: e && e.message ? e.message : String(e) });
    }
    return;
  }
  if (msg.type === 'extract') {
    try {
      const { components, docs } = pickSelection();
      if (components.length === 0) {
        figma.ui.postMessage({ type: 'error', message: 'Sélectionne au moins un composant (COMPONENT ou COMPONENT_SET).' });
        return;
      }
      figma.ui.postMessage({ type: 'progress', step: 'extract' });
      const payload = await buildPayload(components[0], docs, components.slice(1));
      figma.ui.postMessage({ type: 'payload', data: payload });
    } catch (err) {
      figma.ui.postMessage({ type: 'error', message: 'Extraction échouée : ' + (err && err.message ? err.message : String(err)) });
    }
  }
};

function pickSelection() {
  const sel = figma.currentPage.selection;
  const components = [];
  const docs = [];
  for (const n of sel) {
    if (n.type === 'COMPONENT' || n.type === 'COMPONENT_SET') components.push(n);
    else if (n.type === 'FRAME' || n.type === 'SECTION' || n.type === 'GROUP') docs.push(n);
  }
  return { components, docs };
}

function nodeSummary(n) {
  return { id: n.id, name: n.name, type: n.type };
}

function sendSelectionInfo() {
  const { components, docs } = pickSelection();
  figma.ui.postMessage({
    type: 'selection',
    components: components.map(nodeSummary),
    docs: docs.map(nodeSummary),
  });
}

async function buildPayload(componentNode, docFrames, extraComponents) {
  const [metadata, css, documentation] = await Promise.all([
    extractMetadata(componentNode),
    extractCSS(componentNode),
    extractDocs(docFrames),
  ]);

  const payload = {
    meta: {
      extractedAt: new Date().toISOString(),
      pageName: figma.currentPage.name,
      fileName: figma.root.name,
    },
    metadata,
    css,
    documentation,
  };

  if (extraComponents && extraComponents.length > 0) {
    payload.warnings = {
      extraComponents: extraComponents.map(c => ({ id: c.id, name: c.name, type: c.type })),
    };
  }

  return payload;
}

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
      boundVariables: c.boundVariables ? summarizeBoundVariables(c.boundVariables, c) : null,
      children: extractChildren(c, 0, 2),
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
    boundVariables: child.boundVariables ? summarizeBoundVariables(child.boundVariables, child) : null,
    characters: child.type === 'TEXT' ? child.characters : undefined,
    fontSize: child.type === 'TEXT' && typeof child.fontSize === 'number' ? child.fontSize : undefined,
    fontName: child.type === 'TEXT' && typeof child.fontName === 'object' && child.fontName !== null ? child.fontName : undefined,
    children: extractChildren(child, depth + 1, maxDepth),
  }));
}

function channelToHex(c) {
  const n = Math.round(Math.max(0, Math.min(1, c)) * 255);
  return n.toString(16).padStart(2, '0');
}

function rgbToHex(color) {
  if (!color || typeof color !== 'object') return null;
  const hex = '#' + channelToHex(color.r) + channelToHex(color.g) + channelToHex(color.b);
  if (typeof color.a === 'number' && color.a < 1) return hex + channelToHex(color.a);
  return hex;
}

function describeVariable(varId, consumerNode) {
  try {
    const v = figma.variables.getVariableById(varId);
    if (!v) return { id: varId, name: null, type: null, value: null };
    const out = { name: v.name, type: v.resolvedType };
    if (consumerNode && typeof v.resolveForConsumer === 'function') {
      const resolved = v.resolveForConsumer(consumerNode);
      if (resolved && resolved.value !== undefined && resolved.value !== null) {
        if (resolved.resolvedType === 'COLOR' && typeof resolved.value === 'object') {
          out.value = rgbToHex(resolved.value);
          if (typeof resolved.value.a === 'number') out.alpha = resolved.value.a;
        } else {
          out.value = resolved.value;
        }
      }
    }
    return out;
  } catch (e) {
    return { id: varId, name: null, type: null, value: null, error: e && e.message ? e.message : String(e) };
  }
}

function summarizeBoundVariables(bv, consumerNode) {
  const result = {};
  for (const key of Object.keys(bv)) {
    const binding = bv[key];
    try {
      if (Array.isArray(binding)) {
        result[key] = binding.map(b => describeVariable(b.id, consumerNode));
      } else if (binding && binding.id) {
        result[key] = describeVariable(binding.id, consumerNode);
      }
    } catch (e) {
      result[key] = null;
    }
  }
  return result;
}

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

// --- Documentation extraction (multi-selection) ---

const DOC_MAX_DEPTH = 6;
const DOC_NODE_BUDGET = 400;
const SCHEMA_CONCURRENCY = 30;
const PROP_VALUE_MAX_CHARS = 200;

// Tri en ordre de lecture visuel (top→bottom, puis left→right avec tolérance
// pour grouper les éléments d'une même "ligne"). Utilisé pour les containers
// freeform (sans auto-layout) où l'ordre natif des enfants est l'ordre z-index.
const ROW_TOLERANCE = 8;
function sortByReadingOrder(nodes) {
  return nodes.slice().sort((a, b) => {
    const ay = typeof a.y === 'number' ? a.y : 0;
    const by = typeof b.y === 'number' ? b.y : 0;
    if (Math.abs(ay - by) < ROW_TOLERANCE) {
      const ax = typeof a.x === 'number' ? a.x : 0;
      const bx = typeof b.x === 'number' ? b.x : 0;
      return ax - bx;
    }
    return ay - by;
  });
}

async function extractDocs(docFrames) {
  if (!docFrames || docFrames.length === 0) {
    return { version: 2, frames: [], textFallback: [] };
  }

  const budget = { remaining: DOC_NODE_BUDGET };
  const schemaPlaceholders = [];
  const instancePlaceholders = [];
  const textFallback = [];

  const orderedDocFrames = sortByReadingOrder(docFrames);

  const frames = orderedDocFrames.map((frame, index) => ({
    index,
    name: frame.name,
    type: frame.type,
    width: Math.round(frame.width),
    height: Math.round(frame.height),
    tree: walkDocNode(frame, 0, budget, schemaPlaceholders, instancePlaceholders, textFallback, new WeakSet()),
    _node: frame,
  }));

  await Promise.all([
    resolveSchemaCSS(schemaPlaceholders),
    resolveInstanceNames(instancePlaceholders),
    captureFrameImages(frames),
  ]);

  for (const f of frames) delete f._node;

  return { version: 2, frames, textFallback };
}

// --- Vision : capture PNG de chaque frame de doc ---

const IMAGE_MAX_DIMENSION = 1024; // px — borne sup pour limiter le coût en tokens
const IMAGE_MAX_BYTES = 4 * 1024 * 1024; // 4 MB max par image (sécurité)

async function captureFrameImages(frames) {
  await Promise.all(frames.map(async f => {
    const node = f._node;
    if (!node || typeof node.exportAsync !== 'function') {
      f.image = null;
      return;
    }
    try {
      const w = node.width || 1;
      const h = node.height || 1;
      const scale = Math.min(2, IMAGE_MAX_DIMENSION / Math.max(w, h));
      const bytes = await node.exportAsync({
        format: 'PNG',
        constraint: { type: 'SCALE', value: scale > 0 ? scale : 1 },
      });
      if (bytes.byteLength > IMAGE_MAX_BYTES) {
        f.image = null;
        f.imageError = 'image trop lourde (' + bytes.byteLength + ' B)';
        return;
      }
      f.image = {
        mediaType: 'image/png',
        base64: figma.base64Encode(bytes),
        width: Math.round(w * scale),
        height: Math.round(h * scale),
        bytes: bytes.byteLength,
      };
    } catch (e) {
      f.image = null;
      f.imageError = e && e.message ? e.message : String(e);
    }
  }));
}

function walkDocNode(node, depth, budget, schemaPlaceholders, instancePlaceholders, textFallback, visited) {
  if (budget.remaining <= 0) {
    return { kind: 'truncated', reason: 'budget' };
  }
  if (visited.has(node)) {
    return { kind: 'truncated', reason: 'cycle' };
  }
  visited.add(node);
  budget.remaining -= 1;

  if (node.type === 'TEXT') {
    const text = typeof node.characters === 'string' ? node.characters : '';
    if (text) textFallback.push(text);
    return {
      kind: 'text',
      text,
      fontSize: typeof node.fontSize === 'number' ? node.fontSize : null,
      level: textLevel(node.fontSize),
    };
  }

  if (node.type === 'INSTANCE') {
    const inst = {
      kind: 'instance',
      componentName: null,
      properties: summarizeInstanceProperties(node),
      _node: node,
    };
    instancePlaceholders.push(inst);
    return inst;
  }

  const hasChildren = 'children' in node && Array.isArray(node.children) && node.children.length > 0;
  const w = node.width || 0;
  const h = node.height || 0;
  const hasVisualPresence = w >= 4 && h >= 4;

  if (depth >= 1 && hasVisualPresence && !hasTextOrInstance(node)) {
    const placeholder = {
      kind: 'schema',
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

  if (depth >= DOC_MAX_DEPTH) {
    return { kind: 'truncated', reason: 'depth', name: node.name };
  }

  const container = {
    kind: 'container',
    name: node.name,
    type: node.type,
    layout: node.layoutMode || 'NONE',
    isRow: isRowLayout(node),
    children: [],
  };

  if (hasChildren) {
    const isAutoLayout = node.layoutMode === 'HORIZONTAL' || node.layoutMode === 'VERTICAL';
    const orderedChildren = isAutoLayout ? node.children : sortByReadingOrder(node.children);
    for (let i = 0; i < orderedChildren.length; i++) {
      const child = orderedChildren[i];
      if (child.visible === false) continue;
      container.children.push(walkDocNode(child, depth + 1, budget, schemaPlaceholders, instancePlaceholders, textFallback, visited));
      if (budget.remaining <= 0) {
        const remaining = orderedChildren.length - (i + 1);
        if (remaining > 0) container.children.push({ kind: 'truncated', reason: 'budget', remaining });
        break;
      }
    }
  }

  return container;
}

function hasTextOrInstance(node) {
  if (node.type === 'TEXT' || node.type === 'INSTANCE') return true;
  if (!('children' in node) || node.visible === false) return false;
  for (const child of node.children) {
    if (hasTextOrInstance(child)) return true;
  }
  return false;
}

function textLevel(fontSize) {
  if (typeof fontSize !== 'number') return 'body';
  if (fontSize >= 24) return 'h1';
  if (fontSize >= 18) return 'h2';
  if (fontSize >= 14) return 'h3';
  return 'body';
}

function isRowLayout(node) {
  return node.layoutMode === 'HORIZONTAL'
    && 'children' in node
    && node.children.length >= 2
    && node.counterAxisAlignItems !== 'CENTER';
}

async function resolveInstanceNames(placeholders) {
  for (let i = 0; i < placeholders.length; i += SCHEMA_CONCURRENCY) {
    const batch = placeholders.slice(i, i + SCHEMA_CONCURRENCY);
    await Promise.all(batch.map(async p => {
      try {
        const mc = typeof p._node.getMainComponentAsync === 'function'
          ? await p._node.getMainComponentAsync()
          : p._node.mainComponent;
        if (!mc) {
          p.componentName = '(detached)';
        } else if (mc.parent && mc.parent.type === 'COMPONENT_SET') {
          p.componentName = mc.parent.name + ' / ' + mc.name;
        } else {
          p.componentName = mc.name;
        }
      } catch (e) {
        p.componentName = '(unknown)';
      }
      delete p._node;
    }));
  }
}

function summarizeInstanceProperties(instanceNode) {
  const out = {};
  try {
    const props = instanceNode.componentProperties;
    if (!props) return out;
    for (const key of Object.keys(props)) {
      const entry = props[key];
      let v = entry && 'value' in entry ? entry.value : entry;
      if (typeof v === 'string' && v.length > PROP_VALUE_MAX_CHARS) {
        v = v.slice(0, PROP_VALUE_MAX_CHARS) + '…';
      }
      out[key] = v;
    }
  } catch (e) {
    // ignore
  }
  return out;
}

async function resolveSchemaCSS(placeholders) {
  for (let i = 0; i < placeholders.length; i += SCHEMA_CONCURRENCY) {
    const batch = placeholders.slice(i, i + SCHEMA_CONCURRENCY);
    await Promise.all(batch.map(async p => {
      try {
        p.css = await p._node.getCSSAsync();
      } catch (e) {
        p.css = null;
        p.cssError = e && e.message ? e.message : String(e);
      }
      delete p._node;
    }));
  }
}
