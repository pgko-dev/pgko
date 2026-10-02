import SwaggerParser from "@apidevtools/swagger-parser";

function rejectExternalReferences(value: unknown): void {
  if (!value || typeof value !== "object") {
    return;
  }
  const object = value as Record<string, unknown>;
  if (typeof object.$ref === "string" && !object.$ref.startsWith("#/")) {
    throw new Error(`The spec must be self-contained: ${object.$ref}`);
  }
  for (const child of Object.values(object)) {
    rejectExternalReferences(child);
  }
}

export async function readSpec(path: string): Promise<string> {
  const source = await Bun.file(path).text();
  const document = JSON.parse(source);
  rejectExternalReferences(document);
  await SwaggerParser.validate(document, { resolve: { external: false } });
  return source;
}
