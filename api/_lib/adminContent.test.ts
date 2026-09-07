import { describe, expect, it } from "vitest";
import { validateContent } from "./adminContent.js";

const validContent = {
  contacto: {
    email: "contacto@example.com",
    telefono: "+598 99 123 456",
    direccion: "Montevideo",
    horario: "Lunes a viernes",
    mapEmbedUrl: "https://www.google.com/maps?q=Montevideo&output=embed",
    formRecipientEmail: "privado@example.com",
  },
  copy: {
    heroEyebrow: "Remates",
    heroTitle: "Título",
    heroDescription: "Descripción",
    empresaTitle: "Empresa",
    empresaParagraph1: "Primer párrafo",
    empresaParagraph2: "Segundo párrafo",
    ubicacionTitle: "Ubicación",
    ubicacionDescription: "Cómo llegar",
  },
  faqs: [{ id: "id-del-cliente", pregunta: " ¿Cómo participo? ", respuesta: " En sala. " }],
  pasos: [{ id: "no-se-modifica", numero: "01", titulo: "Paso", detalle: "Detalle" }],
};

describe("validación del contenido administrativo", () => {
  it("acepta el contrato editable y descarta campos que no administra este endpoint", () => {
    const result = validateContent({ content: validContent });
    expect(result.faqs).toEqual([{ pregunta: "¿Cómo participo?", respuesta: "En sala." }]);
    expect(result.contacto).not.toHaveProperty("formRecipientEmail");
    expect(result).not.toHaveProperty("pasos");
  });

  it("rechaza mapas externos y preguntas incompletas", () => {
    expect(() => validateContent({ content: { ...validContent, contacto: { ...validContent.contacto, mapEmbedUrl: "https://evil.example/map" } } })).toThrow(/Google Maps/);
    expect(() => validateContent({ content: { ...validContent, faqs: [{ pregunta: "", respuesta: "Respuesta" }] } })).toThrow(/pregunta 1/);
  });
});
