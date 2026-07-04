import { get as getTonalTimeSignature } from "@tonaljs/time-signature";

export type MusicTimeSignatureType = "simple" | "compound" | "irregular" | "irrational";

export type MusicTimeSignatureParts = {
  name: string;
  numerator: number;
  denominator: number;
  type: MusicTimeSignatureType;
  additive: readonly number[];
};

export function parseMusicTimeSignature(value: unknown): MusicTimeSignatureParts | null {
  if (typeof value !== "string") {
    return null;
  }

  let parsed: ReturnType<typeof getTonalTimeSignature>;

  try {
    parsed = getTonalTimeSignature(value);
  } catch {
    return null;
  }

  if (parsed.empty) {
    return null;
  }

  const numerator = Array.isArray(parsed.upper)
    ? parsed.upper.reduce((total, upper) => total + upper, 0)
    : parsed.upper;
  const denominator = parsed.lower;

  if (
    !Number.isFinite(numerator) ||
    !Number.isInteger(numerator) ||
    numerator <= 0 ||
    !Number.isFinite(denominator) ||
    !Number.isInteger(denominator) ||
    denominator <= 0
  ) {
    return null;
  }

  return {
    name: parsed.name,
    numerator,
    denominator,
    type: parsed.type,
    additive: [...parsed.additive]
  };
}

export function getMusicTimeSignatureParts(timeSignature: string): Pick<
  MusicTimeSignatureParts,
  "numerator" | "denominator"
> {
  const parts = parseMusicTimeSignature(timeSignature);

  if (parts === null) {
    throw new Error(`Unsupported music time signature: ${timeSignature}`);
  }

  return {
    numerator: parts.numerator,
    denominator: parts.denominator
  };
}
