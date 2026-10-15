import { betterAuth } from "better-auth";
import type { SageCommentsEnv } from "./env";

/**
 * Better Auth with GitHub and X sign-in only. No email/password: nothing to
 * hash, which keeps every request well inside the Workers free-tier CPU limit.
 *
 * `username` is stored as "github:<login>" or "x:<handle>" so moderators can be
 * named unambiguously in `comments.admins`.
 */
export function createAuth(env: SageCommentsEnv, baseURL: string) {
  const socialProviders: Parameters<typeof betterAuth>[0]["socialProviders"] = {};

  if (env.GITHUB_CLIENT_ID && env.GITHUB_CLIENT_SECRET) {
    socialProviders.github = {
      clientId: env.GITHUB_CLIENT_ID,
      clientSecret: env.GITHUB_CLIENT_SECRET,
      mapProfileToUser: profile => ({ username: `github:${profile.login}` }),
    };
  }
  if (env.X_CLIENT_ID && env.X_CLIENT_SECRET) {
    socialProviders.twitter = {
      clientId: env.X_CLIENT_ID,
      clientSecret: env.X_CLIENT_SECRET,
      mapProfileToUser: profile => ({ username: `x:${profile.data.username}` }),
    };
  }

  return betterAuth({
    baseURL,
    basePath: "/api/auth",
    secret: env.BETTER_AUTH_SECRET,
    database: env.DB,
    emailAndPassword: { enabled: false },
    socialProviders,
    user: {
      additionalFields: {
        username: { type: "string", required: false, input: false },
      },
    },
    session: {
      // Avoid a D1 read on every request; re-validated every 5 minutes.
      cookieCache: { enabled: true, maxAge: 5 * 60 },
    },
    advanced: {
      defaultCookieAttributes: { sameSite: "lax", secure: baseURL.startsWith("https:") },
    },
    telemetry: { enabled: false },
  });
}

export type SageAuth = ReturnType<typeof createAuth>;

/** Providers that have credentials configured, in display order. */
export function enabledProviders(env: SageCommentsEnv) {
  return [
    ...(env.GITHUB_CLIENT_ID ? (["github"] as const) : []),
    ...(env.X_CLIENT_ID ? (["twitter"] as const) : []),
  ];
}
