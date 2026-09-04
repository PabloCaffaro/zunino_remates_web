import { ApiError, adminError, privateResponse, readJson } from "../../_lib/adminHttp.js";
import { requireAdmin } from "../../_lib/adminSession.js";
import { databaseError, requireId, requireStatus, requireVersion, validateRemate } from "../../_lib/adminRemates.js";

export default {
  async fetch(request: Request): Promise<Response> {
    const requestId = crypto.randomUUID();
    const headers = new Headers();
    try {
      if (!["GET", "POST", "PATCH", "DELETE"].includes(request.method)) {
        headers.set("Allow", "GET, POST, PATCH, DELETE");
        throw new ApiError(405, "Método no permitido.");
      }
      const { supabase, user } = await requireAdmin(request, headers);
      if (request.method === "GET") {
        const { data, error } = await supabase.rpc("admin_list_remates");
        if (error) throw databaseError(error);
        return privateResponse(data, headers, requestId);
      }
      const body = await readJson(request);
      let operation;
      if (request.method === "POST") {
        const { remate, version } = validateRemate(body);
        operation = supabase.rpc("admin_save_remate", { p_remate: remate, p_expected_version: version });
      } else {
        const params = { p_id: requireId(body.id), p_expected_version: requireVersion(body.version) };
        if (request.method === "DELETE") {
          if (user.rol !== "administrador") throw new ApiError(403, "Sólo un administrador puede eliminar remates.");
          operation = supabase.rpc("admin_delete_remate", params);
        } else operation = supabase.rpc("admin_change_remate_status", { ...params, p_status: requireStatus(body.status) });
      }
      const { data, error } = await operation;
      if (error) throw databaseError(error);
      return privateResponse(data, headers, requestId, data?.status === "conflict" ? 409 : 200);
    } catch (error) { return adminError(error, headers, requestId); }
  },
};
