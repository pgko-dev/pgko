import type { ChartNote } from "./types.js";

/** Sorted start times plus a segment tree of end times. Queries retain source order. */
export class NoteIndex {
  private readonly entries: { note: ChartNote; order: number }[];
  private readonly maximumEnds: Float64Array;
  private readonly leaves: number;

  constructor(notes: readonly ChartNote[]) {
    this.entries = notes
      .map((note, order) => ({ note, order }))
      .sort((a, b) => a.note.tick - b.note.tick);
    this.leaves = 2 ** Math.ceil(Math.log2(Math.max(1, notes.length)));
    this.maximumEnds = new Float64Array(this.leaves * 2).fill(-Infinity);
    this.entries.forEach(({ note }, index) => {
      this.maximumEnds[this.leaves + index] = note.endTick;
    });
    for (let index = this.leaves - 1; index > 0; index--) {
      this.maximumEnds[index] = Math.max(
        this.maximumEnds[index * 2],
        this.maximumEnds[index * 2 + 1],
      );
    }
  }

  query(start: number, end: number): ChartNote[] {
    if (end < start) return [];
    const found: number[] = [];
    const pending: [node: number, first: number, length: number][] = [[1, 0, this.leaves]];

    while (pending.length) {
      const [node, first, length] = pending.pop()!;
      if (
        this.maximumEnds[node] < start ||
        first >= this.entries.length ||
        this.entries[first].note.tick > end
      )
        continue;
      if (length === 1) {
        found.push(first);
      } else {
        const half = length / 2;
        pending.push([node * 2, first, half], [node * 2 + 1, first + half, half]);
      }
    }
    found.sort((a, b) => this.entries[a].order - this.entries[b].order);
    return found.map((index) => this.entries[index].note);
  }
}
