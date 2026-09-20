import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ProductDetail } from "@/components/ProductDetail";
import { ProductCard } from "@/components/ProductCard";
import { RevealGrid } from "@/components/motion";
import { liveProducts, liveProduct, liveSlugs } from "@/lib/store";
import { formatPrice } from "@/lib/types";

type Params = { params: Promise<{ slug: string }> };

// Slugs are known up front, but stock/price come from the database, so
// each page is rendered per request rather than baked at build time.
export const dynamic = "force-dynamic";

export function generateStaticParams() {
  return liveSlugs().map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { slug } = await params;
  const product = liveProduct(slug);
  if (!product) return { title: "Not found" };
  return {
    title: `${product.subject} — ${product.name}`,
    description: `${product.tagline} ${formatPrice(product.price)}. Authenticated, insured shipping, 14-day returns.`,
  };
}

export default async function ProductPage({ params }: Params) {
  const { slug } = await params;
  const product = liveProduct(slug);
  if (!product) notFound();

  const all = liveProducts();
  const related = [
    ...all.filter((p) => p.slug !== slug && p.category === product.category),
    ...all.filter((p) => p.slug !== slug && p.category !== product.category),
  ].slice(0, 4);

  return (
    <>
      <ProductDetail product={product} />

      <section className="container-page py-20 md:py-28" aria-labelledby="related">
        <div className="flex flex-wrap items-end justify-between gap-6">
          <h2 id="related" className="text-[clamp(2rem,5vw,3.4rem)] text-chalk">
            More on the shelf
          </h2>
          <Link
            href="/shop"
            className="link-sweep tap-pad font-mono text-[0.7rem] uppercase tracking-[0.14em] text-fog hover:text-volt"
          >
            View all
          </Link>
        </div>
        <RevealGrid className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {related.map((p) => <ProductCard key={p.slug} product={p} />)}
        </RevealGrid>
      </section>
    </>
  );
}
