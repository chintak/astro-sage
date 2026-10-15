import type { APIRoute } from "astro";
import { context, error, json, sameOrigin } from "@sage/comments/api";
import {
  MAX_COMMENT_LENGTH,
  getComment,
  softDeleteComment,
  updateComment,
} from "@sage/comments/store";

export const prerender = false;

/** PATCH /api/comments/:id { body } (author only) */
export const PATCH: APIRoute = async ctx => {
  if (!sameOrigin(ctx)) return error("Bad origin", 403);
  const { env, viewer } = await context(ctx);
  if (!viewer) return error("Sign in first", 401);
  const comment = await getComment(env.DB, ctx.params.id!);
  if (!comment || comment.deletedAt) return error("Not found", 404);
  if (comment.userId !== viewer.id) return error("Forbidden", 403);

  const input = (await ctx.request.json().catch(() => null)) as {
    body?: string;
  } | null;
  const body = input?.body?.trim() ?? "";
  if (!body) return error("Comment is empty", 400);
  if (body.length > MAX_COMMENT_LENGTH)
    return error("Comment is too long", 400);

  await updateComment(env.DB, comment.id, body);
  return json({ ok: true });
};

/** DELETE /api/comments/:id (author or admin; soft delete) */
export const DELETE: APIRoute = async ctx => {
  if (!sameOrigin(ctx)) return error("Bad origin", 403);
  const { env, viewer } = await context(ctx);
  if (!viewer) return error("Sign in first", 401);
  const comment = await getComment(env.DB, ctx.params.id!);
  if (!comment || comment.deletedAt) return error("Not found", 404);
  if (comment.userId !== viewer.id && !viewer.isAdmin)
    return error("Forbidden", 403);

  await softDeleteComment(env.DB, comment.id);
  return json({ ok: true });
};
