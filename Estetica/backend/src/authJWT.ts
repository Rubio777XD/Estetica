import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";

// Define el tipo del usuario autenticado
export interface AuthUser {
  id: string;
  email: string;
  role: string;
  name?: string | null;
}

// Extiende Request para incluir la propiedad user
export interface AuthedRequest extends Request {
  user?: AuthUser;
}

// Middleware que valida el JWT
export function authJWT(req: AuthedRequest, res: Response, next: NextFunction) {
  const hdr = req.headers.authorization || "";
  const token = hdr.startsWith("Bearer ") ? hdr.slice(7) : "";
  if (!token) return res.status(401).json({ error: "Missing token" });

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET as string) as AuthUser;
    req.user = payload;
    next();
  } catch {
    res.status(401).json({ error: "Invalid token" });
  }
}
