import type { SegmentTempoApplyResult } from "@/domain/practice";
import { Button } from "@/components/ui/button";

type SegmentTempoApplyControlProps = {
  policy: SegmentTempoApplyResult;
  onApply: () => void;
};

function getPolicyStatusText(policy: SegmentTempoApplyResult) {
  switch (policy.status) {
    case "applied":
      return policy.targetBpm === null
        ? `Set BPM to ${policy.nextBpm}.`
        : `Target ${policy.targetBpm} BPM; set BPM to ${policy.nextBpm}.`;
    case "already-applied":
      return "Target already applied.";
    case "no-target-bpm":
      return "No target BPM.";
    case "no-segment":
      return "Select a segment to use target BPM.";
  }
}

export function SegmentTempoApplyControl({
  policy,
  onApply
}: SegmentTempoApplyControlProps) {
  const canApply = policy.status === "applied";
  const segmentLabel = policy.segmentName ?? "Segment tempo";

  return (
    <div className="border-border bg-muted/40 mt-3 flex flex-wrap items-center justify-between gap-2 rounded-md border px-3 py-2">
      <div className="min-w-0">
        <p className="break-words text-xs font-semibold">{segmentLabel}</p>
        <p
          role="status"
          aria-live="polite"
          className="text-muted-foreground mt-0.5 text-xs"
        >
          {getPolicyStatusText(policy)}
        </p>
      </div>
      <Button
        type="button"
        variant="secondary"
        className="h-9 px-3 text-xs"
        aria-label="Apply target BPM"
        disabled={!canApply}
        onClick={onApply}
      >
        Apply target BPM
      </Button>
    </div>
  );
}
