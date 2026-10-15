import type { D1Database } from "@cloudflare/workers-types/index.ts";
import { renderComment } from "./render";

export const MAX_COMMENT_LENGTH = 5000;
/** Max comments per user in RATE_WINDOW_MS. */
export const RATE_LIMIT = 5;
export const RATE_WINDOW_MS = 10 * 60 * 1000;

export interface CommentRow {
  id: string;
  postSlug: string;
  userId: string;
  parentId: string | null;
  bodyHtml: string;
  bodyMd: string;
  createdAt: number;
  editedAt: number | null;
  deletedAt: number | null;
  authorName: string;
  authorImage: string | null;
  authorUsername: string | null;
}

export async function listComments(db: D1Database, postSlug: string) {
  const { results } = await db
    .prepare(
      `SELECT c.*, u.name AS authorName, u.image AS authorImage, u.username AS authorUsername
       FROM comment c JOIN "user" u ON u.id = c.userId
       WHERE c.postSlug = ?1 ORDER BY c.createdAt ASC LIMIT 500`
    )
    .bind(postSlug)
    .all<CommentRow>();
  // Hide the body of deleted comments but keep them as thread anchors.
  return results.map((c: CommentRow) =>
    c.deletedAt ? { ...c, bodyHtml: "", bodyMd: "" } : c
  );
}

export async function getComment(db: D1Database, id: string) {
  return db
    .prepare(`SELECT * FROM comment WHERE id = ?1`)
    .bind(id)
    .first<CommentRow>();
}

export async function recentCount(db: D1Database, userId: string, now: number) {
  const row = await db
    .prepare(
      `SELECT COUNT(*) AS n FROM comment WHERE userId = ?1 AND createdAt > ?2`
    )
    .bind(userId, now - RATE_WINDOW_MS)
    .first<{ n: number }>();
  return row?.n ?? 0;
}

export async function createComment(
  db: D1Database,
  input: {
    postSlug: string;
    userId: string;
    parentId: string | null;
    bodyMd: string;
  }
) {
  const id = crypto.randomUUID();
  const now = Date.now();
  await db
    .prepare(
      `INSERT INTO comment (id, postSlug, userId, parentId, bodyMd, bodyHtml, createdAt)
       VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)`
    )
    .bind(
      id,
      input.postSlug,
      input.userId,
      input.parentId,
      input.bodyMd,
      renderComment(input.bodyMd),
      now
    )
    .run();
  return id;
}

export async function updateComment(
  db: D1Database,
  id: string,
  bodyMd: string
) {
  await db
    .prepare(
      `UPDATE comment SET bodyMd = ?2, bodyHtml = ?3, editedAt = ?4 WHERE id = ?1`
    )
    .bind(id, bodyMd, renderComment(bodyMd), Date.now())
    .run();
}

export async function softDeleteComment(db: D1Database, id: string) {
  await db
    .prepare(`UPDATE comment SET deletedAt = ?2 WHERE id = ?1`)
    .bind(id, Date.now())
    .run();
}
