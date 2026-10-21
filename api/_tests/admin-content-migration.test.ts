/// <reference types="vite/client" />

import { describe, expect, it } from "vitest";
import migration from "../../supabase/migrations/20261021014926_allow_safe_admin_content_faq_replacement.sql?raw";

const normalized = migration.replace(/\s+/g, " ").toLowerCase();

describe("migración de admin_save_content", () => {
  it("mantiene SECURITY INVOKER y condiciona explícitamente el reemplazo total de FAQ", () => {
    expect(normalized).toContain("create or replace function public.admin_save_content(p_content jsonb)");
    expect(normalized).toContain("security invoker");
    expect(normalized).toContain("delete from public.preguntas_frecuentes where id is not null;");
    expect(normalized).not.toMatch(/delete from public\.preguntas_frecuentes\s*;/);
  });

  it("conserva actualización, orden, auditoría por triggers y confirmación transaccional", () => {
    const updatePosition = normalized.indexOf("update public.configuracion_sitio set");
    const deletePosition = normalized.indexOf("delete from public.preguntas_frecuentes where id is not null;");
    const insertPosition = normalized.indexOf("insert into public.preguntas_frecuentes");
    const snapshotPosition = normalized.indexOf("saved_content := public.admin_content_snapshot();");
    const confirmationPosition = normalized.indexOf("raise exception 'no se pudo confirmar el contenido guardado.' using errcode = 'p0001';");

    expect(updatePosition).toBeGreaterThan(-1);
    expect(deletePosition).toBeGreaterThan(updatePosition);
    expect(insertPosition).toBeGreaterThan(deletePosition);
    expect(snapshotPosition).toBeGreaterThan(insertPosition);
    expect(confirmationPosition).toBeGreaterThan(snapshotPosition);
    expect(normalized).toContain("with ordinality");
    expect(normalized).toContain("ordinality::integer - 1");
    expect(normalized).toContain("if not private.is_active_admin() then");
    expect(normalized).not.toContain("exception when");
    expect(normalized).not.toMatch(/\bcommit\b|\brollback\b/);
  });
});
