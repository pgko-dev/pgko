export type SongSummarySortable = {
  difficulty?: number;
  level?: string;
  constant?: number;
  title?: string;
  weAttribute?: string | null;
  designer?: string;
  bpm?: number | null;
};

export function sortSongs<T extends SongSummarySortable>(songs: T[]): T[] {
  const we = songs.filter((s) => s.difficulty === 4);
  const rest = songs.filter((s) => s.difficulty !== 4);

  const cmp = (a: number, b: number) => {
    if (a > b) return 1;
    if (a < b) return -1;
    return 0;
  };
  const cmpStr = (a: string, b: string) =>
    a === b ? 0 : a.localeCompare(b, undefined, { sensitivity: "base" });
  const cmpBpm = (a: number | null | undefined, b: number | null | undefined) => {
    if (a == null && b == null) return 0;
    if (a == null) return 1;
    if (b == null) return -1;
    return cmp(a, b);
  };

  rest.sort((a, b) => {
    let v = cmp(a.difficulty ?? 0, b.difficulty ?? 0);
    if (v !== 0) return v;
    v = cmpStr(a.level ?? "", b.level ?? "");
    if (v !== 0) return v;
    v = cmp(a.constant ?? 0, b.constant ?? 0);
    if (v !== 0) return v;
    v = cmpStr(a.title ?? "", b.title ?? "");
    if (v !== 0) return v;
    v = cmpStr(a.designer ?? "", b.designer ?? "");
    if (v !== 0) return v;
    return cmpBpm(a.bpm, b.bpm);
  });

  we.sort((a, b) => {
    const wa = a.weAttribute ?? "";
    const wb = b.weAttribute ?? "";
    let v = cmpStr(wa, wb);
    if (v !== 0) return v;
    v = cmpStr(a.level ?? "", b.level ?? "");
    if (v !== 0) return v;
    v = cmpStr(a.title ?? "", b.title ?? "");
    if (v !== 0) return v;
    v = cmpStr(a.designer ?? "", b.designer ?? "");
    if (v !== 0) return v;
    return cmpBpm(a.bpm, b.bpm);
  });

  return [...rest, ...we];
}
