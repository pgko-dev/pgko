import { prepareChart } from "@pgko.dev/ugc-render";

self.onmessage = (event: MessageEvent<ArrayBuffer>) =>
  self.postMessage(prepareChart(new Uint8Array(event.data)));
