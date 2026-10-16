import { defineConfig } from "astro/config";
import astroSage from "astro-sage";
import sageConfig from "./sage.config";

// A fully static site: `astro build` writes plain files to dist/ for any host.
export default defineConfig({
  site: sageConfig.site.url,
  integrations: [astroSage(sageConfig)],
});
