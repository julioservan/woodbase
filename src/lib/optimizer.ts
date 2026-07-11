// Optimizador de cortes: empaqueta las piezas del despiece en las tablas del
// inventario minimizando desperdicio. Algoritmo de estanterías (shelf packing)
// con cortes de guillotina: respeta la veta (el largo de la pieza va siempre
// a lo largo de la tabla), descuenta el kerf de la sierra y devuelve las
// sobras aprovechables como futuros scraps.

import { COUNTABLE_UNIT_RE, formatInches } from "./utils";

export const KERF_IN = 0.125; // ~1/8″ de sierra
const MIN_SCRAP_IN = 4; // sobras menores de 4×4″ no se consideran aprovechables
const MAX_UNITS_PER_ITEM = 10;

export interface GlueInfo {
  /** Eje encolado: tiras al canto (ancho) o capas laminadas (grosor). */
  axis: "ancho" | "grosor";
  pieces: number;
}

export interface PartInstance {
  key: string; // `${partId}#${n}`
  partId: string;
  name: string;
  lengthIn: number;
  widthIn: number;
  thicknessIn: number;
  /** Especie deseada; null = cualquier madera vale. */
  species: string | null;
  /** Presente si esta instancia es una tira/capa de un encolado. */
  glue?: GlueInfo;
}

export interface GlueNote {
  partName: string;
  count: number; // cuántas piezas iguales se encolan así
  axis: "ancho" | "grosor";
  pieces: number;
  pieceDim: number; // ancho de tira o grosor de capa (con demasía)
  targetDim: number; // ancho o grosor final de la pieza
}

export interface BoardUnit {
  key: string; // `${itemId}#${n}`
  itemId: string;
  unitIndex: number;
  name: string;
  species: string | null;
  lengthIn: number;
  widthIn: number;
  thicknessIn: number;
}

export interface Placement {
  part: PartInstance;
  x: number; // a lo largo de la tabla (veta)
  y: number; // a lo ancho
  needsPlaning: boolean; // la tabla es más gruesa: hay que cepillar
}

export interface Leftover {
  x: number;
  y: number;
  lengthIn: number;
  widthIn: number;
}

export interface BoardPlan {
  board: BoardUnit;
  placements: Placement[];
  leftovers: Leftover[];
  utilization: number; // 0..1 del área de la tabla
}

export interface OptimizeResult {
  plans: BoardPlan[];
  unplaced: PartInstance[];
}

interface Shelf {
  y: number;
  height: number;
  xCursor: number;
}

function fitsThickness(board: { thicknessIn: number }, part: { thicknessIn: number }) {
  return board.thicknessIn >= part.thicknessIn - 0.01;
}

function fitsSpecies(board: BoardUnit, part: PartInstance) {
  if (!part.species) return true;
  if (!board.species) return false;
  return board.species.trim().toLowerCase() === part.species.trim().toLowerCase();
}

/** Empaqueta lo que quepa de `parts` en una tabla. No muta `parts`. */
function packBoard(
  board: BoardUnit,
  parts: PartInstance[],
): { placements: Placement[]; leftovers: Leftover[]; utilization: number } {
  // Anchas primero para formar estanterías compactas; a igual ancho, largas.
  const candidates = parts
    .filter(
      (p) =>
        fitsSpecies(board, p) &&
        fitsThickness(board, p) &&
        p.lengthIn <= board.lengthIn &&
        p.widthIn <= board.widthIn,
    )
    .slice()
    .sort((a, b) => b.widthIn - a.widthIn || b.lengthIn - a.lengthIn);

  const shelves: Shelf[] = [];
  const placements: Placement[] = [];
  let yCursor = 0;

  for (const part of candidates) {
    let placed = false;
    for (const shelf of shelves) {
      if (
        part.widthIn <= shelf.height &&
        shelf.xCursor + part.lengthIn <= board.lengthIn
      ) {
        placements.push({
          part,
          x: shelf.xCursor,
          y: shelf.y,
          needsPlaning: board.thicknessIn - part.thicknessIn > 1 / 32,
        });
        shelf.xCursor += part.lengthIn + KERF_IN;
        placed = true;
        break;
      }
    }
    if (!placed && yCursor + part.widthIn <= board.widthIn) {
      const shelf: Shelf = { y: yCursor, height: part.widthIn, xCursor: 0 };
      shelves.push(shelf);
      placements.push({
        part,
        x: 0,
        y: shelf.y,
        needsPlaning: board.thicknessIn - part.thicknessIn > 1 / 32,
      });
      shelf.xCursor = part.lengthIn + KERF_IN;
      yCursor += part.widthIn + KERF_IN;
    }
  }

  // Sobras: el resto de cada estantería y la franja superior completa.
  const leftovers: Leftover[] = [];
  for (const shelf of shelves) {
    const restLength = board.lengthIn - shelf.xCursor;
    if (restLength >= MIN_SCRAP_IN && shelf.height >= MIN_SCRAP_IN) {
      leftovers.push({
        x: shelf.xCursor,
        y: shelf.y,
        lengthIn: restLength,
        widthIn: shelf.height,
      });
    }
  }
  const topStrip = board.widthIn - yCursor;
  if (topStrip >= MIN_SCRAP_IN && board.lengthIn >= MIN_SCRAP_IN) {
    leftovers.push({
      x: 0,
      y: yCursor,
      lengthIn: board.lengthIn,
      widthIn: topStrip,
    });
  }

  const usedArea = placements.reduce(
    (sum, p) => sum + p.part.lengthIn * p.part.widthIn,
    0,
  );
  return {
    placements,
    leftovers,
    utilization: usedArea / (board.lengthIn * board.widthIn),
  };
}

export function expandParts(
  parts: {
    id: string;
    name: string;
    quantity: number;
    lengthIn: number;
    widthIn: number;
    thicknessIn: number;
    species?: string | null;
  }[],
): PartInstance[] {
  return parts.flatMap((p) =>
    Array.from({ length: Math.max(1, Math.floor(p.quantity)) }, (_, i) => ({
      key: `${p.id}#${i}`,
      partId: p.id,
      name: p.name,
      lengthIn: p.lengthIn,
      widthIn: p.widthIn,
      thicknessIn: p.thicknessIn,
      species: p.species ?? null,
    })),
  );
}

export function expandBoards(
  items: {
    id: string;
    name: string;
    species: string | null;
    quantity: number;
    unit: string;
    lengthIn: number | null;
    widthIn: number | null;
    thicknessIn: number | null;
  }[],
): BoardUnit[] {
  return items.flatMap((item) => {
    if (item.lengthIn == null || item.widthIn == null || item.thicknessIn == null) {
      return [];
    }
    // Solo las unidades contables multiplican tablas: "10 pies tablares" es
    // volumen de una única tabla, no diez tablones.
    const countable = COUNTABLE_UNIT_RE.test(item.unit);
    const units = countable
      ? Math.min(Math.max(1, Math.floor(item.quantity)), MAX_UNITS_PER_ITEM)
      : 1;
    return Array.from({ length: units }, (_, i) => ({
      key: `${item.id}#${i}`,
      itemId: item.id,
      unitIndex: i,
      name: item.name,
      species: item.species,
      lengthIn: item.lengthIn!,
      widthIn: item.widthIn!,
      thicknessIn: item.thicknessIn!,
    }));
  });
}

const WIDTH_GLUE_ALLOW_IN = 0.125; // demasía de canteado por tira
const THICK_GLUE_ALLOW_IN = 1 / 16; // demasía de cepillado por capa
const MAX_STRIPS = 4;
const MAX_LAYERS = 3;

function fitsSomeBoard(part: PartInstance, boards: BoardUnit[]): boolean {
  return boards.some(
    (b) =>
      fitsSpecies(b, part) &&
      fitsThickness(b, part) &&
      b.lengthIn >= part.lengthIn &&
      b.widthIn >= part.widthIn,
  );
}

/**
 * Encolados: si una pieza no cabe entera en ninguna tabla, se parte en tiras
 * al canto (demasiado ancha) o en capas laminadas (demasiado gruesa), con
 * demasía de canteado/cepillado. Cada tira/capa se corta como pieza normal y
 * el resultado indica cómo encolarlas.
 */
export function planGlueUps(
  instances: PartInstance[],
  boards: BoardUnit[],
): { instances: PartInstance[]; notes: GlueNote[] } {
  const out: PartInstance[] = [];
  const noteMap = new Map<string, GlueNote>();

  for (const inst of instances) {
    if (fitsSomeBoard(inst, boards)) {
      out.push(inst);
      continue;
    }

    let transformed = false;
    // Tiras al canto: la pieza es más ancha que cualquier tabla.
    for (let k = 2; k <= MAX_STRIPS && !transformed; k++) {
      const stripW = inst.widthIn / k + WIDTH_GLUE_ALLOW_IN;
      if (fitsSomeBoard({ ...inst, widthIn: stripW }, boards)) {
        for (let i = 0; i < k; i++) {
          out.push({
            ...inst,
            key: `${inst.key}~t${i}`,
            name: `${inst.name} · tira ${i + 1}/${k}`,
            widthIn: stripW,
            glue: { axis: "ancho", pieces: k },
          });
        }
        const noteKey = `${inst.name}|ancho|${k}`;
        const note = noteMap.get(noteKey) ?? {
          partName: inst.name,
          count: 0,
          axis: "ancho" as const,
          pieces: k,
          pieceDim: stripW,
          targetDim: inst.widthIn,
        };
        note.count += 1;
        noteMap.set(noteKey, note);
        transformed = true;
      }
    }
    // Capas laminadas: la pieza es más gruesa que cualquier tabla.
    for (let k = 2; k <= MAX_LAYERS && !transformed; k++) {
      const layerT = inst.thicknessIn / k + THICK_GLUE_ALLOW_IN;
      if (fitsSomeBoard({ ...inst, thicknessIn: layerT }, boards)) {
        for (let i = 0; i < k; i++) {
          out.push({
            ...inst,
            key: `${inst.key}~c${i}`,
            name: `${inst.name} · capa ${i + 1}/${k}`,
            thicknessIn: layerT,
            glue: { axis: "grosor", pieces: k },
          });
        }
        const noteKey = `${inst.name}|grosor|${k}`;
        const note = noteMap.get(noteKey) ?? {
          partName: inst.name,
          count: 0,
          axis: "grosor" as const,
          pieces: k,
          pieceDim: layerT,
          targetDim: inst.thicknessIn,
        };
        note.count += 1;
        noteMap.set(noteKey, note);
        transformed = true;
      }
    }
    // Sin transformación posible: se queda tal cual y saldrá en faltantes.
    if (!transformed) out.push(inst);
  }

  return { instances: out, notes: [...noteMap.values()] };
}

/**
 * Explica por qué una pieza no cupo: qué le falta al inventario para ella.
 * Se evalúa contra TODAS las tablas (usadas o no) para dar el motivo real.
 */
export function unplacedReason(part: PartInstance, boards: BoardUnit[]): string {
  if (boards.length === 0) return "no hay tablas con medidas en el inventario";
  const ofSpecies = boards.filter((b) => fitsSpecies(b, part));
  if (ofSpecies.length === 0) {
    return `no hay ${part.species} en el inventario`;
  }
  const thick = ofSpecies.filter((b) => fitsThickness(b, part));
  if (thick.length === 0) {
    return `ninguna tabla con grosor ≥ ${formatInches(part.thicknessIn)}″ (ni laminando ${MAX_LAYERS} capas)`;
  }
  const wide = thick.filter((b) => b.widthIn >= part.widthIn);
  if (wide.length === 0) {
    return `ninguna tabla con ancho ≥ ${formatInches(part.widthIn)}″ (ni encolando ${MAX_STRIPS} tiras)`;
  }
  const long = wide.filter((b) => b.lengthIn >= part.lengthIn);
  if (long.length === 0) {
    return `ninguna tabla con largo ≥ ${formatInches(part.lengthIn)}″ (y ancho/grosor suficientes)`;
  }
  return "cabe en tus tablas, pero no junto al resto de piezas: hace falta otra tabla";
}

/**
 * Optimización global: si una sola tabla puede con todo el despiece, se elige
 * la más pequeña que lo consiga; si no, se van eligiendo con avaricia las
 * tablas que más área del despiece colocan (a igualdad, la más pequeña).
 */
export function optimize(
  partInstances: PartInstance[],
  boards: BoardUnit[],
): OptimizeResult {
  const byAreaAsc = boards
    .slice()
    .sort((a, b) => a.lengthIn * a.widthIn - b.lengthIn * b.widthIn || a.key.localeCompare(b.key));

  // ¿Una sola tabla lo resuelve?
  for (const board of byAreaAsc) {
    const attempt = packBoard(board, partInstances);
    if (attempt.placements.length === partInstances.length) {
      return { plans: [{ board, ...attempt }], unplaced: [] };
    }
  }

  const plans: BoardPlan[] = [];
  let remaining = partInstances.slice();
  const available = byAreaAsc.slice();

  while (remaining.length > 0 && available.length > 0) {
    let best: { index: number; plan: BoardPlan; area: number } | null = null;
    for (let i = 0; i < available.length; i++) {
      const attempt = packBoard(available[i], remaining);
      if (attempt.placements.length === 0) continue;
      const area = attempt.placements.reduce(
        (sum, p) => sum + p.part.lengthIn * p.part.widthIn,
        0,
      );
      if (!best || area > best.area) {
        best = { index: i, plan: { board: available[i], ...attempt }, area };
      }
    }
    if (!best) break;
    plans.push(best.plan);
    available.splice(best.index, 1);
    const placedKeys = new Set(best.plan.placements.map((p) => p.part.key));
    remaining = remaining.filter((p) => !placedKeys.has(p.key));
  }

  return { plans, unplaced: remaining };
}
