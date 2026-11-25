interface DownloadEnv {
  API_HOST: string;
  DOWNLOAD_ORIGIN: string;
  CDN_ORIGIN: string;
  S3_ORIGIN: string;
  S3_BUCKET: string;
}

const uuid = "[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}";
const apiPath = new RegExp(`^/api/download/bundles/${uuid}/file/?$`, "i");
const zipPath = new RegExp(`^/bundles/${uuid}\\.zip$`, "i");
const rangeHeaders = [
  "Range",
  "If-Range",
  "If-Match",
  "If-None-Match",
  "If-Modified-Since",
  "If-Unmodified-Since",
];

function signedQuery(url: URL): boolean {
  return url.searchParams.has("X-Amz-Signature") && url.searchParams.has("X-Amz-Expires");
}

function downloadResponse(response: Response, source?: Response): Response {
  const headers = new Headers(response.headers);
  const disposition = source?.headers.get("Content-Disposition");
  if (disposition) {
    headers.set("Content-Disposition", disposition);
  }

  const cacheStatus = headers.get("CF-Cache-Status");
  if (source && cacheStatus) {
    headers.set("X-PGKO-Cache-Status", cacheStatus);
  }

  // The edge fetch caches the ZIP by version. The signed client URL is temporary.
  headers.set("Cache-Control", "private, no-store");
  return new Response(response.body, { status: response.status, headers });
}

async function redirectDownload(request: Request, env: DownloadEnv): Promise<Response> {
  const response = await fetch(request, { redirect: "manual" });
  const location = response.headers.get("Location");
  if (response.status !== 302 || !location || !env.S3_ORIGIN || !env.S3_BUCKET) {
    return response;
  }

  const source = new URL(location);
  const bucketPath = `/${env.S3_BUCKET}`;
  const path = source.pathname.slice(bucketPath.length);
  if (
    source.origin !== env.S3_ORIGIN ||
    !source.pathname.startsWith(`${bucketPath}/`) ||
    !zipPath.test(path) ||
    !signedQuery(source)
  ) {
    return response;
  }

  const target = new URL(path, env.DOWNLOAD_ORIGIN);
  target.searchParams.set("source", source.search.slice(1));
  const headers = new Headers(response.headers);
  headers.set("Location", target.href);
  return new Response(response.body, { status: 302, headers });
}

async function serveDownload(request: Request, url: URL, env: DownloadEnv): Promise<Response> {
  const query = url.searchParams.get("source");
  if (
    (request.method !== "GET" && request.method !== "HEAD") ||
    !zipPath.test(url.pathname) ||
    !query ||
    !env.S3_ORIGIN ||
    !env.S3_BUCKET
  ) {
    return new Response(null, { status: 404, headers: { "Cache-Control": "private, no-store" } });
  }

  const source = new URL(`/${env.S3_BUCKET}${url.pathname}`, env.S3_ORIGIN);
  source.search = query;
  if (!signedQuery(source)) {
    return new Response(null, { status: 403, headers: { "Cache-Control": "private, no-store" } });
  }

  // Validate the original presigned GET against R2 before reading from a shared cache.
  const proof = await fetch(source, {
    headers: { Range: "bytes=0-0" },
    redirect: "manual",
    cache: "no-store",
  });
  if (proof.status !== 206) {
    if (!proof.ok) {
      return downloadResponse(proof);
    }
    await proof.body?.cancel();
    return new Response(null, { status: 502, headers: { "Cache-Control": "private, no-store" } });
  }
  await proof.body?.cancel();

  const headers = new Headers();
  for (const header of rangeHeaders) {
    const value = request.headers.get(header);
    if (value) {
      headers.set(header, value);
    }
  }

  const etag = proof.headers.get("ETag");
  if (etag) {
    const cdn = new URL(url.pathname, env.CDN_ORIGIN);
    cdn.searchParams.set("download-version", etag);
    try {
      const cached = await fetch(cdn, {
        method: request.method,
        headers,
        redirect: "manual",
        cf: { cacheEverything: true, cacheTtlByStatus: { "200-299": 3600, "300-599": -1 } },
      });
      if ((cached.ok || cached.status === 304) && cached.headers.get("ETag") === etag) {
        return downloadResponse(cached, proof);
      }
      await cached.body?.cancel();
    } catch {
      // The signed object remains available even when the CDN fetch fails.
    }
  }

  // A presigned GET cannot be used as a HEAD request.
  if (request.method === "HEAD") {
    const total = proof.headers.get("Content-Range")?.match(/\/(\d+)$/)?.[1];
    const fallbackHeaders = new Headers(proof.headers);
    fallbackHeaders.delete("Content-Range");
    fallbackHeaders.delete("Content-Length");
    if (total) {
      fallbackHeaders.set("Content-Length", total);
    }
    return downloadResponse(new Response(null, { headers: fallbackHeaders }));
  }

  return downloadResponse(await fetch(source, { headers, redirect: "manual", cache: "no-store" }));
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.origin === env.DOWNLOAD_ORIGIN) {
      try {
        return await serveDownload(request, url, env);
      } catch {
        return new Response(null, {
          status: 502,
          headers: { "Cache-Control": "private, no-store" },
        });
      }
    }
    if (request.method === "GET" && url.hostname === env.API_HOST && apiPath.test(url.pathname)) {
      return redirectDownload(request, env);
    }
    return fetch(request);
  },
} satisfies ExportedHandler<DownloadEnv>;
