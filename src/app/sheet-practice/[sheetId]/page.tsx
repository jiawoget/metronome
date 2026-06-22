import { SheetViewerExperience } from "@/components/sheet-practice/viewer/sheet-viewer-experience";

type SheetPracticePathPageProps = {
  params: Promise<{
    sheetId: string;
  }>;
  searchParams?: Promise<{
    recordingId?: string | string[];
  }>;
};

export default async function SheetPracticePathPage({ params, searchParams }: SheetPracticePathPageProps) {
  const { sheetId } = await params;
  const query = await searchParams;
  const rawRecordingId = query?.recordingId;
  const sourceRecordingId = Array.isArray(rawRecordingId) ? rawRecordingId[0] : rawRecordingId ?? null;

  return <SheetViewerExperience sheetId={sheetId} sourceRecordingId={sourceRecordingId} />;
}
