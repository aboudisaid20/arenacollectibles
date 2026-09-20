import { Suspense } from "react";
import { InventoryPanel } from "@/components/admin/InventoryPanel";
import { allProducts } from "@/lib/store";

export default async function AdminInventoryPage() {
  const products = allProducts();

  return (
    <div className="container-page py-10 md:py-14">
      {/* The panel reads ?stock= from the URL, so it needs a Suspense
          boundary for useSearchParams during prerender. */}
      <Suspense fallback={null}>
        <InventoryPanel products={products} />
      </Suspense>
    </div>
  );
}
