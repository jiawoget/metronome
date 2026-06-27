export function MetadataPill({
  value,
  wrap = false
}: {
  value: string;
  wrap?: boolean;
}) {
  return (
    <span
      className={`border-border bg-muted inline-block max-w-full rounded-md border px-2 py-1 font-medium ${
        wrap ? "whitespace-normal break-words" : "truncate"
      }`}
    >
      {value}
    </span>
  );
}
