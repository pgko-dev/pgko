import { fetchUpstream, getApiOrigin } from "@/shared/api";

import { matchSeoRequest } from "./match";

export async function handleSeoRequest(
  request: Request,
  env: Env,
  url: URL,
): Promise<Response | null> {
  const match = matchSeoRequest(request, url);
  const apiOrigin = getApiOrigin(env);
  if (!match || !apiOrigin) {
    return null;
  }

  if (match.type === "bundle") {
    return fetchUpstream(
      `${apiOrigin}/api/og/bundles/${encodeURIComponent(match.id)}${url.search}`,
      {
        headers: { Accept: "text/html" },
      },
    );
  }

  return fetchUpstream(
    `${apiOrigin}/api/og/users/${encodeURIComponent(match.jointId)}${url.search}`,
    {
      headers: { Accept: "text/html" },
    },
  );
}
