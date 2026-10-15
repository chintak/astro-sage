import { defineConfig } from "astro/config";
import astroSage from "astro-sage";
import sageConfig from "./sage.config";

export default defineConfig({
  site: sageConfig.site.url,
  integrations: [astroSage(sageConfig)],
});
