import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { nextCookies } from "better-auth/next-js";
import { db } from "./db";
import * as appSchema from "./db/schema";
import * as authSchema from "./db/auth-schema";

const isProduction = process.env.NODE_ENV === "production";

export const auth = betterAuth({
  database: drizzleAdapter(db, {
    provider: "pg",
    schema: { ...appSchema, ...authSchema },
  }),
  emailAndPassword: {
    enabled: true,
    minPasswordLength: 8,
  },
  user: {
    additionalFields: {
      role: {
        type: "string",
        defaultValue: "salesman",
        input: false,
      },
      phone: {
        type: "string",
        required: false,
        input: true,
      },
      designation: {
        type: "string",
        required: false,
        input: true,
      },
    },
  },
  session: {
    expiresIn: 60 * 60 * 24 * 14,
    cookieCache: { enabled: true, maxAge: 5 * 60 },
  },
  baseURL: isProduction
    ? process.env.BETTER_AUTH_URL
    : {
        allowedHosts: ["*"],
        fallback: process.env.BETTER_AUTH_URL ?? "http://localhost:4000",
      },
  trustedOrigins: ["*"],
  advanced: isProduction
    ? {}
    : {
        defaultCookieAttributes: {
          sameSite: "none",
          secure: true,
          partitioned: true,
        },
      },
  plugins: [nextCookies()],
});

export type Session = typeof auth.$Infer.Session;
