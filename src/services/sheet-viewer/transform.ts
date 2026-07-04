import type {
  SheetViewerTransform,
  SheetViewerTransformBounds
} from "@/services/sheet-viewer/types";

export const SHEET_VIEWER_TRANSFORM_LIMITS = {
  minScale: 0.5,
  maxScale: 2,
  scaleStep: 0.25
} as const;

function clampValue(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

export function clampSheetViewerZoom(value: number) {
  if (!Number.isFinite(value)) {
    return 1;
  }

  return clampValue(
    value,
    SHEET_VIEWER_TRANSFORM_LIMITS.minScale,
    SHEET_VIEWER_TRANSFORM_LIMITS.maxScale
  );
}

export function stepSheetViewerZoom(current: number, direction: "in" | "out") {
  const base = Number.isFinite(current) ? current : 1;
  const next = base + (direction === "in" ? SHEET_VIEWER_TRANSFORM_LIMITS.scaleStep : -SHEET_VIEWER_TRANSFORM_LIMITS.scaleStep);

  return clampSheetViewerZoom(Number(next.toFixed(2)));
}

function normalizeTranslation(value: number | undefined) {
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

function hasPositiveFiniteSize(size: { width?: unknown; height?: unknown } | null | undefined) {
  const width = size?.width;
  const height = size?.height;

  return (
    typeof width === "number" &&
    typeof height === "number" &&
    Number.isFinite(width) &&
    Number.isFinite(height) &&
    width > 0 &&
    height > 0
  );
}

function hasUsableTransformBounds(bounds: SheetViewerTransformBounds | undefined): bounds is SheetViewerTransformBounds {
  return hasPositiveFiniteSize(bounds?.viewport) && hasPositiveFiniteSize(bounds?.content);
}

function roundScale(value: number) {
  return Number(value.toFixed(2));
}

function clampTranslation(value: number, maxPan: number) {
  if (maxPan <= 0) {
    return 0;
  }

  return clampValue(value, -maxPan, maxPan);
}

export function createSheetViewerTransform(input: Partial<SheetViewerTransform> = {}): SheetViewerTransform {
  return {
    scale: clampSheetViewerZoom(input.scale ?? 1),
    translateX: normalizeTranslation(input.translateX),
    translateY: normalizeTranslation(input.translateY)
  };
}

export function resetSheetViewerTransform(): SheetViewerTransform {
  return {
    scale: 1,
    translateX: 0,
    translateY: 0
  };
}

export function resetSheetViewerTransformForPageChange(): SheetViewerTransform {
  return resetSheetViewerTransform();
}

export function clampSheetViewerTransform(
  transform: SheetViewerTransform,
  bounds?: SheetViewerTransformBounds
): SheetViewerTransform {
  const normalized = createSheetViewerTransform(transform);

  if (!hasUsableTransformBounds(bounds)) {
    return {
      ...normalized,
      translateX: 0,
      translateY: 0
    };
  }

  const effectiveWidth = bounds.content.width * normalized.scale;
  const effectiveHeight = bounds.content.height * normalized.scale;
  const maxX = effectiveWidth <= bounds.viewport.width ? 0 : (effectiveWidth - bounds.viewport.width) / 2;
  const maxY = effectiveHeight <= bounds.viewport.height ? 0 : (effectiveHeight - bounds.viewport.height) / 2;

  return {
    ...normalized,
    translateX: clampTranslation(normalized.translateX, maxX),
    translateY: clampTranslation(normalized.translateY, maxY)
  };
}

export function setSheetViewerTransformScale(
  transform: SheetViewerTransform,
  scale: number,
  bounds?: SheetViewerTransformBounds
): SheetViewerTransform {
  return clampSheetViewerTransform(
    {
      ...createSheetViewerTransform(transform),
      scale: clampSheetViewerZoom(Number.isFinite(scale) ? roundScale(scale) : 1)
    },
    bounds
  );
}

export function panSheetViewerTransform(
  transform: SheetViewerTransform,
  delta: { x: number; y: number },
  bounds?: SheetViewerTransformBounds
): SheetViewerTransform {
  const normalized = createSheetViewerTransform(transform);

  return clampSheetViewerTransform(
    {
      ...normalized,
      translateX: normalized.translateX + normalizeTranslation(delta.x),
      translateY: normalized.translateY + normalizeTranslation(delta.y)
    },
    bounds
  );
}
