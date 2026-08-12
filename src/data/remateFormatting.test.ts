import { describe, expect, it } from "vitest";
import {
  formatRemateDateDisplay,
  formatRemateDateInput,
  formatRemateDateSummary,
  isValidRemateDateTime,
  remateDateTimeInputToIso,
} from "./remateFormatting";

describe("formato de fecha de remates", () => {
  it("guarda un instante real y lo muestra en la zona de Montevideo", () => {
    const fechaHora = remateDateTimeInputToIso("22/03/2026 17:00");

    expect(fechaHora).toBe("2026-03-22T20:00:00.000Z");
    expect(formatRemateDateInput(fechaHora)).toBe("22/03/2026 17:00");
    expect(formatRemateDateSummary(fechaHora)).toBe("22 MAR · 17:00");
  });

  it("muestra el estado pendiente sin inventar una fecha", () => {
    expect(formatRemateDateSummary(null, true)).toBe("Fecha a confirmar");
    expect(formatRemateDateDisplay(null, true)).toBe("Fecha a confirmar");
  });

  it("valida formato, hora y calendario", () => {
    expect(isValidRemateDateTime("05/09/2026 09:30")).toBe(true);
    expect(isValidRemateDateTime("29/02/2028 09:30")).toBe(true);
    expect(isValidRemateDateTime("29/02/2027 09:30")).toBe(false);
    expect(isValidRemateDateTime("5/9/2026 09:30")).toBe(false);
    expect(isValidRemateDateTime("31/02/2026 09:30")).toBe(false);
    expect(isValidRemateDateTime("05/09/2026 24:00")).toBe(false);
    expect(isValidRemateDateTime("Cualquier cosa")).toBe(false);
  });

  it("conserva fecha y hora al convertir de formulario a ISO y volver", () => {
    const input = "31/12/2026 23:59";
    const fechaHora = remateDateTimeInputToIso(input);

    expect(fechaHora).toBe("2027-01-01T02:59:00.000Z");
    expect(formatRemateDateInput(fechaHora)).toBe(input);
  });

  it("rechaza instantes ISO inválidos al formatear", () => {
    expect(formatRemateDateInput("fecha-invalida")).toBe("");
    expect(formatRemateDateSummary("fecha-invalida")).toBe("");
  });
});
