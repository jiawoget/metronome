"use client";

import Link from "next/link";
import {
  FileImage,
  FileText,
  Filter,
  LibraryBig,
  Pencil,
  Search,
  Star,
  Trash2,
  Upload,
  Wand2
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";

import {
  SHEET_CATEGORIES,
  filterSheets,
  formatPageCount,
  getRecordingsReviewBySheetHref,
  getSheetPracticeHref,
  sheetCategoryLabels,
  type SheetCategory,
  type SheetCategoryFilter,
  type SheetMetadataInput,
  type SheetListItem
} from "@/domain/sheet";
import type { LibraryRecentPracticeSummaryBySheetItem } from "@/domain/practice";
import { browserSheetLibraryService } from "@/infrastructure/files/sheet-library-service";
import { browserPracticeSessionService } from "@/infrastructure/db/browser-practice-session-service";
import type {
  SheetBatchImportResult,
  SheetImportPreview
} from "@/services/sheet-library";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

const defaultMetadata = {
  name: "",
  category: "song" as SheetCategory,
  bpm: "120",
  timeSignature: "4/4"
};

type ImportState =
  | "idle"
  | "checking"
  | "ready"
  | "saving"
  | "batching"
  | "error";
type MetadataDraft = typeof defaultMetadata;

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

  return new Intl.DateTimeFormat(undefined, { dateStyle: "medium" }).format(
    new Date(value)
  );
}

function formatPracticeDate(value: string) {
  const date = new Date(value);

  if (!Number.isFinite(date.getTime())) {
    return "Unknown date";
  }

  return new Intl.DateTimeFormat(undefined, { dateStyle: "medium" }).format(
    date
  );
}

function formatPracticeDuration(durationMs: number) {
  const totalMinutes = Math.max(1, Math.round(durationMs / 60_000));

  if (!Number.isFinite(durationMs) || durationMs <= 0) {
    return "<1 min";
  }

  if (totalMinutes < 60) {
    return `${totalMinutes} min`;
  }

  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  return minutes > 0 ? `${hours} hr ${minutes} min` : `${hours} hr`;
}

function formatCount(count: number, singular: string, plural: string) {
  return `${count} ${count === 1 ? singular : plural}`;
}

function formatPracticeMetrics(
  summary: LibraryRecentPracticeSummaryBySheetItem
) {
  return [
    formatPracticeDuration(summary.durationMs),
    formatCount(summary.sessionCount, "session", "sessions"),
    formatCount(summary.recordingCount, "recording", "recordings"),
    summary.segmentPracticeCount > 0
      ? formatCount(
          summary.segmentPracticeCount,
          "segment practice",
          "segment practices"
        )
      : null
  ]
    .filter(Boolean)
    .join(" · ");
}

function formatBatchSummary(result: SheetBatchImportResult) {
  if (!result.ok) {
    return result.message;
  }

  const failedText =
    result.failedCount === 1
      ? "1 failed."
      : `${result.failedCount} failed.`;

  return `Imported ${result.importedCount} of ${result.total} files. ${failedText}`;
}

export function SheetLibraryExperience() {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [sheets, setSheets] = useState<SheetListItem[]>([]);
  const [query, setQuery] = useState("");
  const [categoryFilter, setCategoryFilter] =
    useState<SheetCategoryFilter>("all");
  const [favoritesOnly, setFavoritesOnly] = useState(false);
  const [tagFilter, setTagFilter] = useState("");
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [preview, setPreview] = useState<SheetImportPreview | null>(null);
  const [batchResult, setBatchResult] =
    useState<SheetBatchImportResult | null>(null);
  const [metadata, setMetadata] = useState(defaultMetadata);
  const [importState, setImportState] = useState<ImportState>("idle");
  const [message, setMessage] = useState<string | null>(null);
  const [messageKind, setMessageKind] = useState<"status" | "error">("status");
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [editingSheetId, setEditingSheetId] = useState<string | null>(null);
  const [editMetadata, setEditMetadata] =
    useState<MetadataDraft>(defaultMetadata);
  const [favoriteUpdatingId, setFavoriteUpdatingId] = useState<string | null>(
    null
  );
  const [tagSavingId, setTagSavingId] = useState<string | null>(null);
  const [tagDrafts, setTagDrafts] = useState<Record<string, string>>({});
  const [practiceSummariesBySheetId, setPracticeSummariesBySheetId] = useState<
    Record<string, LibraryRecentPracticeSummaryBySheetItem>
  >({});
  const [practiceSummaryLoading, setPracticeSummaryLoading] = useState(true);
  const [practiceSummaryError, setPracticeSummaryError] = useState<
    string | null
  >(null);

  useEffect(() => {
    let isActive = true;

    void browserSheetLibraryService.listSheets().then((nextSheets) => {
      if (!isActive) {
        return;
      }

      setSheets(nextSheets);
      setLoading(false);
    });

    void browserPracticeSessionService
      .getLibraryRecentPracticeSummaryBySheet({
        limit: Number.MAX_SAFE_INTEGER
      })
      .then((source) => {
        if (!isActive) {
          return;
        }

        setPracticeSummariesBySheetId(
          Object.fromEntries(
            source.items.map((summary) => [summary.sheetId, summary])
          )
        );
        setPracticeSummaryError(null);
      })
      .catch(() => {
        if (!isActive) {
          return;
        }

        setPracticeSummaryError(
          "Recent practice summaries could not be loaded."
        );
      })
      .finally(() => {
        if (!isActive) {
          return;
        }

        setPracticeSummaryLoading(false);
      });

    return () => {
      isActive = false;
    };
  }, []);

  const visibleSheets = useMemo(
    () =>
      filterSheets(sheets, {
        query,
        category: categoryFilter,
        favorite: favoritesOnly ? "favorites" : "all",
        tag: tagFilter
      }),
    [sheets, query, categoryFilter, favoritesOnly, tagFilter]
  );

  async function handleFileChange(files: FileList | null) {
    const nextFiles = Array.from(files ?? []);

    setSelectedFiles(nextFiles);
    setPreview(null);
    setBatchResult(null);
    setMessage(null);
    setMessageKind("status");

    if (nextFiles.length === 0) {
      setImportState("idle");
      return;
    }

    setImportState("checking");
    const result = await browserSheetLibraryService.previewImport(nextFiles);

    if (!result.ok) {
      setImportState("error");
      setMessage(result.message);
      setMessageKind("error");
      return;
    }

    setPreview(result.preview);
    setImportState("ready");
    setMessage(
      result.preview.kind === "pdf"
        ? `Ready: PDF with ${result.preview.pageCount} page${result.preview.pageCount === 1 ? "" : "s"}.`
        : `Ready: ${result.preview.imageCount} image${result.preview.imageCount === 1 ? "" : "s"}.`
    );
    setMessageKind("status");

    if (!metadata.name.trim()) {
      const firstName =
        result.preview.originalFileNames[0]?.replace(/\.[^.]+$/, "") ?? "";
      setMetadata((current) => ({ ...current, name: firstName }));
    }
  }

  async function handleSave() {
    setImportState("saving");
    setBatchResult(null);
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
      setMessageKind("error");
      return;
    }

    setSheets((current) => [
      result.sheet,
      ...current.filter((sheet) => sheet.id !== result.sheet.id)
    ]);
    setTagDrafts((current) => ({
      ...current,
      [result.sheet.id]: (result.sheet.tags ?? []).join(", ")
    }));
    setSelectedFiles([]);
    setPreview(null);
    setMetadata(defaultMetadata);
    setImportState("idle");
    setMessage(`Imported ${result.sheet.name}.`);
    setMessageKind("status");

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  }

  async function handleBatchImport() {
    setImportState("batching");
    setBatchResult(null);
    setMessage(null);
    setMessageKind("status");

    const result = await browserSheetLibraryService.importSheetsBatch({
      files: selectedFiles,
      metadataDefaults: {
        category: metadata.category,
        bpm: Number(metadata.bpm),
        timeSignature: metadata.timeSignature
      }
    });

    setBatchResult(result);

    if (!result.ok) {
      setImportState("error");
      return;
    }

    const importedSheets = result.items.flatMap((item) =>
      item.ok ? [item.sheet] : []
    );

    if (importedSheets.length > 0) {
      setSheets((current) => [
        ...importedSheets,
        ...current.filter(
          (sheet) =>
            !importedSheets.some((importedSheet) => importedSheet.id === sheet.id)
        )
      ]);
      setTagDrafts((current) => ({
        ...current,
        ...Object.fromEntries(
          importedSheets.map((sheet) => [
            sheet.id,
            (sheet.tags ?? []).join(", ")
          ])
        )
      }));
    }

    setSelectedFiles([]);
    setPreview(null);
    setMetadata(defaultMetadata);
    setImportState("idle");

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  }

  async function handleDelete(sheet: SheetListItem) {
    setDeletingId(sheet.id);
    await browserSheetLibraryService.deleteSheet(sheet.id);
    setSheets((current) => current.filter((item) => item.id !== sheet.id));
    setTagDrafts((current) => {
      const remaining = { ...current };

      delete remaining[sheet.id];
      return remaining;
    });
    setDeletingId(null);
    setMessage(`Deleted ${sheet.name}.`);
    setMessageKind("status");
  }

  function startEditing(sheet: SheetListItem) {
    setEditingSheetId(sheet.id);
    setEditMetadata({
      name: sheet.name,
      category: sheet.category,
      bpm: String(sheet.bpm),
      timeSignature: sheet.timeSignature
    });
    setMessage(null);
    setMessageKind("status");
  }

  function cancelEditing() {
    setEditingSheetId(null);
    setEditMetadata(defaultMetadata);
    setMessage(null);
    setMessageKind("status");
  }

  async function saveMetadataEdit(sheet: SheetListItem) {
    const metadataInput: SheetMetadataInput = {
      name: editMetadata.name,
      category: editMetadata.category,
      bpm: Number(editMetadata.bpm),
      timeSignature: editMetadata.timeSignature
    };
    const result = await browserSheetLibraryService.updateSheetMetadata({
      sheetId: sheet.id,
      metadata: metadataInput
    });

    if (!result.ok) {
      setMessage(result.message);
      setMessageKind("error");
      return;
    }

    setSheets((current) =>
      current.map((item) => (item.id === result.sheet.id ? result.sheet : item))
    );
    setEditingSheetId(null);
    setEditMetadata(defaultMetadata);
    setMessage(`Updated ${result.sheet.name}.`);
    setMessageKind("status");
  }

  async function toggleFavorite(sheet: SheetListItem) {
    setFavoriteUpdatingId(sheet.id);
    setMessage(null);

    const result = await browserSheetLibraryService.setSheetFavorite({
      sheetId: sheet.id,
      favorite: !sheet.favorite
    });

    if (!result.ok) {
      setMessage(result.message);
      setMessageKind("error");
      setFavoriteUpdatingId(null);
      return;
    }

    setSheets((current) =>
      current.map((item) => (item.id === result.sheet.id ? result.sheet : item))
    );
    setMessage(
      result.sheet.favorite
        ? `Favorited ${result.sheet.name}.`
        : `Unfavorited ${result.sheet.name}.`
    );
    setMessageKind("status");
    setFavoriteUpdatingId(null);
  }

  async function saveTags(sheet: SheetListItem) {
    const draft = tagDrafts[sheet.id] ?? (sheet.tags ?? []).join(", ");
    const draftTags = draft.split(",");
    const tags = draftTags.every((tag) => !tag.trim()) ? [] : draftTags;

    setTagSavingId(sheet.id);
    setMessage(null);

    const result = await browserSheetLibraryService.setSheetTags({
      sheetId: sheet.id,
      tags
    });

    if (!result.ok) {
      setMessage(result.message);
      setMessageKind("error");
      setTagSavingId(null);
      return;
    }

    setSheets((current) =>
      current.map((item) => (item.id === result.sheet.id ? result.sheet : item))
    );
    setTagDrafts((current) => ({
      ...current,
      [result.sheet.id]: (result.sheet.tags ?? []).join(", ")
    }));
    setMessage(`Updated tags for ${result.sheet.name}.`);
    setMessageKind("status");
    setTagSavingId(null);
  }

  return (
    <section
      aria-labelledby="sheet-library-title"
      className="mx-auto flex w-full max-w-6xl flex-col gap-5"
    >
      <header className="border-border bg-card shadow-soft flex flex-col gap-4 rounded-lg border p-5 md:flex-row md:items-center md:justify-between">
        <div className="min-w-0">
          <p className="text-muted-foreground mb-3 text-xs font-semibold tracking-[0.08em] uppercase">
            Sheet Library
          </p>
          <h1
            id="sheet-library-title"
            className="text-2xl font-semibold tracking-normal sm:text-3xl"
          >
            Sheet Library
          </h1>
          <p className="text-muted-foreground mt-3 max-w-3xl text-sm leading-6">
            Import Sheet entry lands here and now saves real PDF or image
            artifacts for practice routing.
          </p>
        </div>
        <div className="bg-primary text-primary-foreground flex h-14 w-14 shrink-0 items-center justify-center rounded-full">
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
                  onChange={(event) =>
                    void handleFileChange(event.target.files)
                  }
                  className="border-border bg-background file:bg-muted min-h-11 rounded-md border px-3 py-2 text-sm file:mr-3 file:rounded-md file:border-0 file:px-3 file:py-1.5 file:text-sm file:font-medium"
                />
              </label>

              <div className="grid gap-3 sm:grid-cols-2">
                <label className="grid gap-2 text-sm font-medium">
                  Name
                  <input
                    value={metadata.name}
                    onChange={(event) =>
                      setMetadata((current) => ({
                        ...current,
                        name: event.target.value
                      }))
                    }
                    className="border-border bg-background h-10 rounded-md border px-3 text-sm"
                  />
                </label>
                <label className="grid gap-2 text-sm font-medium">
                  Category
                  <select
                    aria-label="Sheet category"
                    value={metadata.category}
                    onChange={(event) =>
                      setMetadata((current) => ({
                        ...current,
                        category: event.target.value as SheetCategory
                      }))
                    }
                    className="border-border bg-background h-10 rounded-md border px-3 text-sm"
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
                    onChange={(event) =>
                      setMetadata((current) => ({
                        ...current,
                        bpm: event.target.value
                      }))
                    }
                    className="border-border bg-background h-10 rounded-md border px-3 text-sm"
                  />
                </label>
                <label className="grid gap-2 text-sm font-medium">
                  Time signature
                  <input
                    value={metadata.timeSignature}
                    onChange={(event) =>
                      setMetadata((current) => ({
                        ...current,
                        timeSignature: event.target.value
                      }))
                    }
                    className="border-border bg-background h-10 rounded-md border px-3 text-sm"
                  />
                </label>
              </div>

              {message ? (
                <p
                  role={messageKind === "error" ? "alert" : "status"}
                  className={cn(
                    "rounded-md border px-3 py-2 text-sm",
                    messageKind === "error"
                      ? "border-destructive/30 bg-destructive/10 text-destructive"
                      : "border-border bg-muted text-foreground"
                  )}
                >
                  {message}
                </p>
              ) : null}

              {batchResult ? (
                <div
                  role={
                    !batchResult.ok ||
                    (batchResult.total > 0 && batchResult.importedCount === 0)
                      ? "alert"
                      : "status"
                  }
                  className={cn(
                    "rounded-md border px-3 py-2 text-sm",
                    !batchResult.ok ||
                      (batchResult.total > 0 &&
                        batchResult.importedCount === 0)
                      ? "border-destructive/30 bg-destructive/10 text-destructive"
                      : "border-border bg-muted text-foreground"
                  )}
                >
                  <p className="font-medium">{formatBatchSummary(batchResult)}</p>
                  {batchResult.items.length > 0 ? (
                    <ul className="mt-2 grid gap-1">
                      {batchResult.items.map((item, index) => (
                        <li key={`${item.fileName}-${index}`}>
                          {item.ok
                            ? `${item.fileName}: Imported ${item.sheet.name}.`
                            : `${item.fileName}: ${item.message}`}
                        </li>
                      ))}
                    </ul>
                  ) : null}
                </div>
              ) : null}
            </div>

            <div className="border-border bg-muted rounded-md border p-4 text-sm">
              <div className="mb-3 flex items-center gap-2 font-medium">
                {preview?.kind === "image" ? (
                  <FileImage className="h-4 w-4" aria-hidden="true" />
                ) : (
                  <FileText className="h-4 w-4" aria-hidden="true" />
                )}
                Import Preview
              </div>
              {preview ? (
                <dl className="text-muted-foreground grid gap-2">
                  <div className="flex justify-between gap-3">
                    <dt>Type</dt>
                    <dd className="text-foreground font-medium">
                      {preview.kind === "pdf" ? "PDF" : "Image sheet"}
                    </dd>
                  </div>
                  <div className="flex justify-between gap-3">
                    <dt>Pages</dt>
                    <dd className="text-foreground font-medium">
                      {preview.pageCount ?? preview.imageCount}
                    </dd>
                  </div>
                  <div className="flex justify-between gap-3">
                    <dt>Size</dt>
                    <dd className="text-foreground font-medium">
                      {formatBytes(preview.sizeBytes)}
                    </dd>
                  </div>
                  {preview.imageDimensions[0] ? (
                    <div className="flex justify-between gap-3">
                      <dt>First image</dt>
                      <dd className="text-foreground font-medium">
                        {preview.imageDimensions[0].width} x{" "}
                        {preview.imageDimensions[0].height}
                      </dd>
                    </div>
                  ) : null}
                </dl>
              ) : (
                <p className="text-muted-foreground leading-6">
                  Choose a PDF or PNG/JPG image. Validation and metadata
                  extraction run before save.
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
              {selectedFiles.length > 1 ? (
                <Button
                  type="button"
                  variant="secondary"
                  className="mt-2 w-full"
                  disabled={
                    importState === "checking" ||
                    importState === "saving" ||
                    importState === "batching"
                  }
                  onClick={() => void handleBatchImport()}
                >
                  <Upload className="h-4 w-4" aria-hidden="true" />
                  Import files separately
                </Button>
              ) : null}
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_190px_180px_200px]">
        <label className="relative grid gap-2 text-sm font-medium">
          Search
          <Search
            className="text-muted-foreground pointer-events-none absolute bottom-3 left-3 h-4 w-4"
            aria-hidden="true"
          />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search by name, category, BPM, or time signature"
            className="border-border bg-background h-10 rounded-md border pr-3 pl-9 text-sm"
          />
        </label>
        <label className="grid gap-2 text-sm font-medium">
          Category filter
          <span className="relative">
            <Filter
              className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2"
              aria-hidden="true"
            />
            <select
              aria-label="Sheet category filter"
              value={categoryFilter}
              onChange={(event) =>
                setCategoryFilter(event.target.value as SheetCategoryFilter)
              }
              className="border-border bg-background h-10 w-full rounded-md border pr-3 pl-9 text-sm"
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
        <label className="grid content-end gap-2 text-sm font-medium">
          Favorites
          <button
            type="button"
            aria-pressed={favoritesOnly}
            aria-label="Show favorites only"
            onClick={() => setFavoritesOnly((current) => !current)}
            className="border-border bg-background hover:bg-muted focus-visible:ring-ring aria-pressed:border-primary aria-pressed:bg-primary/10 flex h-10 items-center justify-center gap-2 rounded-md border px-3 text-sm font-semibold transition-colors focus-visible:ring-2 focus-visible:outline-none"
          >
            <Star className="h-4 w-4" aria-hidden="true" />
            Favorites only
          </button>
        </label>
        <label className="grid gap-2 text-sm font-medium">
          Tag filter
          <input
            value={tagFilter}
            onChange={(event) => setTagFilter(event.target.value)}
            placeholder="Filter by tag"
            className="border-border bg-background h-10 rounded-md border px-3 text-sm"
          />
        </label>
      </div>

      <div aria-live="polite" className="grid gap-3">
        {!loading && visibleSheets.length > 0 && practiceSummaryError ? (
          <p
            role="alert"
            className="border-destructive/30 bg-destructive/10 text-destructive rounded-md border px-3 py-2 text-sm"
          >
            {practiceSummaryError}
          </p>
        ) : null}
        {loading ? (
          <Card>
            <CardContent className="pt-5">
              <p className="text-muted-foreground text-sm">Loading sheets...</p>
            </CardContent>
          </Card>
        ) : visibleSheets.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-start gap-3 pt-5">
              <div className="bg-muted flex h-11 w-11 items-center justify-center rounded-full">
                <Wand2 className="h-5 w-5" aria-hidden="true" />
              </div>
              <div>
                <h2 className="text-base font-semibold">
                  No sheets imported yet
                </h2>
                <p className="text-muted-foreground mt-1 text-sm leading-6">
                  Imported PDF and image artifacts will appear here with
                  metadata and practice routing.
                </p>
              </div>
            </CardContent>
          </Card>
        ) : (
          visibleSheets.map((sheet) => {
            const isEditing = editingSheetId === sheet.id;
            const sheetTags = sheet.tags ?? [];
            const isFavorite = sheet.favorite === true;
            const practiceSummary = practiceSummariesBySheetId[sheet.id];

            return (
              <Card key={sheet.id}>
                <CardContent className="pt-5">
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <h2 className="text-lg font-semibold break-words">
                          {sheet.name}
                        </h2>
                        <span className="bg-muted rounded-md px-2 py-1 text-xs font-medium">
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
                      <dl className="text-muted-foreground mt-3 grid gap-2 text-sm sm:grid-cols-2 xl:grid-cols-5">
                        <div>
                          <dt className="text-foreground font-medium">Pages</dt>
                          <dd>{formatPageCount(sheet)}</dd>
                        </div>
                        <div>
                          <dt className="text-foreground font-medium">BPM</dt>
                          <dd>{sheet.bpm}</dd>
                        </div>
                        <div>
                          <dt className="text-foreground font-medium">Time</dt>
                          <dd>{sheet.timeSignature}</dd>
                        </div>
                        <div>
                          <dt className="text-foreground font-medium">
                            Last practiced
                          </dt>
                          <dd>{formatLastPracticed(sheet.lastPracticedAt)}</dd>
                        </div>
                        <div>
                          <dt className="text-foreground font-medium">
                            Artifact
                          </dt>
                          <dd>{sheet.originalFileNames.join(", ")}</dd>
                        </div>
                      </dl>
                      {!practiceSummaryError ? (
                        <div
                          aria-label={`Recent practice for ${sheet.name}`}
                          className="border-border bg-muted/50 mt-3 rounded-md border px-3 py-2 text-sm"
                        >
                          <p className="text-foreground font-medium">
                            Recent practice
                          </p>
                          {practiceSummaryLoading ? (
                            <p
                              aria-busy="true"
                              className="text-muted-foreground mt-1"
                            >
                              Loading practice summary...
                            </p>
                          ) : practiceSummary ? (
                            <div className="text-muted-foreground mt-1 grid gap-1">
                              <p>
                                Last practiced{" "}
                                {formatPracticeDate(
                                  practiceSummary.lastPracticedAt
                                )}
                              </p>
                              <p>{formatPracticeMetrics(practiceSummary)}</p>
                            </div>
                          ) : (
                            <p className="text-muted-foreground mt-1">
                              No local practice summary yet.
                            </p>
                          )}
                        </div>
                      ) : null}
                      <div className="mt-4 grid gap-3">
                        <div className="flex flex-wrap items-center gap-2">
                          {sheetTags.length > 0 ? (
                            sheetTags.map((tag) => (
                              <span
                                key={tag}
                                className="bg-muted rounded-md px-2 py-1 text-xs font-medium"
                              >
                                {tag}
                              </span>
                            ))
                          ) : (
                            <span className="text-muted-foreground text-sm">
                              No tags
                            </span>
                          )}
                        </div>
                        <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_auto]">
                          <label className="grid gap-2 text-sm font-medium">
                            Edit tags for {sheet.name}
                            <input
                              aria-label={`Edit tags for ${sheet.name}`}
                              value={
                                tagDrafts[sheet.id] ?? sheetTags.join(", ")
                              }
                              onChange={(event) =>
                                setTagDrafts((current) => ({
                                  ...current,
                                  [sheet.id]: event.target.value
                                }))
                              }
                              className="border-border bg-background h-10 rounded-md border px-3 text-sm"
                            />
                          </label>
                          <Button
                            type="button"
                            variant="secondary"
                            disabled={tagSavingId === sheet.id}
                            onClick={() => void saveTags(sheet)}
                            className="self-end"
                          >
                            Save tags
                          </Button>
                        </div>
                      </div>
                      {isEditing ? (
                        <div className="border-border bg-background mt-4 grid gap-3 rounded-md border p-3">
                          <div className="grid gap-3 sm:grid-cols-2">
                            <label className="grid gap-2 text-sm font-medium">
                              Edit name
                              <input
                                aria-label="Edit sheet name"
                                value={editMetadata.name}
                                onChange={(event) =>
                                  setEditMetadata((current) => ({
                                    ...current,
                                    name: event.target.value
                                  }))
                                }
                                className="border-border bg-background h-10 rounded-md border px-3 text-sm"
                              />
                            </label>
                            <label className="grid gap-2 text-sm font-medium">
                              Edit category
                              <select
                                aria-label="Edit sheet category"
                                value={editMetadata.category}
                                onChange={(event) =>
                                  setEditMetadata((current) => ({
                                    ...current,
                                    category: event.target
                                      .value as SheetCategory
                                  }))
                                }
                                className="border-border bg-background h-10 rounded-md border px-3 text-sm"
                              >
                                {SHEET_CATEGORIES.map((category) => (
                                  <option key={category} value={category}>
                                    {sheetCategoryLabels[category]}
                                  </option>
                                ))}
                              </select>
                            </label>
                            <label className="grid gap-2 text-sm font-medium">
                              Edit BPM
                              <input
                                aria-label="Edit sheet BPM"
                                value={editMetadata.bpm}
                                inputMode="numeric"
                                onChange={(event) =>
                                  setEditMetadata((current) => ({
                                    ...current,
                                    bpm: event.target.value
                                  }))
                                }
                                className="border-border bg-background h-10 rounded-md border px-3 text-sm"
                              />
                            </label>
                            <label className="grid gap-2 text-sm font-medium">
                              Edit time signature
                              <input
                                aria-label="Edit sheet time signature"
                                value={editMetadata.timeSignature}
                                onChange={(event) =>
                                  setEditMetadata((current) => ({
                                    ...current,
                                    timeSignature: event.target.value
                                  }))
                                }
                                className="border-border bg-background h-10 rounded-md border px-3 text-sm"
                              />
                            </label>
                          </div>
                          <div className="flex flex-col gap-2 sm:flex-row">
                            <Button
                              type="button"
                              onClick={() => void saveMetadataEdit(sheet)}
                            >
                              Save metadata
                            </Button>
                            <Button
                              type="button"
                              variant="secondary"
                              onClick={cancelEditing}
                            >
                              Cancel
                            </Button>
                          </div>
                        </div>
                      ) : null}
                    </div>
                    <div className="flex flex-col gap-2 sm:flex-row lg:shrink-0">
                      <Button
                        type="button"
                        variant={isFavorite ? "default" : "secondary"}
                        aria-pressed={isFavorite}
                        aria-label={`${isFavorite ? "Unfavorite" : "Favorite"} ${sheet.name}`}
                        disabled={favoriteUpdatingId === sheet.id}
                        onClick={() => void toggleFavorite(sheet)}
                      >
                        <Star className="h-4 w-4" aria-hidden="true" />
                        {isFavorite ? "Favorited" : "Favorite"}
                      </Button>
                      <Button asChild>
                        <Link href={getSheetPracticeHref(sheet.id)}>
                          Open Sheet Practice
                        </Link>
                      </Button>
                      <Button asChild variant="secondary">
                        <Link href={getRecordingsReviewBySheetHref(sheet.id)}>
                          Review recordings
                        </Link>
                      </Button>
                      <Button
                        type="button"
                        variant="secondary"
                        onClick={() => startEditing(sheet)}
                      >
                        <Pencil className="h-4 w-4" aria-hidden="true" />
                        Edit Metadata
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
            );
          })
        )}
      </div>
    </section>
  );
}
