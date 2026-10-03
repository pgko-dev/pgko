import { expect, test } from "bun:test";

import { NoteGeometry } from "./note-geometry.js";
import { parseUgcChart } from "./parser.js";
import { interpolatePoint } from "./renderer.js";
import type { ChartNote, ChartPoint } from "./types.js";

function note(ticks: number[], actions = false): ChartNote {
  const source = [
    "@BPM\t0'0\t120",
    "#0'0:s04",
    ...ticks.map((tick, index) => `#${tick}>${actions ? "s" : "c"}${index % 8}4`),
  ].join("\n");
  return parseUgcChart(new TextEncoder().encode(source)).chart!.notes[0];
}

function linearInterpolate(note: ChartNote, tick: number): ChartPoint {
  let previous: ChartPoint = note;
  for (const next of note.children) {
    if (next.tick > tick) {
      const fraction = (tick - previous.tick) / (next.tick - previous.tick);
      return {
        ...previous,
        tick,
        lane: previous.lane + (next.lane - previous.lane) * fraction,
        width: previous.width + (next.width - previous.width) * fraction,
      };
    }
    previous = next;
  }
  return { ...previous, tick };
}

test("crush interpolation retains duplicate-tick, extrapolation and point metadata semantics", () => {
  const model = note([0, 120, 120, 120, 360, 480, 480]);
  for (const [index, child] of model.children.entries()) {
    child.width = index + 1;
    child.action = index % 2 === 0;
    child.noLine = index % 3 === 0;
  }
  for (let tick = -120; tick <= 600; tick++) {
    expect(interpolatePoint(model, tick)).toEqual(linearInterpolate(model, tick));
  }
  model.children = [];
  expect(interpolatePoint(model, 100)).toEqual({ ...model, tick: 100 });
});

test("visible ribbons keep adjacent vertices and the complete run's gradient endpoints", () => {
  const model = note([120, 240, 360, 480, 600]);
  const visible = new NoteGeometry(model).visible(250, 350);
  expect(visible).toEqual([
    {
      points: [model, ...model.children.slice(1, 3), model.children.at(-1)!],
      startTick: 0,
      endTick: 600,
    },
  ]);
  expect(new NoteGeometry(model).visible(700, 800)).toEqual([]);
  expect(new NoteGeometry(model).visible(-200, -100)).toEqual([]);
});

test("same-tick boundaries keep every vertex and both adjoining action runs", () => {
  const model = note([120, 240, 240, 240, 360, 480]);
  model.children[2].action = true;
  const visible = new NoteGeometry(model).visible(240, 240);
  expect(visible.map(({ points }) => points.map(({ tick }) => tick))).toEqual([
    [0, 120, 240, 240],
    [240, 240, 360, 480],
  ]);
  expect(visible.map(({ startTick, endTick }) => [startTick, endTick])).toEqual([
    [0, 240],
    [240, 480],
  ]);
});

test("noLine discards unfinished geometry without joining across hidden segments", () => {
  const model = note([120, 240, 360, 480, 600, 720]);
  model.children[1].action = true;
  model.children[3].noLine = true;
  model.children[4].action = true;
  expect(
    new NoteGeometry(model).visible(0, 720).map(({ points }) => points.map(({ tick }) => tick)),
  ).toEqual([
    [0, 120, 240],
    [480, 600],
    [600, 720],
  ]);
  expect(new NoteGeometry(model).visible(300, 400)).toEqual([]);
});

test("large crossing ribbons and many action runs emit only the visible controls", () => {
  for (const actions of [false, true]) {
    const model = note(
      Array.from({ length: 20_000 }, (_, index) => (index + 1) * 120),
      actions,
    );
    const visible = new NoteGeometry(model).visible(2_160_001, 2_166_001);
    const points = visible.flatMap((run) => run.points);
    expect(points.length).toBeLessThanOrEqual(104);
    const adjacent = points.filter((point) => point.tick !== 0 && point.tick !== model.endTick);
    expect(adjacent[0].tick).toBe(2_160_000);
    expect(adjacent.at(-1)!.tick).toBe(2_166_120);
  }
});
