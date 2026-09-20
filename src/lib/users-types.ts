/**
 * User types and the one shared constant, free of `server-only` and of
 * any node: import so the admin Team panel — a client component — can use
 * them. Keeping these here is what stops users.ts, and therefore SQLite,
 * being pulled into the browser bundle.
 */

export type Role = "admin" | "customer";

export interface TeamMember {
  id: string;
  email: string;
  name: string;
  role: Role;
  created_at: string;
}

/** Length only. Composition rules push people toward predictable
 *  substitutions without adding real entropy. */
export const MIN_PASSWORD_LENGTH = 12;
