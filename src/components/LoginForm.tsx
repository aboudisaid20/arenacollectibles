"use client";

import { useActionState } from "react";
import { useSearchParams } from "next/navigation";
import { WarningCircle, CircleNotch } from "@phosphor-icons/react";
import { Field } from "./ui/field";
import { Button } from "./ui";
import { loginAction, type LoginState } from "@/app/login/actions";
import { useState } from "react";

export function LoginForm() {
  const params = useSearchParams();
  const next = params.get("next") ?? "/admin";
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [state, action, pending] = useActionState<LoginState, FormData>(
    loginAction,
    {},
  );

  return (
    <form action={action} className="mt-9 space-y-5">
      <input type="hidden" name="next" value={next} />

      {state.error && (
        <p
          role="alert"
          className="flex items-start gap-2 border border-flag/50 bg-flag/8 p-4 text-sm text-flag"
        >
          <WarningCircle size={17} weight="fill" aria-hidden="true" className="mt-0.5 shrink-0" />
          {state.error}
        </p>
      )}

      <Field
        id="login-email" label="Email" type="email" inputMode="email"
        autoComplete="username" required value={email} onChange={setEmail}
      />
      <Field
        id="login-password" label="Password" type="password"
        autoComplete="current-password" required value={password}
        onChange={setPassword}
      />
      {/* The real value the action reads — Field is controlled, and a
          password manager still fills the visible input above. */}
      <input type="hidden" name="email" value={email} />
      <input type="hidden" name="password" value={password} />

      <Button type="submit" size="lg" className="w-full" disabled={pending}>
        {pending ? (
          <>
            <CircleNotch size={17} weight="bold" aria-hidden="true" className="animate-spin" />
            Checking…
          </>
        ) : (
          "Sign in"
        )}
      </Button>

      {/* Development only. These are the seeded local accounts, and a
          public login page is the last place credentials belong — the
          check is on NODE_ENV rather than a prop so it cannot be switched
          on by accident in a deployed build. */}
      {process.env.NODE_ENV !== "production" && (
        <div className="border border-line bg-pitch p-4">
          <p className="kicker text-volt">Demo accounts · local only</p>
          <dl className="mt-3 space-y-2 font-mono text-[0.72rem] leading-relaxed text-fog">
            <div>
              <dt className="text-chalk">Admin</dt>
              <dd className="break-token">admin@arena.test · arena-admin-2026</dd>
            </div>
            <div>
              <dt className="text-chalk">Customer (gets redirected)</dt>
              <dd className="break-token">customer@arena.test · arena-customer-2026</dd>
            </div>
          </dl>
        </div>
      )}
    </form>
  );
}
