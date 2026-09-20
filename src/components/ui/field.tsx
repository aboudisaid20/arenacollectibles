"use client";

import { WarningCircle } from "@phosphor-icons/react";
import type { ReactNode } from "react";

/**
 * Accessible field primitive shared by every form on the site.
 *
 * - visible label always (never placeholder-as-label)
 * - persistent helper text, not a disappearing placeholder
 * - error sits with its field and is wired via aria-describedby
 * - 48px control height: over the 44px touch minimum, and >=16px text
 *   so iOS does not zoom the page on focus
 */
export function Field({
  id,
  label,
  value,
  onChange,
  onBlur,
  error,
  hint,
  required,
  type = "text",
  inputMode,
  autoComplete,
  multiline,
  rows = 5,
  options,
  placeholder,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (v: string) => void;
  onBlur?: () => void;
  error?: string;
  hint?: string;
  required?: boolean;
  type?: string;
  inputMode?: "email" | "tel" | "text" | "numeric";
  autoComplete?: string;
  multiline?: boolean;
  rows?: number;
  /** Renders a <select> instead of an <input>. */
  options?: { value: string; label: string }[];
  placeholder?: string;
}) {
  const hintId = `${id}-hint`;
  const errId = `${id}-error`;
  const describedBy =
    [hint ? hintId : null, error ? errId : null].filter(Boolean).join(" ") ||
    undefined;

  const base = `w-full border bg-pitch px-4 text-base text-chalk placeholder:text-steel transition-colors duration-200 focus:outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-volt ${
    error ? "border-flag" : "border-line focus:border-volt"
  }`;

  return (
    <div className="min-w-0">
      <label
        htmlFor={id}
        className="mb-2 block font-mono text-[0.68rem] uppercase tracking-[0.14em] text-fog"
      >
        {label}
        {required && (
          <>
            <span className="ml-1 text-volt" aria-hidden="true">*</span>
            <span className="sr-only"> (required)</span>
          </>
        )}
      </label>

      {options ? (
        <select
          id={id}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onBlur={onBlur}
          aria-describedby={describedBy}
          aria-invalid={error ? true : undefined}
          className={`${base} h-12 cursor-pointer`}
        >
          {options.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
      ) : multiline ? (
        <textarea
          id={id}
          rows={rows}
          value={value}
          placeholder={placeholder}
          onChange={(e) => onChange(e.target.value)}
          onBlur={onBlur}
          aria-describedby={describedBy}
          aria-invalid={error ? true : undefined}
          className={`${base} resize-y py-3 leading-relaxed`}
        />
      ) : (
        <input
          id={id}
          type={type}
          inputMode={inputMode}
          autoComplete={autoComplete}
          value={value}
          placeholder={placeholder}
          onChange={(e) => onChange(e.target.value)}
          onBlur={onBlur}
          aria-describedby={describedBy}
          aria-invalid={error ? true : undefined}
          className={`${base} h-12`}
        />
      )}

      {hint && !error && (
        <p id={hintId} className="mt-2 text-xs leading-relaxed text-steel">
          {hint}
        </p>
      )}
      {error && (
        <p
          id={errId}
          className="mt-2 flex items-start gap-1.5 text-xs leading-relaxed text-flag"
        >
          <WarningCircle size={13} weight="fill" aria-hidden="true" className="mt-0.5 shrink-0" />
          {error}
        </p>
      )}
    </div>
  );
}

/** Focusable summary shown after a failed submit with multiple errors. */
export function ErrorSummary({
  errors,
  summaryRef,
}: {
  errors: [string, string][];
  summaryRef: React.RefObject<HTMLDivElement | null>;
}) {
  if (errors.length < 2) return null;
  return (
    <div
      ref={summaryRef}
      tabIndex={-1}
      role="alert"
      className="border border-flag/50 bg-flag/8 p-5"
    >
      <p className="flex items-center gap-2 font-display text-lg uppercase text-flag">
        <WarningCircle size={18} weight="fill" aria-hidden="true" />
        {errors.length} things to fix
      </p>
      <ul className="mt-3 space-y-1.5">
        {errors.map(([id, msg]) => (
          <li key={id}>
            <a
              href={`#${id}`}
              onClick={(e) => {
                e.preventDefault();
                document.getElementById(id)?.focus();
              }}
              className="text-sm text-flag underline underline-offset-4 hover:text-chalk"
            >
              {msg}
            </a>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function FieldRow({ children }: { children: ReactNode }) {
  return <div className="grid gap-5 sm:grid-cols-2">{children}</div>;
}
