import { beforeEach, describe, expect, it, vi } from "vitest";
import { createServerSupabaseClient } from "./supabase.js";
import { getPublishedRemates } from "./publicData.js";

vi.mock("./supabase.js", () => ({ createServerSupabaseClient: vi.fn() }));

const published = {
  id: "10000000-0000-4000-8000-000000000001",
  slug: "publicado",
  estado: "publicado",
  titulo: "Publicado",
  subtitulo: "Subtítulo",
  fecha_hora: null,
  fecha_por_confirmar: true,
  lugar: "Montevideo",
  ubicacion_detalle: "Dirección",
  detalle: "Detalle",
  descripcion_larga: "Descripción",
  catalogo_descripcion: "Próximamente",
  catalogo_estado: "proximamente",
  destacado: false,
  orden: 0,
};

function queryResult(data: unknown[]) {
  const result = {
    select: vi.fn(() => result),
    eq: vi.fn(() => result),
    order: vi.fn(() => result),
    then: (resolve: (value: { data: unknown[]; error: null }) => unknown) =>
      Promise.resolve({ data, error: null }).then(resolve),
  };
  return result;
}

describe("datos públicos de remates", () => {
  beforeEach(() => vi.clearAllMocks());

  it("serializa únicamente remates publicados aunque la consulta devuelva otros estados", async () => {
    const rows = [
      published,
      ...["borrador", "en_revision", "oculto", "finalizado", "cancelado"].map(
        (estado, index) => ({
          ...published,
          id: `20000000-0000-4000-8000-${String(index + 1).padStart(12, "0")}`,
          slug: estado,
          estado,
          titulo: estado,
        })
      ),
    ];
    const rematesQuery = queryResult(rows);
    const emptyQuery = () => queryResult([]);
    vi.mocked(createServerSupabaseClient).mockReturnValue({
      from: vi.fn((table: string) =>
        table === "remates" ? rematesQuery : emptyQuery()
      ),
      storage: {
        from: vi.fn(() => ({ createSignedUrls: vi.fn() })),
      },
    } as never);

    const result = await getPublishedRemates();

    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({ id: published.id, slug: "publicado" });
    expect(result[0]).not.toHaveProperty("estado");
    expect(rematesQuery.eq).toHaveBeenCalledWith("estado", "publicado");
  });
});
