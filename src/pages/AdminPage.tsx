import {
  useEffect,
  useMemo,
  useState,
  type ChangeEvent,
  type FormEvent,
} from "react";
import {
  ADMIN_SESSION_KEY,
  DEMO_ADMIN_CREDENTIALS,
} from "../admin/adminConfig";
import {
  validateRemateForPublish,
  type PublishValidationErrors,
} from "../admin/adminValidation";
import { useSiteData } from "../context/siteDataContextValue";
import type {
  AdminRemate,
  EditableSiteContent,
  HighlightedLot,
  RemateEstadoAdmin,
} from "../types/site";

type AdminTab = "resumen" | "remates" | "contenido";

const statusLabels: Record<RemateEstadoAdmin, string> = {
  borrador: "Borrador",
  en_revision: "En revisión",
  publicado: "Publicado",
  finalizado: "Finalizado",
  cancelado: "Cancelado",
};

function slugify(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function createEmptyRemate(): AdminRemate {
  const now = new Date().toISOString();
  const id = `remate-${Date.now()}`;

  return {
    id,
    slug: "",
    fecha: "",
    fechaCompleta: "",
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
    catalogoPdf: {
      url: "",
      fileName: "",
      label: "Descargar catálogo PDF",
    },
    estadoAdmin: "borrador",
    catalogoPublicacionEstado: "proximamente",
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

function AdminLogin({ onLogin }: { onLogin: () => void }) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (
      username === DEMO_ADMIN_CREDENTIALS.username &&
      password === DEMO_ADMIN_CREDENTIALS.password
    ) {
      window.sessionStorage.setItem(ADMIN_SESSION_KEY, "active");
      onLogin();
      return;
    }

    setError("Usuario o contraseña incorrectos.");
  };

  return (
    <main id="contenido-principal" className="admin-login-page">
      <section className="admin-login-card">
        <p className="eyebrow">Administración</p>
        <h1>Ingresar al panel</h1>
        <p>Gestioná remates y contenido visible de Zunino Remates.</p>
        <form onSubmit={handleSubmit}>
          <label>
            Usuario
            <input
              value={username}
              onChange={(event) => setUsername(event.target.value)}
              autoComplete="username"
              required
            />
          </label>
          <label>
            Contraseña
            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              autoComplete="current-password"
              required
            />
          </label>
          {error ? <p className="form-status form-status-error">{error}</p> : null}
          <button className="btn" type="submit">
            Ingresar
          </button>
        </form>
        <p className="admin-security-note">
          Acceso de demostración. Antes de publicar se reemplazará por autenticación segura.
        </p>
      </section>
    </main>
  );
}

type RemateEditorProps = {
  initialRemate: AdminRemate;
  onSave: (remate: AdminRemate) => void;
  onCancel: () => void;
};

function RemateEditor({ initialRemate, onSave, onCancel }: RemateEditorProps) {
  const [form, setForm] = useState(initialRemate);
  const [requisitosText, setRequisitosText] = useState(initialRemate.requisitos.join("\n"));
  const [condicionesText, setCondicionesText] = useState(initialRemate.condiciones.join("\n"));
  const [errors, setErrors] = useState<PublishValidationErrors>({});
  const [notice, setNotice] = useState("");

  useEffect(() => {
    setForm(initialRemate);
    setRequisitosText(initialRemate.requisitos.join("\n"));
    setCondicionesText(initialRemate.condiciones.join("\n"));
    setErrors({});
    setNotice("");
  }, [initialRemate]);

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
    slug: slugify(form.slug || form.titulo),
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

  const saveWithStatus = (status: RemateEstadoAdmin) => {
    const nextRemate = normalizedForm(status);

    if (status === "publicado") {
      const publishErrors = validateRemateForPublish(nextRemate);
      setErrors(publishErrors);

      if (Object.keys(publishErrors).length > 0) {
        setNotice("El remate no puede publicarse hasta completar todos los campos obligatorios.");
        return;
      }
    }

    setErrors({});
    onSave(nextRemate);
  };

  const addHighlightedLot = () => {
    const lot: HighlightedLot = {
      id: `lote-${Date.now()}`,
      nombre: "",
      imagen: { url: "", alt: "" },
    };

    setForm((current) => ({ ...current, destacados: [...current.destacados, lot] }));
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
  };

  const handlePdfUpload = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const url = await readFileAsDataUrl(file, 1_500_000);
      setForm((current) => ({
        ...current,
        catalogoPdf: {
          ...current.catalogoPdf,
          url,
          fileName: file.name,
        },
      }));
      setErrors((current) => {
        const next = { ...current };
        delete next.catalogoPdfUrl;
        delete next.catalogoPdfFileName;
        return next;
      });
    } catch (uploadError) {
      setNotice(uploadError instanceof Error ? uploadError.message : "No se pudo cargar el PDF.");
    }
  };

  const handleLotImageUpload = async (
    lotId: string,
    event: ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const url = await readFileAsDataUrl(file, 700_000);
      updateHighlightedLot(lotId, (lot) => ({
        ...lot,
        imagen: {
          url,
          alt: lot.imagen.alt || `Imagen de ${lot.nombre || "lote destacado"}`,
        },
      }));
    } catch (uploadError) {
      setNotice(uploadError instanceof Error ? uploadError.message : "No se pudo cargar la imagen.");
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

      {notice ? <p className="form-status form-status-error">{notice}</p> : null}

      <div className="admin-form-grid">
        <label>
          Título *
          <input
            value={form.titulo}
            onChange={(event) => {
              const title = event.target.value;
              setForm((current) => ({
                ...current,
                titulo: title,
                slug: current.slug ? current.slug : slugify(title),
              }));
            }}
            aria-invalid={Boolean(errors.titulo)}
          />
          {errors.titulo ? <span className="admin-field-error">{errors.titulo}</span> : null}
        </label>
        <label>
          Ruta o slug *
          <input
            value={form.slug}
            onChange={(event) => updateTextField("slug", slugify(event.target.value))}
            placeholder="maquinaria-y-herramientas"
            aria-invalid={Boolean(errors.slug)}
          />
          {errors.slug ? <span className="admin-field-error">{errors.slug}</span> : null}
        </label>
        <label>
          Fecha resumida *
          <input
            value={form.fecha}
            onChange={(event) => updateTextField("fecha", event.target.value)}
            placeholder="22 MAR · 17:00"
            aria-invalid={Boolean(errors.fecha)}
          />
          {errors.fecha ? <span className="admin-field-error">{errors.fecha}</span> : null}
        </label>
        <label>
          Fecha y hora completas *
          <input
            value={form.fechaCompleta}
            onChange={(event) => updateTextField("fechaCompleta", event.target.value)}
            placeholder="Viernes 22 de marzo · 17:00"
            aria-invalid={Boolean(errors.fechaCompleta)}
          />
          {errors.fechaCompleta ? (
            <span className="admin-field-error">{errors.fechaCompleta}</span>
          ) : null}
        </label>
        <label className="admin-span-two">
          Subtítulo *
          <input
            value={form.subtitulo}
            onChange={(event) => updateTextField("subtitulo", event.target.value)}
            aria-invalid={Boolean(errors.subtitulo)}
          />
          {errors.subtitulo ? <span className="admin-field-error">{errors.subtitulo}</span> : null}
        </label>
        <label>
          Lugar resumido *
          <input
            value={form.lugar}
            onChange={(event) => updateTextField("lugar", event.target.value)}
            aria-invalid={Boolean(errors.lugar)}
          />
          {errors.lugar ? <span className="admin-field-error">{errors.lugar}</span> : null}
        </label>
        <label>
          Estado visible del catálogo *
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
          Ubicación detallada *
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
          Descripción breve *
          <textarea
            rows={2}
            value={form.detalle}
            onChange={(event) => updateTextField("detalle", event.target.value)}
            aria-invalid={Boolean(errors.detalle)}
          />
          {errors.detalle ? <span className="admin-field-error">{errors.detalle}</span> : null}
        </label>
        <label className="admin-span-two">
          Descripción completa *
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
          Texto sobre el catálogo *
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

      <div className="admin-subsection">
        <h3>Catálogo PDF *</h3>
        <p>
          Podés ingresar una ruta o URL. Para esta demostración también se admite un PDF de hasta 1,5 MB.
        </p>
        <div className="admin-form-grid">
          <label>
            URL o ruta del PDF
            <input
              value={form.catalogoPdf.url}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  catalogoPdf: { ...current.catalogoPdf, url: event.target.value },
                }))
              }
              aria-invalid={Boolean(errors.catalogoPdfUrl)}
            />
            {errors.catalogoPdfUrl ? (
              <span className="admin-field-error">{errors.catalogoPdfUrl}</span>
            ) : null}
          </label>
          <label>
            Nombre del archivo
            <input
              value={form.catalogoPdf.fileName}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  catalogoPdf: { ...current.catalogoPdf, fileName: event.target.value },
                }))
              }
              aria-invalid={Boolean(errors.catalogoPdfFileName)}
            />
            {errors.catalogoPdfFileName ? (
              <span className="admin-field-error">{errors.catalogoPdfFileName}</span>
            ) : null}
          </label>
          <label className="admin-span-two">
            Cargar archivo PDF
            <input type="file" accept="application/pdf" onChange={handlePdfUpload} />
          </label>
        </div>
      </div>

      <div className="admin-form-grid admin-subsection">
        <label>
          Requisitos para participar *
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
          Condiciones del remate *
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

      <div className="admin-subsection">
        <div className="admin-subsection-heading">
          <div>
            <h3>Lotes destacados</h3>
            <p>Son opcionales. Podés agregar la cantidad que necesites.</p>
          </div>
          <button className="btn btn-outline btn-small" type="button" onClick={addHighlightedLot}>
            Agregar lote
          </button>
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
              <label>
                Nombre
                <input
                  value={lot.nombre}
                  onChange={(event) =>
                    updateHighlightedLot(lot.id, (current) => ({
                      ...current,
                      nombre: event.target.value,
                    }))
                  }
                />
              </label>
              <label>
                URL de imagen
                <input
                  value={lot.imagen.url}
                  onChange={(event) =>
                    updateHighlightedLot(lot.id, (current) => ({
                      ...current,
                      imagen: { ...current.imagen, url: event.target.value },
                    }))
                  }
                />
              </label>
              <label>
                Texto alternativo
                <input
                  value={lot.imagen.alt}
                  onChange={(event) =>
                    updateHighlightedLot(lot.id, (current) => ({
                      ...current,
                      imagen: { ...current.imagen, alt: event.target.value },
                    }))
                  }
                />
              </label>
              <label>
                Cargar imagen
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  onChange={(event) => handleLotImageUpload(lot.id, event)}
                />
              </label>
            </article>
          ))}
          {form.destacados.length === 0 ? (
            <p className="admin-empty-state">Todavía no hay lotes destacados.</p>
          ) : null}
        </div>
      </div>

      <div className="admin-editor-actions">
        <button className="btn btn-ghost" type="button" onClick={() => saveWithStatus("borrador")}>
          Guardar borrador
        </button>
        <button className="btn btn-outline" type="button" onClick={() => saveWithStatus("en_revision")}>
          Enviar a revisión
        </button>
        <button className="btn" type="button" onClick={() => saveWithStatus("publicado")}>
          Publicar remate
        </button>
      </div>
    </section>
  );
}

function SiteContentEditor() {
  const { content, saveContent } = useSiteData();
  const [draft, setDraft] = useState<EditableSiteContent>(content);
  const [saved, setSaved] = useState(false);

  useEffect(() => setDraft(content), [content]);

  const save = () => {
    saveContent(draft);
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
        <button className="btn" type="button" onClick={save}>
          Guardar cambios
        </button>
      </div>
      {saved ? <p className="form-status form-status-success">Cambios guardados.</p> : null}

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
        <div className="admin-lots-list">
          {draft.faqs.map((faq) => (
            <article className="admin-lot-card" key={faq.id}>
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

export function AdminPage() {
  const {
    remates,
    saveRemate,
    deleteRemate,
    changeRemateStatus,
    resetDemoData,
  } = useSiteData();
  const [authenticated, setAuthenticated] = useState(
    () => window.sessionStorage.getItem(ADMIN_SESSION_KEY) === "active"
  );
  const [tab, setTab] = useState<AdminTab>("resumen");
  const [editingRemate, setEditingRemate] = useState<AdminRemate | null>(null);

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
          finalizado: 0,
          cancelado: 0,
        } as Record<RemateEstadoAdmin, number>
      ),
    [remates]
  );

  if (!authenticated) {
    return <AdminLogin onLogin={() => setAuthenticated(true)} />;
  }

  const handleSaveRemate = (remate: AdminRemate) => {
    saveRemate(remate);
    setEditingRemate(null);
    setTab("remates");
  };

  const handleDelete = (remate: AdminRemate) => {
    const confirmed = window.confirm(
      `¿Seguro que querés eliminar "${remate.titulo || "este remate"}"? Esta acción no se puede deshacer.`
    );
    if (confirmed) deleteRemate(remate.id);
  };

  const logout = () => {
    window.sessionStorage.removeItem(ADMIN_SESSION_KEY);
    setAuthenticated(false);
  };

  return (
    <main id="contenido-principal" className="admin-page">
      <header className="admin-topbar">
        <div>
          <p className="eyebrow">Zunino Remates</p>
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

      <div className="admin-layout">
        <nav className="admin-sidebar" aria-label="Navegación administrativa">
          <button
            className={tab === "resumen" ? "active" : ""}
            type="button"
            onClick={() => {
              setTab("resumen");
              setEditingRemate(null);
            }}
          >
            Resumen
          </button>
          <button
            className={tab === "remates" ? "active" : ""}
            type="button"
            onClick={() => {
              setTab("remates");
              setEditingRemate(null);
            }}
          >
            Remates
          </button>
          <button
            className={tab === "contenido" ? "active" : ""}
            type="button"
            onClick={() => {
              setTab("contenido");
              setEditingRemate(null);
            }}
          >
            Contenido general
          </button>
        </nav>

        <div className="admin-content">
          {editingRemate ? (
            <RemateEditor
              initialRemate={editingRemate}
              onSave={handleSaveRemate}
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
                {(Object.keys(statusLabels) as RemateEstadoAdmin[]).map((status) => (
                  <article className="admin-stat-card" key={status}>
                    <span>{statusLabels[status]}</span>
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
                        <td>
                          <strong>{remate.titulo || "Sin título"}</strong>
                          <span>{remate.lugar || "Lugar pendiente"}</span>
                        </td>
                        <td>{remate.fecha || "Pendiente"}</td>
                        <td>
                          <span className={`admin-status admin-status-${remate.estadoAdmin}`}>
                            {statusLabels[remate.estadoAdmin]}
                          </span>
                        </td>
                        <td>
                          <div className="admin-row-actions">
                            <button type="button" onClick={() => setEditingRemate(remate)}>
                              Editar
                            </button>
                            {remate.estadoAdmin === "publicado" ? (
                              <button
                                type="button"
                                onClick={() => changeRemateStatus(remate.id, "finalizado")}
                              >
                                Finalizar
                              </button>
                            ) : null}
                            <button
                              className="danger"
                              type="button"
                              onClick={() => handleDelete(remate)}
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

          {!editingRemate && tab === "contenido" ? <SiteContentEditor /> : null}

          {!editingRemate ? (
            <div className="admin-demo-reset">
              <p>
                Los cambios se guardan en este navegador. Esta persistencia es apropiada para la
                demostración, no para producción.
              </p>
              <button
                className="admin-danger-link"
                type="button"
                onClick={() => {
                  if (window.confirm("¿Restablecer todos los datos de demostración?")) {
                    resetDemoData();
                  }
                }}
              >
                Restablecer datos de demostración
              </button>
            </div>
          ) : null}
        </div>
      </div>
    </main>
  );
}
