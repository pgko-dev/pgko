import { Buffer } from "node:buffer";

export function wave(duration = 8) {
  const rate = 44100;
  const samples = Math.round(rate * duration);
  const buffer = Buffer.alloc(44 + samples * 2);
  buffer.write("RIFF");
  buffer.writeUInt32LE(buffer.length - 8, 4);
  buffer.write("WAVEfmt ", 8);
  buffer.writeUInt32LE(16, 16);
  buffer.writeUInt16LE(1, 20);
  buffer.writeUInt16LE(1, 22);
  buffer.writeUInt32LE(rate, 24);
  buffer.writeUInt32LE(rate * 2, 28);
  buffer.writeUInt16LE(2, 32);
  buffer.writeUInt16LE(16, 34);
  buffer.write("data", 36);
  buffer.writeUInt32LE(samples * 2, 40);
  for (let index = 0; index < samples; index++)
    buffer.writeInt16LE(
      Math.round(Math.sin((index / rate) * Math.PI * 880) * 1000),
      44 + index * 2,
    );
  return buffer;
}
