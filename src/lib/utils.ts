import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Parsea una medida en pulgadas escrita "a lo carpintero":
 *   "3/4"  ·  "1 1/2"  ·  "1-1/2"  ·  "48"  ·  "1,5"  ·  '3/4"'
 * Devuelve pulgadas decimales, o null si no es interpretable.
 */
export function parseInches(input: string | null): number | null {
  if (input == null) return null;
  const s = input
    .trim()
    .replace(/["″”]|in\.?$/gi, "")
    .trim();
  if (!s) return null;

  const fraction = s.match(/^(?:(\d+)[\s-]+)?(\d+)\s*\/\s*(\d+)$/);
  if (fraction) {
    const whole = fraction[1] ? parseInt(fraction[1], 10) : 0;
    const numerator = parseInt(fraction[2], 10);
    const denominator = parseInt(fraction[3], 10);
    if (denominator === 0) return null;
    return whole + numerator / denominator;
  }

  const n = Number(s.replace(",", "."));
  return Number.isFinite(n) && n >= 0 ? n : null;
}

/**
 * Formatea pulgadas decimales como fracción de carpintero redondeada
 * al 1/16″ más cercano: 1.75 → «1 3/4», 0.375 → «3/8», 48 → «48».
 */
export function formatInches(value: number | null): string | null {
  if (value == null) return null;
  const sixteenths = Math.round(value * 16);
  const whole = Math.floor(sixteenths / 16);
  let numerator = sixteenths % 16;
  let denominator = 16;
  while (numerator > 0 && numerator % 2 === 0) {
    numerator /= 2;
    denominator /= 2;
  }
  if (numerator === 0) return `${whole}`;
  if (whole === 0) return `${numerator}/${denominator}`;
  return `${whole} ${numerator}/${denominator}`;
}

export function formatDimensions(
  lengthIn: number | null,
  widthIn: number | null,
  thicknessIn: number | null,
): string | null {
  if (lengthIn == null && widthIn == null && thicknessIn == null) return null;
  const fmt = (v: number | null) => {
    const f = formatInches(v);
    return f == null ? "—" : `${f}″`;
  };
  return `${fmt(lengthIn)} × ${fmt(widthIn)} × ${fmt(thicknessIn)}`;
}

export function formatConfidence(confidence: number | null): string | null {
  if (confidence == null) return null;
  return `${Math.round(confidence * 100)}%`;
}

export const CUT_TYPES = [
  "lumber",
  "live_edge",
  "cookie",
  "torneado",
  "chapa",
  "plywood",
] as const;

export type CutType = (typeof CUT_TYPES)[number];

export const CUT_LABELS: Record<CutType, string> = {
  lumber: "Lumber",
  live_edge: "Live edge",
  cookie: "Cookie",
  torneado: "Torneado",
  chapa: "Chapa",
  plywood: "Plywood",
};

// Especies habituales: clásicas de EE. UU. + las del taller, en formato
// "inglés (español)". La opción "Otra…" de los formularios abre campo libre.
export const SPECIES_OPTIONS = [
  "ash (fresno)",
  "beech (haya)",
  "birch (abedul)",
  "bocote",
  "bubinga",
  "cedar (cedro)",
  "cherry (cerezo)",
  "claro walnut (nogal claro)",
  "cocobolo",
  "douglas fir (abeto de Douglas)",
  "granadillo",
  "hickory (pacana)",
  "mahogany (caoba)",
  "mango",
  "maple (arce)",
  "narra",
  "olive (olivo)",
  "padauk",
  "pine (pino)",
  "poplar (álamo)",
  "purpleheart (amaranto)",
  "red oak (roble rojo)",
  "sande",
  "sapele (sapeli)",
  "siberian elm (olmo siberiano)",
  "sucupira",
  "teak (teca)",
  "walnut (nogal)",
  "wenge (wengué)",
  "white oak (roble blanco)",
  "zebrawood (cebrano)",
];

/**
 * Talla visual de la pieza en la estantería (como tallas de camiseta).
 * El factor es la fracción de la altura del área de exhibición que ocupa.
 */
export const DISPLAY_SIZES = ["s", "m", "l", "xl"] as const;

export type DisplaySize = (typeof DISPLAY_SIZES)[number];

export const SIZE_SCALE: Record<DisplaySize, number> = {
  s: 0.45,
  m: 0.62,
  l: 0.8,
  xl: 0.96,
};

export function sizeScale(size: string | null | undefined): number {
  return SIZE_SCALE[(size ?? "xl") as DisplaySize] ?? SIZE_SCALE.xl;
}

/**
 * Materiales no-madera para piezas de proyecto: se listan en el despiece y
 * el PDF, pero quedan fuera del plan de corte (no salen de tablas).
 */
export const NON_WOOD_MATERIALS = ["metal", "vidrio", "comprado / herraje"];

export function isNonWoodMaterial(species: string | null | undefined): boolean {
  if (!species) return false;
  return /metal|vidrio|acr[ií]lico|herraje|comprad/i.test(species);
}

/**
 * Unidades "contables": la cantidad representa un número de piezas físicas
 * (a diferencia de pies tablares/lineales/cuadrados, que son volumen o área).
 */
export const COUNTABLE_UNIT_RE =
  /tabl[oó]n|pieza|unidad|bloque|palo|panel|plancha/i;

/**
 * Pies tablares (board feet) de una pieza: L × A × G (pulgadas) / 144.
 */
export function boardFeet(
  lengthIn: number | null,
  widthIn: number | null,
  thicknessIn: number | null,
): number | null {
  if (lengthIn == null || widthIn == null || thicknessIn == null) return null;
  const bf = (lengthIn * widthIn * thicknessIn) / 144;
  return Math.round(bf * 100) / 100;
}
