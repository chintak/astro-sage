import type { APIContext } from "astro";
import config from "@sage/config";
import { createAuth, enabledProviders } from "./auth";
import { getEnv } from "./env";

export const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
  });

export const error = (message: string, status: number) => json({ error: message }, status);

/** Rejects cross-site writes: the Origin must match this site. */
export function sameOrigin({ request, url }: APIContext) {
  return request.headers.get("Origin") === url.origin;
}

export async function context(ctx: APIContext) {
  const env = await getEnv();
  const auth = createAuth(env, ctx.url.origin);
  const session = await auth.api.getSession({ headers: ctx.request.headers });
  const user = session?.user as
    | (NonNullable<typeof session>["user"] & { username?: string | null })
    | undefined;
  const isAdmin = !!user?.username && config.comments.admins.some(a => {
    const name = a.includes(":") ? a : `github:${a}`;
    return name.toLowerCase() === user.username!.toLowerCase();
  });
  return {
    env,
    auth,
    providers: enabledProviders(env),
    viewer: user
      ? { id: user.id, name: user.name, image: user.image ?? null, username: user.username ?? null, isAdmin }
      : null,
  };
}
