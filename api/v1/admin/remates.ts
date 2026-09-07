import { ApiError, adminError, privateResponse, readJson } from "../../_lib/adminHttp.js";
import { requireAdmin } from "../../_lib/adminSession.js";
import { databaseError, requireId, requireStatus, requireVersion, validateRemate } from "../../_lib/adminRemates.js";
import { prepareLots, removeStoragePaths, signLots } from "../../_lib/adminStorage.js";

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
        const signed = await Promise.all((data ?? []).map((remate: Parameters<typeof signLots>[1]) => signLots(supabase, remate)));
        return privateResponse(signed, headers, requestId);
      }
      const body = await readJson(request, request.method === "POST" ? 8_000_000 : 128_000);
      let operation;
      if (request.method === "POST") {
        const raw = body.remate as Record<string, unknown> | undefined;
        const { remate, version } = validateRemate({ ...body, remate: { ...raw, destacados: [] } });
        const previous = version > 0 ? await supabase.rpc("admin_remate_snapshot", { p_id: remate.id }) : { data: null, error: null };
        if (previous.error) throw databaseError(previous.error);
        const prepared = await prepareLots(supabase, remate.id, raw?.destacados);
        try {
          const result = await supabase.rpc("admin_save_remate", { p_remate: { ...remate, destacados: prepared.lots }, p_expected_version: version });
          if (result.error) throw databaseError(result.error);
          if (result.data?.status === "conflict") {
            await removeStoragePaths(supabase, prepared.uploaded);
            return privateResponse({ ...result.data, current: await signLots(supabase, result.data.current) }, headers, requestId, 409);
          }
          const kept = new Set(prepared.lots.map((lot) => lot.storagePath));
          const removed = (previous.data?.destacados ?? []).map((lot: { storagePath: string }) => lot.storagePath).filter((path: string) => !kept.has(path));
          await removeStoragePaths(supabase, removed);
          return privateResponse({ ...result.data, remate: await signLots(supabase, result.data.remate) }, headers, requestId);
        } catch (error) {
          await removeStoragePaths(supabase, prepared.uploaded);
          throw error;
        }
      } else {
        const params = { p_id: requireId(body.id), p_expected_version: requireVersion(body.version) };
        if (request.method === "DELETE") {
          if (user.rol !== "administrador") throw new ApiError(403, "Sólo un administrador puede eliminar remates.");
          operation = supabase.rpc("admin_delete_remate", params);
        } else operation = supabase.rpc("admin_change_remate_status", { ...params, p_status: requireStatus(body.status) });
      }
      const { data, error } = await operation;
      if (error) throw databaseError(error);
      if (request.method === "DELETE" && data?.status === "saved") await removeStoragePaths(supabase, data.storagePaths ?? []);
      const responseData = data?.remate ? { ...data, remate: await signLots(supabase, data.remate) } : data?.current ? { ...data, current: await signLots(supabase, data.current) } : data;
      return privateResponse(responseData, headers, requestId, data?.status === "conflict" ? 409 : 200);
    } catch (error) { return adminError(error, headers, requestId); }
  },
};
