import type { SiteContent } from "../types/site";

export const siteContent: SiteContent = {
  remates: [
    {
      id: "maq-herr-2026-03-22",
      slug: "maquinaria-y-herramientas",
      fechaHora: "2026-03-22T20:00:00.000Z",
      fechaPorConfirmar: false,
      titulo: "Maquinaria y herramientas",
      subtitulo: "Remate presencial de equipamiento industrial",
      lugar: "Salón Central · Ruta 8 Km 45",
      ubicacionDetalle: "Salón Central, Ruta 8 Km 45, con inspección previa coordinada.",
      detalle: "Equipos industriales, compresores, tornos y lotes de taller.",
      enlace: "Catálogo disponible",
      catalogoEstado: "Catálogo abierto con fichas técnicas, condiciones y retiro coordinado.",
      descripcionLarga:
        "Una jornada pensada para compradores que buscan equipamiento industrial, herramientas de taller y lotes de uso inmediato. El evento contará con inspección previa, apoyo en sala y condiciones visibles desde el catálogo.",
      destacados: [
        {
          id: "maq-lote-01",
          nombre: "Compresor industrial de alto caudal",
          imagen: {
            url: "/media/remates/maquinaria-lote-01.svg",
            alt: "Compresor industrial destacado del remate de maquinaria y herramientas",
          },
        },
        {
          id: "maq-lote-02",
          nombre: "Torno con banco y accesorios",
          imagen: {
            url: "/media/remates/maquinaria-lote-02.svg",
            alt: "Torno con banco y accesorios destacado del remate de maquinaria y herramientas",
          },
        },
        {
          id: "maq-lote-03",
          nombre: "Lote completo de herramientas pesadas",
          imagen: {
            url: "/media/remates/maquinaria-principal.svg",
            alt: "Lote completo de herramientas pesadas destacado del remate de maquinaria y herramientas",
          },
        },
      ],
      requisitos: [
        "Documento de identidad vigente al registrarte",
        "Datos de contacto actualizados para confirmar adjudicación",
        "Revisión previa del catálogo y condiciones de retiro",
      ],
      condiciones: [
        "Remate presencial con incrementos informados en sala",
        "Pago dentro de los plazos comunicados el día del evento",
        "Retiro coordinado según cronograma del organizador",
      ],
    },
    {
      id: "veh-util-2026-04-05",
      slug: "vehiculos-utilitarios",
      fechaHora: "2026-04-05T22:00:00.000Z",
      fechaPorConfirmar: false,
      titulo: "Vehículos utilitarios",
      subtitulo: "Flota urbana y unidades de trabajo",
      lugar: "Predio Zunino · Montevideo",
      ubicacionDetalle: "Predio Zunino, Montevideo, con agenda para ver unidades antes del remate.",
      detalle: "Pickups, furgones y flota urbana con inspección previa.",
      enlace: "Catálogo disponible",
      catalogoEstado: "Catálogo de unidades con publicación escalonada y notas de inspección.",
      descripcionLarga:
        "Este remate reúne vehículos utilitarios seleccionados para trabajo urbano, logística y uso comercial. Cada unidad se presenta con datos base, estado general y su instancia de inspección previa.",
      destacados: [
        {
          id: "veh-lote-01",
          nombre: "Pickup mediana cabina doble",
          imagen: {
            url: "/media/remates/vehiculos-lote-01.svg",
            alt: "Pickup mediana destacada del remate de vehículos utilitarios",
          },
        },
        {
          id: "veh-lote-02",
          nombre: "Furgón urbano de reparto",
          imagen: {
            url: "/media/remates/vehiculos-lote-02.svg",
            alt: "Furgón urbano destacado del remate de vehículos utilitarios",
          },
        },
        {
          id: "veh-lote-03",
          nombre: "Unidad comercial lista para trabajo",
          imagen: {
            url: "/media/remates/vehiculos-principal.svg",
            alt: "Unidad comercial destacada del remate de vehículos utilitarios",
          },
        },
      ],
      requisitos: [
        "Registro presencial antes del inicio del evento",
        "Verificación de identidad y datos de facturación",
        "Lectura previa de condiciones por unidad",
      ],
      condiciones: [
        "Las unidades se rematan según orden de salida publicado",
        "La información visual no reemplaza inspección presencial",
        "Entrega sujeta a confirmación de pago y documentación",
      ],
    },
    {
      id: "agro-campo-2026-04-19",
      slug: "agro-y-campo",
      fechaHora: "2026-04-19T19:30:00.000Z",
      fechaPorConfirmar: false,
      titulo: "Agro y campo",
      subtitulo: "Implementos rurales y herramientas de campo",
      lugar: "Predio Rural · Canelones",
      ubicacionDetalle: "Predio Rural en Canelones, con recepción de público desde media tarde.",
      detalle: "Implementos agrícolas, trailers y herramientas de campo.",
      enlace: "Catálogo disponible",
      catalogoEstado: "Listado preliminar publicado con ampliación prevista en la semana del remate.",
      descripcionLarga:
        "Una propuesta orientada a productores, contratistas y compradores del rubro rural. El remate combina implementos agrícolas, accesorios y herramientas de uso intensivo para campo y mantenimiento.",
      destacados: [
        {
          id: "agro-lote-01",
          nombre: "Implemento de arrastre rural",
          imagen: {
            url: "/media/remates/agro-lote-01.svg",
            alt: "Implemento de arrastre destacado del remate agro y campo",
          },
        },
        {
          id: "agro-lote-02",
          nombre: "Trailer auxiliar para campo",
          imagen: {
            url: "/media/remates/agro-lote-02.svg",
            alt: "Trailer auxiliar destacado del remate agro y campo",
          },
        },
        {
          id: "agro-lote-03",
          nombre: "Lote mixto de herramientas rurales",
          imagen: {
            url: "/media/remates/agro-principal.svg",
            alt: "Lote mixto de herramientas rurales destacado del remate agro y campo",
          },
        },
      ],
      requisitos: [
        "Acreditación personal al ingreso al predio",
        "Consulta previa del listado de lotes disponibles",
        "Coordinación posterior para retiro de implementos grandes",
      ],
      condiciones: [
        "Remate sujeto a disponibilidad final de lotes publicados",
        "Los lotes se entregan en el estado informado al momento del evento",
        "El retiro de equipos grandes se agenda con anticipación",
      ],
    },
  ],
  catalogos: [
    {
      id: "cat-maquinaria",
      remateId: "maq-herr-2026-03-22",
      titulo: "Maquinaria y herramientas",
      detalle: "Consultá las fichas técnicas, condiciones y ubicación informada para cada lote.",
      estado: "disponible",
    },
    {
      id: "cat-vehiculos",
      remateId: "veh-util-2026-04-05",
      titulo: "Vehículos utilitarios",
      detalle: "Catálogo disponible con unidades, observaciones generales y condiciones por lote.",
      estado: "disponible",
    },
    {
      id: "cat-agro",
      remateId: "agro-campo-2026-04-19",
      titulo: "Agro y campo",
      detalle: "Listado preliminar disponible con ubicación, condiciones y notas del organizador.",
      estado: "preliminar",
    },
  ],
  pasos: [
    {
      id: "paso-01",
      numero: "01",
      titulo: "Revisá el catálogo",
      detalle: "Verificá lotes, condiciones y fechas. Podés coordinar inspecciones.",
    },
    {
      id: "paso-02",
      numero: "02",
      titulo: "Registrate en sala",
      detalle: "Presentá tu documentación y recibí el número de oferente.",
    },
    {
      id: "paso-03",
      numero: "03",
      titulo: "Participá del remate",
      detalle: "Ofertá en vivo con reglas claras e incrementos informados.",
    },
    {
      id: "paso-04",
      numero: "04",
      titulo: "Pagos y retiro",
      detalle: "Confirmá la forma de pago y coordiná el retiro con el equipo.",
    },
  ],
  faqs: [
    {
      id: "faq-documentacion",
      pregunta: "¿Qué documentación necesito para participar?",
      respuesta: "Documento de identidad vigente y datos de contacto. Empresas: datos fiscales.",
    },
    {
      id: "faq-inspeccion",
      pregunta: "¿Puedo inspeccionar los lotes antes del remate?",
      respuesta: "Sí. Coordinamos visitas programadas para que revises cada lote.",
    },
    {
      id: "faq-pago",
      pregunta: "¿Qué formas de pago aceptan?",
      respuesta: "Transferencia bancaria, efectivo dentro de límites legales y cheques certificados.",
    },
    {
      id: "faq-registro-previo",
      pregunta: "¿Es necesario registrarse antes del remate?",
      respuesta:
        "No hay reserva previa de lugar. El registro se realiza de forma presencial en sala antes de participar, presentando la documentación requerida.",
    },
  ],
  contacto: {
    email: "contacto@zuninoremates.com",
    telefono: "+598 99 123 456",
    direccion: "Av. 18 de Julio 1234, Centro, Montevideo",
    horario: "Lun a Vie · 9:00 a 18:00",
    formRecipientEmail: "pablocaffaro2000@gmail.com",
    mapEmbedUrl:
      "https://www.google.com/maps?q=Av.%2018%20de%20Julio%201234,%20Montevideo&z=15&output=embed",
  },
};
