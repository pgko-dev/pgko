import { fixture } from "../../e2e/fixtures/beatmap.js";

const HEADER = "@VER\t8\n@TICKS\t480\n@BPM\t0'0\t120\n";

function mixedSource(events: number) {
  const rows: string[] = [];
  for (let index = 0; index < events; index++) {
    const position = `${Math.floor(index / 16)}'${(index % 16) * 120}`;
    const lane = ((index % 4) * 4).toString(16).toUpperCase();
    const point = `${lane}4`;
    switch (index % 8) {
      case 0:
        rows.push(`#${position}:t${point}`, `#${position}:a${point}UCN`);
        break;
      case 1:
        rows.push(`#${position}:x${point}D`);
        break;
      case 2:
        rows.push(`#${position}:f${point}L`);
        break;
      case 3:
        rows.push(`#${position}:d${point}`);
        break;
      case 4:
        rows.push(`#${position}:h${point}`, "#240>s");
        break;
      case 5:
        rows.push(`#${position}:s${point}`, "#120>c82", "#240>s44");
        break;
      case 6:
        rows.push(`#${position}:t${point}`, `#${position}:H${point}N`, "#240>s");
        break;
      default:
        rows.push(`#${position}:t${point}`, `#${position}:S${point}28N`, "#240>s0428");
    }
  }
  return HEADER + rows.join("\n");
}

function longSource(kind: "slide" | "crush", children: number) {
  const rows = kind === "slide" ? ["#0'0:s04"] : ["#0'0:t04", "#0'0:C04280,120"];
  for (let index = 1; index <= children; index++) {
    const lane = ((index % 4) * 4).toString(16).toUpperCase();
    const action = kind === "slide" && index === children ? "s" : "c";
    rows.push(`#${index * 120}>${action}${lane}4${kind === "crush" ? "28" : ""}`);
  }
  return HEADER + rows.join("\n");
}

/** Authored synthetic workloads; no downloaded or private chart data. */
export const benchmarkSources = [
  { name: "fixture", source: fixture },
  { name: "mixed-2k-events", source: mixedSource(2_000) },
  { name: "mixed-20k-events", source: mixedSource(20_000) },
  { name: "long-slide-20k-controls", source: longSource("slide", 20_000) },
  { name: "long-crush-20k-controls", source: longSource("crush", 20_000) },
  { name: "sparse-90k-bars", source: HEADER + "#89999'0:t04" },
];
