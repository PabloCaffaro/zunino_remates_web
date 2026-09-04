export class ApiError extends Error {
  constructor(public status: number, message: string, public code = "request_failed") {
    super(message);
  }
}

export function checkOrigin(request: Request) {
  const origin = request.headers.get("origin");
  if (origin !== new URL(request.url).origin || request.headers.get("x-requested-with") !== "zunino-admin") {
    throw new ApiError(403, "Solicitud no permitida.");
  }
  if (request.headers.get("sec-fetch-site") === "cross-site") {
    throw new ApiError(403, "Solicitud no permitida.");
  }
}

export async function readJson(request: Request): Promise<Record<string, unknown>> {
  if (request.headers.get("content-type")?.split(";")[0] !== "application/json") {
    throw new ApiError(415, "Se requiere contenido JSON.");
  }
  // Se limita también lo leído, sin confiar solamente en Content-Length.
  const reader = request.body?.getReader();
  if (!reader) throw new ApiError(400, "Faltan los datos de la solicitud.");
  const chunks: Uint8Array[] = [];
  let size = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.length;
    if (size > 128_000) {
      await reader.cancel();
      throw new ApiError(413, "La solicitud supera el tamaño permitido.");
    }
    chunks.push(value);
  }
  const bytes = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.length; }
  try {
    const body: unknown = JSON.parse(new TextDecoder().decode(bytes));
    if (!body || typeof body !== "object" || Array.isArray(body)) throw new Error();
    return body as Record<string, unknown>;
  } catch { throw new ApiError(400, "Los datos enviados no son válidos."); }
}

export function privateResponse(data: unknown, headers: Headers, requestId: string, status = 200) {
  headers.set("Cache-Control", "private, no-store");
  headers.set("Pragma", "no-cache");
  headers.set("X-Content-Type-Options", "nosniff");
  headers.set("X-Request-Id", requestId);
  return Response.json({ data, requestId }, { status, headers });
}

export function adminError(error: unknown, headers: Headers, requestId: string) {
  const known = error instanceof ApiError;
  // No se registran contraseñas, cookies, tokens ni cuerpos de solicitudes.
  if (!known) console.error("admin_request_failed", { requestId, type: error instanceof Error ? error.name : "unknown" });
  const response = privateResponse(null, headers, requestId, known ? error.status : 503);
  return Response.json({ error: known ? error.message : "El servicio no está disponible. Intentá nuevamente.", code: known ? error.code : "unavailable", requestId }, { status: response.status, headers: response.headers });
}
