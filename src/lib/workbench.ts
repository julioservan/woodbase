// Lógica pura de la Mesa de trabajo: instancias de piezas (con encolados
// manuales en tiras/capas), colisiones con kerf, imanes de ajuste y cálculo
// del mayor hueco libre de cada tabla. Sin dependencias de React ni del
// servidor: se usa desde el componente cliente.

import { KERF_IN } from "./optimizer";

export { KERF_IN };
export const SNAP_IN = 0.4; // distancia a la que "imanta" un borde
export const WIDTH_GLUE_ALLOW_IN = 0.125; // demasía de canteado por tira
export const THICK_GLUE_ALLOW_IN = 1 / 16; // demasía de cepillado por capa

export type GlueAxis = "ancho" | "grosor";

export interface WbGlue {
  k: number;
  axis: GlueAxis;
}

/** Estado persistido en projects.workbench. */
export interface WbLayout {
  /** Unidades de tabla puestas sobre la mesa. */
  boards: { key: string; itemId: string; unitIndex: number }[];
  placements: WbPlacement[];
  /** Encolado manual activo por pieza del despiece. */
  glue: Record<string, WbGlue>;
}

export interface WbPlacement {
  key: string;
  /** Instancia colocada (`${partId}#${n}` o `…~t2` si es tira/capa). */
  instanceKey: string;
  boardKey: string;
  x: number; // pulgadas a lo largo de la tabla (veta)
  y: number; // pulgadas a lo ancho
  rot: boolean; // girada 90° (la veta de la pieza cruza la de la tabla)
}

export const EMPTY_LAYOUT: WbLayout = { boards: [], placements: [], glue: {} };

export function normalizeLayout(raw: unknown): WbLayout {
  if (typeof raw !== "object" || raw === null) return EMPTY_LAYOUT;
  const l = raw as Partial<WbLayout>;
  return {
    boards: Array.isArray(l.boards) ? l.boards : [],
    placements: Array.isArray(l.placements) ? l.placements : [],
    glue: typeof l.glue === "object" && l.glue !== null ? l.glue : {},
  };
}

export interface WbPart {
  id: string;
  name: string;
  quantity: number;
  lengthIn: number;
  widthIn: number;
  thicknessIn: number;
  species: string | null;
}

export interface WbInstance {
  key: string;
  partId: string;
  label: string;
  lengthIn: number;
  widthIn: number;
  thicknessIn: number;
  species: string | null;
  /** Presente si la instancia es una tira/capa de un encolado manual. */
  glue?: WbGlue & { index: number };
}

/**
 * Expande el despiece en instancias colocables, aplicando los encolados
 * manuales: `ancho` parte la pieza en k tiras (con demasía de canteado),
 * `grosor` en k capas (con demasía de cepillado).
 */
export function buildInstances(
  parts: WbPart[],
  glue: Record<string, WbGlue>,
): WbInstance[] {
  const out: WbInstance[] = [];
  for (const p of parts) {
    const count = Math.max(1, Math.floor(p.quantity));
    const cfg = glue[p.id];
    for (let i = 0; i < count; i++) {
      const base = count > 1 ? `${p.name} ${i + 1}` : p.name;
      if (!cfg || cfg.k <= 1) {
        out.push({
          key: `${p.id}#${i}`,
          partId: p.id,
          label: base,
          lengthIn: p.lengthIn,
          widthIn: p.widthIn,
          thicknessIn: p.thicknessIn,
          species: p.species,
        });
      } else if (cfg.axis === "ancho") {
        const stripW = p.widthIn / cfg.k + WIDTH_GLUE_ALLOW_IN;
        for (let j = 0; j < cfg.k; j++) {
          out.push({
            key: `${p.id}#${i}~t${j}`,
            partId: p.id,
            label: `${base} · tira ${j + 1}/${cfg.k}`,
            lengthIn: p.lengthIn,
            widthIn: stripW,
            thicknessIn: p.thicknessIn,
            species: p.species,
            glue: { ...cfg, index: j },
          });
        }
      } else {
        const layerT = p.thicknessIn / cfg.k + THICK_GLUE_ALLOW_IN;
        for (let j = 0; j < cfg.k; j++) {
          out.push({
            key: `${p.id}#${i}~c${j}`,
            partId: p.id,
            label: `${base} · capa ${j + 1}/${cfg.k}`,
            lengthIn: p.lengthIn,
            widthIn: p.widthIn,
            thicknessIn: layerT,
            species: p.species,
            glue: { ...cfg, index: j },
          });
        }
      }
    }
  }
  return out;
}

export interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

/** Huella de una instancia sobre la tabla (girada si rot). */
export function footprint(inst: WbInstance, rot: boolean): { w: number; h: number } {
  return rot
    ? { w: inst.widthIn, h: inst.lengthIn }
    : { w: inst.lengthIn, h: inst.widthIn };
}

/** ¿Se solapan dos rectángulos dejando menos de `gap` entre ellos? */
export function collide(a: Rect, b: Rect, gap = KERF_IN): boolean {
  return (
    a.x < b.x + b.w + gap - 1e-6 &&
    b.x < a.x + a.w + gap - 1e-6 &&
    a.y < b.y + b.h + gap - 1e-6 &&
    b.y < a.y + a.h + gap - 1e-6
  );
}

const clamp = (v: number, min: number, max: number) =>
  Math.min(Math.max(v, min), Math.max(min, max));

/**
 * Ajusta una posición: primero imanta los bordes a la tabla y a las piezas
 * vecinas (dejando el kerf de la sierra), luego encaja dentro de la tabla.
 */
export function snapPosition(
  x: number,
  y: number,
  w: number,
  h: number,
  boardL: number,
  boardW: number,
  others: Rect[],
): { x: number; y: number } {
  const candX: number[] = [0, boardL - w];
  const candY: number[] = [0, boardW - h];
  for (const o of others) {
    candX.push(o.x + o.w + KERF_IN, o.x - w - KERF_IN, o.x);
    candY.push(o.y + o.h + KERF_IN, o.y - h - KERF_IN, o.y);
  }
  let bx = x;
  let bestDx = SNAP_IN;
  for (const c of candX) {
    const d = Math.abs(c - x);
    if (d < bestDx) {
      bestDx = d;
      bx = c;
    }
  }
  let by = y;
  let bestDy = SNAP_IN;
  for (const c of candY) {
    const d = Math.abs(c - y);
    if (d < bestDy) {
      bestDy = d;
      by = c;
    }
  }
  return { x: clamp(bx, 0, boardL - w), y: clamp(by, 0, boardW - h) };
}

/**
 * Mayor rectángulo libre de la tabla (rejilla de 1/4″ + histograma).
 * Sirve para saber de un vistazo qué sobra aprovechable queda.
 */
export function largestFreeRect(
  boardL: number,
  boardW: number,
  rects: Rect[],
): { w: number; h: number } {
  const res = 0.25;
  const cols = Math.max(1, Math.round(boardL / res));
  const rows = Math.max(1, Math.round(boardW / res));
  const occ = new Uint8Array(cols * rows);
  for (const r of rects) {
    const c0 = clamp(Math.floor(r.x / res), 0, cols - 1);
    const c1 = clamp(Math.ceil((r.x + r.w) / res) - 1, 0, cols - 1);
    const r0 = clamp(Math.floor(r.y / res), 0, rows - 1);
    const r1 = clamp(Math.ceil((r.y + r.h) / res) - 1, 0, rows - 1);
    for (let ri = r0; ri <= r1; ri++) {
      occ.fill(1, ri * cols + c0, ri * cols + c1 + 1);
    }
  }
  const heights = new Int32Array(cols);
  let best = { area: 0, w: 0, h: 0 };
  const stack: number[] = [];
  for (let ri = 0; ri < rows; ri++) {
    for (let ci = 0; ci < cols; ci++) {
      heights[ci] = occ[ri * cols + ci] ? 0 : heights[ci] + 1;
    }
    stack.length = 0;
    for (let ci = 0; ci <= cols; ci++) {
      const hgt = ci < cols ? heights[ci] : 0;
      while (stack.length && heights[stack[stack.length - 1]] > hgt) {
        const top = stack.pop()!;
        const height = heights[top];
        const width = stack.length ? ci - stack[stack.length - 1] - 1 : ci;
        if (width * height > best.area) {
          best = { area: width * height, w: width, h: height };
        }
      }
      if (ci < cols) stack.push(ci);
    }
  }
  return { w: best.w * res, h: best.h * res };
}

/** Color estable por especie (tono pastel) para pintar las piezas. */
export function speciesColor(species: string | null, alpha = 1): string {
  if (!species) return `hsla(30, 8%, 52%, ${alpha})`;
  let hash = 0;
  for (const ch of species.toLowerCase()) {
    hash = (hash * 31 + ch.charCodeAt(0)) % 360;
  }
  return `hsla(${hash}, 45%, 48%, ${alpha})`;
}
