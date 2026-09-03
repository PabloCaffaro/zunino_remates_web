import { createClient } from "@supabase/supabase-js";
import { getServerEnvironment } from "./env.js";

export const createServerSupabaseClient = () => {
  const environment = getServerEnvironment();

  return createClient(
    environment.supabaseUrl,
    environment.supabasePublishableKey,
    {
      auth: {
        autoRefreshToken: false,
        detectSessionInUrl: false,
        persistSession: false,
      },
    },
  );
};

export const checkSupabaseConnection = async (): Promise<void> => {
  const supabase = createServerSupabaseClient();

  // Consulta una fila pública mínima para verificar red, clave, Data API y RLS.
  const { error } = await supabase
    .from("configuracion_sitio")
    .select("id")
    .eq("id", "principal")
    .limit(1);

  if (error) {
    throw new Error("Supabase no respondió correctamente.");
  }
};
