import { jsonResponse } from "../../_lib/http.js";
import { getPublicContent } from "../../_lib/publicData.js";

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
      return jsonResponse({ data: await getPublicContent(), requestId }, 200);
    } catch {
      return jsonResponse(
        { error: "No se pudo cargar el contenido público.", requestId },
        503,
      );
    }
  },
};
