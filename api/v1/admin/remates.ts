import { ApiError, adminError, privateResponse, readJson } from "../../_lib/adminHttp.js";
import { requireAdmin } from "../../_lib/adminSession.js";
import { databaseError, requireId, requireStatus, requireVersion, validateRemate } from "../../_lib/adminRemates.js";
import { applySignedLotUrls, prepareLots, removeStoragePaths, signLots } from "../../_lib/adminStorage.js";

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
        let result;
        try {
          result = await supabase.rpc("admin_save_remate", { p_remate: { ...remate, destacados: prepared.lots }, p_expected_version: version });
        } catch {
          // Sin una respuesta del RPC no sabemos si PostgreSQL confirmó la escritura.
          // No se borran las imágenes nuevas porque podrían haber quedado referenciadas.
          throw new ApiError(503, "No se pudo confirmar si el remate se guardó. Recargá el listado antes de volver a intentar.", "save_outcome_unknown");
        }
        if (result.error) {
          const cleanupComplete = await removeStoragePaths(supabase, prepared.uploaded);
          if (!cleanupComplete) throw new Error("Falló la operación y no se pudieron limpiar las imágenes nuevas.");
          throw databaseError(result.error);
        }
        if (!result.data || !["saved", "conflict"].includes(result.data.status)) {
          throw new ApiError(503, "No se pudo confirmar si el remate se guardó. Recargá el listado antes de volver a intentar.", "save_outcome_unknown");
        }
        if (result.data?.status === "conflict") {
          const cleanupComplete = await removeStoragePaths(supabase, prepared.uploaded);
          return privateResponse({
            ...result.data,
            current: await signLots(supabase, result.data.current),
            ...(!cleanupComplete ? { storageCleanupPending: true } : {}),
          }, headers, requestId, 409);
        }
        const kept = new Set(prepared.lots.map((lot) => lot.storagePath));
        const removed = (previous.data?.destacados ?? []).map((lot: { storagePath: string }) => lot.storagePath).filter((path: string) => !kept.has(path));
        const cleanupComplete = await removeStoragePaths(supabase, removed);
        return privateResponse({
          ...result.data,
          remate: applySignedLotUrls(result.data.remate, prepared.signedLots),
          ...(!cleanupComplete ? { storageCleanupPending: true } : {}),
        }, headers, requestId);
      } else {
        const params = { p_id: requireId(body.id), p_expected_version: requireVersion(body.version) };
        if (request.method === "DELETE") {
          if (user.rol !== "administrador") throw new ApiError(403, "Sólo un administrador puede eliminar remates.");
          operation = supabase.rpc("admin_delete_remate", params);
        } else operation = supabase.rpc("admin_change_remate_status", { ...params, p_status: requireStatus(body.status) });
      }
      const { data, error } = await operation;
      if (error) throw databaseError(error);
      const deleteCleanupComplete = request.method !== "DELETE" || data?.status !== "saved"
        ? true
        : await removeStoragePaths(supabase, data.storagePaths ?? []);
      let responseData = data;
      try {
        responseData = data?.remate ? { ...data, remate: await signLots(supabase, data.remate) } : data?.current ? { ...data, current: await signLots(supabase, data.current) } : data;
      } catch (error) {
        if (data?.status !== "saved") throw error;
        responseData = { ...data, storageSigningPending: true };
      }
      return privateResponse({ ...responseData, ...(!deleteCleanupComplete ? { storageCleanupPending: true } : {}) }, headers, requestId, data?.status === "conflict" ? 409 : 200);
    } catch (error) { return adminError(error, headers, requestId); }
  },
};
