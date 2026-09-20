"use client";

import { useState, useTransition, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import {
  Check, CircleNotch, Plus, Trash, WarningCircle, X, Key,
} from "@phosphor-icons/react";
import {
  createUserAction, setUserRoleAction, setUserPasswordAction,
  deleteUserAction, changeOwnPasswordAction,
} from "@/app/admin/actions";
import { MIN_PASSWORD_LENGTH, type Role, type TeamMember } from "@/lib/users-types";

const INPUT =
  "h-11 w-full min-w-0 border border-line bg-void px-3 text-sm text-chalk placeholder:text-steel focus:border-volt focus:outline-none";

/**
 * Team management.
 *
 * Every rule that matters — last admin, self-demotion, password length —
 * is enforced server-side. What is disabled here is a courtesy so the
 * control that cannot work does not look like it should.
 */
export function TeamPanel({
  users,
  meId,
}: {
  users: TeamMember[];
  meId: string;
}) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [resetting, setResetting] = useState<string | null>(null);

  const adminCount = users.filter((u) => u.role === "admin").length;

  const flash = (msg: string) => {
    setSaved(msg);
    window.setTimeout(() => setSaved((s) => (s === msg ? null : s)), 2800);
  };

  const run = async (
    key: string,
    fn: () => Promise<{ ok: boolean; error?: string }>,
    okMessage: string,
  ) => {
    setError(null);
    setBusy(key);
    const res = await fn();
    setBusy(null);
    if (!res.ok) { setError(res.error ?? "That did not work."); return false; }
    flash(okMessage);
    startTransition(() => router.refresh());
    return true;
  };

  return (
    <section aria-labelledby="team-h">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="kicker text-volt">Access</p>
          <h2 id="team-h" className="mt-2 font-display text-3xl text-chalk">
            Team
          </h2>
          <p className="mt-1 font-mono text-[0.7rem] text-steel">
            <span className="tnum text-chalk">{adminCount}</span>{" "}
            {adminCount === 1 ? "admin" : "admins"} ·{" "}
            <span className="tnum">{users.length}</span> total
          </p>
        </div>
        {!adding && (
          <button
            type="button"
            onClick={() => setAdding(true)}
            className="flex min-h-[48px] cursor-pointer items-center gap-2 bg-volt px-5 font-display text-base uppercase tracking-wide text-void transition-colors hover:bg-volt-dim"
          >
            <Plus size={16} weight="bold" aria-hidden="true" />
            Add person
          </button>
        )}
      </div>

      {adding && (
        <AddPerson
          busy={busy === "__new__"}
          onCancel={() => setAdding(false)}
          onSubmit={async (v) => {
            const ok = await run("__new__", () => createUserAction(v), `${v.email} added`);
            if (ok) setAdding(false);
          }}
        />
      )}

      <div role="status" aria-live="polite" className="mt-3 min-h-[1.25rem]">
        {saved && (
          <p className="flex items-center gap-2 font-mono text-xs text-volt">
            <Check size={13} weight="bold" aria-hidden="true" />
            {saved}
          </p>
        )}
      </div>
      {error && (
        <p role="alert" className="mt-1 flex items-start gap-2 border border-flag/50 bg-flag/8 p-3 text-sm text-flag">
          <WarningCircle size={15} weight="fill" aria-hidden="true" className="mt-0.5 shrink-0" />
          {error}
        </p>
      )}

      <ul className="mt-4 divide-y divide-line border border-line">
        {users.map((u) => {
          const isMe = u.id === meId;
          const lastAdmin = u.role === "admin" && adminCount <= 1;
          const working = busy === u.id;

          return (
            <li key={u.id} className="bg-void p-4">
              <div className="flex flex-wrap items-center gap-x-4 gap-y-3">
                <div className="min-w-0 flex-1">
                  <p className="font-display text-lg uppercase text-chalk">
                    {u.name}
                    {isMe && (
                      <span className="ml-2 font-mono text-[0.62rem] uppercase tracking-[0.14em] text-volt">
                        You
                      </span>
                    )}
                  </p>
                  <p className="break-token font-mono text-[0.68rem] text-steel">
                    {u.email}
                  </p>
                </div>

                <div>
                  <label htmlFor={`role-${u.id}`} className="sr-only">
                    Role for {u.name}
                  </label>
                  <select
                    id={`role-${u.id}`}
                    value={u.role}
                    disabled={working || isMe || lastAdmin}
                    onChange={(e) =>
                      run(u.id, () => setUserRoleAction(u.id, e.target.value),
                        `${u.name} is now ${e.target.value}`)
                    }
                    className="h-11 cursor-pointer border border-line bg-pitch px-3 text-sm text-chalk focus:border-volt focus:outline-none disabled:cursor-not-allowed disabled:text-steel"
                  >
                    <option value="admin">Admin</option>
                    <option value="customer">Customer</option>
                  </select>
                </div>

                <button
                  type="button"
                  onClick={() => setResetting(resetting === u.id ? null : u.id)}
                  disabled={working}
                  className="inline-flex min-h-[44px] cursor-pointer items-center gap-1.5 border border-line px-3 font-mono text-[0.66rem] uppercase tracking-wide text-fog transition-colors hover:border-volt hover:text-volt disabled:cursor-not-allowed"
                >
                  <Key size={13} weight="bold" aria-hidden="true" />
                  Reset password
                </button>

                <button
                  type="button"
                  onClick={() => {
                    if (!window.confirm(`Remove ${u.name}? This cannot be undone.`)) return;
                    run(u.id, () => deleteUserAction(u.id), `${u.name} removed`);
                  }}
                  disabled={working || isMe || lastAdmin}
                  title={
                    isMe ? "You cannot delete your own account"
                      : lastAdmin ? "This is the only admin" : undefined
                  }
                  className="inline-flex min-h-[44px] cursor-pointer items-center gap-1.5 px-2 font-mono text-[0.66rem] uppercase tracking-wide text-steel transition-colors hover:text-flag disabled:cursor-not-allowed disabled:text-line-hot"
                >
                  <Trash size={13} weight="bold" aria-hidden="true" />
                  Remove
                </button>
              </div>

              {resetting === u.id && (
                <ResetPassword
                  name={u.name}
                  busy={working}
                  onCancel={() => setResetting(null)}
                  onSubmit={async (pw) => {
                    const ok = await run(u.id, () => setUserPasswordAction(u.id, pw),
                      `Password set for ${u.name}`);
                    if (ok) setResetting(null);
                  }}
                />
              )}
            </li>
          );
        })}
      </ul>

      <OwnPassword />
    </section>
  );
}

/* ---------- add ---------- */

function AddPerson({
  busy, onSubmit, onCancel,
}: {
  busy: boolean;
  onSubmit: (v: { email: string; name: string; role: Role; password: string }) => void;
  onCancel: () => void;
}) {
  const [v, setV] = useState({
    email: "", name: "", role: "admin" as Role, password: "",
  });

  return (
    <form
      onSubmit={(e: FormEvent) => { e.preventDefault(); onSubmit(v); }}
      className="mt-5 border border-volt/40 bg-pitch p-5"
    >
      <div className="flex items-start justify-between gap-4">
        <h3 className="font-display text-xl uppercase text-chalk">Add person</h3>
        <button
          type="button" onClick={onCancel}
          className="-mr-2 -mt-1 flex h-10 w-10 cursor-pointer items-center justify-center text-chalk hover:text-volt"
        >
          <span className="sr-only">Cancel</span>
          <X size={18} weight="bold" aria-hidden="true" />
        </button>
      </div>

      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="new-name" className={LABEL}>Name</label>
          <input
            id="new-name" value={v.name} required
            onChange={(e) => setV({ ...v, name: e.target.value })}
            placeholder="Sam Reyes" className={INPUT}
          />
        </div>
        <div>
          <label htmlFor="new-email" className={LABEL}>Email</label>
          <input
            id="new-email" type="email" value={v.email} required
            autoComplete="off"
            onChange={(e) => setV({ ...v, email: e.target.value })}
            placeholder="sam@example.com" className={INPUT}
          />
        </div>
        <div>
          <label htmlFor="new-role" className={LABEL}>Role</label>
          <select
            id="new-role" value={v.role}
            onChange={(e) => setV({ ...v, role: e.target.value as Role })}
            className={INPUT}
          >
            <option value="admin">Admin — full access</option>
            <option value="customer">Customer — shop only</option>
          </select>
        </div>
        <div>
          <label htmlFor="new-password" className={LABEL}>
            Password ({MIN_PASSWORD_LENGTH}+ characters)
          </label>
          <input
            id="new-password" type="text" value={v.password} required
            autoComplete="off" spellCheck={false}
            onChange={(e) => setV({ ...v, password: e.target.value })}
            placeholder="Generate one in a password manager" className={INPUT}
          />
        </div>
      </div>

      <p className="mt-3 font-mono text-[0.62rem] leading-relaxed text-steel">
        You are setting this password, so you will know it — send it to them
        over something private, and tell them to change it from their own
        account below once they are in.
      </p>

      <button
        type="submit" disabled={busy}
        className="mt-5 flex min-h-[48px] cursor-pointer items-center gap-2 bg-volt px-6 font-display text-base uppercase tracking-wide text-void transition-colors hover:bg-volt-dim disabled:cursor-not-allowed disabled:bg-deck disabled:text-steel"
      >
        {busy
          ? <CircleNotch size={16} weight="bold" aria-hidden="true" className="animate-spin" />
          : <Plus size={16} weight="bold" aria-hidden="true" />}
        {busy ? "Adding…" : "Add person"}
      </button>
    </form>
  );
}

/* ---------- admin resetting someone else ---------- */

function ResetPassword({
  name, busy, onSubmit, onCancel,
}: {
  name: string;
  busy: boolean;
  onSubmit: (pw: string) => void;
  onCancel: () => void;
}) {
  const [pw, setPw] = useState("");
  return (
    <div className="mt-4 border border-line bg-pitch p-4">
      <p className="font-mono text-[0.66rem] uppercase tracking-[0.14em] text-steel">
        New password for {name}
      </p>
      <div className="mt-3 flex flex-wrap gap-2">
        <input
          type="text" value={pw} autoComplete="off" spellCheck={false}
          onChange={(e) => setPw(e.target.value)}
          placeholder={`At least ${MIN_PASSWORD_LENGTH} characters`}
          aria-label={`New password for ${name}`}
          className={`${INPUT} sm:w-72`}
        />
        <button
          type="button" onClick={() => onSubmit(pw)} disabled={busy || !pw}
          className="min-h-[44px] cursor-pointer bg-volt px-4 font-display text-sm uppercase text-void transition-colors hover:bg-volt-dim disabled:cursor-not-allowed disabled:bg-deck disabled:text-steel"
        >
          Set
        </button>
        <button
          type="button" onClick={onCancel}
          className="min-h-[44px] cursor-pointer border border-line px-4 font-mono text-[0.66rem] uppercase text-fog transition-colors hover:border-volt hover:text-volt"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}

/* ---------- your own account ---------- */

function OwnPassword() {
  const [v, setV] = useState({ current: "", next: "", confirm: "" });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    if (v.next !== v.confirm) { setError("The two new passwords do not match."); return; }

    setBusy(true);
    const res = await changeOwnPasswordAction({
      currentPassword: v.current, newPassword: v.next,
    });
    setBusy(false);

    if (!res.ok) { setError(res.error ?? "Could not change your password."); return; }
    setV({ current: "", next: "", confirm: "" });
    setDone(true);
    window.setTimeout(() => setDone(false), 4000);
  };

  return (
    <form onSubmit={submit} className="mt-10 border border-line bg-pitch p-5 md:p-6">
      <h3 className="font-display text-xl uppercase text-chalk">Your password</h3>
      <p className="mt-1 font-mono text-[0.68rem] text-steel">
        Changing your own. Your current password is required even though you
        are signed in.
      </p>

      <div className="mt-5 grid gap-4 sm:grid-cols-3">
        <div>
          <label htmlFor="pw-current" className={LABEL}>Current</label>
          <input
            id="pw-current" type="password" value={v.current} required
            autoComplete="current-password"
            onChange={(e) => setV({ ...v, current: e.target.value })}
            className={INPUT}
          />
        </div>
        <div>
          <label htmlFor="pw-new" className={LABEL}>
            New ({MIN_PASSWORD_LENGTH}+)
          </label>
          <input
            id="pw-new" type="password" value={v.next} required
            autoComplete="new-password"
            onChange={(e) => setV({ ...v, next: e.target.value })}
            className={INPUT}
          />
        </div>
        <div>
          <label htmlFor="pw-confirm" className={LABEL}>Confirm new</label>
          <input
            id="pw-confirm" type="password" value={v.confirm} required
            autoComplete="new-password"
            onChange={(e) => setV({ ...v, confirm: e.target.value })}
            className={INPUT}
          />
        </div>
      </div>

      {error && (
        <p role="alert" className="mt-4 flex items-start gap-2 text-sm text-flag">
          <WarningCircle size={15} weight="fill" aria-hidden="true" className="mt-0.5 shrink-0" />
          {error}
        </p>
      )}
      <div role="status" aria-live="polite">
        {done && (
          <p className="mt-4 flex items-center gap-2 font-mono text-xs text-volt">
            <Check size={13} weight="bold" aria-hidden="true" />
            Password changed. Use it next time you sign in.
          </p>
        )}
      </div>

      <button
        type="submit" disabled={busy}
        className="mt-5 flex min-h-[48px] cursor-pointer items-center gap-2 border border-line-hot px-6 font-display text-base uppercase tracking-wide text-chalk transition-colors hover:border-volt hover:text-volt disabled:cursor-not-allowed disabled:text-steel"
      >
        {busy && <CircleNotch size={16} weight="bold" aria-hidden="true" className="animate-spin" />}
        {busy ? "Changing…" : "Change password"}
      </button>
    </form>
  );
}

const LABEL =
  "mb-1.5 block font-mono text-[0.62rem] uppercase tracking-[0.16em] text-steel";
