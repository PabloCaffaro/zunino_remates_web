import { describe, expect, it } from "vitest";
import {
  formatRemateDateDisplay,
  formatRemateDateSummary,
  isValidRemateDateTime,
} from "./remateFormatting";

describe("formato de fecha de remates", () => {
  it("genera la fecha corta desde el formato administrativo", () => {
    expect(formatRemateDateSummary("22/03/2026 17:00")).toBe("22 MAR · 17:00");
  });

  it("muestra el estado pendiente sin inventar una fecha", () => {
    expect(formatRemateDateSummary("", true)).toBe("Fecha a confirmar");
    expect(formatRemateDateDisplay("", true)).toBe("Fecha a confirmar");
  });

  it("valida formato, hora y calendario", () => {
    expect(isValidRemateDateTime("05/09/2026 09:30")).toBe(true);
    expect(isValidRemateDateTime("5/9/2026 09:30")).toBe(false);
    expect(isValidRemateDateTime("31/02/2026 09:30")).toBe(false);
    expect(isValidRemateDateTime("05/09/2026 24:00")).toBe(false);
    expect(isValidRemateDateTime("Cualquier cosa")).toBe(false);
  });
});
