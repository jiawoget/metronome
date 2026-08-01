export function LabeledSelect({
  label,
  value,
  onChange,
  options,
  disabled = false
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: { value: string; label: string }[];
  disabled?: boolean;
}) {
  const id = `sheet-${label.toLowerCase().replaceAll(" ", "-")}`;

  return (
    <div className="min-w-0">
      <label htmlFor={id} className="text-sm font-medium">
        {label}
      </label>
      <select
        id={id}
        aria-label={label}
        value={value}
        disabled={disabled}
        onChange={(event) => onChange(event.target.value)}
        className="mt-2 h-10 w-full rounded-md border border-border bg-background px-3 text-sm focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </div>
  );
}
