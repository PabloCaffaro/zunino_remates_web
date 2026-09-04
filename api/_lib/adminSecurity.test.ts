import { describe, expect, it } from "vitest";
import { ApiError, checkOrigin, readJson } from "./adminHttp.js";
import { databaseError, requireVersion, validateRemate } from "./adminRemates.js";

const validRemate = {
  id: "10000000-0000-4000-8000-000000000001", version: 0,
  estadoAdmin: "borrador", titulo: "Prueba", subtitulo: "Detalle",
  slug: "prueba", lugar: "Montevideo", ubicacionDetalle: "Dirección",
  detalle: "Detalle", descripcionLarga: "Descripción", catalogoEstado: "Catálogo",
  catalogoPublicacionEstado: "disponible", fechaPorConfirmar: false,
  fechaHora: "2026-10-18T17:00:00-03:00", requisitos: ["Documento"],
  condiciones: ["Pago contado"], destacados: [],
};

describe("protecciones de la API administrativa", () => {
  it("acepta únicamente solicitudes del mismo origen con la cabecera administrativa", () => {
    expect(() => checkOrigin(new Request("https://preview.example/api", { headers: { origin: "https://preview.example", "x-requested-with": "zunino-admin" } }))).not.toThrow();
    expect(() => checkOrigin(new Request("https://preview.example/api", { headers: { origin: "https://evil.example", "x-requested-with": "zunino-admin" } }))).toThrow(ApiError);
  });

  it("rechaza cuerpos que no son JSON y cuerpos demasiado grandes", async () => {
    await expect(readJson(new Request("https://preview.example/api", { method: "POST", body: "{}" }))).rejects.toMatchObject({ status: 415 });
    await expect(readJson(new Request("https://preview.example/api", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ value: "x".repeat(128_001) }) }))).rejects.toMatchObject({ status: 413 });
  });

  it("filtra metadatos internos y fuerza fecha nula cuando está por confirmar", () => {
    const result = validateRemate({ remate: { ...validRemate, fechaPorConfirmar: true, created_by: "intruso" } });
    expect(result.remate.fechaHora).toBeNull();
    expect(result.remate).not.toHaveProperty("created_by");
  });

  it("rechaza imágenes hasta habilitar Storage, versiones inválidas y errores de permisos", () => {
    expect(() => validateRemate({ remate: { ...validRemate, destacados: [{ id: "1" }] } })).toThrow(/Storage/);
    expect(() => requireVersion(-1)).toThrow(ApiError);
    expect(databaseError({ code: "42501" })).toMatchObject({ status: 403 });
  });
});
