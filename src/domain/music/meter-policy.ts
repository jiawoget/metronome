export const SUPPORTED_TIME_SIGNATURES = ["2/4", "3/4", "4/4", "6/8", "12/8"] as const;
export type SupportedTimeSignature = (typeof SUPPORTED_TIME_SIGNATURES)[number];

export const SUPPORTED_SUBDIVISIONS = ["quarter", "eighth", "triplet", "sixteenth"] as const;
export type SupportedSubdivision = (typeof SUPPORTED_SUBDIVISIONS)[number];

export function isSupportedTimeSignature(value: unknown): value is SupportedTimeSignature {
  return typeof value === "string" && (SUPPORTED_TIME_SIGNATURES as readonly string[]).includes(value);
}

export function isSupportedSubdivision(value: unknown): value is SupportedSubdivision {
  return typeof value === "string" && (SUPPORTED_SUBDIVISIONS as readonly string[]).includes(value);
}
