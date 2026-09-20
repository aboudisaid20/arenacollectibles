import "server-only";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getDb, verifyPassword } from "./db";
import { verifySession, SESSION_COOKIE, type SessionPayload } from "./session";

export interface AppUser {
  id: string;
  email: string;
  name: string;
  role: "admin" | "customer";
}

/** Reads the signed cookie. Does not touch the database. */
export async function getSession(): Promise<SessionPayload | null> {
  const store = await cookies();
  return verifySession(store.get(SESSION_COOKIE)?.value);
}

/**
 * Resolves the session against the database.
 *
 * Defence in depth: middleware already gated on the token's role claim,
 * but a token outlives a role change. This re-reads the row, so demoting
 * an admin takes effect on their very next request rather than in eight
 * hours when the cookie expires.
 */
export async function getCurrentUser(): Promise<AppUser | null> {
  const session = await getSession();
  if (!session) return null;
  const row = getDb()
    .prepare("SELECT id, email, name, role FROM users WHERE id = ?")
    .get(session.uid) as AppUser | undefined;
  return row ?? null;
}

/** Server-side guard for admin pages and every admin mutation. */
export async function requireAdmin(): Promise<AppUser> {
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=/admin");
  if (user.role !== "admin") redirect("/?denied=admin");
  return user;
}

export function authenticate(email: string, password: string): AppUser | null {
  const row = getDb()
    .prepare("SELECT id, email, name, role, password_hash FROM users WHERE email = ?")
    .get(email.trim().toLowerCase()) as
    | (AppUser & { password_hash: string })
    | undefined;

  // Hash a dummy even when the user is missing, so response time does not
  // reveal which emails exist.
  const stored = row?.password_hash ?? "scrypt:00:00";
  const ok = verifyPassword(password, stored);
  if (!row || !ok) return null;

  return { id: row.id, email: row.email, name: row.name, role: row.role };
}
