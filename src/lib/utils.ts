import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDimensions(
  lengthMm: number | null,
  widthMm: number | null,
  thicknessMm: number | null,
): string | null {
  if (lengthMm == null && widthMm == null && thicknessMm == null) return null;
  const fmt = (v: number | null) => (v == null ? "—" : String(v));
  return `${fmt(lengthMm)} × ${fmt(widthMm)} × ${fmt(thicknessMm)} mm`;
}

export function formatConfidence(confidence: number | null): string | null {
  if (confidence == null) return null;
  return `${Math.round(confidence * 100)}%`;
}
