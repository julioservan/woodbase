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
] as const;

export type CutType = (typeof CUT_TYPES)[number];

export const CUT_LABELS: Record<CutType, string> = {
  lumber: "Lumber",
  live_edge: "Live edge",
  cookie: "Cookie",
  torneado: "Torneado",
  chapa: "Chapa",
};

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
