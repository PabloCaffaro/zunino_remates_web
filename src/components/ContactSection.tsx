import type { ChangeEvent, FocusEvent, FormEvent } from "react";
import { useState } from "react";
import type { ContactInfo, FormFields } from "../types/site";

type ContactSectionProps = {
  contact: ContactInfo;
};

export function ContactSection({ contact }: ContactSectionProps) {
  const [formData, setFormData] = useState<FormFields>({ name: "", email: "", message: "" });
  const [formErrors, setFormErrors] = useState<FormFields>({ name: "", email: "", message: "" });
  const [touchedFields, setTouchedFields] = useState({ name: false, email: false, message: false });
  const [formStatus, setFormStatus] = useState<"idle" | "sending" | "success" | "error">("idle");

  const validateField = (fieldName: keyof FormFields, value: string) => {
    // La validación se centraliza para que blur y submit usen exactamente las mismas reglas.
    const trimmedValue = value.trim();

    if (!trimmedValue) {
      if (fieldName === "name") return "El nombre es obligatorio.";
      if (fieldName === "email") return "El email es obligatorio.";
      return "El mensaje es obligatorio.";
    }

    if (fieldName === "email") {
      const validEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedValue);
      if (!validEmail) return "Ingresá un email válido.";
    }

    return "";
  };

  const validateAllFields = (data: FormFields): FormFields => ({
    name: validateField("name", data.name),
    email: validateField("email", data.email),
    message: validateField("message", data.message),
  });

  const handleFormChange = (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = event.target;
    const fieldName = name as keyof FormFields;

    setFormData((prev) => ({ ...prev, [fieldName]: value }));

    // Una vez que la persona ya interactuó con un campo, se revalida en vivo mientras sigue editando.
    if (touchedFields[fieldName]) {
      setFormErrors((prev) => ({
        ...prev,
        [fieldName]: validateField(fieldName, value),
      }));
    }

    if (formStatus !== "idle") {
      setFormStatus("idle");
    }
  };

  const handleFieldBlur = (event: FocusEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = event.target;
    const fieldName = name as keyof FormFields;

    setTouchedFields((prev) => ({ ...prev, [fieldName]: true }));
    setFormErrors((prev) => ({
      ...prev,
      [fieldName]: validateField(fieldName, value),
    }));
  };

  const handleFormSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    // Marca todos los campos como tocados al enviar para que los errores faltantes se vean juntos.
    const nextErrors = validateAllFields(formData);
    setTouchedFields({ name: true, email: true, message: true });
    setFormErrors(nextErrors);

    if (nextErrors.name || nextErrors.email || nextErrors.message) {
      setFormStatus("idle");
      return;
    }

    setFormStatus("sending");

    try {
      // FormSubmit permite enviar emails desde el sitio sin mantener un backend propio.
      const response = await fetch(`https://formsubmit.co/ajax/${contact.formRecipientEmail}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({
          name: formData.name,
          email: formData.email,
          message: formData.message,
          _subject: "Nueva consulta desde Zunino Remates Web",
          _captcha: "false",
          _template: "table",
        }),
      });

      if (!response.ok) {
        throw new Error("No se pudo enviar");
      }

      setFormStatus("success");
      // Reinicia la interfaz solo después de que el servicio remoto confirma el envío.
      setFormData({ name: "", email: "", message: "" });
      setFormErrors({ name: "", email: "", message: "" });
      setTouchedFields({ name: false, email: false, message: false });
    } catch {
      setFormStatus("error");
    }
  };

  return (
    <section id="contacto" className="section alt">
      <div className="container contact-grid">
        <div className="contact-copy reveal">
          <p className="eyebrow">Contacto</p>
          <h2>Hablemos sobre tu próximo remate</h2>
          <p>Escribinos para recibir catálogos, coordinar visitas o consultar requisitos.</p>
          <div className="contact-details">
            <p>
              <strong>Teléfono:</strong> {contact.telefono}
            </p>
            <p>
              <strong>Email:</strong> {contact.email}
            </p>
            <p>
              <strong>Dirección:</strong> {contact.direccion}
            </p>
            <p>
              <strong>Horario:</strong> {contact.horario}
            </p>
          </div>
        </div>
        <div className="contact-form reveal">
          <h3>Formulario rápido</h3>
          <form onSubmit={handleFormSubmit} noValidate aria-describedby="contacto-ayuda">
            <input className="hp-field" type="text" name="_honey" tabIndex={-1} autoComplete="off" />
            <p id="contacto-ayuda" className="form-hint">
              Todos los campos son obligatorios.
            </p>

            <label>
              Nombre
              <input
                type="text"
                name="name"
                placeholder="Tu nombre"
                value={formData.name}
                onChange={handleFormChange}
                onBlur={handleFieldBlur}
                autoComplete="name"
                aria-invalid={Boolean(formErrors.name)}
                aria-describedby={formErrors.name ? "name-error" : undefined}
                required
              />
            </label>
            {touchedFields.name && formErrors.name && (
              <p id="name-error" className="field-error">
                {formErrors.name}
              </p>
            )}

            <label>
              Email
              <input
                type="email"
                name="email"
                placeholder="tu@email.com"
                value={formData.email}
                onChange={handleFormChange}
                onBlur={handleFieldBlur}
                autoComplete="email"
                inputMode="email"
                aria-invalid={Boolean(formErrors.email)}
                aria-describedby={formErrors.email ? "email-error" : undefined}
                required
              />
            </label>
            {touchedFields.email && formErrors.email && (
              <p id="email-error" className="field-error">
                {formErrors.email}
              </p>
            )}

            <label>
              Mensaje
              <textarea
                name="message"
                rows={4}
                placeholder="Quiero recibir el catálogo de..."
                value={formData.message}
                onChange={handleFormChange}
                onBlur={handleFieldBlur}
                aria-invalid={Boolean(formErrors.message)}
                aria-describedby={formErrors.message ? "message-error" : undefined}
                required
              ></textarea>
            </label>
            {touchedFields.message && formErrors.message && (
              <p id="message-error" className="field-error">
                {formErrors.message}
              </p>
            )}

            <button className="btn" type="submit" disabled={formStatus === "sending"}>
              {formStatus === "sending" ? "Enviando..." : "Enviar consulta"}
            </button>

            {formStatus === "success" && (
              <p className="form-status form-status-success" aria-live="polite">
                Gracias. Tu consulta fue enviada correctamente.
              </p>
            )}
            {formStatus === "error" && (
              <p className="form-status form-status-error" aria-live="polite">
                No se pudo enviar la consulta. Intentá de nuevo en unos minutos.
              </p>
            )}
          </form>
        </div>
      </div>
    </section>
  );
}
