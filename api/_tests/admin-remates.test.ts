import { beforeEach, describe, expect, it, vi } from "vitest";
import { requireAdmin } from "../_lib/adminSession.js";
import { prepareLots, removeStoragePaths, signLots } from "../_lib/adminStorage.js";
import { ApiError } from "../_lib/adminHttp.js";
import handler from "../v1/admin/remates.js";

vi.mock("../_lib/adminSession.js", () => ({ requireAdmin: vi.fn() }));
vi.mock("../_lib/adminStorage.js", () => ({
  applySignedLotUrls: vi.fn((remate, signedLots) => {
    const urls = new Map(signedLots.map((lot: { storagePath: string; imagen: { url: string } }) => [lot.storagePath, lot.imagen.url]));
    return {
      ...remate,
      destacados: remate.destacados.map((lot: { storagePath: string; imagen: { url: string } }) => ({
        ...lot,
        imagen: { ...lot.imagen, url: urls.get(lot.storagePath) ?? lot.imagen.url },
      })),
    };
  }),
  prepareLots: vi.fn(),
  removeStoragePaths: vi.fn(),
  signLots: vi.fn(async (_supabase, remate) => remate),
}));

const remateId = "10000000-0000-4000-8000-000000000001";
const lotId = "20000000-0000-4000-8000-000000000001";
const storagePath = `${remateId}/${lotId}.jpg`;
const remate = {
  id: remateId,
  slug: "remate-qa",
  titulo: "Remate QA",
  subtitulo: "Subtítulo",
  fechaHora: null,
  fechaPorConfirmar: true,
  lugar: "Montevideo",
  ubicacionDetalle: "Dirección",
  detalle: "Detalle",
  descripcionLarga: "Descripción",
  catalogoEstado: "Catálogo",
  catalogoPublicacionEstado: "disponible",
  estadoAdmin: "borrador",
  version: 0,
  destacados: [{ id: lotId, nombre: "Lote", storagePath, imagen: { url: "", alt: "Lote" } }],
  requisitos: ["Documento"],
  condiciones: ["Pago"],
};

const postRequest = (value = remate) => new Request("https://preview.example/api/v1/admin/remates", {
  method: "POST",
  headers: { "content-type": "application/json" },
  body: JSON.stringify({ remate: value }),
});

describe("API administrativa de remates", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(removeStoragePaths).mockResolvedValue(true);
    vi.mocked(signLots).mockImplementation(async (_supabase, value) => value);
  });

  it("compara en PostgreSQL exactamente la versión recibida y propaga el conflicto", async () => {
    const rpc = vi.fn().mockResolvedValue({
      data: { status: "conflict", current: { id: "10000000-0000-4000-8000-000000000001", version: 12 } },
      error: null,
    });
    vi.mocked(requireAdmin).mockResolvedValue({
      supabase: { rpc },
      user: { id: "20000000-0000-4000-8000-000000000001", nombre: "QA", rol: "editor" },
    } as never);

    const response = await handler.fetch(new Request("https://preview.example/api/v1/admin/remates", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        id: "10000000-0000-4000-8000-000000000001",
        version: 11,
        status: "oculto",
      }),
    }));

    expect(rpc).toHaveBeenCalledWith("admin_change_remate_status", {
      p_id: "10000000-0000-4000-8000-000000000001",
      p_expected_version: 11,
      p_status: "oculto",
    });
    expect(response.status).toBe(409);
    await expect(response.json()).resolves.toMatchObject({
      data: { status: "conflict", current: { version: 12 } },
    });
  });

  it("no informa un 503 si la firma falla después de confirmar otro cambio administrativo", async () => {
    const rpc = vi.fn().mockResolvedValue({
      data: { status: "saved", remate: { ...remate, version: 2 } },
      error: null,
    });
    vi.mocked(requireAdmin).mockResolvedValue({ supabase: { rpc }, user: { rol: "editor" } } as never);
    vi.mocked(signLots).mockRejectedValue(new Error("No se pudo firmar"));

    const response = await handler.fetch(new Request("https://preview.example/api/v1/admin/remates", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ id: remateId, version: 1, status: "oculto" }),
    }));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.data).toMatchObject({ status: "saved", storageSigningPending: true });
  });

  it("no invoca el RPC de escritura cuando la fotografía no existe", async () => {
    const rpc = vi.fn().mockResolvedValue({ data: null, error: null });
    vi.mocked(requireAdmin).mockResolvedValue({ supabase: { rpc }, user: { rol: "editor" } } as never);
    vi.mocked(prepareLots).mockRejectedValue(new ApiError(400, "La fotografía no existe en Storage."));

    const response = await handler.fetch(postRequest());

    expect(response.status).toBe(400);
    expect(rpc.mock.calls.some(([name]) => name === "admin_save_remate")).toBe(false);
  });

  it("guarda normalmente fotografías válidas y reutiliza la firma obtenida antes del RPC", async () => {
    const saved = { ...remate, version: 1, destacados: [{ ...remate.destacados[0], imagen: { url: "", alt: "Lote" } }] };
    const rpc = vi.fn().mockResolvedValue({ data: { status: "saved", remate: saved }, error: null });
    vi.mocked(requireAdmin).mockResolvedValue({ supabase: { rpc }, user: { rol: "editor" } } as never);
    vi.mocked(prepareLots).mockResolvedValue({
      lots: remate.destacados,
      uploaded: [],
      signedLots: [{ ...remate.destacados[0], imagen: { url: "https://signed.example/image", alt: "Lote" } }],
    });

    const response = await handler.fetch(postRequest());
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.data).toMatchObject({ status: "saved", remate: { destacados: [{ imagen: { url: "https://signed.example/image" } }] } });
    expect(signLots).not.toHaveBeenCalled();
    expect(rpc).toHaveBeenLastCalledWith("admin_save_remate", expect.objectContaining({ p_expected_version: 0 }));
  });

  it("limpia las cargas nuevas cuando PostgreSQL rechaza la escritura", async () => {
    const rpc = vi.fn().mockResolvedValue({ data: null, error: { code: "23514" } });
    vi.mocked(requireAdmin).mockResolvedValue({ supabase: { rpc }, user: { rol: "editor" } } as never);
    vi.mocked(prepareLots).mockResolvedValue({
      lots: remate.destacados,
      uploaded: [storagePath],
      signedLots: [{ ...remate.destacados[0], imagen: { url: "https://signed.example/image", alt: "Lote" } }],
    });

    const response = await handler.fetch(postRequest());

    expect(response.status).toBe(400);
    expect(removeStoragePaths).toHaveBeenCalledWith(expect.anything(), [storagePath]);
  });

  it("mantiene una respuesta de guardado exitosa si queda una limpieza de Storage pendiente", async () => {
    const previous = { destacados: [{ storagePath: `${remateId}/30000000-0000-4000-8000-000000000001.jpg` }] };
    const existingRemate = { ...remate, version: 1 };
    const saved = { ...existingRemate, version: 2 };
    const rpc = vi.fn()
      .mockResolvedValueOnce({ data: previous, error: null })
      .mockResolvedValueOnce({ data: { status: "saved", remate: saved }, error: null });
    vi.mocked(requireAdmin).mockResolvedValue({ supabase: { rpc }, user: { rol: "editor" } } as never);
    vi.mocked(prepareLots).mockResolvedValue({
      lots: remate.destacados,
      uploaded: [],
      signedLots: [{ ...remate.destacados[0], imagen: { url: "https://signed.example/image", alt: "Lote" } }],
    });
    vi.mocked(removeStoragePaths).mockResolvedValue(false);

    const response = await handler.fetch(postRequest(existingRemate));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.data).toMatchObject({ status: "saved", storageCleanupPending: true });
  });

  it("no borra imágenes cuando el resultado del RPC es incierto", async () => {
    const rpc = vi.fn().mockRejectedValue(new Error("network"));
    vi.mocked(requireAdmin).mockResolvedValue({ supabase: { rpc }, user: { rol: "editor" } } as never);
    vi.mocked(prepareLots).mockResolvedValue({
      lots: remate.destacados,
      uploaded: [storagePath],
      signedLots: [{ ...remate.destacados[0], imagen: { url: "https://signed.example/image", alt: "Lote" } }],
    });

    const response = await handler.fetch(postRequest());
    const body = await response.json();

    expect(response.status).toBe(503);
    expect(body.code).toBe("save_outcome_unknown");
    expect(removeStoragePaths).not.toHaveBeenCalled();
  });
});
