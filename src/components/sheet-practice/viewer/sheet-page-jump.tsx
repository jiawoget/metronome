"use client";

import { FormEvent, useId, useState } from "react";

import { Button } from "@/components/ui/button";

type SheetPageJumpProps = {
  currentPage: number;
  totalPages: number;
  onJumpToPage: (pageNumber: number) => void;
};

function parsePageJump(value: string, totalPages: number) {
  const trimmed = value.trim();

  if (!/^\d+$/.test(trimmed)) {
    return {
      valid: false,
      message: `Enter a page number from 1 to ${totalPages}.`
    } as const;
  }

  const pageNumber = Number(trimmed);

  if (!Number.isSafeInteger(pageNumber) || pageNumber < 1 || pageNumber > totalPages) {
    return {
      valid: false,
      message: `Page must be between 1 and ${totalPages}.`
    } as const;
  }

  return { valid: true, pageNumber } as const;
}

export function SheetPageJump({
  currentPage,
  totalPages,
  onJumpToPage
}: SheetPageJumpProps) {
  const errorId = useId();
  const [value, setValue] = useState("");
  const [error, setError] = useState<string | null>(null);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const parsed = parsePageJump(value, totalPages);

    if (!parsed.valid) {
      setError(parsed.message);
      return;
    }

    setError(null);
    setValue("");
    onJumpToPage(parsed.pageNumber);
  }

  return (
    <form className="flex flex-wrap items-center gap-2" noValidate onSubmit={handleSubmit}>
      <label className="sr-only" htmlFor={`${errorId}-input`}>
        Page number
      </label>
      <input
        id={`${errorId}-input`}
        type="text"
        inputMode="numeric"
        pattern="[0-9]*"
        aria-invalid={error ? "true" : undefined}
        aria-describedby={error ? errorId : undefined}
        value={value}
        placeholder={String(currentPage)}
        onChange={(event) => {
          setValue(event.target.value);
          setError(null);
        }}
        className="h-9 w-16 rounded-md border border-input bg-background px-2 text-center text-sm outline-none transition placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring"
      />
      <Button type="submit" variant="secondary" className="h-9 px-3">
        Go
      </Button>
      {error ? (
        <p id={errorId} role="alert" className="basis-full text-sm text-destructive">
          {error}
        </p>
      ) : null}
    </form>
  );
}
