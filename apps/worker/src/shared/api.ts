export function getApiOrigin(env: Env): string | null {
  return env.API_ORIGIN?.replace(/\/$/, "") || null;
}

export async function fetchJson<T>(url: string, init?: RequestInit): Promise<T> {
  const headers = new Headers(init?.headers);
  headers.set("Accept", "application/json");

  const response = await fetch(url, {
    ...init,
    headers,
  });

  if (!response.ok) {
    throw new Error(`Unexpected API response: ${response.status}`);
  }

  return (await response.json()) as T;
}

export function proxyUpstreamResponse(response: Response): Response {
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers: response.headers,
  });
}

export async function fetchUpstream(url: string, init?: RequestInit): Promise<Response> {
  const response = await fetch(url, init);
  if (!response.ok) {
    throw new Error(`Unexpected API response: ${response.status}`);
  }
  return proxyUpstreamResponse(response);
}
