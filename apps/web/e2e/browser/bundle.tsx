import { useState } from "react";
import { createRoot } from "react-dom/client";

import Preview from "../../src/components/preview/preview";
import { SongPanel } from "../../src/components/song-panel";

import { Harness } from "./harness";
import "./observe-audio";

const song = {
  id: "00000000-0000-4000-8000-000000000002",
  ugcPath: "fixture.ugc",
  songId: "fixture",
  title: "Preview fixture",
  artist: "Test",
  difficulty: 3,
  level: "13+",
  constant: 13.5,
  weAttribute: null,
  bpm: 120,
  designer: "Fixture",
  assetReferences: null,
  videoUrl: "https://example.test/video",
};
const ignore = () => {};
function Fixture() {
  const [open, setOpen] = useState(false);
  return (
    <Harness>
      <SongPanel
        song={song}
        videoUrl={song.videoUrl}
        isPreviewPlaying={false}
        onPlayPreview={ignore}
        onPreviewBeatmap={() => setOpen(true)}
      />
      <div>
        {open ? (
          <Preview
            bundleId="00000000-0000-4000-8000-000000000001"
            revision={1}
            song={song}
            pauseSignal={0}
            onClose={() => setOpen(false)}
            onPlaybackStart={ignore}
            onRevisionChange={ignore}
          />
        ) : null}
      </div>
    </Harness>
  );
}
createRoot(document.getElementById("root")!).render(<Fixture />);
