import { CurrencyDollar, Receipt, WarningDiamond } from "@phosphor-icons/react/dist/ssr";
import Link from "next/link";
import { formatPrice } from "@/lib/types";
import {
  LOW_STOCK_THRESHOLD, LOW_STOCK_EXCLUDED, type Metrics,
} from "@/lib/store-types";
import { CATEGORY_PLURAL } from "@/lib/types";

/** The three headline numbers. Read-only summary of the tables below. */
export function MetricsRow({ metrics }: { metrics: Metrics }) {
  const { grossRevenue, orderCount, lowStock, outOfStockCount } = metrics;
  const avg = orderCount > 0 ? Math.round(grossRevenue / orderCount) : 0;

  return (
    <section aria-labelledby="metrics-h">
      <h2 id="metrics-h" className="sr-only">Performance overview</h2>
      <div className="grid gap-4 md:grid-cols-3">
        <Card
          Icon={CurrencyDollar}
          label="Gross sales revenue"
          value={formatPrice(grossRevenue)}
          sub={`Average order ${formatPrice(avg)}`}
        />
        <Card
          Icon={Receipt}
          label="Orders processed"
          value={orderCount.toLocaleString("en-US")}
          sub="All time, every status"
        />
        <Card
          Icon={WarningDiamond}
          label="Low stock alerts"
          value={lowStock.length.toLocaleString("en-US")}
          sub={
            outOfStockCount > 0
              ? `${outOfStockCount} already sold out`
              : `At or below ${LOW_STOCK_THRESHOLD} in stock`
          }
          tone={lowStock.length > 0 ? "alert" : "normal"}
          // The whole card is the way into the rows it is counting.
          href="/admin/inventory?stock=low"
          hrefLabel="Open low stock in inventory"
        >
          {lowStock.length > 0 && (
            <ul className="relative z-[1] mt-4 space-y-1 border-t border-line pt-3">
              {lowStock.slice(0, 4).map((p) => (
                <li key={p.slug} className="flex items-baseline justify-between gap-3">
                  <Link
                    href={`/product/${p.slug}`}
                    className="truncate font-mono text-[0.68rem] text-fog underline-offset-4 hover:text-volt hover:underline"
                  >
                    {p.subject}
                  </Link>
                  <span
                    className={`tnum shrink-0 font-mono text-[0.68rem] ${
                      p.stock === 0 ? "text-flag" : "text-volt"
                    }`}
                  >
                    {p.stock === 0 ? "out" : p.stock}
                  </span>
                </li>
              ))}
              {lowStock.length > 4 && (
                <li className="pt-1 font-mono text-[0.62rem] text-steel">
                  +{lowStock.length - 4} more
                </li>
              )}
            </ul>
          )}
          <p className="mt-3 font-mono text-[0.62rem] leading-relaxed text-steel">
            {CATEGORY_PLURAL[LOW_STOCK_EXCLUDED[0]]} excluded — single copies.
          </p>
        </Card>
      </div>
    </section>
  );
}

function Card({
  Icon, label, value, sub, tone = "normal", children, href, hrefLabel,
}: {
  Icon: React.ComponentType<{ size?: number; weight?: "light"; className?: string }>;
  label: string;
  value: string;
  sub: string;
  tone?: "normal" | "alert";
  children?: React.ReactNode;
  /** Makes the whole card a link into the rows behind the number. */
  href?: string;
  hrefLabel?: string;
}) {
  return (
    <div
      className={`relative border bg-pitch p-6 transition-colors ${
        tone === "alert" ? "border-volt/40" : "border-line"
      } ${href ? "hover:border-volt" : ""}`}
    >
      {/* Stretched link: the card is clickable, but the product links
          inside it stay individually clickable because they sit above it. */}
      {href && (
        <Link
          href={href}
          className="absolute inset-0 z-0 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-volt"
        >
          <span className="sr-only">{hrefLabel ?? label}</span>
        </Link>
      )}
      <div className="flex items-start justify-between gap-4">
        <p className="kicker text-steel">{label}</p>
        <Icon
          size={20}
          weight="light"
          className={tone === "alert" ? "text-volt" : "text-steel"}
        />
      </div>
      <p className="tnum mt-4 font-display text-[clamp(2rem,4.5vw,3rem)] leading-none text-volt">
        {value}
      </p>
      <p className="mt-2 font-mono text-[0.68rem] text-steel">{sub}</p>
      {children}
    </div>
  );
}
