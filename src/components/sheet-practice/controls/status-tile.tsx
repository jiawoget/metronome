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
    <div className={cn("border-border bg-muted min-w-0 rounded-md border px-3 py-2", className)}>
      <p className="text-muted-foreground truncate text-xs font-medium">
        {label}
      </p>
      <p className="mt-1 truncate font-semibold" data-testid={testId}>
        {value}
      </p>
    </div>
  );
}
