"use client";

import Link from "next/link";
import {
  FileImage,
  FileText,
  Filter,
  LibraryBig,
  Search,
  Trash2,
  Upload,
  Wand2
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";

import {
  SHEET_CATEGORIES,
  filterSheets,
  formatPageCount,
  getSheetPracticeHref,
  sheetCategoryLabels,
  type SheetCategory,
  type SheetCategoryFilter,
  type SheetListItem
} from "@/domain/sheet";
import { browserSheetLibraryService } from "@/infrastructure/files/sheet-library-service";
import type { SheetImportPreview } from "@/services/sheet-library";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

const defaultMetadata = {
  name: "",
  category: "song" as SheetCategory,
  bpm: "120",
  timeSignature: "4/4"
};

type ImportState = "idle" | "checking" | "ready" | "saving" | "error";

function formatBytes(sizeBytes: number) {
  if (sizeBytes < 1024) {
    return `${sizeBytes} B`;
  }

  if (sizeBytes < 1024 * 1024) {
    return `${Math.round(sizeBytes / 1024)} KB`;
  }

  return `${(sizeBytes / 1024 / 1024).toFixed(1)} MB`;
}

function formatLastPracticed(value: string | null) {
  if (!value) {
    return "Not practiced yet";
  }

  return new Intl.DateTimeFormat(undefined, { dateStyle: "medium" }).format(new Date(value));
}

export function SheetLibraryExperience() {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [sheets, setSheets] = useState<SheetListItem[]>([]);
  const [query, setQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<SheetCategoryFilter>("all");
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [preview, setPreview] = useState<SheetImportPreview | null>(null);
  const [metadata, setMetadata] = useState(defaultMetadata);
  const [importState, setImportState] = useState<ImportState>("idle");
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    let isActive = true;

    void browserSheetLibraryService.listSheets().then((nextSheets) => {
      if (!isActive) {
        return;
      }

      setSheets(nextSheets);
      setLoading(false);
    });

    return () => {
      isActive = false;
    };
  }, []);

  const visibleSheets = useMemo(
    () => filterSheets(sheets, { query, category: categoryFilter }),
    [sheets, query, categoryFilter]
  );

  async function handleFileChange(files: FileList | null) {
    const nextFiles = Array.from(files ?? []);

    setSelectedFiles(nextFiles);
    setPreview(null);
    setMessage(null);

    if (nextFiles.length === 0) {
      setImportState("idle");
      return;
    }

    setImportState("checking");
    const result = await browserSheetLibraryService.previewImport(nextFiles);

    if (!result.ok) {
      setImportState("error");
      setMessage(result.message);
      return;
    }

    setPreview(result.preview);
    setImportState("ready");
    setMessage(
      result.preview.kind === "pdf"
        ? `Ready: PDF with ${result.preview.pageCount} page${result.preview.pageCount === 1 ? "" : "s"}.`
        : `Ready: ${result.preview.imageCount} image${result.preview.imageCount === 1 ? "" : "s"}.`
    );

    if (!metadata.name.trim()) {
      const firstName = result.preview.originalFileNames[0]?.replace(/\.[^.]+$/, "") ?? "";
      setMetadata((current) => ({ ...current, name: firstName }));
    }
  }

  async function handleSave() {
    setImportState("saving");
    setMessage(null);

    const result = await browserSheetLibraryService.importSheet({
      files: selectedFiles,
      metadata: {
        name: metadata.name,
        category: metadata.category,
        bpm: Number(metadata.bpm),
        timeSignature: metadata.timeSignature
      }
    });

    if (!result.ok) {
      setImportState("error");
      setMessage(result.message);
      return;
    }

    setSheets((current) => [result.sheet, ...current.filter((sheet) => sheet.id !== result.sheet.id)]);
    setSelectedFiles([]);
    setPreview(null);
    setMetadata(defaultMetadata);
    setImportState("idle");
    setMessage(`Imported ${result.sheet.name}.`);

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  }

  async function handleDelete(sheet: SheetListItem) {
    setDeletingId(sheet.id);
    await browserSheetLibraryService.deleteSheet(sheet.id);
    setSheets((current) => current.filter((item) => item.id !== sheet.id));
    setDeletingId(null);
    setMessage(`Deleted ${sheet.name}.`);
  }

  return (
    <section aria-labelledby="sheet-library-title" className="mx-auto flex w-full max-w-6xl flex-col gap-5">
      <header className="flex flex-col gap-4 rounded-lg border border-border bg-card p-5 shadow-soft md:flex-row md:items-center md:justify-between">
        <div className="min-w-0">
          <p className="mb-3 text-xs font-semibold uppercase tracking-[0.08em] text-muted-foreground">
            Sheet Library
          </p>
          <h1 id="sheet-library-title" className="text-2xl font-semibold tracking-normal sm:text-3xl">
            Sheet Library
          </h1>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-muted-foreground">
            Import Sheet entry lands here and now saves real PDF or image artifacts for practice routing.
          </p>
        </div>
        <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground">
          <LibraryBig className="h-7 w-7" aria-hidden="true" />
        </div>
      </header>

      <Card>
        <CardHeader>
          <CardTitle>Import Sheet</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 lg:grid-cols-[minmax(0,1.2fr)_minmax(280px,0.8fr)]">
            <div className="grid gap-3">
              <label className="grid gap-2 text-sm font-medium">
                File
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="application/pdf,.pdf,image/png,image/jpeg,.png,.jpg,.jpeg"
                  multiple
                  onChange={(event) => void handleFileChange(event.target.files)}
                  className="min-h-11 rounded-md border border-border bg-background px-3 py-2 text-sm file:mr-3 file:rounded-md file:border-0 file:bg-muted file:px-3 file:py-1.5 file:text-sm file:font-medium"
                />
              </label>

              <div className="grid gap-3 sm:grid-cols-2">
                <label className="grid gap-2 text-sm font-medium">
                  Name
                  <input
                    value={metadata.name}
                    onChange={(event) => setMetadata((current) => ({ ...current, name: event.target.value }))}
                    className="h-10 rounded-md border border-border bg-background px-3 text-sm"
                  />
                </label>
                <label className="grid gap-2 text-sm font-medium">
                  Category
                  <select
                    aria-label="Sheet category"
                    value={metadata.category}
                    onChange={(event) =>
                      setMetadata((current) => ({ ...current, category: event.target.value as SheetCategory }))
                    }
                    className="h-10 rounded-md border border-border bg-background px-3 text-sm"
                  >
                    {SHEET_CATEGORIES.map((category) => (
                      <option key={category} value={category}>
                        {sheetCategoryLabels[category]}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="grid gap-2 text-sm font-medium">
                  BPM
                  <input
                    value={metadata.bpm}
                    inputMode="numeric"
                    onChange={(event) => setMetadata((current) => ({ ...current, bpm: event.target.value }))}
                    className="h-10 rounded-md border border-border bg-background px-3 text-sm"
                  />
                </label>
                <label className="grid gap-2 text-sm font-medium">
                  Time signature
                  <input
                    value={metadata.timeSignature}
                    onChange={(event) =>
                      setMetadata((current) => ({ ...current, timeSignature: event.target.value }))
                    }
                    className="h-10 rounded-md border border-border bg-background px-3 text-sm"
                  />
                </label>
              </div>

              {message ? (
                <p
                  role={importState === "error" ? "alert" : "status"}
                  className={cn(
                    "rounded-md border px-3 py-2 text-sm",
                    importState === "error"
                      ? "border-destructive/30 bg-destructive/10 text-destructive"
                      : "border-border bg-muted text-foreground"
                  )}
                >
                  {message}
                </p>
              ) : null}
            </div>

            <div className="rounded-md border border-border bg-muted p-4 text-sm">
              <div className="mb-3 flex items-center gap-2 font-medium">
                {preview?.kind === "image" ? (
                  <FileImage className="h-4 w-4" aria-hidden="true" />
                ) : (
                  <FileText className="h-4 w-4" aria-hidden="true" />
                )}
                Import Preview
              </div>
              {preview ? (
                <dl className="grid gap-2 text-muted-foreground">
                  <div className="flex justify-between gap-3">
                    <dt>Type</dt>
                    <dd className="font-medium text-foreground">{preview.kind === "pdf" ? "PDF" : "Image sheet"}</dd>
                  </div>
                  <div className="flex justify-between gap-3">
                    <dt>Pages</dt>
                    <dd className="font-medium text-foreground">{preview.pageCount ?? preview.imageCount}</dd>
                  </div>
                  <div className="flex justify-between gap-3">
                    <dt>Size</dt>
                    <dd className="font-medium text-foreground">{formatBytes(preview.sizeBytes)}</dd>
                  </div>
                  {preview.imageDimensions[0] ? (
                    <div className="flex justify-between gap-3">
                      <dt>First image</dt>
                      <dd className="font-medium text-foreground">
                        {preview.imageDimensions[0].width} x {preview.imageDimensions[0].height}
                      </dd>
                    </div>
                  ) : null}
                </dl>
              ) : (
                <p className="leading-6 text-muted-foreground">
                  Choose a PDF or PNG/JPG image. Validation and metadata extraction run before save.
                </p>
              )}
              <Button
                type="button"
                className="mt-4 w-full"
                disabled={importState !== "ready"}
                onClick={() => void handleSave()}
              >
                <Upload className="h-4 w-4" aria-hidden="true" />
                Save Imported Sheet
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_220px]">
        <label className="relative grid gap-2 text-sm font-medium">
          Search
          <Search className="pointer-events-none absolute bottom-3 left-3 h-4 w-4 text-muted-foreground" aria-hidden="true" />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search by name, category, BPM, or time signature"
            className="h-10 rounded-md border border-border bg-background pl-9 pr-3 text-sm"
          />
        </label>
        <label className="grid gap-2 text-sm font-medium">
          Category filter
          <span className="relative">
            <Filter
              className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
              aria-hidden="true"
            />
            <select
              aria-label="Sheet category filter"
              value={categoryFilter}
              onChange={(event) => setCategoryFilter(event.target.value as SheetCategoryFilter)}
              className="h-10 w-full rounded-md border border-border bg-background pl-9 pr-3 text-sm"
            >
              <option value="all">All categories</option>
              {SHEET_CATEGORIES.map((category) => (
                <option key={category} value={category}>
                  {sheetCategoryLabels[category]}s
                </option>
              ))}
            </select>
          </span>
        </label>
      </div>

      <div aria-live="polite" className="grid gap-3">
        {loading ? (
          <Card>
            <CardContent className="pt-5">
              <p className="text-sm text-muted-foreground">Loading sheets...</p>
            </CardContent>
          </Card>
        ) : visibleSheets.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-start gap-3 pt-5">
              <div className="flex h-11 w-11 items-center justify-center rounded-full bg-muted">
                <Wand2 className="h-5 w-5" aria-hidden="true" />
              </div>
              <div>
                <h2 className="text-base font-semibold">No sheets imported yet</h2>
                <p className="mt-1 text-sm leading-6 text-muted-foreground">
                  Imported PDF and image artifacts will appear here with metadata and practice routing.
                </p>
              </div>
            </CardContent>
          </Card>
        ) : (
          visibleSheets.map((sheet) => (
            <Card key={sheet.id}>
              <CardContent className="pt-5">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="break-words text-lg font-semibold">{sheet.name}</h2>
                      <span className="rounded-md bg-muted px-2 py-1 text-xs font-medium">
                        {sheetCategoryLabels[sheet.category]}
                      </span>
                      <span
                        className={cn(
                          "rounded-md px-2 py-1 text-xs font-medium",
                          sheet.artifactStatus.readable
                            ? "bg-primary/10 text-primary"
                            : "bg-destructive/10 text-destructive"
                        )}
                      >
                        {sheet.artifactStatus.label}
                      </span>
                    </div>
                    <dl className="mt-3 grid gap-2 text-sm text-muted-foreground sm:grid-cols-2 xl:grid-cols-5">
                      <div>
                        <dt className="font-medium text-foreground">Pages</dt>
                        <dd>{formatPageCount(sheet)}</dd>
                      </div>
                      <div>
                        <dt className="font-medium text-foreground">BPM</dt>
                        <dd>{sheet.bpm}</dd>
                      </div>
                      <div>
                        <dt className="font-medium text-foreground">Time</dt>
                        <dd>{sheet.timeSignature}</dd>
                      </div>
                      <div>
                        <dt className="font-medium text-foreground">Last practiced</dt>
                        <dd>{formatLastPracticed(sheet.lastPracticedAt)}</dd>
                      </div>
                      <div>
                        <dt className="font-medium text-foreground">Artifact</dt>
                        <dd>{sheet.originalFileNames.join(", ")}</dd>
                      </div>
                    </dl>
                  </div>
                  <div className="flex flex-col gap-2 sm:flex-row lg:shrink-0">
                    <Button asChild>
                      <Link href={getSheetPracticeHref(sheet.id)}>Open Sheet Practice</Link>
                    </Button>
                    <Button
                      type="button"
                      variant="secondary"
                      disabled={deletingId === sheet.id}
                      onClick={() => void handleDelete(sheet)}
                    >
                      <Trash2 className="h-4 w-4" aria-hidden="true" />
                      Delete
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </section>
  );
}
