import type { PracticeTimeSignature } from "@/domain/practice/types";

export type MeterTimingInput = {
  bpm: number;
  timeSignature: PracticeTimeSignature;
};

export function getMeterTimeSignatureParts(timeSignature: PracticeTimeSignature) {
  const [numerator, denominator] = timeSignature.split("/").map((value) => Number.parseInt(value, 10));

  return { numerator, denominator };
}

export function getMeterBeatDurationMs({ bpm, timeSignature }: MeterTimingInput) {
  const { denominator } = getMeterTimeSignatureParts(timeSignature);

  return (60_000 / bpm) * (4 / denominator);
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
