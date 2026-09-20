"use client";

import { useRef, useState, type FormEvent } from "react";
import { CheckCircle, WarningCircle, CircleNotch } from "@phosphor-icons/react";
import { Field, FieldRow, ErrorSummary } from "./ui/field";
import { Button } from "./ui";

type Values = Record<string, string>;

function validate(v: Values): Record<string, string> {
  const e: Record<string, string> = {};
  if (!v.name.trim()) e.name = "Tell us who we are speaking to.";
  if (!v.email.trim()) e.email = "Enter an email so we can reply.";
  else if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v.email.trim()))
    e.email = "That email is missing an @ or a domain.";
  if (!v.message.trim()) e.message = "Tell us briefly what you are after.";
  else if (v.message.trim().length < 12)
    e.message = "A bit more detail gets you a much better answer.";
  return e;
}

export function ContactForm({ subject }: { subject?: string }) {
  const [values, setValues] = useState<Values>({
    name: "", email: "", phone: "", interest: subject ?? "", message: "",
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [state, setState] = useState<"idle" | "sending" | "sent" | "failed">("idle");
  const summaryRef = useRef<HTMLDivElement>(null);

  const set = (k: string) => (v: string) => {
    setValues((s) => ({ ...s, [k]: v }));
    if (errors[k]) {
      const next = validate({ ...values, [k]: v });
      if (!next[k]) setErrors((e) => ({ ...e, [k]: "" }));
    }
  };
  const blur = (k: string) => () => {
    setTouched((t) => ({ ...t, [k]: true }));
    setErrors((e) => ({ ...e, [k]: validate(values)[k] ?? "" }));
  };

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const found = validate(values);
    const real = Object.fromEntries(Object.entries(found).filter(([, v]) => v));
    setErrors(real);
    setTouched({ name: true, email: true, message: true });
    if (Object.keys(real).length > 0) {
      requestAnimationFrame(() => summaryRef.current?.focus());
      return;
    }
    setState("sending");
    try {
      // Wire to your endpoint / CRM here.
      await new Promise((r) => setTimeout(r, 1000));
      setState("sent");
    } catch {
      setState("failed");
    }
  };

  if (state === "sent") {
    return (
      <div className="border border-volt/40 bg-volt/5 px-6 py-14 text-center" role="status">
        <CheckCircle size={38} weight="light" aria-hidden="true" className="mx-auto text-volt" />
        <h3 className="mt-5 font-display text-3xl text-chalk">Got it</h3>
        <p className="mx-auto mt-3 max-w-sm text-sm leading-relaxed text-fog">
          We reply to everything within one business day. If it is urgent,
          call the shop on{" "}
          <a href="tel:+442070000000" className="link-sweep text-volt">+44 20 7000 0000</a>.
        </p>
        <Button
          variant="outline" size="sm" className="mt-7"
          onClick={() => {
            setValues({ name: "", email: "", phone: "", interest: subject ?? "", message: "" });
            setErrors({}); setTouched({}); setState("idle");
          }}
        >
          Send another
        </Button>
      </div>
    );
  }

  const errorList = Object.entries(errors).filter(([, v]) => v) as [string, string][];

  return (
    <form onSubmit={onSubmit} noValidate className="space-y-5">
      <ErrorSummary errors={errorList} summaryRef={summaryRef} />

      <FieldRow>
        <Field id="name" label="Name" required autoComplete="name"
          value={values.name} onChange={set("name")} onBlur={blur("name")}
          error={touched.name ? errors.name : undefined} />
        <Field id="email" label="Email" type="email" inputMode="email" required
          autoComplete="email" value={values.email} onChange={set("email")}
          onBlur={blur("email")} error={touched.email ? errors.email : undefined} />
      </FieldRow>

      <FieldRow>
        <Field id="phone" label="Phone" type="tel" inputMode="tel" autoComplete="tel"
          value={values.phone} onChange={set("phone")}
          hint="Optional. Faster for anything time-sensitive." />
        <Field id="interest" label="What you are after"
          value={values.interest} onChange={set("interest")}
          hint="Leave blank if you are just browsing." />
      </FieldRow>

      <Field id="message" label="Message" multiline required
        value={values.message} onChange={set("message")} onBlur={blur("message")}
        error={touched.message ? errors.message : undefined}
        hint="Player, set, grade, budget, and how soon you need it." />

      {state === "failed" && (
        <p role="alert" className="flex items-start gap-2 border border-flag/50 bg-flag/8 p-4 text-sm text-flag">
          <WarningCircle size={17} weight="fill" aria-hidden="true" className="mt-0.5 shrink-0" />
          <span>
            That did not send.{" "}
            <button type="button" onClick={() => setState("idle")}
              className="cursor-pointer underline underline-offset-4 hover:text-chalk">
              Try again
            </button>
            , or email{" "}
            <a href="mailto:hello@arenacollectibles.co" className="break-token underline underline-offset-4">
              hello@arenacollectibles.co
            </a>.
          </span>
        </p>
      )}

      <div className="flex flex-wrap items-center gap-5 pt-2">
        <Button type="submit" size="lg" disabled={state === "sending"}>
          {state === "sending" ? (
            <>
              <CircleNotch size={16} weight="bold" aria-hidden="true" className="animate-spin" />
              Sending
            </>
          ) : "Send it"}
        </Button>
        <p className="font-mono text-[0.68rem] leading-relaxed text-steel">
          We reply within one business day.<br />Your details are never shared.
        </p>
      </div>
    </form>
  );
}
