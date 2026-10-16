import type { APIRoute } from "astro";
import { renderOgImage } from "@sage/utils/ogImage";
import config from "@sage/config";

export const GET: APIRoute = () =>
  renderOgImage({
    title: config.site.title,
    subtitle: config.site.description,
    footer: new URL(config.site.url).hostname,
  });
