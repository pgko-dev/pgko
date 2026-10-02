import { resolve } from "node:path";

const output = resolve(import.meta.dir, "../dist");
const files = new Set(["index.html", "openapi.json", "scalar.js"]);
if (!(await Bun.file(resolve(output, "index.html")).exists())) {
  throw new Error("Run bun run build before previewing.");
}

const server = Bun.serve({
  hostname: "127.0.0.1",
  port: 4173,
  fetch(request) {
    const pathname = new URL(request.url).pathname;
    if (pathname === "/openapi") {
      return Response.redirect(`${new URL(request.url).origin}/openapi/`, 308);
    }
    const filename = pathname.replace(/^\/(?:openapi\/)?/, "") || "index.html";
    if (!files.has(filename)) {
      return new Response("Not found", { status: 404 });
    }
    return new Response(Bun.file(resolve(output, filename)));
  },
});
console.log(`Preview: ${server.url}openapi/ (matches the GitHub Pages project path)`);
