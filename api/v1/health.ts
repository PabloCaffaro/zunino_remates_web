import { jsonResponse } from "../_lib/http.js";
import { checkSupabaseConnection } from "../_lib/supabase.js";

const handler = {
  async fetch(request: Request): Promise<Response> {
    const requestId = crypto.randomUUID();

    if (request.method !== "GET") {
      return new Response(null, {
        status: 405,
        headers: {
          Allow: "GET",
          "Cache-Control": "no-store",
          "X-Request-Id": requestId,
        },
      });
    }

    try {
      await checkSupabaseConnection();

      return jsonResponse(
        {
          status: "ok",
          checks: { api: "ok", database: "ok" },
          requestId,
        },
        200,
      );
    } catch {
      return jsonResponse(
        {
          status: "unavailable",
          checks: { api: "ok", database: "unavailable" },
          requestId,
        },
        503,
      );
    }
  },
};

export default handler;
