import { defineSageCollections } from "astro-sage/content";
import config from "../sage.config";

export const collections = defineSageCollections({
  author: config.site.author,
});
