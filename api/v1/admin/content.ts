import { validateContent } from "../../_lib/adminContent.js";
import { ApiError, adminError, privateResponse, readJson } from "../../_lib/adminHttp.js";
import { databaseError } from "../../_lib/adminRemates.js";
import { requireAdmin } from "../../_lib/adminSession.js";

export default {
  async fetch(request: Request): Promise<Response> {
    const requestId = crypto.randomUUID();
    const headers = new Headers();
    try {
      if (!["GET", "POST"].includes(request.method)) {
        headers.set("Allow", "GET, POST");
        throw new ApiError(405, "Método no permitido.");
      }
      const { supabase } = await requireAdmin(request, headers);
      const operation = request.method === "GET"
        ? supabase.rpc("admin_content_snapshot")
        : supabase.rpc("admin_save_content", { p_content: validateContent(await readJson(request)) });
      const { data, error } = await operation;
      if (error) throw databaseError(error);
      return privateResponse(data, headers, requestId);
    } catch (error) { return adminError(error, headers, requestId); }
  },
};
