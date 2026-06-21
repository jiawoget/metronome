import { SheetViewerExperience } from "@/components/sheet-practice/viewer/sheet-viewer-experience";

type SheetPracticePageProps = {
  searchParams?: Promise<{
    sheetId?: string | string[];
  }>;
};

export default async function SheetPracticePage({ searchParams }: SheetPracticePageProps) {
  const params = await searchParams;
  const rawSheetId = params?.sheetId;
  const sheetId = Array.isArray(rawSheetId) ? rawSheetId[0] : rawSheetId ?? null;

  return <SheetViewerExperience sheetId={sheetId} />;
}
