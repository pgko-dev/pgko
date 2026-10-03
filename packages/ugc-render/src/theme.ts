// Based on MargreteOnline by inonote. Palette uses CSS RGB, not Win32 COLORREF.
export const theme = {
  background: "#000000",
  border: "#cccccc",
  measure: "#999999",
  beat: "#555555",
  subdivision: "#222222",
  tap: "#cc0000",
  exTap: "#cccc00",
  exLong: "#bfcc40",
  flick: "#777788",
  flickInner: "#00eeee",
  damage: "#000077",
  slide: "#0033ee",
  slideCenter: "#00eeff",
  hold: "#ee7700",
  highlight: "#eeeeee",
  slideGradient: ["#a54fd7", "#00ffff", "#00ffff", "#d64faf"],
  holdGradient: ["#a64fd6", "#ffe400", "#ffe400", "#d850ad"],
  airUp: "#00ff00",
  airDown: "#ff00ff",
  airEdge: "#ffffff",
  airAction: "#ff00ff",
  crush: "#5e00ff",
  crushEmphasis: "#ff57ab",
  crushCenter: "#ff00bb",
} as const;

const AIR_WIDTH_RATIOS = [
  0, 0.4, 0.5, 0.63, 0.69, 0.7, 0.7, 0.73, 0.75, 0.765, 0.78, 0.795, 0.81, 0.825, 0.84, 0.855, 0.87,
];
export const innerWidthRatio = (width: number) =>
  AIR_WIDTH_RATIOS[Math.max(0, Math.min(16, Math.round(width)))];

const CUSTOM_COLORS: Record<string, string> = {
  R: "#e30000",
  O: "#e3b600",
  Y: "#f6ff00",
  M: "#99ff00",
  G: "#00e304",
  A: "#00dbe3",
  C: "#00b3ff",
  D: "#008dff",
  B: "#3b2fe0",
  P: "#7d00e3",
  V: "#d900c4",
  H: "#46484d",
  K: "#000000",
  Z: "transparent",
};
// UGC color codes differ from the editor's palette indices.
const CRUSH_COLORS: Record<string, string> = {
  "1": "#e30000",
  "2": "#e3b600",
  "3": "#f6ff00",
  "4": CUSTOM_COLORS.M,
  "5": CUSTOM_COLORS.G,
  "6": CUSTOM_COLORS.A,
  "7": CUSTOM_COLORS.C,
  "8": CUSTOM_COLORS.D,
  "9": CUSTOM_COLORS.B,
  A: CUSTOM_COLORS.P,
  Y: theme.crushCenter,
  B: CUSTOM_COLORS.V,
  C: "#ffffff",
  D: CUSTOM_COLORS.H,
  Z: "transparent",
};
export function airColor(code: string, down: boolean) {
  if (code !== "N" && code !== "I") return CUSTOM_COLORS[code] ?? theme.airUp;
  return down === (code === "I") ? theme.airUp : theme.airDown;
}
export const crushColor = (code: string) => CRUSH_COLORS[code] ?? theme.crushCenter;
