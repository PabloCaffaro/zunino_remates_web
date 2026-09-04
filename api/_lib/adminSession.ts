import { getIronSession, webCookies } from "iron-session";
import { readEnvironmentVariable } from "./env.js";
import { createServerSupabaseClient } from "./supabase.js";
import { ApiError, checkOrigin } from "./adminHttp.js";

export type SessionData = { accessToken: string; refreshToken: string; csrf: string; expiresAt: number; accessExpiresAt: number };
export const SESSION_SECONDS = 8 * 60 * 60;

export async function readAdminSession(request: Request, headers: Headers) {
  const password = readEnvironmentVariable("SESSION_SECRET");
  if (password.length < 32) throw new Error("SESSION_SECRET inválido");
  const secure = new URL(request.url).protocol === "https:";
  const host = new URL(request.url).hostname;
  if (!secure && host !== "localhost" && host !== "127.0.0.1") throw new ApiError(400, "Se requiere HTTPS.");
  return getIronSession<SessionData>(webCookies(request, headers), {
    cookieName: secure ? "__Host-zunino-session" : "zunino-session-local",
    password, ttl: SESSION_SECONDS, chunk: true,
    cookieOptions: { httpOnly: true, secure, sameSite: "strict", path: "/" },
  });
}

export function checkCsrf(request: Request, csrf: string | undefined) {
  checkOrigin(request);
  if (!csrf || request.headers.get("x-csrf-token") !== csrf) throw new ApiError(403, "La verificación de la solicitud falló. Recargá la página.");
}

export async function verifyAdmin(accessToken: string) {
  const supabase = createServerSupabaseClient(accessToken);
  const { data: userData, error: userError } = await supabase.auth.getUser(accessToken);
  if (userError || !userData.user) throw new ApiError(401, "La sesión venció. Ingresá nuevamente.", "session_expired");
  const [{ data: profile, error }, { data: active, error: activeError }] = await Promise.all([
    supabase.from("admin_profiles").select("user_id,nombre,rol,activo").eq("user_id", userData.user.id).maybeSingle(),
    supabase.rpc("admin_session_active"),
  ]);
  if (error || activeError) throw new Error("No se pudieron verificar los permisos.");
  if (!active) throw new ApiError(401, "La sesión ya no está activa.", "session_expired");
  if (!profile?.activo || !["administrador", "editor"].includes(profile.rol)) throw new ApiError(403, "Tu usuario no tiene acceso al administrador.");
  return { supabase, user: { id: profile.user_id as string, nombre: profile.nombre as string, rol: profile.rol as "administrador" | "editor" } };
}

export async function requireAdmin(request: Request, headers: Headers) {
  const session = await readAdminSession(request, headers);
  if (!session.accessToken || !session.expiresAt || session.expiresAt <= Date.now()) {
    session.destroy();
    throw new ApiError(401, "Ingresá al administrador.", "session_expired");
  }
  if (request.method !== "GET") checkCsrf(request, session.csrf);
  if (!session.accessExpiresAt || session.accessExpiresAt <= Date.now() + 30_000) throw new ApiError(401, "Es necesario renovar la sesión.", "refresh_required");
  const verified = await verifyAdmin(session.accessToken);
  return { ...verified, session };
}
