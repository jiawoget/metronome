import { createBrowserRecordingCaptureService } from "@/infrastructure/audio/browser-recording-capture";
import { BrowserSheetRecordingService } from "@/lib/sheet-practice/recording-service";

export { createBrowserRecordingCaptureService };

export function createBrowserSheetRecordingService() {
  return new BrowserSheetRecordingService(createBrowserRecordingCaptureService());
}
