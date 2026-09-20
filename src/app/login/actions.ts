"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { authenticate } from "@/lib/auth";
import { signSession, SESSION_COOKIE, SESSION_MAX_AGE } from "@/lib/session";

export interface LoginState {
  error?: string;
}

/**
 * In-memory attempt throttle. Enough to blunt credential stuffing in a
 * single-instance deployment; a multi-instance one needs Redis or the
 * equivalent. Keyed by email so one attacker cannot lock out everybody.
 */
const attempts = new Map<string, { count: number; first: number }>();
const WINDOW_MS = 10 * 60 * 1000;
const MAX_ATTEMPTS = 8;

function throttled(key: string): boolean {
  const now = Date.now();
  const rec = attempts.get(key);
  if (!rec || now - rec.first > WINDOW_MS) {
    attempts.set(key, { count: 1, first: now });
    return false;
  }
  rec.count += 1;
  return rec.count > MAX_ATTEMPTS;
}

function clearAttempts(key: string) {
  attempts.delete(key);
}

/** Only same-origin absolute paths. Blocks `//evil.com` open redirects. */
function safeNext(raw: FormDataEntryValue | null): string {
  const s = typeof raw === "string" ? raw : "";
  if (!s.startsWith("/") || s.startsWith("//")) return "/admin";
  return s;
}

export async function loginAction(
  _prev: LoginState,
  formData: FormData,
): Promise<LoginState> {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");
  const next = safeNext(formData.get("next"));

  if (!email || !password) {
    return { error: "Enter both your email and password." };
  }

  if (throttled(email)) {
    return { error: "Too many attempts. Wait ten minutes and try again." };
  }

  const user = authenticate(email, password);
  if (!user) {
    // One message for both cases — never reveal which emails exist.
    return { error: "Those details do not match an account." };
  }

  clearAttempts(email);

  const token = await signSession({
    uid: user.id,
    role: user.role,
    email: user.email,
  });

  (await cookies()).set(SESSION_COOKIE, token, {
    httpOnly: true,               // unreadable from JavaScript
    sameSite: "lax",              // blocks cross-site form CSRF
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_MAX_AGE,
  });

  // Customers have no business at /admin, so land them on the shop.
  redirect(user.role === "admin" ? next : "/shop");
}

export async function logoutAction() {
  (await cookies()).delete(SESSION_COOKIE);
  redirect("/");
}
