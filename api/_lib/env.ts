export type ServerEnvironment = {
  supabaseUrl: string;
  supabasePublishableKey: string;
};

type RuntimeGlobal = typeof globalThis & {
  process?: {
    env?: Record<string, string | undefined>;
  };
};

export class ServerConfigurationError extends Error {
  constructor() {
    super("Falta configuración obligatoria del servidor.");
    this.name = "ServerConfigurationError";
  }
}

const readEnvironmentVariable = (name: string): string => {
  const value = (globalThis as RuntimeGlobal).process?.env?.[name]?.trim();

  if (!value) {
    throw new ServerConfigurationError();
  }

  return value;
};

export const getServerEnvironment = (): ServerEnvironment => ({
  supabaseUrl: readEnvironmentVariable("SUPABASE_URL"),
  supabasePublishableKey: readEnvironmentVariable(
    "SUPABASE_PUBLISHABLE_KEY",
  ),
});
