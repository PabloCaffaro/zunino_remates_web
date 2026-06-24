# Zunino Remates Web

Sitio web para promocionar remates presenciales, publicar catálogos PDF y
administrar el contenido de la empresa.

El proyecto incluye una web pública, páginas de detalle por remate y un panel
administrativo. Actualmente el panel utiliza autenticación y persistencia local
de demostración. El esquema de producción para Supabase ya está diseñado, pero
su conexión con React continúa pendiente.

## Tecnologías

- React 18 y TypeScript.
- Vite.
- React Router.
- Vitest y React Testing Library.
- Supabase, planificado para Auth, PostgreSQL y Storage.

## Requisitos

- Node.js 24 LTS.
- npm 11 o compatible.

## Inicio rápido

```powershell
npm install
npm run dev
```

Vite mostrará la dirección local, normalmente `http://localhost:5173`.

## Comandos

```powershell
npm run dev        # Servidor de desarrollo
npm test           # Suite automática
npm run test:watch # Pruebas en modo continuo
npm run lint       # Revisión estática
npm run build      # Compilación de producción
npm run preview    # Vista previa del build
```

Antes de integrar o publicar un cambio deben pasar:

```powershell
npm test
npm run lint
npm run build
```

## Rutas

- `/`: página principal.
- `/remates/:slug`: detalle de un remate publicado.
- `/admin12345`: panel administrativo de demostración.

La ruta administrativa no es una medida de seguridad. Antes de producción, el
acceso local debe reemplazarse por Supabase Auth y políticas RLS.

## Estructura

```text
src/
├── admin/       # Configuración y reglas del panel
├── components/  # Componentes compartidos y secciones
├── context/     # Estado y persistencia actual
├── data/        # Contenido inicial y selectores
├── pages/       # Páginas y rutas
├── test/        # Configuración y datos para pruebas
└── types/       # Tipos TypeScript

docs/            # Documentación de mantenimiento
public/          # Archivos estáticos de demostración
supabase/        # Migraciones, modelo y diagrama de base de datos
```

## Estado del proyecto

Implementado:

- Diseño responsive y accesibilidad básica.
- Remates, catálogos y páginas de detalle.
- Formulario de contacto mediante FormSubmit.
- Panel administrativo de demostración.
- Validación previa a la publicación.
- Pruebas unitarias y de integración.
- Esquema, RLS y Storage diseñados para Supabase.

Pendiente antes de producción:

- Aplicar la migración y conectar React con Supabase.
- Sustituir login y `localStorage` de demostración.
- Migrar PDFs, imágenes y datos reales.
- Implementar el formulario seguro con una Edge Function.
- Configurar hosting, dominio, variables, rutas SPA y headers.
- Completar contenido, SEO y pruebas finales.

## Documentación

- [Arquitectura](docs/architecture.md)
- [Configuración local](docs/local-setup.md)
- [Guía del panel](docs/admin-guide.md)
- [Despliegue](docs/deployment.md)
- [Seguridad](docs/security.md)
- [Supabase](supabase/README.md)
- [Modelo de datos](supabase/SCHEMA.md)
- [Diagrama editable](supabase/Zunino-Remates-ER.drawio)

