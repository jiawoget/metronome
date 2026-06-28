import type { RecordingAudioDownloadAdapter } from "@/lib/recordings-review/audio-export";

const DOWNLOAD_CLEANUP_DELAY_MS = 30_000;

export const browserAudioDownloadAdapter: RecordingAudioDownloadAdapter = {
  downloadBlob({ blob, filename }) {
    if (
      typeof document === "undefined" ||
      typeof URL === "undefined" ||
      typeof URL.createObjectURL !== "function"
    ) {
      throw new Error("Browser downloads are not available.");
    }

    const objectUrl = URL.createObjectURL(blob);
    const link = document.createElement("a");

    try {
      link.href = objectUrl;
      link.download = filename;
      link.rel = "noopener";
      link.style.display = "none";
      document.body.appendChild(link);
      link.click();
    } finally {
      window.setTimeout(() => {
        link.remove();
        URL.revokeObjectURL(objectUrl);
      }, DOWNLOAD_CLEANUP_DELAY_MS);
    }
  }
};
