import { cn } from "@/lib/utils";

export function StatusTile({
  label,
  value,
  testId,
  className
}: {
  label: string;
  value: string;
  testId?: string;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "min-w-0 rounded-md border border-border bg-muted px-3 py-2",
        className
      )}
    >
      <p className="truncate text-xs font-medium text-muted-foreground">
        {label}
      </p>
      <p className="mt-1 truncate font-semibold" data-testid={testId}>
        {value}
      </p>
    </div>
  );
}
