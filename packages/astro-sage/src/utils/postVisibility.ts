/**
 * Which posts each surface may show. Pure (no `astro:*` imports) so it can be
 * unit-tested; `postFilter.ts` binds it to `import.meta.env.DEV` and config.
 *
 * - Drafts (`draft: true`) render while developing (`astro dev`) so they can be
 *   previewed, and are never part of a build.
 * - Scheduled posts (future `pubDatetime`) render in dev, and in builds only
 *   once `pubDatetime - scheduledPostMargin` has passed.
 * - Feeds stay production-shaped: never drafts, even in dev.
 */

export type VisibilityData = {
  draft?: boolean;
  pubDatetime: Date | string;
};

export type VisibilityEnv = {
  /** `import.meta.env.DEV`: true under `astro dev`, false in `astro build`. */
  dev: boolean;
  scheduledPostMargin: number;
  now?: number;
};

/** Whether a post's draft state allows showing it: drafts only in dev. */
export function isDraftVisible(draft: boolean | undefined, dev: boolean) {
  return draft !== true || dev;
}

/** Whether a post is due: always in dev, otherwise once its time has come. */
export function isPublishDue(
  { pubDatetime }: VisibilityData,
  { dev, scheduledPostMargin, now = Date.now() }: VisibilityEnv
) {
  return dev || now > new Date(pubDatetime).getTime() - scheduledPostMargin;
}

/** Pages, lists, tags, series, prev/next, home: drafts in dev only. */
export function isPostVisible(data: VisibilityData, env: VisibilityEnv) {
  return isDraftVisible(data.draft, env.dev) && isPublishDue(data, env);
}

/** RSS and other feeds: never drafts, even in dev. */
export function isFeedVisible(data: VisibilityData, env: VisibilityEnv) {
  return data.draft !== true && isPostVisible(data, env);
}

/** The "Draft" badge: a draft, in dev. Never in a build. */
export function isDraftBadgeVisible(draft: boolean | undefined, dev: boolean) {
  return dev && draft === true;
}
