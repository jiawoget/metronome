import { RecordingsReviewExperience } from "@/components/recordings-review/recordings-review-experience";

type RecordingsPageProps = {
  searchParams?: Promise<{
    sheetId?: string | string[];
  }>;
};

export default async function RecordingsPage({
  searchParams
}: RecordingsPageProps) {
  const params = await searchParams;
  const rawSheetId = params?.sheetId;
  const sheetFilterId = Array.isArray(rawSheetId)
    ? rawSheetId[0]
    : (rawSheetId ?? null);

  return <RecordingsReviewExperience sheetFilterId={sheetFilterId} />;
}
