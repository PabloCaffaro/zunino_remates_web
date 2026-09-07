import type { SupabaseClient } from "@supabase/supabase-js";
import { describe, expect, it, vi } from "vitest";
import { prepareLots, signLots } from "./adminStorage.js";

const remateId = "10000000-0000-4000-8000-000000000001";

function storageClient(overrides: Record<string, unknown> = {}) {
  const bucket = {
    upload: vi.fn().mockResolvedValue({ error: null }),
    remove: vi.fn().mockResolvedValue({ error: null }),
    createSignedUrls: vi.fn().mockResolvedValue({ data: [{ path: "ruta", signedUrl: "https://signed.example/image" }], error: null }),
    ...overrides,
  };
  return { client: { storage: { from: vi.fn(() => bucket) } } as unknown as SupabaseClient, bucket };
}

describe("imágenes de lotes destacados", () => {
  it("valida la firma real y sube una imagen dentro de la carpeta del remate", async () => {
    const { client, bucket } = storageClient();
    const jpeg = `data:image/jpeg;base64,${btoa(String.fromCharCode(0xff, 0xd8, 0xff, 0x00))}`;
    const result = await prepareLots(client, remateId, [{ nombre: "Tractor", imagen: { url: jpeg, alt: "" } }]);
    expect(result.lots[0]).toMatchObject({ nombre: "Tractor", imagen: { url: "", alt: "Imagen de Tractor" } });
    expect(result.lots[0].storagePath).toMatch(new RegExp(`^${remateId}/[0-9a-f-]+\\.jpg$`));
    expect(bucket.upload).toHaveBeenCalledOnce();
  });

  it("rechaza contenido que no coincide con el MIME declarado", async () => {
    const { client } = storageClient();
    const falsePng = `data:image/png;base64,${btoa("contenido falso")}`;
    await expect(prepareLots(client, remateId, [{ nombre: "Lote", imagen: { url: falsePng, alt: "Lote" } }])).rejects.toThrow(/no coincide/);
  });

  it("firma temporalmente las imágenes privadas", async () => {
    const { client, bucket } = storageClient();
    const remate = { destacados: [{ storagePath: `${remateId}/20000000-0000-4000-8000-000000000001.jpg`, imagen: { url: "" } }] };
    await expect(signLots(client, remate)).resolves.toMatchObject({ destacados: [{ imagen: { url: "https://signed.example/image" } }] });
    expect(bucket.createSignedUrls).toHaveBeenCalledWith([remate.destacados[0].storagePath], 3600);
  });
});
