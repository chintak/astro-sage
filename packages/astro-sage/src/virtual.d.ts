declare module "virtual:astro-sage/user-config" {
  const config: import("./types/config").SageConfig;
  export default config;
}

declare module "cloudflare:workers" {
  export const env: Record<string, unknown>;
}
