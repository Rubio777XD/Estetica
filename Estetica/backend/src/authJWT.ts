import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { clearSessionCookie, SESSION_COOKIE_NAME } from "./session";

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
function getCookieToken(req: Request): string | null {
  const cookieHeader = req.headers.cookie;
  if (!cookieHeader) return null;

  const cookies = cookieHeader.split(";");
  for (const cookie of cookies) {
    const [name, ...valueParts] = cookie.split("=");
    if (!name) continue;
    if (name.trim() === SESSION_COOKIE_NAME) {
      const rawValue = valueParts.join("=").trim();
      if (!rawValue) return null;
      try {
        return decodeURIComponent(rawValue);
      } catch {
        return rawValue;
      }
    }
  }
  return null;
}

export function authJWT(req: AuthedRequest, res: Response, next: NextFunction) {
  const cookieToken = getCookieToken(req);
  const hdr = req.headers.authorization || "";
  const headerToken = hdr.startsWith("Bearer ") ? hdr.slice(7) : "";
  const token = cookieToken || headerToken;

  if (!token) {
    return res.status(401).json({ error: "Missing token" });
  }

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET as string) as AuthUser;
    req.user = payload;
    next();
  } catch {
    if (cookieToken) {
      clearSessionCookie(res);
    }
    res.status(401).json({ error: "Invalid token" });
  }
}
