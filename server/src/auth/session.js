import session from "express-session";
import { PrismaSessionStore } from "@quixo3/prisma-session-store";
import { prisma } from "../db.js";

const isProduction = process.env.NODE_ENV === "production";

const sessionSecret = process.env.SESSION_SECRET;
if (!sessionSecret) {
  if (isProduction) {
    throw new Error("SESSION_SECRET environment variable is required in production");
  }
  console.warn(
    "[auth] SESSION_SECRET is not set; using an insecure development-only default. " +
      "Set SESSION_SECRET in server/.env before deploying."
  );
}

const ONE_WEEK_MS = 7 * 24 * 60 * 60 * 1000;

export const sessionMiddleware = session({
  secret: sessionSecret || "dev-only-insecure-secret-do-not-use-in-production",
  resave: false,
  saveUninitialized: false,
  name: "ks.sid",
  store: new PrismaSessionStore(prisma, {
    checkPeriod: 2 * 60 * 1000,
    dbRecordIdIsSessionId: true,
  }),
  cookie: {
    httpOnly: true,
    secure: isProduction,
    sameSite: "lax",
    maxAge: ONE_WEEK_MS,
  },
});
