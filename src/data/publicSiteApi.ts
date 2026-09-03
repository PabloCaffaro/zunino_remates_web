import type { AdminRemate, EditableSiteContent, Remate } from "../types/site";
import { siteContent } from "./siteContent";

type PublicContentResponse = {
  data: Omit<EditableSiteContent, "contacto"> & {
    contacto: Omit<EditableSiteContent["contacto"], "formRecipientEmail">;
  };
};

type PublicRemateResponse = {
  data: Array<Remate & Pick<AdminRemate, "catalogoPublicacionEstado">>;
};

const getJson = async <Data>(url: string, signal: AbortSignal): Promise<Data> => {
  const response = await fetch(url, { signal, headers: { Accept: "application/json" } });

  if (!response.ok) {
    throw new Error("La API pública no respondió correctamente.");
  }

  return response.json() as Promise<Data>;
};

export const fetchPublicSiteData = async (signal: AbortSignal) => {
  const [contentResponse, rematesResponse] = await Promise.all([
    getJson<PublicContentResponse>("/api/v1/public/content", signal),
    getJson<PublicRemateResponse>("/api/v1/public/remates", signal),
  ]);

  return {
    content: {
      ...contentResponse.data,
      contacto: {
        ...contentResponse.data.contacto,
        // El destinatario actual se retirará del navegador al crear el endpoint de contacto.
        formRecipientEmail: siteContent.contacto.formRecipientEmail,
      },
    },
    remates: rematesResponse.data,
  };
};
