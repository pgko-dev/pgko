export type ChartDiagnostic = {
  severity: "warning" | "error";
  code: string;
  line: number;
  message: string;
};

export type NoteKind =
  | "tap"
  | "exTap"
  | "flick"
  | "damage"
  | "hold"
  | "slide"
  | "air"
  | "airHold"
  | "airSlide"
  | "airCrush";

export type ChartPoint = {
  id: string;
  line: number;
  tick: number;
  lane: number;
  width: number;
  height: number;
  action: boolean;
  /** Whether the segment arriving at this point is hidden. */
  noLine: boolean;
};

export type ChartNote = ChartPoint & {
  kind: NoteKind;
  timeline: number;
  children: ChartPoint[];
  endTick: number;
  pairId?: string;
  direction: string;
  color: string;
  effect: string;
  ex: boolean;
  /** 0 = trace, null = head only, otherwise source ticks between attacks. */
  interval: number | null;
};

export type TempoEvent = { tick: number; bpm: number; line: number };
export type MeterEvent = { bar: number; numerator: number; denominator: number; line: number };
export type SpeedEvent = { tick: number; speed: number; timeline: number | null; line: number };

/** Plain structured-clone data. Ticks retain the input file's resolution. */
export type UgcChart = {
  version: number;
  ticksPerQuarter: number;
  encoding: "utf-8" | "shift_jis";
  metadata: {
    title: string;
    artist: string;
    designer: string;
    bgm: string;
    bgmOffset: number;
    startOffset: boolean;
    mainTimeline: number;
  };
  tempos: TempoEvent[];
  meters: MeterEvent[];
  speeds: SpeedEvent[];
  notes: ChartNote[];
  lastTick: number;
};

export type ChartParseResult = {
  chart: UgcChart | null;
  diagnostics: ChartDiagnostic[];
};
