import {
  getMeterTickIntervalMs,
  getMeterTicksPerMeasure,
  getMeterTimeSignatureParts
} from "@/domain/practice/meter-timing";
import {
  DEFAULT_BPM,
  DEFAULT_METRONOME_SETTINGS,
  MAX_BPM,
  MIN_BPM,
  type AccentMode,
  type MetronomeSettings,
  type Subdivision,
  type TimeSignature
} from "@/lib/quick-metronome/types";

export const TIME_SIGNATURES = [
  "2/4",
  "3/4",
  "4/4",
  "6/8",
  "12/8"
] as const satisfies readonly TimeSignature[];
export const SUBDIVISIONS = [
  "quarter",
  "eighth",
  "triplet",
  "sixteenth"
] as const satisfies readonly Subdivision[];
export const ACCENT_MODES: AccentMode[] = ["downbeat", "every-beat", "off"];
export const COUNTDOWN_BAR_OPTIONS = [0, 1, 2] as const;

export function clampBpm(value: number) {
  if (!Number.isFinite(value)) {
    return DEFAULT_BPM;
  }

  return Math.min(MAX_BPM, Math.max(MIN_BPM, Math.round(value)));
}

export function stepBpm(currentBpm: number, direction: -1 | 1, amount = 1) {
  return clampBpm(currentBpm + direction * amount);
}

export function commitBpmDraft(value: string, fallbackBpm = DEFAULT_BPM) {
  const trimmedValue = value.trim();

  if (!trimmedValue) {
    return clampBpm(fallbackBpm);
  }

  return clampBpm(Number(trimmedValue));
}

export function parseTimeSignature(value: string): TimeSignature {
  if (TIME_SIGNATURES.includes(value as TimeSignature)) {
    return value as TimeSignature;
  }

  return DEFAULT_METRONOME_SETTINGS.timeSignature;
}

export function parseSubdivision(value: string): Subdivision {
  if (SUBDIVISIONS.includes(value as Subdivision)) {
    return value as Subdivision;
  }

  return DEFAULT_METRONOME_SETTINGS.subdivision;
}

export function parseAccentMode(value: string): AccentMode {
  if (ACCENT_MODES.includes(value as AccentMode)) {
    return value as AccentMode;
  }

  return DEFAULT_METRONOME_SETTINGS.accent;
}

export function getCountdownOptions(timeSignature: TimeSignature) {
  const { numerator } = getMeterTimeSignatureParts(timeSignature);

  return COUNTDOWN_BAR_OPTIONS.map((bars) => ({
    bars,
    beats: bars * numerator,
    label: bars === 0 ? "Off" : bars === 1 ? "1 bar" : "2 bars"
  }));
}

export function getCountdownBars(
  countdownBeats: number,
  timeSignature: TimeSignature
) {
  const { numerator } = getMeterTimeSignatureParts(timeSignature);

  if (countdownBeats === numerator) {
    return 1;
  }

  if (countdownBeats === numerator * 2) {
    return 2;
  }

  return 0;
}

export function getCountdownBeatsForBars(
  bars: number,
  timeSignature: TimeSignature
) {
  const { numerator } = getMeterTimeSignatureParts(timeSignature);

  return COUNTDOWN_BAR_OPTIONS.includes(
    bars as (typeof COUNTDOWN_BAR_OPTIONS)[number]
  )
    ? bars * numerator
    : 0;
}

export function parseCountdownBeats(
  value: string | number,
  timeSignature: TimeSignature = DEFAULT_METRONOME_SETTINGS.timeSignature
) {
  const parsed = typeof value === "number" ? value : Number.parseInt(value, 10);
  const validOptions = getCountdownOptions(timeSignature).map(
    (option) => option.beats
  );

  return validOptions.includes(parsed) ? parsed : 0;
}

export function getSubdivisionMultiplier(subdivision: Subdivision) {
  switch (subdivision) {
    case "quarter":
      return 1;
    case "eighth":
      return 2;
    case "triplet":
      return 3;
    case "sixteenth":
      return 4;
  }
}

export function getTickIntervalMs(
  settings: Pick<MetronomeSettings, "bpm" | "timeSignature" | "subdivision">
) {
  return getMeterTickIntervalMs({
    bpm: clampBpm(settings.bpm),
    timeSignature: settings.timeSignature,
    ticksPerBeat: getSubdivisionMultiplier(settings.subdivision)
  });
}

export function isAccentTick(
  tickIndex: number,
  settings: Pick<MetronomeSettings, "timeSignature" | "subdivision" | "accent">
) {
  if (settings.accent === "off") {
    return false;
  }

  const subdivisionMultiplier = getSubdivisionMultiplier(settings.subdivision);
  const beatIndex = tickIndex % subdivisionMultiplier;

  if (settings.accent === "every-beat") {
    return beatIndex === 0;
  }

  return (
    tickIndex %
      getMeterTicksPerMeasure({
        timeSignature: settings.timeSignature,
        ticksPerBeat: subdivisionMultiplier
      }) ===
    0
  );
}

export function calculateTapTempo(tapTimesMs: number[]) {
  const validTapTimes = tapTimesMs
    .filter((tapTime) => Number.isFinite(tapTime))
    .slice(-5);

  if (validTapTimes.length < 2) {
    return null;
  }

  const intervals = validTapTimes
    .slice(1)
    .map((tapTime, index) => tapTime - validTapTimes[index]);
  const usableIntervals = intervals.filter(
    (interval) => interval >= 250 && interval <= 2_000
  );

  if (usableIntervals.length === 0) {
    return null;
  }

  const averageInterval =
    usableIntervals.reduce((total, interval) => total + interval, 0) /
    usableIntervals.length;

  return clampBpm(60_000 / averageInterval);
}
