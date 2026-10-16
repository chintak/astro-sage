import rss from "@astrojs/rss";
import { getCollection } from "astro:content";
import { getSortedPosts } from "@sage/utils/getSortedPosts";
import { getPostUrl } from "@sage/utils/getPostPaths";
import { feedContent } from "@sage/utils/feedContent";
import config from "@sage/config";

/**
 * RSS 2.0 feed of published posts (drafts and scheduled posts excluded), with
 * each post's full HTML so it can be read in a feed reader.
 */
export async function GET() {
  const posts = getSortedPosts(await getCollection("posts")).sort(
    (a, b) => b.data.pubDatetime.getTime() - a.data.pubDatetime.getTime()
  );
  const site = new URL(config.site.url);
  const feedUrl = new URL("rss.xml", site).href;

  return rss({
    title: config.site.title,
    description: config.site.description,
    site: site.href,
    xmlns: {
      atom: "http://www.w3.org/2005/Atom",
      dc: "http://purl.org/dc/elements/1.1/",
    },
    customData: [
      `<language>${config.site.lang}</language>`,
      `<atom:link href="${feedUrl}" rel="self" type="application/rss+xml"/>`,
      `<lastBuildDate>${new Date().toUTCString()}</lastBuildDate>`,
    ].join(""),
    items: await Promise.all(
      posts.map(async post => {
        const { data, id, filePath } = post;
        const link = new URL(getPostUrl(id, filePath, config.site.lang), site);
        return {
          link: link.href,
          title: data.title,
          description: data.description,
          pubDate: data.pubDatetime,
          // RSS <author> must be an email; a name goes in dc:creator.
          customData: `<dc:creator><![CDATA[${data.author}]]></dc:creator>`,
          categories: data.tags,
          content: await feedContent(post, link),
        };
      })
    ),
  });
}
