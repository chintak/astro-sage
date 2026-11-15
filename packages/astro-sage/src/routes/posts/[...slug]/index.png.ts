import type { APIRoute } from "astro";
import { type CollectionEntry, getCollection } from "astro:content";
import { renderOgImage } from "@sage/utils/ogImage";
import { getPostSlug } from "@sage/utils/getPostPaths";
import { draftFilter } from "@sage/utils/postFilter";
import config from "@sage/config";

export async function getStaticPaths() {
  if (!config.features.dynamicOgImage) {
    return [];
  }

  const posts = await getCollection("posts").then(p =>
    p.filter(post => draftFilter(post) && !post.data.ogImage)
  );

  return posts.map(post => ({
    params: { slug: getPostSlug(post.id, post.filePath) },
    props: post,
  }));
}

export const GET: APIRoute = ({ props }) => {
  const { data } = props as CollectionEntry<"posts">;
  return renderOgImage({
    eyebrow: data.series ?? config.site.title,
    title: data.title,
    footer: `${data.author} · ${new URL(config.site.url).hostname}`,
  });
};
