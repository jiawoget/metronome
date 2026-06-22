export function StatusTile({
  label,
  value,
  testId
}: {
  label: string;
  value: string;
  testId?: string;
}) {
  return (
    <div className="border-border bg-muted min-w-0 rounded-md border px-3 py-2">
      <p className="text-muted-foreground truncate text-xs font-medium">
        {label}
      </p>
      <p className="mt-1 truncate font-semibold" data-testid={testId}>
        {value}
      </p>
    </div>
  );
}
