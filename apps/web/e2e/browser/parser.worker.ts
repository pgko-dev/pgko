import { prepareChart } from "ugc-render";

self.onmessage = (event: MessageEvent<ArrayBuffer>) =>
  self.postMessage(prepareChart(new Uint8Array(event.data)));
