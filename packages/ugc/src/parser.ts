import * as v from "valibot";

import { type Ugc, type UgcHeader, UgcHeaderSchema, type UgcIssue } from "./types.js";

const MAX_HEADER_BYTES = 1024 * 1024;
const LINE_SEPARATOR_PATTERN = /\r\n|\n/;

export class UgcError extends Error {
  issues: UgcIssue[];
  constructor(message: string, issues: UgcIssue[]) {
    super(message);
    this.name = "UgcError";
    this.issues = issues;
  }
}

const handleDirective = (header: Partial<UgcHeader>, name: string, values: string[]) => {
  switch (name) {
    case "SONGID": {
      header.songId = values[0];
      return;
    }
    case "BGM": {
      header.bgm = values[0];
      return;
    }
    case "DESIGN": {
      header.designer = values[0];
      return;
    }
    case "MAINBPM": {
      const n = Number.parseFloat(values[0]);
      header.bpm = Number.isFinite(n) ? n : undefined;
      return;
    }
    case "JACKET": {
      header.jacket = values[0];
      return;
    }
    case "BGMPRV": {
      header.bgmPreviewStart = Number.parseFloat(values[0]);
      header.bgmPreviewStop = Number.parseFloat(values[1]);
      return;
    }
    case "FLDIMG": {
      header.fldImg = values[0];
      return;
    }
    case "BGIMG": {
      header.bgImg = values[0];
      return;
    }
    case "TITLE": {
      header.title = values[0];
      return;
    }
    case "ARTIST": {
      header.artist = values[0];
      return;
    }
    case "DIFF": {
      header.difficulty = Number.parseInt(values[0], 10);
      return;
    }
    case "LEVEL": {
      header.level = values[0];
      return;
    }
    case "WEATTR": {
      header.weAttribute = values[0];
      return;
    }
    case "CONST": {
      header.constant = Number.parseFloat(values[0]);
      return;
    }
    case "CMT": {
      header.comments ??= [];
      header.comments.push(values[0]);
      return;
    }
    default: {
      return;
    }
  }
};

function hasReplacementChars(header: Partial<UgcHeader>): boolean {
  const fields = [header.title, header.artist, header.designer, header.songId];
  return fields.some((f) => f?.includes("\uFFFD"));
}

async function readHeaderLines(
  input: ReadableStream<Uint8Array<ArrayBuffer>>,
  processLine: (line: string) => boolean,
): Promise<void> {
  const decoder = new TextDecoder("utf-8", { fatal: false });
  let bufferedText = "";
  let headerBytes = 0;
  const reader = input.getReader();

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) {
        if (bufferedText.length > 0) {
          processLine(bufferedText);
        }
        return;
      }

      const remainingBytes = MAX_HEADER_BYTES - headerBytes;
      const headerChunk = value.subarray(0, remainingBytes);
      headerBytes += headerChunk.byteLength;
      bufferedText += decoder.decode(headerChunk, { stream: true });

      const lines = bufferedText.split(LINE_SEPARATOR_PATTERN);
      bufferedText = lines.pop() ?? "";
      for (const line of lines) {
        if (processLine(line)) {
          return;
        }
      }

      if (value.byteLength > remainingBytes) {
        throw new UgcError("ugc.error.invalidHeader", [{ message: "UGC header exceeds 1 MiB" }]);
      }
    }
  } finally {
    await reader.cancel();
    reader.releaseLock();
  }
}

export async function parseUgc(input: ReadableStream<Uint8Array<ArrayBuffer>>): Promise<Ugc> {
  const header: Partial<UgcHeader> = { comments: [] };
  let currentLineNumber = 0;

  await readHeaderLines(input, (rawLine) => {
    currentLineNumber += 1;
    const line =
      currentLineNumber === 1 && rawLine.codePointAt(0) === 0xfeff ? rawLine.slice(1) : rawLine;

    if (line.startsWith("@ENDHEAD")) {
      return true;
    }
    if (!line.startsWith("@")) {
      return false;
    }

    const parts = line.slice(1).split("\t");
    const name = parts[0];
    const values = parts.slice(1);
    handleDirective(header, name, values);
    return false;
  });

  const result = v.safeParse(UgcHeaderSchema, header);
  if (!result.success) {
    const issues: UgcIssue[] = result.issues.map((issue) => ({
      message: issue.message,
      context: {
        input: issue.input,
        path: issue.path,
        type: issue.type,
      },
    }));

    throw new UgcError("ugc.error.invalidHeader", issues);
  }

  return {
    header: result.output,
    encoding: {
      hasReplacementChars: hasReplacementChars(result.output),
    },
  };
}
