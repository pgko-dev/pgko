import { handleSeoRequest } from "./seo";

export default {
  async fetch(request, env, _ctx): Promise<Response> {
    const url = new URL(request.url);

    const seoResponse = await handleSeoRequest(request, env, url);
    if (seoResponse) {
      return seoResponse;
    }

    return fetch(request);
  },
} satisfies ExportedHandler<Env>;
