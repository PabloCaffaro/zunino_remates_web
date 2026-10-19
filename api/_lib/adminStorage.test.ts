import type { SupabaseClient } from "@supabase/supabase-js";
import { describe, expect, it, vi } from "vitest";
import { applySignedLotUrls, prepareLots, removeStoragePaths, signLots } from "./adminStorage.js";

const remateId = "10000000-0000-4000-8000-000000000001";

function storageClient(overrides: Record<string, unknown> = {}) {
  const bucket = {
    upload: vi.fn().mockResolvedValue({ error: null }),
    remove: vi.fn().mockResolvedValue({ error: null }),
    exists: vi.fn().mockResolvedValue({ data: true, error: null }),
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
    expect(result.signedLots[0]).toMatchObject({ imagen: { url: "https://signed.example/image" } });
    expect(result.lots[0].storagePath).toMatch(new RegExp(`^${remateId}/[0-9a-f-]+\\.jpg$`));
    expect(bucket.upload).toHaveBeenCalledOnce();
    expect(bucket.exists).toHaveBeenCalledWith(result.lots[0].storagePath);
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

  it("acepta una ruta existente del mismo remate y la deja firmada antes de guardar", async () => {
    const { client, bucket } = storageClient();
    const lotId = "20000000-0000-4000-8000-000000000001";
    const storagePath = `${remateId}/${lotId}.jpg`;

    const result = await prepareLots(client, remateId, [{
      id: lotId,
      nombre: "Tractor",
      storagePath,
      imagen: { url: "", alt: "Tractor" },
    }]);

    expect(bucket.exists).toHaveBeenCalledWith(storagePath);
    expect(result.signedLots[0]).toMatchObject({ storagePath, imagen: { url: "https://signed.example/image" } });
  });

  it("rechaza una ruta válida cuyo objeto no existe", async () => {
    const { client, bucket } = storageClient({ exists: vi.fn().mockResolvedValue({ data: false, error: { status: 404 } }) });
    const lotId = "20000000-0000-4000-8000-000000000001";

    await expect(prepareLots(client, remateId, [{
      id: lotId,
      nombre: "Inexistente",
      storagePath: `${remateId}/${lotId}.jpg`,
      imagen: { url: "", alt: "Inexistente" },
    }])).rejects.toThrow(/no existe en Storage/);
    expect(bucket.createSignedUrls).not.toHaveBeenCalled();
  });

  it("rechaza una ruta perteneciente a otro remate antes de consultar Storage", async () => {
    const { client, bucket } = storageClient();
    const lotId = "20000000-0000-4000-8000-000000000001";

    await expect(prepareLots(client, remateId, [{
      id: lotId,
      nombre: "Ajeno",
      storagePath: `30000000-0000-4000-8000-000000000001/${lotId}.jpg`,
      imagen: { url: "", alt: "Ajeno" },
    }])).rejects.toThrow(/no es válida/);
    expect(bucket.exists).not.toHaveBeenCalled();
  });

  it("elimina la imagen recién subida si falla la firma previa al guardado", async () => {
    const { client, bucket } = storageClient({
      createSignedUrls: vi.fn().mockResolvedValue({ data: [{ path: null, signedUrl: null, error: "missing" }], error: null }),
    });
    const jpeg = `data:image/jpeg;base64,${btoa(String.fromCharCode(0xff, 0xd8, 0xff, 0x00))}`;

    await expect(prepareLots(client, remateId, [{ nombre: "Tractor", imagen: { url: jpeg, alt: "" } }]))
      .rejects.toThrow(/firmar/);
    expect(bucket.remove).toHaveBeenCalledOnce();
    expect(bucket.remove.mock.calls[0][0]).toHaveLength(1);
  });

  it("informa si la compensación de Storage no pudo completarse", async () => {
    const { client } = storageClient({
      remove: vi.fn().mockResolvedValue({ error: { message: "unavailable" } }),
    });
    await expect(removeStoragePaths(client, [`${remateId}/image.jpg`])).resolves.toBe(false);
  });

  it("reutiliza las URLs firmadas sin volver a consultar Storage después del guardado", () => {
    const storagePath = `${remateId}/20000000-0000-4000-8000-000000000001.jpg`;
    const remate = { destacados: [{ storagePath, imagen: { url: "" } }] };
    const signed = [{ storagePath, imagen: { url: "https://signed.example/image" } }];
    expect(applySignedLotUrls(remate, signed)).toMatchObject({ destacados: [{ imagen: { url: "https://signed.example/image" } }] });
  });
});
