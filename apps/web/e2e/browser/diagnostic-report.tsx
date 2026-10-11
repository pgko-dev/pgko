import { Button } from "../../src/components/ui/button";

export function DiagnosticReport() {
  return (
    <Button
      variant="outline"
      onClick={() => {
        const engine = window.previewTransport;
        const gaps = window.previewFrameGaps.toSorted((a, b) => a - b);
        const report = {
          capturedAt: new Date().toISOString(),
          userAgent: navigator.userAgent,
          devicePixelRatio,
          physicalOutputValidated: false,
          audio: engine?.diagnostics,
          playback: engine?.snapshot(),
          presentationPosition: engine?.presentationPosition,
          frames: {
            count: gaps.length,
            p95: gaps[Math.floor(gaps.length * 0.95)],
            maximum: gaps.at(-1),
          },
          paintCount: window.previewPaints.length,
          signals: window.previewSignals,
        };
        const url = URL.createObjectURL(
          new Blob([JSON.stringify(report, null, 2)], { type: "application/json" }),
        );
        const link = document.createElement("a");
        link.href = url;
        link.download = "preview-diagnostics.json";
        link.click();
        setTimeout(() => URL.revokeObjectURL(url), 1000);
      }}
    >
      Export diagnostics
    </Button>
  );
}
