declare module "virtual:astro-sage/user-config" {
  const config: import("./types/config").SageConfig;
  export default config;
  /** Top-level file names in the site's public/ directory. */
  export const publicFiles: string[];
  /**
   * Absolute path of this package's src/. Bundled build code resolves the
   * theme's own dependencies from here: its import.meta.url points into
   * dist/, where strict package managers (pnpm) don't expose them.
   */
  export const packageDir: string;
}
