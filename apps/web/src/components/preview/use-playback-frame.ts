import { useEffect, useLayoutEffect, useRef, useState } from "react";

export function usePixelRatio() {
  const [ratio, setRatio] = useState(globalThis.devicePixelRatio || 1);
  useEffect(() => {
    const query = matchMedia(`(resolution: ${ratio}dppx)`);
    const update = () => setRatio(globalThis.devicePixelRatio || 1);
    query.addEventListener("change", update);
    update();
    return () => query.removeEventListener("change", update);
  }, [ratio]);
  return ratio;
}

/** Frame updates stay in the viewport; React receives only structural/state changes. */
export function usePlaybackFrame(
  playing: boolean,
  tick: number,
  readTick: (() => number) | undefined,
  draw: (tick: number) => void,
) {
  const latest = useRef({ tick, draw });
  useLayoutEffect(() => {
    latest.current = { tick, draw };
    draw(playing ? (readTick?.() ?? tick) : tick);
  }, [tick, draw, playing, readTick]);

  useLayoutEffect(() => {
    if (!playing) return;
    let frame: number;
    const update = () => {
      latest.current.draw(readTick?.() ?? latest.current.tick);
      frame = requestAnimationFrame(update);
    };
    frame = requestAnimationFrame(update);
    return () => cancelAnimationFrame(frame);
  }, [playing, readTick]);
}
