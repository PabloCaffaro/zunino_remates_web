import { jsonResponse } from "../../_lib/http.js";
import { getPublishedRemates } from "../../_lib/publicData.js";

export default {
  async fetch(request: Request): Promise<Response> {
    const requestId = crypto.randomUUID();

    if (request.method !== "GET") {
      return new Response(null, {
        status: 405,
        headers: { Allow: "GET", "Cache-Control": "no-store", "X-Request-Id": requestId },
      });
    }

    try {
      return jsonResponse({ data: await getPublishedRemates(), requestId }, 200);
    } catch {
      return jsonResponse(
        { error: "No se pudieron cargar los remates publicados.", requestId },
        503,
      );
    }
  },
};
