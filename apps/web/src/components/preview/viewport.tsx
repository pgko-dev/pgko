import type { UgcChart } from "ugc-render";
import type { ChartRenderOptions } from "ugc-render/canvas";

import { OverviewViewport } from "./overview";
import { PortraitViewport } from "./portrait";

export type PreviewViewportProps = Readonly<{
  chart: UgcChart;
  zoom: number;
  expanded: boolean;
  tick: number;
  follow: boolean;
  onPan: () => void;
  onSeek: (tick: number) => void;
  label: string;
  options: ChartRenderOptions;
}>;

export function PreviewViewport({
  portrait,
  ...props
}: PreviewViewportProps & { readonly portrait: boolean }) {
  return portrait ? <PortraitViewport {...props} /> : <OverviewViewport {...props} />;
}
