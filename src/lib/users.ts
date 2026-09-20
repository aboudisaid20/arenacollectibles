import "server-only";
import { randomUUID } from "node:crypto";
import { getDb, queryAll, queryOne, hashPassword, verifyPassword } from "./db";

/**
 * User administration.
 *
 * The invariants here exist to stop an admin locking everybody out of
 * their own shop, which is the failure mode that has no recovery path
 * short of shell access to the database:
 *
 *  - the last admin cannot be deleted or demoted
 *  - nobody can delete or demote their own account
 *
 * Both are enforced here rather than in the UI, because the UI is a
 * convenience and the server action is the boundary.
 */

import { MIN_PASSWORD_LENGTH, type Role, type TeamMember } from "./users-types";

export { MIN_PASSWORD_LENGTH };
export type { Role, TeamMember };

export function listUsers(): TeamMember[] {
  return queryAll<TeamMember>(
    "SELECT id, email, name, role, created_at FROM users ORDER BY role ASC, created_at ASC",
  );
}

function adminCount(): number {
  return (
    queryOne<{ n: number }>("SELECT COUNT(*) AS n FROM users WHERE role = 'admin'")
      ?.n ?? 0
  );
}

function findById(id: string): TeamMember | undefined {
  return queryOne<TeamMember>(
    "SELECT id, email, name, role, created_at FROM users WHERE id = ?",
    id,
  );
}

/** Shared password rule. */
export function passwordProblem(password: string): string | null {
  if (typeof password !== "string" || password.length < MIN_PASSWORD_LENGTH) {
    return `Password must be at least ${MIN_PASSWORD_LENGTH} characters.`;
  }
  if (password.length > 200) return "That password is too long.";
  return null;
}

export function createUser(input: {
  email: string;
  name: string;
  role: Role;
  password: string;
}): { ok: true; id: string } | { ok: false; error: string } {
  const email = String(input.email ?? "").trim().toLowerCase();
  const name = String(input.name ?? "").trim();

  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
    return { ok: false, error: "Enter a valid email address." };
  }
  if (!name) return { ok: false, error: "Enter a name." };
  if (input.role !== "admin" && input.role !== "customer") {
    return { ok: false, error: "Pick a role." };
  }
  const bad = passwordProblem(input.password);
  if (bad) return { ok: false, error: bad };

  const existing = queryOne<{ id: string }>(
    "SELECT id FROM users WHERE email = ?",
    email,
  );
  if (existing) return { ok: false, error: `${email} already has an account.` };

  const id = randomUUID();
  getDb()
    .prepare(
      "INSERT INTO users (id,email,name,password_hash,role,created_at) VALUES (?,?,?,?,?,?)",
    )
    .run(id, email, name, hashPassword(input.password), input.role,
      new Date().toISOString());

  return { ok: true, id };
}

export function setUserRole(
  id: string,
  role: Role,
  actingUserId: string,
): { ok: true } | { ok: false; error: string } {
  if (role !== "admin" && role !== "customer") {
    return { ok: false, error: "Unknown role." };
  }
  const target = findById(id);
  if (!target) return { ok: false, error: "That account no longer exists." };
  if (target.role === role) return { ok: true };

  if (role === "customer") {
    if (target.id === actingUserId) {
      return { ok: false, error: "You cannot remove your own admin access." };
    }
    if (adminCount() <= 1) {
      return { ok: false, error: "That is the only admin. Promote someone else first." };
    }
  }

  getDb().prepare("UPDATE users SET role = ? WHERE id = ?").run(role, id);
  return { ok: true };
}

/** Admin setting somebody else's password, for a lockout. */
export function setUserPassword(
  id: string,
  password: string,
): { ok: true } | { ok: false; error: string } {
  const bad = passwordProblem(password);
  if (bad) return { ok: false, error: bad };
  if (!findById(id)) return { ok: false, error: "That account no longer exists." };

  getDb()
    .prepare("UPDATE users SET password_hash = ? WHERE id = ?")
    .run(hashPassword(password), id);
  return { ok: true };
}

/**
 * Someone changing their own password.
 *
 * Requires the current one even though they are already signed in — an
 * unattended session should not be enough to take an account over.
 */
export function changeOwnPassword(
  id: string,
  currentPassword: string,
  nextPassword: string,
): { ok: true } | { ok: false; error: string } {
  const row = queryOne<{ password_hash: string }>(
    "SELECT password_hash FROM users WHERE id = ?",
    id,
  );
  if (!row) return { ok: false, error: "That account no longer exists." };

  if (!verifyPassword(currentPassword, row.password_hash)) {
    return { ok: false, error: "That is not your current password." };
  }
  const bad = passwordProblem(nextPassword);
  if (bad) return { ok: false, error: bad };
  if (currentPassword === nextPassword) {
    return { ok: false, error: "Choose a password you have not used here before." };
  }

  getDb()
    .prepare("UPDATE users SET password_hash = ? WHERE id = ?")
    .run(hashPassword(nextPassword), id);
  return { ok: true };
}

export function deleteUser(
  id: string,
  actingUserId: string,
): { ok: true } | { ok: false; error: string } {
  if (id === actingUserId) {
    return { ok: false, error: "You cannot delete your own account." };
  }
  const target = findById(id);
  if (!target) return { ok: false, error: "That account no longer exists." };
  if (target.role === "admin" && adminCount() <= 1) {
    return { ok: false, error: "That is the only admin." };
  }

  getDb().prepare("DELETE FROM users WHERE id = ?").run(id);
  return { ok: true };
}
