import { getMusicBeatDurationMs } from "@/domain/music/duration";
import { getMusicTimeSignatureParts } from "@/domain/music/time-signature";
import type { PracticeTimeSignature } from "@/domain/practice/types";

export type MeterTimingInput = {
  bpm: number;
  timeSignature: PracticeTimeSignature;
};

export function getMeterTimeSignatureParts(timeSignature: PracticeTimeSignature) {
  return getMusicTimeSignatureParts(timeSignature);
}

export function getMeterBeatDurationMs({ bpm, timeSignature }: MeterTimingInput) {
  const { denominator } = getMeterTimeSignatureParts(timeSignature);

  return getMusicBeatDurationMs({ bpm, denominator });
}

export function getMeterMeasureDurationMs(input: MeterTimingInput) {
  const { numerator } = getMeterTimeSignatureParts(input.timeSignature);

  return Math.round(numerator * getMeterBeatDurationMs(input));
}

export function getMeterTickIntervalMs({
  bpm,
  timeSignature,
  ticksPerBeat
}: MeterTimingInput & { ticksPerBeat: number }) {
  return getMeterBeatDurationMs({ bpm, timeSignature }) / ticksPerBeat;
}

export function getMeterTicksPerMeasure({
  timeSignature,
  ticksPerBeat
}: Pick<MeterTimingInput, "timeSignature"> & { ticksPerBeat: number }) {
  const { numerator } = getMeterTimeSignatureParts(timeSignature);

  return numerator * ticksPerBeat;
}
