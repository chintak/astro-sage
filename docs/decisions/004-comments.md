# 004: Comments with GitHub / X sign-in

**Status:** Superseded, 2026-10-16. AstroSage now builds a fully static site and makes no assumptions about hosting, so the self-hosted backend described below was removed in favour of client-side GitHub widgets (utterances, giscus). See README → Comments. Kept for the record.

## Constraints
Cloudflare Workers free tier (10 ms CPU per request, D1 limits). GitHub and X sign-in only. Pages must stay static and fast for readers who never comment.

## Decision
- **Better Auth** with only the `github` and `twitter` social providers and no email/password. With nothing to hash, requests stay far inside 10 ms CPU. Sessions are cookie-cached for 5 minutes to skip D1 reads.
- **D1** stores the Better Auth tables plus `comment`. The migration ships in `packages/astro-sage/migrations/`.
- **Routes:** posts stay prerendered. Only `/api/auth/*`, `/api/comments` and `/api/comments/:id` are on-demand, injected only when `comments.provider = "cloudflare-d1"`.
- **UI:** a 0.3 KB bootstrap uses an IntersectionObserver to `import()` a ~2.7 KB (gz) vanilla client when the comments section is within 600 px of the viewport. There's no framework runtime.
- **Safety:** Origin check on every write, a 5-comments-per-10-minutes rate limit, a 5,000-character cap, one reply level, soft delete, and admins set by `comments.admins: ["github:login"]`. Comment Markdown is HTML-escaped first, then a small subset (bold, italic, code, http(s) links with `rel="nofollow ugc noopener"`) is applied.
- **Portability:** `comments.provider: false` (the default) ships no API, no JS and no adapter requirement.

## Verified locally
Under `astro dev` with Miniflare D1 and a seeded session: post, reply, edit-own, delete-own, admin delete, 403 on editing or deleting someone else's comment, 400 for empty, too-long or bad-slug input, 429 rate limit, cross-origin write rejected, `<script>` escaped. The GitHub and X sign-in endpoints return correct authorize URLs (PKCE, callback `/api/auth/callback/<provider>`).

## Not yet verified
A full OAuth round trip with real GitHub and X apps, which needs your client IDs and secrets (see README → Comments).
