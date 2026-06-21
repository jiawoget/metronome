import { SheetViewerExperience } from "@/components/sheet-practice/viewer/sheet-viewer-experience";

type SheetPracticePathPageProps = {
  params: Promise<{
    sheetId: string;
  }>;
};

export default async function SheetPracticePathPage({ params }: SheetPracticePathPageProps) {
  const { sheetId } = await params;

  return <SheetViewerExperience sheetId={sheetId} />;
}
