// Optional fixture regeneration. Synthesizes a tone; no supplied music is copied.
import { mkdir, writeFile } from "node:fs/promises";

import { firefox } from "@playwright/test";

const browser = await firefox.launch();
try {
  const page = await browser.newPage();
  await page.setContent('<button id="record">Record fixture</button>');
  await page.evaluate(() => {
    document.querySelector("button").onclick = () => {
      window.recording = new Promise((resolve, reject) => {
        const context = new AudioContext();
        const output = context.createMediaStreamDestination();
        const gain = context.createGain();
        gain.gain.value = 0.03;
        gain.connect(output);
        const oscillator = context.createOscillator();
        oscillator.connect(gain);
        const recorder = new MediaRecorder(output.stream, { mimeType: "audio/ogg;codecs=opus" });
        const chunks = [];
        recorder.ondataavailable = (event) => chunks.push(event.data);
        recorder.onstop = async () => {
          oscillator.stop();
          await context.close();
          resolve(Array.from(new Uint8Array(await new Blob(chunks).arrayBuffer())));
        };
        void context
          .resume()
          .then(() => {
            recorder.start();
            oscillator.start();
            setTimeout(() => recorder.stop(), 8000);
          })
          .catch(reject);
      });
    };
  });
  await page.click("button");
  const bytes = await page.evaluate(() => window.recording);
  await mkdir(new URL("../fixtures/", import.meta.url), { recursive: true });
  await writeFile(new URL("../fixtures/tone.opus", import.meta.url), new Uint8Array(bytes));
  console.log(`Saved ${bytes.length} bytes of synthetic Ogg Opus.`);
} finally {
  await browser.close();
}
