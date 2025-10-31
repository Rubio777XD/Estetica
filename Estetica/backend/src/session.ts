import type { CookieOptions, Response } from "express";

export const SESSION_COOKIE_NAME = process.env.SESSION_COOKIE_NAME || "salon_session";

const isProduction = process.env.NODE_ENV === "production";
const cookieDomain = process.env.SESSION_COOKIE_DOMAIN;

const baseCookieOptions: CookieOptions = {
  httpOnly: true,
  sameSite: "lax",
  secure: isProduction,
  path: "/",
};

if (cookieDomain) {
  baseCookieOptions.domain = cookieDomain;
}

const ONE_WEEK_IN_MS = 7 * 24 * 60 * 60 * 1000;

export const sessionCookieOptions: CookieOptions = {
  ...baseCookieOptions,
  maxAge: ONE_WEEK_IN_MS,
};

const sessionCookieClearOptions: CookieOptions = {
  ...baseCookieOptions,
  maxAge: 0,
};

export function setSessionCookie(res: Response, token: string) {
  res.cookie(SESSION_COOKIE_NAME, token, sessionCookieOptions);
}

export function clearSessionCookie(res: Response) {
  res.cookie(SESSION_COOKIE_NAME, "", sessionCookieClearOptions);
}
