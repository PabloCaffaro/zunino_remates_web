export type AdminUser = { id: string; nombre: string; rol: "administrador" | "editor" };
export class AdminApiError extends Error {
  constructor(message: string, public status: number, public code: string) { super(message); }
}

export function createAdminApi() {
  let csrf = "";
  let refreshing: Promise<unknown> | null = null;
  const send = async <T>(path: string, method: string, body?: unknown): Promise<T> => {
    let response: Response;
    try {
      response = await fetch(`/api/v1/admin/${path}`, {
        method, credentials: "same-origin", cache: "no-store", signal: AbortSignal.timeout(15000),
        headers: { Accept: "application/json", "Content-Type": "application/json", "X-Requested-With": "zunino-admin", ...(csrf ? { "X-CSRF-Token": csrf } : {}) },
        ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
      });
    } catch { throw new AdminApiError("No se pudo confirmar la operación. Revisá la conexión y recargá el listado antes de volver a guardar.", 0, "network_error"); }
    const payload = await response.json().catch(() => null);
    if (!response.ok && !(response.status === 409 && payload?.data?.status === "conflict")) {
      throw new AdminApiError(payload?.error ?? "No se pudo completar la operación.", response.status, payload?.code ?? "request_failed");
    }
    if (payload?.data?.csrf) csrf = payload.data.csrf;
    return payload.data as T;
  };
  const request = async <T>(path: string, method = "GET", body?: unknown): Promise<T> => {
    try { return await send<T>(path, method, body); }
    catch (error) {
      // Sólo se repite si el servidor rechazó la petición antes de modificar datos.
      if (!(error instanceof AdminApiError) || error.code !== "refresh_required") throw error;
      if (!refreshing) refreshing = send("session", "PUT").finally(() => { refreshing = null; });
      await refreshing;
      return send<T>(path, method, body);
    }
  };
  return {
    request,
    session: () => request<{ user: AdminUser }>("session"),
    login: (email: string, password: string) => request<{ user: AdminUser }>("session", "POST", { email, password }),
    logout: async () => { await request("session", "DELETE"); csrf = ""; },
  };
}
export type AdminApi = ReturnType<typeof createAdminApi>;
