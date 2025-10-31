import express, { type RequestHandler } from "express";
import cors from "cors";
import dotenv from "dotenv";
import { createHash } from "crypto";
import { prisma } from "./db";
import { authJWT, AuthedRequest } from "./authJWT";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { clearSessionCookie, setSessionCookie } from "./session";

dotenv.config();

const app = express();
app.set("trust proxy", 1);

const allowedOrigins = ["http://localhost:3001", "http://localhost:3003"];
app.use(
  cors({
    origin: allowedOrigins,
    credentials: true,
  })
);
app.use(express.json());

const LOGIN_WINDOW_MS = 60_000;
const LOGIN_MAX_ATTEMPTS = 5;
type LoginAttempt = { count: number; expiresAt: number };
const loginAttempts = new Map<string, LoginAttempt>();

const loginRateLimiter: RequestHandler = (req, res, next) => {
  const key = req.ip || req.socket.remoteAddress || "unknown";
  const now = Date.now();
  const entry = loginAttempts.get(key);

  if (!entry || entry.expiresAt <= now) {
    loginAttempts.set(key, { count: 1, expiresAt: now + LOGIN_WINDOW_MS });
    return next();
  }

  if (entry.count >= LOGIN_MAX_ATTEMPTS) {
    return res.status(429).json({ error: "Demasiados intentos. Intenta nuevamente en un minuto." });
  }

  entry.count += 1;
  loginAttempts.set(key, entry);
  next();
};

setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of loginAttempts.entries()) {
    if (entry.expiresAt <= now) {
      loginAttempts.delete(key);
    }
  }
}, LOGIN_WINDOW_MS).unref();

// Salud
app.get("/api/health", (_req, res) => {
  res.status(200).json({ ok: true, service: "salon-backend", env: process.env.NODE_ENV ?? "dev" });
});

// LOGIN → devuelve JWT
app.post("/api/login", loginRateLimiter, async (req, res) => {
  const { email, password } = req.body as { email: string; password: string };
  if (!email || !password) return res.status(400).json({ error: "Email and password required" });

  const clientIdentifier = req.ip || req.socket.remoteAddress || "unknown";
  const hashedEmail = createHash("sha256").update(email.toLowerCase()).digest("hex").slice(0, 12);
  console.info("[auth] login attempt", { emailHash: hashedEmail, ip: clientIdentifier });

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    console.warn("[auth] login failed", { reason: "not_found", emailHash: hashedEmail, ip: clientIdentifier });
    return res.status(401).json({ error: "Invalid credentials" });
  }

  const ok = await bcrypt.compare(password, user.passwordHash);
  if (!ok) {
    console.warn("[auth] login failed", { reason: "bad_password", emailHash: hashedEmail, ip: clientIdentifier });
    return res.status(401).json({ error: "Invalid credentials" });
  }

  const token = jwt.sign(
    { id: user.id, email: user.email, role: user.role, name: user.name },
    process.env.JWT_SECRET as string,
    { expiresIn: "7d" }
  );

  setSessionCookie(res, token);
  loginAttempts.delete(clientIdentifier);
  console.info("[auth] login success", { emailHash: hashedEmail, ip: clientIdentifier });
  res.json({ token });
});

// /api/me → requiere JWT
app.get("/api/me", authJWT, (req: AuthedRequest, res) => {
  res.json({ user: req.user });
});

app.post("/api/logout", (_req, res) => {
  clearSessionCookie(res);
  res.status(204).end();
});

// Servicios
app.get("/api/services", async (_req, res) => {
  try {
    const services = await prisma.service.findMany({ orderBy: { name: "asc" } });
    res.json(services);
  } catch (e) {
    res.status(500).json({ error: "Error obteniendo servicios" });
  }
});

// Productos (una sola vez)
app.get("/api/products", async (_req, res) => {
  try {
    const products = await prisma.product.findMany({ orderBy: { name: "asc" } });
    res.json(products);
  } catch (e) {
    res.status(500).json({ error: "Error obteniendo productos" });
  }
});

// Stats rápidas
app.get("/api/_debug/stats", async (_req, res) => {
  try {
    const [users, services, products, appointments, payments] = await Promise.all([
      prisma.user.count(),
      prisma.service.count(),
      prisma.product.count(),
      prisma.appointment.count(),
      prisma.payment.count(),
    ]);
    res.json({ users, services, products, appointments, payments });
  } catch (e) {
    res.status(500).json({ error: "Error obteniendo stats" });
  }
});

const port = Number(process.env.PORT) || 3000;
app.listen(port, () => console.log(`✅ API server ready on port ${port}`));
