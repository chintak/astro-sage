import { defineConfig } from "astro/config";
import cloudflare from "@astrojs/cloudflare";
import astroSage from "astro-sage";
import sageConfig from "./sage.config";

export default defineConfig({
  site: sageConfig.site.url,
  // Pages are prerendered; only the comments/auth API runs on the Worker.
  adapter: cloudflare(),
  integrations: [astroSage(sageConfig)],
});
