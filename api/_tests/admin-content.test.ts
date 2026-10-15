import { beforeEach, describe, expect, it, vi } from "vitest";
import { requireAdmin } from "../_lib/adminSession.js";
import handler from "../v1/admin/content.js";

vi.mock("../_lib/adminSession.js", () => ({ requireAdmin: vi.fn() }));

const content = {
  contacto: {
    email: "qa+contenido@example.invalid",
    telefono: "+598 99 123 456",
    direccion: "Av. José Belloni 1234, Montevideo",
    horario: "Lunes & miércoles\n9:00 a 18:00",
    mapEmbedUrl: "https://www.google.com/maps?q=Av.%20Jos%C3%A9%20Belloni%201234&output=embed",
  },
  copy: {
    heroEyebrow: "Remates & negocios",
    heroTitle: "Título \"QA\"",
    heroDescription: "Línea con ñ\nSegunda línea",
    empresaTitle: "Zunino Remates",
    empresaParagraph1: "Primer párrafo",
    empresaParagraph2: "Segundo párrafo",
    ubicacionTitle: "Cómo llegar",
    ubicacionDescription: "Atención con coordinación previa",
  },
  faqs: [{ id: "faq-local", pregunta: "¿Cómo participo?", respuesta: "En sala & online.\nConsultá antes." }],
  pasos: [],
};

const request = () => new Request("https://preview.example/api/v1/admin/content", {
  method: "POST",
  headers: { "content-type": "application/json" },
  body: JSON.stringify({ content }),
});

describe("POST /api/v1/admin/content", () => {
  beforeEach(() => vi.clearAllMocks());

  it("envía y devuelve los cuatro contactos, textos y FAQ sin perder caracteres", async () => {
    const saved = { ...content, faqs: [{ ...content.faqs[0], id: "faq-db" }] };
    const rpc = vi.fn().mockResolvedValue({ data: saved, error: null });
    vi.mocked(requireAdmin).mockResolvedValue({ supabase: { rpc } } as never);

    const response = await handler.fetch(request());

    expect(response.status).toBe(200);
    expect(rpc).toHaveBeenCalledWith("admin_save_content", {
      p_content: expect.objectContaining({
        contacto: content.contacto,
        copy: content.copy,
        faqs: [{ pregunta: content.faqs[0].pregunta, respuesta: content.faqs[0].respuesta }],
      }),
    });
    await expect(response.json()).resolves.toMatchObject({ data: saved });
  });

  it("no informa éxito cuando PostgreSQL revierte una confirmación inconsistente", async () => {
    const rpc = vi.fn().mockResolvedValue({
      data: null,
      error: { code: "P0001", message: "No se pudo confirmar el contenido guardado." },
    });
    vi.mocked(requireAdmin).mockResolvedValue({ supabase: { rpc } } as never);

    const response = await handler.fetch(request());

    expect(response.status).toBe(503);
    await expect(response.json()).resolves.toMatchObject({
      error: "El servicio no está disponible. Intentá nuevamente.",
      code: "unavailable",
    });
  });
});
