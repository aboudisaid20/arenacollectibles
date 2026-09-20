import type { Metadata } from "next";
import { Suspense } from "react";
import { LoginForm } from "@/components/LoginForm";

export const metadata: Metadata = {
  title: "Sign in",
  robots: { index: false, follow: false },
};

export default function LoginPage() {
  return (
    <div className="container-page flex min-h-panel items-center py-16">
      <div className="mx-auto w-full max-w-md">
        <p className="kicker text-volt">Staff access</p>
        <h1 className="mt-4 text-[clamp(2.6rem,9vw,4.5rem)] leading-[0.86] text-chalk">
          Sign in
        </h1>
        <p className="mt-5 text-sm leading-relaxed text-fog">
          The admin panel is restricted. Customer accounts can sign in here
          too, but will be sent to the shop.
        </p>

        <Suspense fallback={<div className="mt-9 h-64 animate-pulse bg-pitch" />}>
          <LoginForm />
        </Suspense>
      </div>
    </div>
  );
}
