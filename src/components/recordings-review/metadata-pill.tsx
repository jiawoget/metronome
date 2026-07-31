export function MetadataPill({
  value,
  wrap = false
}: {
  value: string;
  wrap?: boolean;
}) {
  return (
    <span
      className={`inline-block max-w-full rounded-md border border-border bg-muted px-2 py-1 font-medium ${
        wrap ? "break-words whitespace-normal" : "truncate"
      }`}
    >
      {value}
    </span>
  );
}
