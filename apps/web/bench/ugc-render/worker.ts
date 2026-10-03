import { prepareChart } from "../../../../packages/ugc-render/src/prepare.js";

self.onmessage = (event: MessageEvent<ArrayBuffer>) => {
  self.postMessage(prepareChart(new Uint8Array(event.data)));
};
