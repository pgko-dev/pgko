import { useCallback, useRef, useState } from "react";

export function usePreviewAudio() {
  const audioRef = useRef<HTMLAudioElement>(null);
  const playRequestRef = useRef(0);
  const [playingId, setPlayingId] = useState<string | null>(null);

  const playPreview = useCallback(
    (song: { id: string; previewUrl?: string | null }) => {
      if (!song.previewUrl) return;
      const el = audioRef.current;
      if (!el) return;
      if (playingId === song.id) {
        playRequestRef.current += 1;
        el.pause();
        setPlayingId(null);
      } else {
        const playRequest = ++playRequestRef.current;
        el.src = song.previewUrl;
        el.volume = 0.85;
        setPlayingId(song.id);
        void el.play().catch(() => {
          if (playRequestRef.current === playRequest) {
            setPlayingId(null);
          }
        });
      }
    },
    [playingId],
  );

  const stopPreview = useCallback(() => {
    playRequestRef.current += 1;
    setPlayingId(null);
  }, []);

  return { audioRef, playingId, setPlayingId, playPreview, stopPreview };
}
