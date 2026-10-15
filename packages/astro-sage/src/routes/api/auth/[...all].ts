import type { APIRoute } from "astro";
import { createAuth } from "@sage/comments/auth";
import { getEnv } from "@sage/comments/env";

export const prerender = false;

export const ALL: APIRoute = async ({ request, url }) => {
  const auth = createAuth(await getEnv(), url.origin);
  return auth.handler(request);
};
