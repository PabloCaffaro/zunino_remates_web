import { ApiError, adminError, checkOrigin, privateResponse, readJson } from "../../_lib/adminHttp.js";
import { checkCsrf, readAdminSession, requireAdmin, SESSION_SECONDS, verifyAdmin } from "../../_lib/adminSession.js";
import { createServerSupabaseClient } from "../../_lib/supabase.js";

export default {
  async fetch(request: Request): Promise<Response> {
    const headers = new Headers();
    const requestId = crypto.randomUUID();
    try {
      if (!["GET", "POST", "PUT", "DELETE"].includes(request.method)) {
        headers.set("Allow", "GET, POST, PUT, DELETE");
        throw new ApiError(405, "Método no permitido.");
      }
      if (request.method === "GET") {
        const { user, session } = await requireAdmin(request, headers);
        return privateResponse({ user, csrf: session.csrf }, headers, requestId);
      }
      checkOrigin(request);
      const session = await readAdminSession(request, headers);
      if (request.method === "POST") {
        const body = await readJson(request);
        if (typeof body.email !== "string" || body.email.length > 254 || !body.email.includes("@") || typeof body.password !== "string" || body.password.length < 1 || body.password.length > 1024) {
          throw new ApiError(400, "Ingresá un email y una contraseña válidos.");
        }
        const supabase = createServerSupabaseClient();
        const { data, error } = await supabase.auth.signInWithPassword({ email: body.email.trim(), password: body.password });
        if (error || !data.session) throw new ApiError(error?.status === 429 ? 429 : 401, error?.status === 429 ? "Demasiados intentos. Esperá unos minutos." : "Email o contraseña incorrectos.");
        let verified;
        try { verified = await verifyAdmin(data.session.access_token); }
        catch (error) { await supabase.auth.signOut({ scope: "local" }); throw error; }
        session.accessToken = data.session.access_token;
        session.refreshToken = data.session.refresh_token;
        session.csrf = crypto.randomUUID();
        session.expiresAt = Date.now() + SESSION_SECONDS * 1000;
        session.accessExpiresAt = data.session.expires_at! * 1000;
        await session.save();
        return privateResponse({ user: verified.user, csrf: session.csrf }, headers, requestId);
      }
      if (request.method === "DELETE") {
        checkCsrf(request, session.csrf);
        let tokenToRevoke = session.accessToken;
        if (session.refreshToken && (!session.accessExpiresAt || session.accessExpiresAt <= Date.now() + 30_000)) {
          const { data } = await createServerSupabaseClient().auth.refreshSession({ refresh_token: session.refreshToken });
          tokenToRevoke = data.session?.access_token ?? tokenToRevoke;
        }
        if (tokenToRevoke) {
          const { error } = await createServerSupabaseClient().auth.admin.signOut(tokenToRevoke, "local");
          if (error && error.status !== 401 && error.status !== 404) throw error;
        }
        session.destroy();
        return privateResponse({ signedOut: true }, headers, requestId);
      }
      // Sólo la renovación explícita rota tokens; las lecturas concurrentes no escriben cookies.
      if (!session.refreshToken || !session.expiresAt || session.expiresAt <= Date.now()) {
        session.destroy();
        throw new ApiError(401, "La sesión venció. Ingresá nuevamente.", "session_expired");
      }
      if (request.headers.get("x-csrf-token")) checkCsrf(request, session.csrf);
      const supabase = createServerSupabaseClient();
      const { data, error } = await supabase.auth.refreshSession({ refresh_token: session.refreshToken });
      if (error || !data.session) {
        if (error && error.status && error.status >= 500) throw error;
        session.destroy();
        throw new ApiError(401, "La sesión venció. Ingresá nuevamente.", "session_expired");
      }
      const { user } = await verifyAdmin(data.session.access_token);
      session.accessToken = data.session.access_token;
      session.refreshToken = data.session.refresh_token;
      session.accessExpiresAt = data.session.expires_at! * 1000;
      await session.save();
      return privateResponse({ user, csrf: session.csrf }, headers, requestId);
    } catch (error) { return adminError(error, headers, requestId); }
  },
};
