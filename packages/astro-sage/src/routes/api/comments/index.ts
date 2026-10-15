import type { APIRoute } from "astro";
import { context, error, json, sameOrigin } from "@sage/comments/api";
import {
  MAX_COMMENT_LENGTH,
  RATE_LIMIT,
  createComment,
  getComment,
  listComments,
  recentCount,
} from "@sage/comments/store";

export const prerender = false;

const SLUG = /^[a-z0-9][a-z0-9/_-]{0,200}$/i;

/** GET /api/comments?slug=… → { viewer, providers, comments } */
export const GET: APIRoute = async ctx => {
  const slug = ctx.url.searchParams.get("slug") ?? "";
  if (!SLUG.test(slug)) return error("Invalid slug", 400);
  const { env, viewer, providers } = await context(ctx);
  const rows = await listComments(env.DB, slug);
  return json({
    viewer,
    providers,
    comments: rows.map(c => ({
      id: c.id,
      parentId: c.parentId,
      bodyHtml: c.bodyHtml,
      bodyMd: viewer && (viewer.id === c.userId) ? c.bodyMd : undefined,
      createdAt: c.createdAt,
      editedAt: c.editedAt,
      deleted: !!c.deletedAt,
      author: { name: c.authorName, image: c.authorImage, username: c.authorUsername },
      canEdit: !!viewer && viewer.id === c.userId && !c.deletedAt,
      canDelete: !!viewer && (viewer.id === c.userId || viewer.isAdmin) && !c.deletedAt,
    })),
  });
};

/** POST /api/comments { slug, body, parentId? } */
export const POST: APIRoute = async ctx => {
  if (!sameOrigin(ctx)) return error("Bad origin", 403);
  const { env, viewer } = await context(ctx);
  if (!viewer) return error("Sign in to comment", 401);

  const input = (await ctx.request.json().catch(() => null)) as {
    slug?: string;
    body?: string;
    parentId?: string | null;
  } | null;
  const body = input?.body?.trim() ?? "";
  if (!input?.slug || !SLUG.test(input.slug)) return error("Invalid slug", 400);
  if (!body) return error("Comment is empty", 400);
  if (body.length > MAX_COMMENT_LENGTH) return error("Comment is too long", 400);

  let parentId: string | null = null;
  if (input.parentId) {
    const parent = await getComment(env.DB, input.parentId);
    if (!parent || parent.postSlug !== input.slug) return error("Unknown parent", 400);
    // One level of replies: replying to a reply attaches to its root.
    parentId = parent.parentId ?? parent.id;
  }

  if ((await recentCount(env.DB, viewer.id, Date.now())) >= RATE_LIMIT) {
    return error("You're commenting a lot. Try again in a few minutes.", 429);
  }

  const id = await createComment(env.DB, {
    postSlug: input.slug,
    userId: viewer.id,
    parentId,
    bodyMd: body,
  });
  return json({ id }, 201);
};
