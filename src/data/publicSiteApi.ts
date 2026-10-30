import type { EditableSiteContent, Remate } from "../types/site";

type PublicContentResponse = {
  data: EditableSiteContent;
};

type PublicRemateResponse = {
  data: Remate[];
};

const getJson = async <Data>(url: string, signal: AbortSignal): Promise<Data> => {
  const response = await fetch(url, {
    signal,
    cache: "no-store",
    headers: { Accept: "application/json" },
  });

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
    content: contentResponse.data,
    remates: rematesResponse.data,
  };
};
