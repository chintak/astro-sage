declare module "virtual:astro-sage/user-config" {
  const config: import("./types/config").SageConfig;
  export default config;
  /** Top-level file names in the site's public/ directory. */
  export const publicFiles: string[];
}

declare module "cloudflare:workers" {
  export const env: Record<string, unknown>;
}
