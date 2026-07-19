import { createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";

export const ADMIN_COOKIE = "heads_up_admin";
const SESSION_SECONDS = 60 * 60 * 12;

function getConfig() {
  const username = process.env.HEADS_UP_ADMIN_USERNAME;
  const password = process.env.HEADS_UP_ADMIN_PASSWORD;
  const secret = process.env.HEADS_UP_SESSION_SECRET;
  if (!username || !password || !secret || secret.length < 32) return null;
  return { username, password, secret };
}

function safeEqual(left, right) {
  const leftBuffer = Buffer.from(String(left));
  const rightBuffer = Buffer.from(String(right));
  return leftBuffer.length === rightBuffer.length && timingSafeEqual(leftBuffer, rightBuffer);
}

export function verifyCredentials(username, password) {
  const config = getConfig();
  return Boolean(config && safeEqual(username, config.username) && safeEqual(password, config.password));
}

export function createAdminToken(now = Date.now()) {
  const config = getConfig();
  if (!config) throw new Error("Heads Up admin authentication is not configured");
  const payload = Buffer.from(JSON.stringify({ exp: now + SESSION_SECONDS * 1000 })).toString("base64url");
  const signature = createHmac("sha256", config.secret).update(payload).digest("base64url");
  return `${payload}.${signature}`;
}

export function verifyAdminToken(token, now = Date.now()) {
  const config = getConfig();
  if (!config || !token) return false;
  const [payload, signature] = token.split(".");
  if (!payload || !signature) return false;
  const expected = createHmac("sha256", config.secret).update(payload).digest("base64url");
  if (!safeEqual(signature, expected)) return false;
  try {
    return JSON.parse(Buffer.from(payload, "base64url").toString("utf8")).exp > now;
  } catch {
    return false;
  }
}

export async function isAdminRequest() {
  return verifyAdminToken((await cookies()).get(ADMIN_COOKIE)?.value);
}

export const adminCookieOptions = {
  httpOnly: true,
  sameSite: "strict",
  secure: process.env.NODE_ENV === "production",
  path: "/",
  maxAge: SESSION_SECONDS,
};
