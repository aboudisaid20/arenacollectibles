"use client";

import { useEffect, useState } from "react";

/**
 * Scrolling strip — one continuous loop, never interrupted.
 *
 * NOTE ON WCAG 2.2.2 (Pause, Stop, Hide): the pause control was removed
 * by request, and hover-pause with it, since stopping under the cursor
 * is not "continuous". The remaining mechanism is `prefers-reduced-
 * motion`, which stops it dead for anyone who has asked the OS for less
 * movement. That covers the users the criterion exists for, but it is
 * not the discoverable control the SC asks for — a knowing trade-off,
 * not an oversight. Restoring the button is a small change.
 */
export function Ticker({
  items,
  tone = "volt",
}: {
  items: string[];
  tone?: "volt" | "dark";
}) {
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const sync = () => setReduced(mq.matches);
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);

  const running = !reduced;
  const isVolt = tone === "volt";

  return (
    <div
      className={`relative overflow-hidden border-y ${
        isVolt ? "border-volt bg-volt text-void" : "border-line bg-void text-chalk"
      }`}
    >
      <div className="flex items-center">
        <div className="min-w-0 flex-1 overflow-hidden py-3">
          <div
            className="ticker-track items-center gap-8"
            style={{ animation: running ? "arena-ticker 38s linear infinite" : "none" }}
          >
            {[0, 1].map((copy) => (
              <div
                key={copy}
                className="flex items-center gap-8"
                aria-hidden={copy === 1 ? "true" : undefined}
              >
                {items.map((item) => (
                  <span
                    key={item}
                    className="flex shrink-0 items-center gap-8 whitespace-nowrap font-display text-lg uppercase tracking-wide md:text-xl"
                  >
                    {item}
                    <span
                      className={`h-2 w-2 shrink-0 ${isVolt ? "bg-void" : "bg-volt"}`}
                      aria-hidden="true"
                    />
                  </span>
                ))}
              </div>
            ))}
          </div>
        </div>

      </div>

      <style>{`
        @keyframes arena-ticker {
          from { transform: translate3d(0,0,0); }
          to   { transform: translate3d(-50%,0,0); }
        }
      `}</style>
    </div>
  );
}
