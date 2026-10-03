import { prepareChart } from "ugc-render";

self.onmessage = (event: MessageEvent<ArrayBuffer>) => {
  try {
    self.postMessage(prepareChart(new Uint8Array(event.data)));
  } catch {
    self.postMessage({
      chart: null,
      diagnostics: [
        { severity: "error", code: "parse", line: 0, message: "Unable to parse beatmap." },
      ],
    });
  }
};
