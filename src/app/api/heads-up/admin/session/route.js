import { cookies } from "next/headers";
import { ADMIN_COOKIE, adminCookieOptions, createAdminToken, isAdminRequest, verifyCredentials } from "@/lib/heads-up/adminAuth";
import { problem } from "@/lib/heads-up/api";

export async function GET() { return Response.json({ authenticated: await isAdminRequest() }); }

export async function POST(request) {
  const { username, password } = await request.json().catch(() => ({}));
  if (!verifyCredentials(username, password)) return problem(401, "Invalid credentials", "The supplied administrator credentials are invalid.");
  (await cookies()).set(ADMIN_COOKIE, createAdminToken(), adminCookieOptions);
  return Response.json({ authenticated: true });
}

export async function DELETE() {
  (await cookies()).delete(ADMIN_COOKIE);
  return Response.json({ authenticated: false });
}
