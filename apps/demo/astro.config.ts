import { defineConfig } from "astro/config";
import cloudflare from "@astrojs/cloudflare";
import astroSage from "astro-sage";
import sageConfig from "./sage.config";

export default defineConfig({
  site: sageConfig.site.url,
  // Pages are prerendered; only the comments/auth API runs on the Worker.
  // Prerender in Node so build-time tools (sharp, Satori) work; optimise images at build.
  adapter: cloudflare({
    prerenderEnvironment: "node",
    imageService: "compile",
  }),
  integrations: [astroSage(sageConfig)],
});
