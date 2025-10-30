import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { prisma } from "./db";
import { authJWT, AuthedRequest } from "./authJWT";
import bcrypt from "bcryptjs";     
import jwt from "jsonwebtoken";       

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

// Salud
app.get("/api/health", (_req, res) => {
  res.status(200).json({ ok: true, service: "salon-backend", env: process.env.NODE_ENV ?? "dev" });
});

// LOGIN → devuelve JWT
app.post("/api/login", async (req, res) => {
  const { email, password } = req.body as { email: string; password: string };
  if (!email || !password) return res.status(400).json({ error: "Email and password required" });

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) return res.status(401).json({ error: "Invalid credentials" });

  const ok = await bcrypt.compare(password, user.passwordHash);
  if (!ok) return res.status(401).json({ error: "Invalid credentials" });

  const token = jwt.sign(
    { id: user.id, email: user.email, role: user.role, name: user.name },
    process.env.JWT_SECRET as string,
    { expiresIn: "7d" }
  );

  res.json({ token });
});

// /api/me → requiere JWT
app.get("/api/me", authJWT, (req: AuthedRequest, res) => {
  res.json({ user: req.user });
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
