import { expect, test } from "bun:test";

import { parseUgc, UgcError } from "./parser";

const encoder = new TextEncoder();
const validHeader = [
  "@SONGID\ttest",
  "@TITLE\tTest",
  "@ARTIST\tTest",
  "@DESIGN\tTest",
  "@DIFF\t1",
  "@LEVEL\t1",
  "@CONST\t1",
].join("\n");

test("keeps exact music, jacket, and background references", async () => {
  const header = [
    validHeader,
    "@BGM\t../song.ogg",
    "@JACKET\tcover.png",
    "@BGIMG\tbackground.mp4",
    "@FLDIMG\tfield.png",
    "@ENDHEAD",
  ].join("\n");
  const parsed = await parseUgc(new Response(header).body!);

  expect(parsed.header.bgm).toBe("../song.ogg");
  expect(parsed.header.jacket).toBe("cover.png");
  expect(parsed.header.bgImg).toBe("background.mp4");
  expect(parsed.header.fldImg).toBe("field.png");
});

test("stops reading and cancels after ENDHEAD, without consuming a large chart body", async () => {
  let reads = 0;
  let canceled = false;
  const stream = new ReadableStream<Uint8Array<ArrayBuffer>>(
    {
      pull(controller) {
        reads++;
        controller.enqueue(
          encoder.encode(validHeader + "\n@ENDHEAD\n" + "x".repeat(2 * 1024 * 1024)),
        );
      },
      cancel() {
        canceled = true;
      },
    },
    { highWaterMark: 0 },
  );

  expect((await parseUgc(stream)).header.title).toBe("Test");
  expect(reads).toBe(1);
  expect(canceled).toBe(true);
});

test("rejects an oversized unterminated header and cancels its stream", async () => {
  let canceled = false;
  const stream = new ReadableStream<Uint8Array<ArrayBuffer>>(
    {
      pull(controller) {
        controller.enqueue(encoder.encode("@TITLE\t" + "x".repeat(1024 * 1024)));
      },
      cancel() {
        canceled = true;
      },
    },
    { highWaterMark: 0 },
  );

  await expect(parseUgc(stream)).rejects.toBeInstanceOf(UgcError);
  expect(canceled).toBe(true);
});

test("handles split UTF-8, CRLF and a header ending at EOF", async () => {
  const bytes = encoder.encode(validHeader.replace("Test", "楽曲").replaceAll("\n", "\r\n"));
  let offset = 0;
  const stream = new ReadableStream<Uint8Array<ArrayBuffer>>({
    pull(controller) {
      if (offset === bytes.length) {
        controller.close();
      } else {
        controller.enqueue(bytes.slice(offset, ++offset));
      }
    },
  });

  expect((await parseUgc(stream)).header.title).toBe("楽曲");
});

test("accepts extended editor headers larger than 64 KiB", async () => {
  const header = validHeader + "\n" + "' editor metadata\n".repeat(5000) + "@ENDHEAD\n";
  const stream = new Response(header).body!;

  expect((await parseUgc(stream)).header.title).toBe("Test");
});
