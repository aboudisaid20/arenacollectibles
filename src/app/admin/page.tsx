import { MetricsRow } from "@/components/admin/MetricsRow";
import { DiscountsPanel } from "@/components/admin/DiscountsPanel";
import { metrics } from "@/lib/store";
import { listDiscounts } from "@/lib/discounts";

export default async function AdminOverview() {
  // Plain synchronous SQLite reads — no await needed, but the page stays
  // async so the layout's auth check runs first.
  const overview = metrics();
  const discounts = listDiscounts();

  return (
    <div className="container-page space-y-12 py-10 md:space-y-16 md:py-14">
      <MetricsRow metrics={overview} />
      <DiscountsPanel discounts={discounts} />
    </div>
  );
}
