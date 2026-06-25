import { prisma } from "../db.js";
import { toPublicUser } from "../users.js";

/**
 * @param {import("express").Request} req
 * @returns {Promise<import("../users.js").PublicUser | null>}
 */
async function loadAuthenticatedUser(req) {
  const userId = req.session.userId;
  if (!userId) return null;

  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) {
    req.session.userId = undefined;
    return null;
  }
  return toPublicUser(user);
}

/** @type {import("express").RequestHandler} */
export async function requireAuth(req, res, next) {
  try {
    const user = await loadAuthenticatedUser(req);
    if (!user) {
      res.status(401).json({ error: "Authentication required" });
      return;
    }
    req.user = user;
    next();
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Auth check failed" });
  }
}

/** @type {import("express").RequestHandler} */
export async function requireAdmin(req, res, next) {
  try {
    const user = await loadAuthenticatedUser(req);
    if (!user) {
      res.status(401).json({ error: "Authentication required" });
      return;
    }
    if (user.role !== "admin") {
      res.status(403).json({ error: "Forbidden" });
      return;
    }
    req.user = user;
    next();
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Auth check failed" });
  }
}

/**
 * @param {string} paramName
 * @returns {import("express").RequestHandler}
 */
export function requireSelfOrAdmin(paramName) {
  return async (req, res, next) => {
    try {
      const user = await loadAuthenticatedUser(req);
      if (!user) {
        res.status(401).json({ error: "Authentication required" });
        return;
      }
      const targetId = Number(req.params[paramName]);
      if (user.role !== "admin" && user.id !== targetId) {
        res.status(403).json({ error: "Forbidden" });
        return;
      }
      req.user = user;
      next();
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: "Auth check failed" });
    }
  };
}
