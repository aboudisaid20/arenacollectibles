import type { Metadata } from "next";
import { requireAdmin } from "@/lib/auth";
import { logoutAction } from "@/app/login/actions";
import { AdminNav } from "@/components/admin/AdminNav";

export const metadata: Metadata = {
  title: "Admin",
  robots: { index: false, follow: false },
};

// Always live: this reads mutable inventory and orders.
export const dynamic = "force-dynamic";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  /**
   * Second gate. Middleware already redirected non-admins, but it can
   * only read the signed token — this re-reads the role from the
   * database, so a demoted admin loses access on their next request
   * rather than when the cookie expires.
   */
  const user = await requireAdmin();

  return (
    <div className="pt-8 md:pt-12">
      <div className="container-page">
        <div className="flex flex-wrap items-end justify-between gap-4 pb-6">
          <div>
            <p className="kicker text-volt">Admin</p>
            <h1 className="mt-2 text-[clamp(2.2rem,6vw,3.6rem)] leading-[0.88] text-chalk">
              Control room
            </h1>
          </div>
          <form action={logoutAction} className="flex items-center gap-4">
            <p className="text-right font-mono text-[0.7rem] leading-relaxed text-steel">
              <span className="block text-chalk">{user.name}</span>
              <span className="break-token">{user.email}</span>
            </p>
            <button
              type="submit"
              className="min-h-[44px] cursor-pointer border border-line px-4 font-display text-sm uppercase text-chalk transition-colors hover:border-volt hover:text-volt"
            >
              Sign out
            </button>
          </form>
        </div>
      </div>
      <AdminNav />
      {children}
    </div>
  );
}
