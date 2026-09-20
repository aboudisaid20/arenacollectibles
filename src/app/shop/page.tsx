import { Suspense } from "react";
import type { Metadata } from "next";
import { ShopBrowser } from "@/components/ShopBrowser";
import { NeonMesh } from "@/components/ui/neon-mesh";
import { allCategories } from "@/lib/products";
import { liveProducts } from "@/lib/store";

export const metadata: Metadata = {
  title: "Shop",
  description:
    "Every graded card, sealed box and signed piece currently on the ARENA shelf. Filter by type, sport and price.",
};

// Stock and price are editable in the admin panel, so this must not be
// statically cached.
export const dynamic = "force-dynamic";

export default function ShopPage() {
  const products = liveProducts();

  const hero = (
    // Keyed because this element is created here, in a Server Component,
    // and handed to a Client Component as a prop. It is reconstructed on
    // the client inside a children array, which React key-validates.
    <NeonMesh
      key="shop-hero"
      className="bleed-under-header border-b border-line"
      intensity={0.6}
      scrim
    >
      {/* Weighted down rather than centred: with the standfirst gone the
          heading was left sitting high with dead space under it. More
          above, less below, so the block sits on the lower edge of the
          band and the products start right after it. */}
      <div className="container-page pb-8 pt-20 md:pb-12 md:pt-28">
        <p className="kicker text-volt">The shelf</p>
        <h1 className="mt-4 text-[clamp(3rem,11vw,8rem)] leading-[0.85] text-chalk">
          Shop
        </h1>
      </div>
    </NeonMesh>
  );

  return (
    // The filter rail is fixed to the viewport edge, so the hero is handed
    // to ShopBrowser rather than rendered here — it has to sit inside the
    // offset content column or the rail would cover it.
    <Suspense fallback={<ShopSkeleton />}>
      <ShopBrowser
        products={products}
        categories={allCategories()}
        hero={hero}
      />
    </Suspense>
  );
}

function ShopSkeleton() {
  return (
    <div className="xl:pl-[32rem]">
      <div className="container-page py-10 md:py-14">
        <div className="grid grid-cols-2 gap-3 sm:gap-5 xl:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="border border-line bg-deck">
              <div className="aspect-square animate-pulse bg-pitch" />
              <div className="space-y-3 p-5">
                <div className="h-3 w-1/3 animate-pulse bg-pitch" />
                <div className="h-6 w-2/3 animate-pulse bg-pitch" />
                <div className="h-3 w-full animate-pulse bg-pitch" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
