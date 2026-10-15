/** Bindings and secrets the comments feature reads from the Worker env. */
export interface SageCommentsEnv {
  /** D1 database with the astro-sage migrations applied. */
  DB: D1Database;
  /** ≥ 32 random bytes; `openssl rand -base64 32`. */
  BETTER_AUTH_SECRET: string;
  GITHUB_CLIENT_ID?: string;
  GITHUB_CLIENT_SECRET?: string;
  X_CLIENT_ID?: string;
  X_CLIENT_SECRET?: string;
}

/** Reads the Worker env. Works under `astro dev` (platform proxy) and in production. */
export async function getEnv(): Promise<SageCommentsEnv> {
  const { env } = await import("cloudflare:workers");
  if (!env.DB) {
    throw new Error(
      "astro-sage comments: no D1 binding named `DB`. Add one to wrangler.jsonc (see README → Comments)."
    );
  }
  return env as unknown as SageCommentsEnv;
}
