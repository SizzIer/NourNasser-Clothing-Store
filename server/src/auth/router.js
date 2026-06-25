import { Router } from "express";
import { prisma } from "../db.js";
import { toPublicUser } from "../users.js";
import { hashPassword, verifyPassword } from "./password.js";

/**
 * @typedef {Object} RegisterBody
 * @property {string} [name]
 * @property {string} [lastname]
 * @property {string} [email]
 * @property {string} [phone]
 * @property {string} [password]
 */

/**
 * @typedef {Object} LoginBody
 * @property {string} [email]
 * @property {string} [password]
 */

/**
 * @param {import("express").Request} req
 * @returns {Promise<void>}
 */
function regenerateSession(req) {
  return new Promise((resolve, reject) => {
    req.session.regenerate((err) => {
      if (err) reject(err);
      else resolve();
    });
  });
}

export const authRouter = Router();

authRouter.post("/register", async (req, res) => {
  try {
    /** @type {RegisterBody} */
    const { name, lastname, email, phone, password } = req.body;
    if (!name || !lastname || !email || !password) {
      res.status(400).json({ error: "Missing required fields" });
      return;
    }
    if (password.length < 8) {
      res.status(400).json({ error: "Password must be at least 8 characters" });
      return;
    }

    const normalizedEmail = email.trim().toLowerCase();
    const existing = await prisma.user.findUnique({ where: { email: normalizedEmail } });
    if (existing) {
      res.status(409).json({ error: "User with this email already exists" });
      return;
    }

    const hashedPassword = await hashPassword(password);
    const createdUser = await prisma.user.create({
      data: {
        name: `${name.trim()} ${lastname.trim()}`.trim(),
        email: normalizedEmail,
        phone: phone?.trim() || null,
        password: hashedPassword,
      },
    });

    res.status(201).json(toPublicUser(createdUser));
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to register user" });
  }
});

authRouter.post("/login", async (req, res) => {
  try {
    /** @type {LoginBody} */
    const { email, password } = req.body;
    if (!email || !password) {
      res.status(400).json({ error: "Email and password are required" });
      return;
    }

    const normalizedEmail = email.trim().toLowerCase();
    const user = await prisma.user.findUnique({ where: { email: normalizedEmail } });
    if (!user) {
      res.status(401).json({ error: "Invalid email or password" });
      return;
    }

    const passwordMatches = await verifyPassword(password, user.password);
    if (!passwordMatches) {
      res.status(401).json({ error: "Invalid email or password" });
      return;
    }

    await regenerateSession(req);
    req.session.userId = user.id;

    res.json(toPublicUser(user));
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to login" });
  }
});

authRouter.post("/logout", (req, res) => {
  const cookieName = "ks.sid";
  req.session.destroy((err) => {
    if (err) {
      console.error(err);
      res.status(500).json({ error: "Failed to logout" });
      return;
    }
    res.clearCookie(cookieName);
    res.json({ success: true });
  });
});

authRouter.get("/me", async (req, res) => {
  try {
    const userId = req.session.userId;
    if (!userId) {
      res.status(401).json({ error: "Not authenticated" });
      return;
    }

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      req.session.userId = undefined;
      res.status(401).json({ error: "Not authenticated" });
      return;
    }

    res.json(toPublicUser(user));
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to fetch current user" });
  }
});
