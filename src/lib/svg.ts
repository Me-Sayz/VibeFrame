const SVG_NS = "http://www.w3.org/2000/svg";
export const MAX_SVG_CHARS = 400_000;

export const SHAPE_TAGS = ["path", "rect", "circle", "ellipse", "line", "polyline", "polygon"];
const ALLOWED = new Set([
  "svg", "g", "defs", "title", "desc", "linearGradient", "radialGradient", "stop", "clipPath", "use", ...SHAPE_TAGS,
]);
const NON_VISIBLE = "defs,clipPath,mask,pattern,symbol,linearGradient,radialGradient";

const TAG_NAME: Record<string, string> = {
  path: "Bentuk", rect: "Persegi", circle: "Lingkaran", ellipse: "Elips", line: "Garis", polyline: "Poligon", polygon: "Poligon",
};

export type SvgResult =
  | { ok: true; svg: string; removed: string[]; fixed: string[] }
  | { ok: false; error: string };

export function extractSvg(text: string): string {
  const open = text.search(/<svg[\s>]/i);
  const close = text.toLowerCase().lastIndexOf("</svg>");
  if (open === -1 || close === -1 || close < open) return "";
  return text.slice(open, close + 6).trim();
}

function parse(svg: string): Document | null {
  const doc = new DOMParser().parseFromString(svg, "image/svg+xml");
  return doc.getElementsByTagName("parsererror").length > 0 ? null : doc;
}

function cleanAttributes(el: Element) {
  for (const attr of Array.from(el.attributes)) {
    const name = attr.name.toLowerCase();
    const value = attr.value;
    const isHref = name === "href" || name.endsWith(":href");
    const bad =
      name.startsWith("on") ||
      (isHref && !value.trim().startsWith("#")) ||
      /javascript:|expression\(|@import/i.test(value) ||
      /url\(\s*['"]?\s*[^#'")\s]/i.test(value);
    if (bad) el.removeAttribute(attr.name);
  }
}

export function sanitizeSvg(text: string): SvgResult {
  const raw = extractSvg(text);
  if (!raw) return { ok: false, error: "Tidak ada elemen <svg> ... </svg> di kode ini." };
  if (raw.length > MAX_SVG_CHARS) return { ok: false, error: "SVG terlalu besar (maksimal 400.000 karakter)." };

  const openTag = /^<svg[^>]*>/i.exec(raw)?.[0] ?? "";
  let src = raw;
  if (!/\sxmlns\s*=/.test(openTag)) src = src.replace(/^<svg/i, `<svg xmlns="${SVG_NS}"`);
  if (/xlink:/.test(src) && !/xmlns:xlink\s*=/.test(openTag)) {
    src = src.replace(/^<svg/i, `<svg xmlns:xlink="http://www.w3.org/1999/xlink"`);
  }

  const doc = parse(src);
  if (!doc) return { ok: false, error: "SVG rusak (XML tidak valid). Cek tanda < > & di kodenya, atau minta AI memperbaikinya." };
  const root = doc.documentElement;
  if (root.localName !== "svg" || root.namespaceURI !== SVG_NS) return { ok: false, error: "Elemen utamanya bukan <svg>." };

  const removed = new Set<string>();
  const fixed: string[] = [];
  const walk = (el: Element) => {
    for (const node of Array.from(el.childNodes)) if (node.nodeType === 8) node.remove();
    for (const child of Array.from(el.children)) {
      if (!ALLOWED.has(child.localName)) {
        removed.add(child.localName);
        child.remove();
        continue;
      }
      cleanAttributes(child);
      walk(child);
    }
  };
  cleanAttributes(root);
  walk(root);

  const vb = root.getAttribute("viewBox") ?? "";
  if (!/^\s*-?[\d.]+[\s,]+-?[\d.]+[\s,]+[\d.]+[\s,]+[\d.]+\s*$/.test(vb)) {
    const w = parseFloat(root.getAttribute("width") ?? "");
    const h = parseFloat(root.getAttribute("height") ?? "");
    root.setAttribute("viewBox", w > 0 && h > 0 ? `0 0 ${w} ${h}` : "0 0 1000 1000");
    fixed.push("viewBox ditambahkan");
  }
  root.removeAttribute("width");
  root.removeAttribute("height");

  return { ok: true, svg: new XMLSerializer().serializeToString(root), removed: [...removed], fixed };
}

const NAMED: Record<string, string> = {
  black: "#000000", white: "#ffffff", red: "#ff0000", green: "#008000", blue: "#0000ff", yellow: "#ffff00",
  orange: "#ffa500", purple: "#800080", pink: "#ffc0cb", gray: "#808080", grey: "#808080", brown: "#a52a2a",
  cyan: "#00ffff", magenta: "#ff00ff", lime: "#00ff00", navy: "#000080", teal: "#008080", gold: "#ffd700",
  silver: "#c0c0c0",
};

export type Paint = { kind: "color"; hex: string } | { kind: "none" } | { kind: "other"; raw: string };

const hex2 = (n: number) => Math.max(0, Math.min(255, Math.round(n))).toString(16).padStart(2, "0");

export function parsePaint(raw: string | null, fallback: Paint): Paint {
  if (raw === null) return fallback;
  const v = raw.trim().toLowerCase();
  if (v === "none" || v === "transparent") return { kind: "none" };
  const short = /^#([0-9a-f])([0-9a-f])([0-9a-f])$/.exec(v);
  if (short) return { kind: "color", hex: `#${short[1]}${short[1]}${short[2]}${short[2]}${short[3]}${short[3]}` };
  const long = /^#([0-9a-f]{6})(?:[0-9a-f]{2})?$/.exec(v);
  if (long) return { kind: "color", hex: `#${long[1]}` };
  const rgb = /^rgba?\(\s*(\d+(?:\.\d+)?)[\s,]+(\d+(?:\.\d+)?)[\s,]+(\d+(?:\.\d+)?)/.exec(v);
  if (rgb) return { kind: "color", hex: `#${hex2(+rgb[1])}${hex2(+rgb[2])}${hex2(+rgb[3])}` };
  if (NAMED[v]) return { kind: "color", hex: NAMED[v] };
  return { kind: "other", raw: raw.trim() };
}

function declared(el: Element, prop: string): string | null {
  const style = el.getAttribute("style");
  if (style) {
    const m = new RegExp(`(?:^|;)\\s*${prop}\\s*:\\s*([^;]+)`, "i").exec(style);
    if (m) return m[1].trim();
  }
  const attr = el.getAttribute(prop);
  return attr !== null ? attr.trim() : null;
}

function effective(el: Element, prop: "fill" | "stroke"): string | null {
  for (let n: Element | null = el; n; n = n.parentElement) {
    const v = declared(n, prop);
    if (v !== null && v !== "inherit") return v;
  }
  return null;
}

const paintOf = (el: Element, prop: "fill" | "stroke"): Paint =>
  parsePaint(effective(el, prop), prop === "fill" ? { kind: "color", hex: "#000000" } : { kind: "none" });

function shapesOf(doc: Document): Element[] {
  return Array.from(doc.querySelectorAll(SHAPE_TAGS.join(","))).filter((el) => !el.closest(NON_VISIBLE));
}

const humanize = (id: string) => id.replace(/[_-]+/g, " ").trim();

export interface SvgPart {
  index: number;
  label: string;
  tag: string;
  fill: Paint;
  stroke: Paint;
}

export function getParts(svg: string): SvgPart[] {
  const doc = parse(svg);
  if (!doc) return [];
  const perTag = new Map<string, number>();
  const perGroup = new Map<Element, number>();
  return shapesOf(doc).map((el, index) => {
    const tag = el.localName;
    let label: string;
    if (el.id) {
      label = humanize(el.id);
    } else {
      const group = el.parentElement?.closest("g[id]") ?? null;
      if (group) {
        const n = (perGroup.get(group) ?? 0) + 1;
        perGroup.set(group, n);
        label = `${humanize(group.id)} · ${n}`;
      } else {
        const n = (perTag.get(tag) ?? 0) + 1;
        perTag.set(tag, n);
        label = `${TAG_NAME[tag] ?? "Bentuk"} ${n}`;
      }
    }
    return { index, label, tag, fill: paintOf(el, "fill"), stroke: paintOf(el, "stroke") };
  });
}

function writePaint(el: Element, prop: "fill" | "stroke", hex: string) {
  el.setAttribute(prop, hex);
  const style = el.getAttribute("style");
  if (!style) return;
  const next = style.replace(new RegExp(`(?:^|;)\\s*${prop}\\s*:[^;]*`, "gi"), "").replace(/^;+/, "").trim();
  if (next) el.setAttribute("style", next);
  else el.removeAttribute("style");
}

const serialize = (doc: Document) => new XMLSerializer().serializeToString(doc.documentElement);

export function setPartColor(svg: string, index: number, prop: "fill" | "stroke", hex: string): string | null {
  const doc = parse(svg);
  const el = doc ? shapesOf(doc)[index] : undefined;
  if (!doc || !el) return null;
  writePaint(el, prop, hex);
  return serialize(doc);
}

export function recolor(svg: string, prop: "fill" | "stroke", from: string, to: string): string | null {
  const doc = parse(svg);
  if (!doc) return null;
  let changed = 0;
  for (const el of shapesOf(doc)) {
    const p = paintOf(el, prop);
    if (p.kind === "color" && p.hex === from) {
      writePaint(el, prop, to);
      changed++;
    }
  }
  return changed > 0 ? serialize(doc) : null;
}

export function dimOthers(svg: string, keep: number[]): string {
  const doc = parse(svg);
  if (!doc) return svg;
  const kept = new Set(keep);
  shapesOf(doc).forEach((el, i) => {
    if (!kept.has(i)) el.setAttribute("opacity", "0.15");
  });
  return serialize(doc);
}

export function viewBoxSize(svg: string): { width: number; height: number } {
  const m = /viewBox\s*=\s*["']\s*-?[\d.]+[\s,]+-?[\d.]+[\s,]+([\d.]+)[\s,]+([\d.]+)/.exec(svg);
  const width = m ? parseFloat(m[1]) : 1000;
  const height = m ? parseFloat(m[2]) : 1000;
  return width > 0 && height > 0 ? { width, height } : { width: 1000, height: 1000 };
}

export function withBackground(svg: string, color: string): string {
  const doc = parse(svg);
  if (!doc) return svg;
  const root = doc.documentElement;
  const n = (root.getAttribute("viewBox") ?? "").trim().split(/[\s,]+/).map(Number);
  const [x, y, w, h] = n.length === 4 && n.every(Number.isFinite) ? n : [0, 0, 1000, 1000];
  const rect = doc.createElementNS(SVG_NS, "rect");
  rect.setAttribute("id", "latar");
  rect.setAttribute("x", String(x));
  rect.setAttribute("y", String(y));
  rect.setAttribute("width", String(w));
  rect.setAttribute("height", String(h));
  rect.setAttribute("fill", color);
  root.insertBefore(rect, root.firstChild);
  return serialize(doc);
}

export const toDataUrl =(svg: string) => `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;

export async function rasterize(svg: string, width: number): Promise<Blob> {
  const size = viewBoxSize(svg);
  const height = Math.max(1, Math.round((width * size.height) / size.width));
  const img = new Image();
  img.src = toDataUrl(svg);
  await img.decode();
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Browser tidak bisa membuat kanvas untuk PNG.");
  ctx.drawImage(img, 0, 0, width, height);
  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/png"));
  if (!blob) throw new Error("PNG gagal dibuat.");
  return blob;
}

export interface HitMap {
  width: number;
  height: number;
  data: Uint8ClampedArray;
  count: number;
}

const stripOpacity = (el: Element) => {
  for (const name of ["opacity", "fill-opacity", "stroke-opacity"]) el.removeAttribute(name);
  const style = el.getAttribute("style");
  if (!style) return;
  const next = style.replace(/(?:^|;)\s*(?:fill-|stroke-)?opacity\s*:[^;]*/gi, "").replace(/^;+/, "").trim();
  if (next) el.setAttribute("style", next);
  else el.removeAttribute("style");
};

export function buildHitSvg(svg: string): { svg: string; count: number } | null {
  const doc = parse(svg);
  if (!doc) return null;
  const root = doc.documentElement;
  root.setAttribute("shape-rendering", "crispEdges");
  stripOpacity(root);
  root.querySelectorAll("*").forEach(stripOpacity);
  const shapes = shapesOf(doc);
  shapes.forEach((el, i) => {
    const hex = `#${(i + 1).toString(16).padStart(6, "0")}`;
    writePaint(el, "fill", paintOf(el, "fill").kind === "none" ? "none" : hex);
    writePaint(el, "stroke", paintOf(el, "stroke").kind === "none" ? "none" : hex);
  });
  return { svg: serialize(doc), count: shapes.length };
}

export async function rasterizeHit(svg: string, maxSide = 640): Promise<HitMap | null> {
  const hit = buildHitSvg(svg);
  if (!hit || hit.count === 0) return null;
  const size = viewBoxSize(svg);
  const scale = maxSide / Math.max(size.width, size.height);
  const width = Math.max(1, Math.round(size.width * scale));
  const height = Math.max(1, Math.round(size.height * scale));
  const img = new Image();
  img.src = toDataUrl(hit.svg);
  await img.decode();
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) return null;
  ctx.drawImage(img, 0, 0, width, height);
  return { width, height, data: ctx.getImageData(0, 0, width, height).data, count: hit.count };
}

export function hitIndexAt(map: HitMap, nx: number, ny: number): number | null {
  const x = Math.min(map.width - 1, Math.max(0, Math.floor(nx * map.width)));
  const y = Math.min(map.height - 1, Math.max(0, Math.floor(ny * map.height)));
  const o = (y * map.width + x) * 4;
  if (map.data[o + 3] !== 255) return null;
  const n = (map.data[o] << 16) | (map.data[o + 1] << 8) | map.data[o + 2];
  return n >= 1 && n <= map.count ? n - 1 : null;
}

export function hitBounds(map: HitMap, index: number): { x: number; y: number; w: number; h: number } | null {
  const id = index + 1;
  let x0 = map.width, y0 = map.height, x1 = -1, y1 = -1;
  for (let y = 0; y < map.height; y++) {
    for (let x = 0; x < map.width; x++) {
      const o = (y * map.width + x) * 4;
      if (map.data[o + 3] !== 255) continue;
      if (((map.data[o] << 16) | (map.data[o + 1] << 8) | map.data[o + 2]) !== id) continue;
      if (x < x0) x0 = x;
      if (x > x1) x1 = x;
      if (y < y0) y0 = y;
      if (y > y1) y1 = y;
    }
  }
  if (x1 < 0) return null;
  return { x: x0 / map.width, y: y0 / map.height, w: (x1 - x0 + 1) / map.width, h: (y1 - y0 + 1) / map.height };
}
