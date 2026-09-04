import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type DragEvent,
  type FormEvent,
} from "react";
import {
  highlightedLotNameErrorKey,
  validateHighlightedLotNames,
  validateRemateForPublish,
  type PublishValidationErrors,
} from "../admin/adminValidation";
import { createUniqueRemateSlug } from "../admin/remateSlug";
import {
  canRegenerateRemateSlug,
  remateStatusLabels,
} from "../admin/remateWorkflow";
import {
  useSiteData,
  type DataOperationResult,
  type RemateMutationResult,
} from "../context/siteDataContextValue";
import {
  formatRemateDateInput,
  formatRemateDateSummary,
  remateDateTimeInputToIso,
} from "../data/remateFormatting";
import type {
  AdminRemate,
  EditableSiteContent,
  HighlightedLot,
  RemateEstadoAdmin,
} from "../types/site";
import { ConfirmationModal } from "../components/admin/ConfirmationModal";

type AdminTab = "resumen" | "remates" | "contenido";

type PendingConfirmation =
  | { kind: "delete"; remate: AdminRemate }
  | {
      kind: "status";
      remate: AdminRemate;
      status: "finalizado" | "cancelado";
    }
  | { kind: "reset" };

const LOT_IMAGE_MAX_BYTES = 700_000;
const LOT_IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);
const ADMIN_NAVIGATION: Array<{ id: AdminTab; label: string }> = [
  { id: "resumen", label: "Resumen" },
  { id: "remates", label: "Remates" },
  { id: "contenido", label: "Contenido general" },
];

type LotFileResult = { lot: HighlightedLot } | { error: string };

function FieldTitle({
  children,
  description,
}: {
  children: string;
  description: string;
}) {
  return (
    <span className="admin-field-title">
      {children}
      <span
        className="admin-field-help"
        tabIndex={0}
        aria-label={`Ayuda: ${description}`}
      >
        ?
        <span className="admin-field-tooltip" role="tooltip">
          {description}
        </span>
      </span>
    </span>
  );
}

function createEmptyRemate(): AdminRemate {
  const now = new Date().toISOString();
  const id = crypto.randomUUID();

  return {
    id,
    slug: "",
    fechaHora: null,
    fechaPorConfirmar: false,
    titulo: "",
    subtitulo: "",
    lugar: "",
    ubicacionDetalle: "",
    detalle: "",
    enlace: "Catálogo pendiente",
    catalogoEstado: "",
    descripcionLarga: "",
    destacados: [],
    requisitos: [],
    condiciones: [],
    estadoAdmin: "borrador",
    catalogoPublicacionEstado: "proximamente",
    version: 0,
    creadoEn: now,
    actualizadoEn: now,
  };
}

function readFileAsDataUrl(file: File, maxBytes: number): Promise<string> {
  if (file.size > maxBytes) {
    return Promise.reject(new Error("El archivo supera el tamaño permitido para esta demostración."));
  }

  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error("No se pudo leer el archivo."));
    reader.readAsDataURL(file);
  });
}

export function AdminLogin({ onLogin }: { onLogin: (email: string, password: string) => Promise<void> }) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<{ id: number; message: string } | null>(null);
  const errorSequence = useRef(0);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!error) return;

    const timeoutId = window.setTimeout(() => setError(null), 10_000);
    return () => window.clearTimeout(timeoutId);
  }, [error]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (submitting) return;
    setSubmitting(true);
    try { await onLogin(username.trim(), password); }
    catch (error) {
      errorSequence.current += 1;
      setError({ id: errorSequence.current, message: error instanceof Error ? error.message : "No se pudo ingresar." });
    } finally { setSubmitting(false); }
  };

  return (
    <main id="contenido-principal" className="admin-login-page">
      <section className="admin-login-card">
        <p className="eyebrow">Administración</p>
        <h1>Ingresar al panel</h1>
        <p>Gestioná remates y contenido visible de Zunino Remates.</p>
        <form onSubmit={handleSubmit}>
          <label>
            Email
            <input
              value={username}
              type="email"
              onChange={(event) => setUsername(event.target.value)}
              autoComplete="username"
              required
            />
          </label>
          <label htmlFor="admin-password">Contraseña</label>
          <span className="admin-password-field">
            <input
              id="admin-password"
              type={showPassword ? "text" : "password"}
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              autoComplete="current-password"
              required
            />
            <button
              type="button"
              onClick={() => setShowPassword((current) => !current)}
              aria-label={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
            >
              {showPassword ? "Ocultar" : "Mostrar"}
            </button>
          </span>
          {error ? (
            <p
              key={error.id}
              className="form-status form-status-error transient-message-enter"
              data-attempt={error.id}
              role="alert"
            >
              {error.message}
            </p>
          ) : null}
          <button className="btn" type="submit" disabled={submitting}>
            {submitting ? "Ingresando…" : "Ingresar"}
          </button>
        </form>
        <p className="admin-security-note">
          Acceso exclusivo para integrantes autorizados. La sesión se verifica en el servidor.
        </p>
      </section>
    </main>
  );
}

type RemateEditorProps = {
  storageEnabled: boolean;
  initialRemate: AdminRemate;
  existingRemates: AdminRemate[];
  onSave: (remate: AdminRemate) => Promise<RemateMutationResult>;
  onSaved: () => void;
  onCancel: () => void;
};

function RemateEditor({
  storageEnabled,
  initialRemate,
  existingRemates,
  onSave,
  onSaved,
  onCancel,
}: RemateEditorProps) {
  const [form, setForm] = useState(initialRemate);
  const [dateInput, setDateInput] = useState(formatRemateDateInput(initialRemate.fechaHora));
  const [requisitosText, setRequisitosText] = useState(initialRemate.requisitos.join("\n"));
  const [condicionesText, setCondicionesText] = useState(initialRemate.condiciones.join("\n"));
  const [errors, setErrors] = useState<PublishValidationErrors>({});
  const [notice, setNotice] = useState<{ id: number; message: string } | null>(null);
  const [lotUploadNotice, setLotUploadNotice] = useState<{ id: number; message: string } | null>(null);
  const [isDraggingLotImages, setIsDraggingLotImages] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const noticeSequence = useRef(0);
  const noticeRef = useRef<HTMLParagraphElement>(null);
  const lotUploadNoticeSequence = useRef(0);
  const lotSequence = useRef(0);
  const dragDepth = useRef(0);

  useEffect(() => {
    setForm(initialRemate);
    setDateInput(formatRemateDateInput(initialRemate.fechaHora));
    setRequisitosText(initialRemate.requisitos.join("\n"));
    setCondicionesText(initialRemate.condiciones.join("\n"));
    setErrors({});
    setNotice(null);
    setLotUploadNotice(null);
    setIsDraggingLotImages(false);
    dragDepth.current = 0;
  }, [initialRemate]);

  useEffect(() => {
    if (!notice) return;

    noticeRef.current?.focus();
    noticeRef.current?.scrollIntoView?.({ behavior: "smooth", block: "center" });

    const timeoutId = window.setTimeout(() => setNotice(null), 10_000);
    return () => window.clearTimeout(timeoutId);
  }, [notice]);

  useEffect(() => {
    if (!lotUploadNotice) return;

    const timeoutId = window.setTimeout(() => setLotUploadNotice(null), 10_000);
    return () => window.clearTimeout(timeoutId);
  }, [lotUploadNotice]);

  const showNotice = (message: string) => {
    noticeSequence.current += 1;
    setNotice({ id: noticeSequence.current, message });
  };

  const showLotUploadNotice = (message: string) => {
    lotUploadNoticeSequence.current += 1;
    setLotUploadNotice({ id: lotUploadNoticeSequence.current, message });
  };

  const updateTextField = (field: keyof AdminRemate, value: string) => {
    setForm((current) => ({ ...current, [field]: value }));
    setErrors((current) => {
      const next = { ...current };
      delete next[field];
      return next;
    });
  };

  const normalizedForm = (status: RemateEstadoAdmin): AdminRemate => ({
    ...form,
    slug: canRegenerateRemateSlug(form.estadoAdmin)
      ? createUniqueRemateSlug(form.titulo, existingRemates, form.id)
      : form.slug,
    fechaHora: form.fechaPorConfirmar ? null : remateDateTimeInputToIso(dateInput),
    requisitos: requisitosText
      .split("\n")
      .map((item) => item.trim())
      .filter(Boolean),
    condiciones: condicionesText
      .split("\n")
      .map((item) => item.trim())
      .filter(Boolean),
    estadoAdmin: status,
    actualizadoEn: new Date().toISOString(),
  });

  const saveWithStatus = async (status: RemateEstadoAdmin) => {
    const nextRemate = normalizedForm(status);
    const validationErrors: PublishValidationErrors =
      status === "publicado" || status === "oculto"
        ? validateRemateForPublish(nextRemate)
        : validateHighlightedLotNames(nextRemate);

    if (!form.fechaPorConfirmar && dateInput.trim() && !nextRemate.fechaHora) {
      validationErrors.fechaHora = "Ingresá una fecha válida con el formato dd/mm/yyyy HH:mm.";
    }

    setErrors(validationErrors);

    if (Object.keys(validationErrors).length > 0) {
      showNotice(
        status === "publicado" || status === "oculto"
          ? "El remate no puede publicarse hasta completar todos los campos obligatorios."
          : "Poné un nombre a cada foto antes de guardar el remate."
      );
      return;
    }

    setErrors({});
    setIsSaving(true);
    const result = await onSave(nextRemate);
    setIsSaving(false);

    if (result.status === "saved") {
      onSaved();
    } else if (result.status === "conflict") {
      showNotice(
        "Otra persona modificó este remate mientras lo estabas editando. Tus cambios siguen en pantalla; volvé al listado para cargar la versión actual."
      );
    } else if (result.status === "invalid_transition" || result.status === "error") {
      showNotice(result.message);
    }
  };

  const updateHighlightedLot = (
    id: string,
    updater: (lot: HighlightedLot) => HighlightedLot
  ) => {
    setForm((current) => ({
      ...current,
      destacados: current.destacados.map((lot) => (lot.id === id ? updater(lot) : lot)),
    }));
  };

  const removeHighlightedLot = (id: string) => {
    setForm((current) => ({
      ...current,
      destacados: current.destacados.filter((lot) => lot.id !== id),
    }));
    setErrors((current) => {
      const next = { ...current };
      delete next[highlightedLotNameErrorKey(id)];
      return next;
    });
  };

  const addHighlightedLotsFromFiles = async (files: File[]) => {
    if (files.length === 0) return;

    // Cada archivo válido se convierte en una tarjeta independiente para nombrarlo.
    const results = await Promise.all(
      files.map(async (file): Promise<LotFileResult> => {
        if (!LOT_IMAGE_TYPES.has(file.type)) {
          return { error: `${file.name}: formato no admitido.` };
        }

        try {
          const url = await readFileAsDataUrl(file, LOT_IMAGE_MAX_BYTES);
          lotSequence.current += 1;

          return {
            lot: {
              id: `lote-${Date.now()}-${lotSequence.current}`,
              nombre: "",
              imagen: { url, alt: `Vista previa de ${file.name}` },
            } satisfies HighlightedLot,
          };
        } catch (uploadError) {
          const message =
            uploadError instanceof Error ? uploadError.message : "No se pudo leer el archivo.";
          return { error: `${file.name}: ${message}` };
        }
      })
    );

    const addedLots: HighlightedLot[] = [];
    const failedFiles: string[] = [];

    results.forEach((result) => {
      if ("lot" in result) {
        addedLots.push(result.lot);
      } else {
        failedFiles.push(result.error);
      }
    });

    if (addedLots.length > 0) {
      setForm((current) => ({
        ...current,
        destacados: [...current.destacados, ...addedLots],
      }));
    }

    if (failedFiles.length > 0) {
      showLotUploadNotice(failedFiles.join(" "));
    } else {
      setLotUploadNotice(null);
    }
  };

  const handleLotImagesDrop = (event: DragEvent<HTMLLabelElement>) => {
    event.preventDefault();
    dragDepth.current = 0;
    setIsDraggingLotImages(false);
    void addHighlightedLotsFromFiles(Array.from(event.dataTransfer.files));
  };

  const handleLotImagesDragEnter = (event: DragEvent<HTMLLabelElement>) => {
    event.preventDefault();
    dragDepth.current += 1;
    setIsDraggingLotImages(true);
  };

  const handleLotImagesDragLeave = (event: DragEvent<HTMLLabelElement>) => {
    event.preventDefault();
    dragDepth.current = Math.max(0, dragDepth.current - 1);
    if (dragDepth.current === 0) {
      setIsDraggingLotImages(false);
    }
  };

  return (
    <section className="admin-editor">
      <div className="admin-editor-heading">
        <div>
          <p className="eyebrow">Editor de remate</p>
          <h2>{form.titulo || "Nuevo remate"}</h2>
        </div>
        <button className="btn btn-ghost btn-small" type="button" onClick={onCancel}>
          Volver al listado
        </button>
      </div>

      <div className="admin-info-box">
        <strong>Flujo de publicación:</strong> podés guardar información incompleta como borrador o
        enviarla a revisión. El sistema solo exige todos los campos al publicar.
      </div>

      {notice ? (
        <p
          ref={noticeRef}
          key={notice.id}
          className="form-status form-status-error transient-message-enter"
          data-attempt={notice.id}
          role="alert"
          tabIndex={-1}
        >
          {notice.message}
        </p>
      ) : null}

      <div className="admin-form-grid">
        <label>
          <FieldTitle description="Nombre principal con el que se mostrará el remate en toda la web.">
            Título *
          </FieldTitle>
          <input
            value={form.titulo}
            onChange={(event) => {
              const title = event.target.value;
              setForm((current) => ({
                ...current,
                titulo: title,
                slug: canRegenerateRemateSlug(current.estadoAdmin)
                  ? createUniqueRemateSlug(title, existingRemates, current.id)
                  : current.slug,
              }));
            }}
            aria-invalid={Boolean(errors.titulo)}
          />
          {errors.titulo ? <span className="admin-field-error">{errors.titulo}</span> : null}
        </label>
        <label>
          <FieldTitle description="Se genera desde el título mientras el remate está en borrador o revisión. Al publicarse queda fijo para no romper enlaces compartidos.">
            Ruta o slug *
          </FieldTitle>
          <input
            value={form.slug}
            placeholder="maquinaria-y-herramientas"
            readOnly
            aria-readonly="true"
            aria-invalid={Boolean(errors.slug)}
          />
          {errors.slug ? <span className="admin-field-error">{errors.slug}</span> : null}
        </label>
        <label>
          <FieldTitle description="Fecha y hora exactas en formato dd/mm/yyyy HH:mm. El lugar se carga en sus campos específicos.">
            Fecha y hora completas *
          </FieldTitle>
          <input
            value={dateInput}
            onChange={(event) => {
              setDateInput(event.target.value);
              setErrors((current) => {
                const next = { ...current };
                delete next.fechaHora;
                return next;
              });
            }}
            placeholder="22/03/2026 17:00"
            inputMode="numeric"
            disabled={form.fechaPorConfirmar}
            aria-invalid={Boolean(errors.fechaHora)}
          />
          {errors.fechaHora ? (
            <span className="admin-field-error">{errors.fechaHora}</span>
          ) : null}
        </label>
        <label className="admin-checkbox-field">
          <input
            type="checkbox"
            checked={form.fechaPorConfirmar}
            onChange={(event) => {
              const checked = event.target.checked;
              setForm((current) => ({
                ...current,
                fechaPorConfirmar: checked,
              }));
              setErrors((current) => {
                const next = { ...current };
                delete next.fechaHora;
                return next;
              });
            }}
          />
          <span>Fecha a confirmar</span>
        </label>
        <label className="admin-span-two">
          <FieldTitle description="Frase breve que complementa el título y explica qué tipo de remate es.">
            Subtítulo *
          </FieldTitle>
          <input
            value={form.subtitulo}
            onChange={(event) => updateTextField("subtitulo", event.target.value)}
            aria-invalid={Boolean(errors.subtitulo)}
          />
          {errors.subtitulo ? <span className="admin-field-error">{errors.subtitulo}</span> : null}
        </label>
        <label>
          <FieldTitle description="Nombre corto del local o predio, pensado para las tarjetas y encabezados.">
            Lugar resumido *
          </FieldTitle>
          <input
            value={form.lugar}
            onChange={(event) => updateTextField("lugar", event.target.value)}
            aria-invalid={Boolean(errors.lugar)}
          />
          {errors.lugar ? <span className="admin-field-error">{errors.lugar}</span> : null}
        </label>
        <label>
          <FieldTitle description="Indica al público si el catálogo todavía no está publicado, es preliminar o ya está disponible.">
            Estado visible del catálogo *
          </FieldTitle>
          <select
            value={form.catalogoPublicacionEstado}
            onChange={(event) =>
              setForm((current) => ({
                ...current,
                catalogoPublicacionEstado: event.target
                  .value as AdminRemate["catalogoPublicacionEstado"],
              }))
            }
          >
            <option value="proximamente">Próximamente</option>
            <option value="preliminar">Preliminar</option>
            <option value="disponible">Disponible</option>
          </select>
        </label>
        <label className="admin-span-two">
          <FieldTitle description="Dirección completa y cualquier indicación necesaria para llegar o coordinar una inspección.">
            Ubicación detallada *
          </FieldTitle>
          <input
            value={form.ubicacionDetalle}
            onChange={(event) => updateTextField("ubicacionDetalle", event.target.value)}
            aria-invalid={Boolean(errors.ubicacionDetalle)}
          />
          {errors.ubicacionDetalle ? (
            <span className="admin-field-error">{errors.ubicacionDetalle}</span>
          ) : null}
        </label>
        <label className="admin-span-two">
          <FieldTitle description="Resumen de una o dos líneas que se muestra en la tarjeta del remate.">
            Descripción breve *
          </FieldTitle>
          <textarea
            rows={2}
            value={form.detalle}
            onChange={(event) => updateTextField("detalle", event.target.value)}
            aria-invalid={Boolean(errors.detalle)}
          />
          {errors.detalle ? <span className="admin-field-error">{errors.detalle}</span> : null}
        </label>
        <label className="admin-span-two">
          <FieldTitle description="Presentación extensa del remate para su página de detalle: contenido, público objetivo e información relevante.">
            Descripción completa *
          </FieldTitle>
          <textarea
            rows={5}
            value={form.descripcionLarga}
            onChange={(event) => updateTextField("descripcionLarga", event.target.value)}
            aria-invalid={Boolean(errors.descripcionLarga)}
          />
          {errors.descripcionLarga ? (
            <span className="admin-field-error">{errors.descripcionLarga}</span>
          ) : null}
        </label>
        <label className="admin-span-two">
          <FieldTitle description="Mensaje público que describe qué contiene el catálogo o cuándo estará disponible.">
            Texto sobre el catálogo *
          </FieldTitle>
          <textarea
            rows={2}
            value={form.catalogoEstado}
            onChange={(event) => updateTextField("catalogoEstado", event.target.value)}
            aria-invalid={Boolean(errors.catalogoEstado)}
          />
          {errors.catalogoEstado ? (
            <span className="admin-field-error">{errors.catalogoEstado}</span>
          ) : null}
        </label>
      </div>

      <div className="admin-form-grid admin-subsection">
        <label>
          <FieldTitle description="Condiciones que una persona debe cumplir para participar. Escribí un requisito por línea.">
            Requisitos para participar *
          </FieldTitle>
          <textarea
            rows={6}
            value={requisitosText}
            onChange={(event) => setRequisitosText(event.target.value)}
            placeholder="Un requisito por línea"
            aria-invalid={Boolean(errors.requisitos)}
          />
          {errors.requisitos ? <span className="admin-field-error">{errors.requisitos}</span> : null}
        </label>
        <label>
          <FieldTitle description="Reglas de pago, entrega, retiro u otras condiciones. Escribí una condición por línea.">
            Condiciones del remate *
          </FieldTitle>
          <textarea
            rows={6}
            value={condicionesText}
            onChange={(event) => setCondicionesText(event.target.value)}
            placeholder="Una condición por línea"
            aria-invalid={Boolean(errors.condiciones)}
          />
          {errors.condiciones ? (
            <span className="admin-field-error">{errors.condiciones}</span>
          ) : null}
        </label>
      </div>

      {storageEnabled ? <div className="admin-subsection">
        <div className="admin-subsection-heading">
          <div>
            <h3>Lotes destacados</h3>
            <p>Son opcionales. Arrastrá una o varias fotos y asignale un nombre a cada una.</p>
          </div>
        </div>
        <div className="admin-lots-list">
          {form.destacados.map((lot, index) => (
            <article className="admin-lot-card" key={lot.id}>
              <div className="admin-lot-heading">
                <h4>Lote {index + 1}</h4>
                <button
                  className="admin-danger-link"
                  type="button"
                  onClick={() => removeHighlightedLot(lot.id)}
                >
                  Quitar
                </button>
              </div>
              <div className="admin-lot-preview">
                {lot.imagen.url ? (
                  <img src={lot.imagen.url} alt={lot.imagen.alt || `Vista previa del lote ${index + 1}`} />
                ) : (
                  <span>Imagen no disponible</span>
                )}
              </div>
              <div className="admin-lot-details">
                <label htmlFor={`lot-name-${lot.id}`}>
                  <FieldTitle description="Nombre breve y reconocible que se mostrará debajo de esta foto.">
                    Nombre de la foto *
                  </FieldTitle>
                </label>
                <input
                  id={`lot-name-${lot.id}`}
                  value={lot.nombre}
                  required
                  aria-label={`Nombre de la foto ${index + 1}`}
                  aria-invalid={Boolean(errors[highlightedLotNameErrorKey(lot.id)])}
                  onChange={(event) => {
                    const name = event.target.value;
                    updateHighlightedLot(lot.id, (current) => ({
                      ...current,
                      nombre: name,
                      imagen: {
                        ...current.imagen,
                        alt: name.trim() ? `Imagen de ${name.trim()}` : current.imagen.alt,
                      },
                    }));
                    setErrors((current) => {
                      const next = { ...current };
                      delete next[highlightedLotNameErrorKey(lot.id)];
                      return next;
                    });
                  }}
                />
                {errors[highlightedLotNameErrorKey(lot.id)] ? (
                  <span className="admin-field-error">
                    {errors[highlightedLotNameErrorKey(lot.id)]}
                  </span>
                ) : null}
                <p>Este nombre también se usa como descripción accesible de la imagen.</p>
              </div>
            </article>
          ))}
          <label
            className={`admin-lot-dropzone${isDraggingLotImages ? " is-dragging" : ""}`}
            onDragEnter={handleLotImagesDragEnter}
            onDragLeave={handleLotImagesDragLeave}
            onDragOver={(event) => {
              event.preventDefault();
              event.dataTransfer.dropEffect = "copy";
            }}
            onDrop={handleLotImagesDrop}
          >
            <input
              className="admin-lot-file-input"
              type="file"
              accept="image/jpeg,image/png,image/webp"
              multiple
              aria-label="Agregar fotos de lotes destacados"
              onChange={(event) => {
                void addHighlightedLotsFromFiles(Array.from(event.target.files ?? []));
                event.target.value = "";
              }}
            />
            <span className="admin-lot-drop-icon" aria-hidden="true">+</span>
            <strong>Arrastrá las fotos acá</strong>
            <span>o hacé clic para elegir varias desde tu dispositivo</span>
            <small>JPG, PNG o WebP. Hasta 700 KB por foto en esta demostración.</small>
          </label>
          {lotUploadNotice ? (
            <p
              key={lotUploadNotice.id}
              className="form-status form-status-error transient-message-enter"
              data-attempt={lotUploadNotice.id}
              role="alert"
            >
              {lotUploadNotice.message}
            </p>
          ) : null}
        </div>
      </div>

      : <p role="status">Las fotos de lotes destacados se habilitarán al conectar Storage. Podés guardar y publicar el remate sin fotos; las imágenes existentes en la base no se modifican.</p>}

      <div className="admin-editor-actions">
        {form.estadoAdmin === "borrador" || form.estadoAdmin === "en_revision" ? (
          <button
            className="btn btn-ghost"
            type="button"
            disabled={isSaving}
            onClick={() => void saveWithStatus("borrador")}
          >
            Guardar borrador
          </button>
        ) : null}
        {form.estadoAdmin === "borrador" || form.estadoAdmin === "en_revision" ? (
          <button
            className="btn btn-outline"
            type="button"
            disabled={isSaving}
            onClick={() => void saveWithStatus("en_revision")}
          >
            {form.estadoAdmin === "borrador" ? "Enviar a revisión" : "Guardar revisión"}
          </button>
        ) : null}
        {form.estadoAdmin === "borrador" || form.estadoAdmin === "en_revision" ? (
          <button
            className="btn"
            type="button"
            disabled={isSaving}
            onClick={() => void saveWithStatus("publicado")}
          >
            Publicar remate
          </button>
        ) : null}
        {form.estadoAdmin === "publicado" ||
        form.estadoAdmin === "oculto" ||
        form.estadoAdmin === "finalizado" ||
        form.estadoAdmin === "cancelado" ? (
          <button
            className="btn"
            type="button"
            disabled={isSaving}
            onClick={() => void saveWithStatus(form.estadoAdmin)}
          >
            {isSaving ? "Guardando..." : "Guardar cambios"}
          </button>
        ) : null}
      </div>
    </section>
  );
}

function SiteContentEditor() {
  const { content, saveContent } = useSiteData();
  const [draft, setDraft] = useState<EditableSiteContent>(content);
  const [saved, setSaved] = useState(false);
  const [saveError, setSaveError] = useState("");

  useEffect(() => setDraft(content), [content]);

  const save = async () => {
    const result = await saveContent(draft);
    if (result.status === "error") {
      setSaveError(result.message);
      return;
    }

    setSaveError("");
    setSaved(true);
    window.setTimeout(() => setSaved(false), 2500);
  };

  return (
    <section className="admin-editor">
      <div className="admin-editor-heading">
        <div>
          <p className="eyebrow">Contenido general</p>
          <h2>Textos y datos de la empresa</h2>
        </div>
        <button className="btn" type="button" onClick={() => void save()}>
          Guardar cambios
        </button>
      </div>
      {saved ? <p className="form-status form-status-success">Cambios guardados.</p> : null}
      {saveError ? <p className="form-status form-status-error">{saveError}</p> : null}

      <div className="admin-subsection">
        <h3>Portada y empresa</h3>
        <div className="admin-form-grid">
          <label className="admin-span-two">
            Título principal
            <textarea
              rows={2}
              value={draft.copy.heroTitle}
              onChange={(event) =>
                setDraft((current) => ({
                  ...current,
                  copy: { ...current.copy, heroTitle: event.target.value },
                }))
              }
            />
          </label>
          <label className="admin-span-two">
            Descripción principal
            <textarea
              rows={3}
              value={draft.copy.heroDescription}
              onChange={(event) =>
                setDraft((current) => ({
                  ...current,
                  copy: { ...current.copy, heroDescription: event.target.value },
                }))
              }
            />
          </label>
          <label className="admin-span-two">
            Título de la empresa
            <input
              value={draft.copy.empresaTitle}
              onChange={(event) =>
                setDraft((current) => ({
                  ...current,
                  copy: { ...current.copy, empresaTitle: event.target.value },
                }))
              }
            />
          </label>
          <label>
            Primer texto de empresa
            <textarea
              rows={5}
              value={draft.copy.empresaParagraph1}
              onChange={(event) =>
                setDraft((current) => ({
                  ...current,
                  copy: { ...current.copy, empresaParagraph1: event.target.value },
                }))
              }
            />
          </label>
          <label>
            Segundo texto de empresa
            <textarea
              rows={5}
              value={draft.copy.empresaParagraph2}
              onChange={(event) =>
                setDraft((current) => ({
                  ...current,
                  copy: { ...current.copy, empresaParagraph2: event.target.value },
                }))
              }
            />
          </label>
        </div>
      </div>

      <div className="admin-subsection">
        <h3>Contacto y ubicación</h3>
        <div className="admin-form-grid">
          {(["email", "telefono", "direccion", "horario"] as const).map((field) => (
            <label key={field}>
              {field.charAt(0).toUpperCase() + field.slice(1)}
              <input
                value={draft.contacto[field]}
                onChange={(event) =>
                  setDraft((current) => ({
                    ...current,
                    contacto: { ...current.contacto, [field]: event.target.value },
                  }))
                }
              />
            </label>
          ))}
          <label className="admin-span-two">
            URL embebida de Google Maps
            <input
              value={draft.contacto.mapEmbedUrl}
              onChange={(event) =>
                setDraft((current) => ({
                  ...current,
                  contacto: { ...current.contacto, mapEmbedUrl: event.target.value },
                }))
              }
            />
          </label>
          <label className="admin-span-two">
            Título de ubicación
            <input
              value={draft.copy.ubicacionTitle}
              onChange={(event) =>
                setDraft((current) => ({
                  ...current,
                  copy: { ...current.copy, ubicacionTitle: event.target.value },
                }))
              }
            />
          </label>
          <label className="admin-span-two">
            Descripción de ubicación
            <textarea
              rows={3}
              value={draft.copy.ubicacionDescription}
              onChange={(event) =>
                setDraft((current) => ({
                  ...current,
                  copy: { ...current.copy, ubicacionDescription: event.target.value },
                }))
              }
            />
          </label>
        </div>
      </div>

      <div className="admin-subsection">
        <div className="admin-subsection-heading">
          <div>
            <h3>Preguntas frecuentes</h3>
            <p>Editá, eliminá o agregá preguntas.</p>
          </div>
          <button
            className="btn btn-outline btn-small"
            type="button"
            onClick={() =>
              setDraft((current) => ({
                ...current,
                faqs: [
                  ...current.faqs,
                  { id: `faq-${Date.now()}`, pregunta: "", respuesta: "" },
                ],
              }))
            }
          >
            Agregar pregunta
          </button>
        </div>
        <div className="admin-faq-list">
          {draft.faqs.map((faq) => (
            <article className="admin-faq-card" key={faq.id}>
              <label>
                Pregunta
                <input
                  value={faq.pregunta}
                  onChange={(event) =>
                    setDraft((current) => ({
                      ...current,
                      faqs: current.faqs.map((item) =>
                        item.id === faq.id ? { ...item, pregunta: event.target.value } : item
                      ),
                    }))
                  }
                />
              </label>
              <label>
                Respuesta
                <textarea
                  rows={3}
                  value={faq.respuesta}
                  onChange={(event) =>
                    setDraft((current) => ({
                      ...current,
                      faqs: current.faqs.map((item) =>
                        item.id === faq.id ? { ...item, respuesta: event.target.value } : item
                      ),
                    }))
                  }
                />
              </label>
              <button
                className="admin-danger-link"
                type="button"
                onClick={() =>
                  setDraft((current) => ({
                    ...current,
                    faqs: current.faqs.filter((item) => item.id !== faq.id),
                  }))
                }
              >
                Eliminar pregunta
              </button>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

export function AdminPage({ onLogout = () => {}, role = "editor", storageEnabled = false }: {
  onLogout?: () => void;
  role?: "administrador" | "editor";
  storageEnabled?: boolean;
}) {
  const {
    remates,
    saveRemate,
    deleteRemate,
    changeRemateStatus,
    resetDemoData,
  } = useSiteData();
  const [tab, setTab] = useState<AdminTab>("resumen");
  const [isMobileNavigationOpen, setIsMobileNavigationOpen] = useState(false);
  const [editingRemate, setEditingRemate] = useState<AdminRemate | null>(null);
  const [pageNotice, setPageNotice] = useState<{ id: number; message: string } | null>(null);
  const [pendingConfirmation, setPendingConfirmation] =
    useState<PendingConfirmation | null>(null);
  const [isConfirming, setIsConfirming] = useState(false);
  const pageNoticeSequence = useRef(0);

  useEffect(() => {
    if (!pageNotice) return;
    const timeoutId = window.setTimeout(() => setPageNotice(null), 10_000);
    return () => window.clearTimeout(timeoutId);
  }, [pageNotice]);

  const showPageNotice = (message: string) => {
    pageNoticeSequence.current += 1;
    setPageNotice({ id: pageNoticeSequence.current, message });
  };

  const counts = useMemo(
    () =>
      remates.reduce(
        (result, remate) => ({
          ...result,
          [remate.estadoAdmin]: result[remate.estadoAdmin] + 1,
        }),
        {
          borrador: 0,
          en_revision: 0,
          publicado: 0,
          oculto: 0,
          finalizado: 0,
          cancelado: 0,
        } as Record<RemateEstadoAdmin, number>
      ),
    [remates]
  );

  useEffect(() => {
    if (!isMobileNavigationOpen) return;

    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setIsMobileNavigationOpen(false);
    };

    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [isMobileNavigationOpen]);


  const handleSaveRemate = async (remate: AdminRemate) => {
    return saveRemate(remate);
  };

  const handleDelete = (remate: AdminRemate) => {
    setPendingConfirmation({ kind: "delete", remate });
  };

  const handleStatusChange = async (
    remate: AdminRemate,
    status: RemateEstadoAdmin
  ) => {
    if (status === "finalizado" || status === "cancelado") {
      setPendingConfirmation({ kind: "status", remate, status });
      return;
    }

    if (status === "publicado" && Object.keys(validateRemateForPublish(remate)).length > 0) {
      showPageNotice("El remate debe conservar todos los datos obligatorios para volver a publicarse.");
      return;
    }

    const result = await changeRemateStatus(remate.id, remate.version, status);
    if (result.status === "saved") return;

    showPageNotice(
      result.status === "conflict"
        ? "Otra persona modificó este remate. El listado fue actualizado; revisá la versión actual."
        : result.message
    );
  };

  const confirmPendingAction = async () => {
    if (!pendingConfirmation || isConfirming) return;

    setIsConfirming(true);
    let result: RemateMutationResult | DataOperationResult;

    if (pendingConfirmation.kind === "delete") {
      result = await deleteRemate(
        pendingConfirmation.remate.id,
        pendingConfirmation.remate.version
      );
    } else if (pendingConfirmation.kind === "status") {
      result = await changeRemateStatus(
        pendingConfirmation.remate.id,
        pendingConfirmation.remate.version,
        pendingConfirmation.status
      );
    } else {
      result = await resetDemoData();
    }

    setIsConfirming(false);
    setPendingConfirmation(null);

    if (result.status === "saved") return;
    showPageNotice(
      result.status === "conflict"
        ? "Otra persona modificó este remate. El listado fue actualizado; revisá la versión actual."
        : result.message
    );
  };

  const confirmationCopy = pendingConfirmation
    ? pendingConfirmation.kind === "delete"
      ? {
          title: "Eliminar remate",
          description: `Vas a eliminar “${pendingConfirmation.remate.titulo || "este remate"}”. Esta acción no se puede deshacer.`,
          confirmLabel: "Eliminar remate",
        }
      : pendingConfirmation.kind === "status"
        ? pendingConfirmation.status === "finalizado"
          ? {
              title: "Finalizar remate",
              description: `“${pendingConfirmation.remate.titulo || "Este remate"}” quedará finalizado de forma permanente y no podrá reactivarse.`,
              confirmLabel: "Finalizar remate",
            }
          : {
              title: "Cancelar remate",
              description: `“${pendingConfirmation.remate.titulo || "Este remate"}” quedará cancelado de forma permanente y no podrá reactivarse.`,
              confirmLabel: "Cancelar remate",
            }
        : {
            title: "Restablecer demostración",
            description:
              "Se reemplazarán los cambios guardados en este navegador por los datos iniciales de demostración.",
            confirmLabel: "Restablecer datos",
          }
    : null;

  const logout = onLogout;

  const selectTab = (nextTab: AdminTab) => {
    setTab(nextTab);
    setEditingRemate(null);
    setIsMobileNavigationOpen(false);
  };

  return (
    <main id="contenido-principal" className="admin-page">
      <header className="admin-topbar">
        <button
          className="admin-menu-toggle"
          type="button"
          aria-controls="admin-navigation"
          aria-expanded={isMobileNavigationOpen}
          aria-label={isMobileNavigationOpen ? "Cerrar menú" : "Abrir menú"}
          onClick={() => setIsMobileNavigationOpen((current) => !current)}
        >
          <span aria-hidden="true">☰</span>
        </button>
        <div className="admin-brand">
          <span className="admin-brand-name">Zunino Remates</span>
          <h1>Panel administrador</h1>
        </div>
        <div className="admin-topbar-actions">
          <a className="btn btn-outline btn-small" href="/" target="_blank" rel="noreferrer">
            Ver sitio público
          </a>
          <button className="btn btn-ghost btn-small" type="button" onClick={logout}>
            Cerrar sesión
          </button>
        </div>
      </header>

      <button
        className={`admin-sidebar-backdrop${isMobileNavigationOpen ? " is-open" : ""}`}
        type="button"
        aria-label="Cerrar menú"
        tabIndex={isMobileNavigationOpen ? 0 : -1}
        onClick={() => setIsMobileNavigationOpen(false)}
      />

      <div className="admin-layout">
        <nav
          id="admin-navigation"
          className={`admin-sidebar${isMobileNavigationOpen ? " is-open" : ""}`}
          aria-label="Navegación administrativa"
        >
          <div className="admin-sidebar-header">
            <div>
              <strong>Zunino Remates</strong>
              <span>Administración</span>
            </div>
            <button
              className="admin-sidebar-close"
              type="button"
              aria-label="Cerrar menú"
              onClick={() => setIsMobileNavigationOpen(false)}
            >
              <span aria-hidden="true">×</span>
            </button>
          </div>
          <div className="admin-sidebar-navigation">
            {ADMIN_NAVIGATION.map((item) => (
              <button
                className={tab === item.id ? "active" : ""}
                key={item.id}
                type="button"
                onClick={() => selectTab(item.id)}
              >
                {item.label}
              </button>
            ))}
          </div>
          <div className="admin-sidebar-actions">
            <a href="/" target="_blank" rel="noreferrer">
              Ver sitio público
            </a>
            <button type="button" onClick={logout}>
              Cerrar sesión
            </button>
          </div>
        </nav>

        <div className="admin-content">
          {pageNotice ? (
            <p
              key={pageNotice.id}
              className="form-status form-status-error transient-message-enter"
              role="alert"
            >
              {pageNotice.message}
            </p>
          ) : null}
          {editingRemate ? (
            <RemateEditor
              initialRemate={editingRemate}
              storageEnabled={storageEnabled}
              existingRemates={remates}
              onSave={handleSaveRemate}
              onSaved={() => {
                setEditingRemate(null);
                setTab("remates");
              }}
              onCancel={() => setEditingRemate(null)}
            />
          ) : null}

          {!editingRemate && tab === "resumen" ? (
            <section>
              <div className="admin-section-heading">
                <div>
                  <p className="eyebrow">Estado general</p>
                  <h2>Resumen de contenidos</h2>
                </div>
                <button
                  className="btn"
                  type="button"
                  onClick={() => {
                    setEditingRemate(createEmptyRemate());
                    setTab("remates");
                  }}
                >
                  Crear remate
                </button>
              </div>
              <div className="admin-stats-grid">
                {(Object.keys(remateStatusLabels) as RemateEstadoAdmin[]).map((status) => (
                  <article className="admin-stat-card" key={status}>
                    <span>{remateStatusLabels[status]}</span>
                    <strong>{counts[status]}</strong>
                  </article>
                ))}
              </div>
              <div className="admin-review-panel">
                <div>
                  <p className="eyebrow">Pendientes</p>
                  <h3>Remates para verificar</h3>
                </div>
                {remates.filter((item) => item.estadoAdmin === "en_revision").map((remate) => (
                  <article className="admin-review-item" key={remate.id}>
                    <div>
                      <strong>{remate.titulo || "Remate sin título"}</strong>
                      <span>Actualizado {new Date(remate.actualizadoEn).toLocaleString("es-UY")}</span>
                    </div>
                    <button
                      className="btn btn-outline btn-small"
                      type="button"
                      onClick={() => setEditingRemate(remate)}
                    >
                      Revisar carga
                    </button>
                  </article>
                ))}
              </div>
            </section>
          ) : null}

          {!editingRemate && tab === "remates" ? (
            <section>
              <div className="admin-section-heading">
                <div>
                  <p className="eyebrow">Gestión</p>
                  <h2>Todos los remates</h2>
                </div>
                <button className="btn" type="button" onClick={() => setEditingRemate(createEmptyRemate())}>
                  Agregar remate
                </button>
              </div>
              <div className="admin-table-wrap">
                <table className="admin-table">
                  <thead>
                    <tr>
                      <th>Remate</th>
                      <th>Fecha</th>
                      <th>Estado</th>
                      <th>Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {remates.map((remate) => (
                      <tr key={remate.id}>
                        <td className="admin-remate-cell">
                          <strong>{remate.titulo || "Sin título"}</strong>
                          <span>{remate.lugar || "Lugar pendiente"}</span>
                        </td>
                        <td data-label="Fecha">
                          {formatRemateDateSummary(
                            remate.fechaHora,
                            remate.fechaPorConfirmar
                          ) || "Pendiente"}
                        </td>
                        <td data-label="Estado">
                          <span className={`admin-status admin-status-${remate.estadoAdmin}`}>
                            {remateStatusLabels[remate.estadoAdmin]}
                          </span>
                        </td>
                        <td data-label="Acciones">
                          <div className="admin-row-actions">
                            <button type="button" onClick={() => setEditingRemate(remate)}>
                              Editar
                            </button>
                            {remate.estadoAdmin === "publicado" ? (
                              <button
                                type="button"
                                onClick={() => void handleStatusChange(remate, "oculto")}
                              >
                                Ocultar
                              </button>
                            ) : null}
                            {remate.estadoAdmin === "oculto" ? (
                              <button
                                type="button"
                                onClick={() => void handleStatusChange(remate, "publicado")}
                              >
                                Volver a publicar
                              </button>
                            ) : null}
                            {remate.estadoAdmin === "publicado" ||
                            remate.estadoAdmin === "oculto" ? (
                              <button
                                type="button"
                                onClick={() => void handleStatusChange(remate, "finalizado")}
                              >
                                Finalizar
                              </button>
                            ) : null}
                            {remate.estadoAdmin === "publicado" ||
                            remate.estadoAdmin === "oculto" ? (
                              <button
                                type="button"
                                onClick={() => void handleStatusChange(remate, "cancelado")}
                              >
                                Cancelar
                              </button>
                            ) : null}
                            <button
                              className="danger"
                              type="button"
                              disabled={role !== "administrador"}
                              title={role !== "administrador" ? "Sólo administradores pueden eliminar" : undefined}
                              onClick={() => void handleDelete(remate)}
                            >
                              Eliminar
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          ) : null}

          {!editingRemate && tab === "contenido" ? <>
            <p role="status">La edición de contenido general está pendiente de conexión. Por ahora esta sección es de sólo lectura.</p>
            <fieldset disabled><SiteContentEditor /></fieldset>
          </> : null}

          {!editingRemate && storageEnabled ? (
            <div className="admin-demo-reset">
              <p>
                Los cambios se guardan en este navegador. Esta persistencia es apropiada para la
                demostración, no para producción.
              </p>
              <button
                className="admin-danger-link"
                type="button"
                onClick={() => setPendingConfirmation({ kind: "reset" })}
              >
                Restablecer datos de demostración
              </button>
            </div>
          ) : null}
        </div>
      </div>
      {confirmationCopy ? (
        <ConfirmationModal
          title={confirmationCopy.title}
          description={confirmationCopy.description}
          confirmLabel={confirmationCopy.confirmLabel}
          isConfirming={isConfirming}
          onCancel={() => setPendingConfirmation(null)}
          onConfirm={() => void confirmPendingAction()}
        />
      ) : null}
    </main>
  );
}
