import { get as getTonalDuration } from "@tonaljs/duration-value";

export type MusicDuration = {
  name: string;
  value: number;
  fraction: readonly [number, number];
  shorthand: string;
};

export function parseMusicDuration(name: string): MusicDuration | null {
  const duration = getTonalDuration(name);

  if (duration.empty) {
    return null;
  }

  return {
    name: duration.name,
    value: duration.value,
    fraction: duration.fraction,
    shorthand: duration.shorthand
  };
}

function getRequiredMusicDuration(name: string): MusicDuration {
  const duration = parseMusicDuration(name);

  if (duration === null) {
    throw new Error(`Unsupported music duration: ${name}`);
  }

  return duration;
}

export function getMusicDurationForDenominator(denominator: number): MusicDuration {
  switch (denominator) {
    case 4:
      return getRequiredMusicDuration("quarter");
    case 8:
      return getRequiredMusicDuration("eighth");
    default:
      throw new Error(`Unsupported meter denominator: ${denominator}`);
  }
}

export function getMusicBeatDurationMs({
  bpm,
  denominator
}: {
  bpm: number;
  denominator: number;
}) {
  const beatDuration = getMusicDurationForDenominator(denominator);
  const quarterDuration = getRequiredMusicDuration("quarter");

  return (60_000 / bpm) * (beatDuration.value / quarterDuration.value);
}
