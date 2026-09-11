# Zunino Remates Web

Sitio web para promocionar remates presenciales, presentar sus catálogos y
administrar el contenido de la empresa.

El proyecto incluye una web pública, páginas de detalle por remate y un panel
administrativo. En la rama `desarrollo`, la web pública y el panel utilizan una
API del mismo origen conectada con Supabase Auth, PostgreSQL y Storage privado.
Los datos públicos y administrativos se obtienen mediante la API conectada a Supabase.

## Tecnologías

- React 18 y TypeScript.
- Vite.
- React Router.
- Vitest y React Testing Library.
- Supabase para Auth, PostgreSQL y Storage.

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
- `/admin12345`: panel administrativo protegido por sesión de servidor.

La ruta administrativa no es una medida de seguridad: el acceso se protege con
Supabase Auth, cookie cifrada `HttpOnly`, API del mismo origen y políticas RLS.

## Estructura

```text
src/
├── admin/       # Configuración y reglas del panel
├── components/  # Componentes compartidos y secciones
├── context/     # Estado remoto y proveedores de datos
├── data/        # Clientes de API, formato y selectores
├── pages/       # Páginas y rutas
├── test/        # Configuración y datos para pruebas
└── types/       # Tipos TypeScript

docs/            # Documentación de mantenimiento
public/          # Archivos estáticos del sitio
supabase/        # Migraciones, modelo y diagrama de base de datos
```

## Estado del proyecto

Implementado:

- Diseño responsive y accesibilidad básica.
- Remates, catálogos y páginas de detalle.
- Formulario de contacto mediante FormSubmit.
- Panel administrativo conectado a Supabase en `desarrollo`.
- Validación previa a la publicación.
- Pruebas unitarias y de integración.
- Lectura pública, CRUD administrativo, contenido general e imágenes mediante Supabase.

Pendiente antes de producción:

- Crear y validar un proyecto Supabase separado para producción.
- Migrar y revisar los datos reales.
- Implementar el formulario seguro mediante la API de Vercel.
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
