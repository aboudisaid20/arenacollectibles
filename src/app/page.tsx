import Link from "next/link";
import { ArrowRight } from "@phosphor-icons/react/dist/ssr";
import { Hero } from "@/components/Hero";
import { Ticker } from "@/components/Ticker";

import { ProductCard } from "@/components/ProductCard";
import { Reveal, RevealGrid, CountUp } from "@/components/motion";
import { ButtonLink, SectionHeading } from "@/components/ui";
import { liveProducts } from "@/lib/store";
import { CATEGORY_PLURAL, CATEGORY_ORDER, type Category } from "@/lib/types";
import { ProductArtwork } from "@/components/ProductArtwork";
import {
  DepartmentPhotos,
  departmentImages,
  DEPARTMENT_FALLBACK_SLUG,
} from "@/lib/department-assets";

const TICKER = [
  "PSA Authorised",
  "BGS Certified",
  "BBCE Authenticated",
  "Insured Worldwide",
  "Free UK & US Shipping Over $250",
  "14-Day Returns",
];

export const dynamic = "force-dynamic";

export default function HomePage() {
  const all = liveProducts();
  // Two fixed rows of three. Slice rather than trust the flag count, so
  // marking a seventh product featured cannot leave a ragged third row.
  const featured = all.filter((p) => p.featured).slice(0, 6);
  // Supplies is stocked and shoppable, just not a headline department —
  // it stays in the menu and on /shop, off the home page.
  const categories: Category[] = CATEGORY_ORDER.filter((c) => c !== "supplies");
  // One directory read for the whole section rather than one per tile.
  const deptImages = departmentImages();

  return (
    <>
      <Hero />

      <Ticker items={TICKER} />

      {/* ---------- Featured ---------- */}
      <section className="container-page py-20 md:py-28" aria-labelledby="drops">
        <Reveal className="flex flex-wrap items-end justify-between gap-6">
          <SectionHeading
            id="drops"
            kicker="In stock now"
            title={<>This week&rsquo;s heat</>}
          />
          <ButtonLink href="/shop" variant="outline" size="sm" arrow>
            All {all.length} items
          </ButtonLink>
        </Reveal>

        <RevealGrid className="mt-12 grid grid-cols-2 gap-3 sm:gap-5 lg:grid-cols-3">
          {featured.map((p) => (
            <ProductCard key={p.slug} product={p} />
          ))}
        </RevealGrid>
      </section>

      {/* ---------- Categories ---------- */}
      <section className="border-y border-line bg-pitch" aria-labelledby="cats">
        <div className="container-page py-20 md:py-28">
          <Reveal>
            <SectionHeading
              id="cats"
              kicker="Pick your lane"
              title="Three ways in"
            />
          </Reveal>

          {/* Phones get a horizontal rail instead of a stack: without
              hover there is no reveal to earn, so the tiles carry the
              green treatment permanently and swiping is the interaction.
              The rail is a labelled, focusable region — a bare
              overflow-x-auto div is pointer-only. From sm up it becomes
              an ordinary grid and hover takes over again. */}
          <RevealGrid
            role="region"
            tabIndex={0}
            aria-label="Departments, scrolls horizontally"
            className="-mx-4 mt-14 flex snap-x snap-mandatory gap-3 overflow-x-auto scroll-smooth px-4 pb-2 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-volt sm:mx-0 sm:grid sm:snap-none sm:grid-cols-2 sm:gap-5 sm:overflow-visible sm:px-0 sm:pb-0 lg:grid-cols-3"
          >
            {categories.map((cat) => {
              const photos = deptImages[cat];
              const hasPhoto = Boolean(photos.rest || photos.hover);
              const stand = all.find((p) => p.slug === DEPARTMENT_FALLBACK_SLUG[cat]);
              return (
                <Link
                  key={cat}
                  href={`/shop?category=${cat}`}
                  className="group flex w-[78vw] shrink-0 snap-start flex-col border border-volt bg-void transition-colors duration-200 sm:w-auto sm:border-line sm:hover:border-volt"
                >
                  {/* Square well. The pictures are different shapes —
                      Cards is portrait (790x1280), the other two square —
                      so `cover` cropped the card in half, and a taller
                      well made it render 20% bigger than the squares.
                      Square is the shape that treats both alike, and it
                      drops the dead space the 5:6 box left above and
                      below the square images. aspect-ratio still reserves
                      the box, so the image arriving never shifts the
                      heading underneath it. */}
                  <div className="relative aspect-square overflow-hidden bg-pitch">
                    <div
                      className="absolute inset-0 z-[1] opacity-100 transition-opacity duration-500 sm:opacity-70 sm:group-hover:opacity-100"
                      style={{
                        background:
                          "linear-gradient(to top, rgba(0,0,0,0.72) 0%, transparent 58%)",
                      }}
                      aria-hidden="true"
                    />
                    <div className="absolute inset-0 transition-transform duration-[600ms] ease-[cubic-bezier(.22,1,.36,1)] group-hover:scale-[1.02]">
                      {hasPhoto ? (
                        <DepartmentPhotos images={photos} />
                      ) : stand ? (
                        // No department photograph supplied yet: show the
                        // artwork of a representative product instead.
                        <div className="grid h-full w-full place-items-center p-10">
                          <ProductArtwork product={stand} className="h-full w-full" />
                        </div>
                      ) : null}
                    </div>
                  </div>

                  <div className="flex items-end justify-between gap-4 p-7 md:p-8">
                    <h3 className="font-display text-[2.2rem] leading-[0.9] text-volt transition-colors duration-200 sm:text-chalk sm:group-hover:text-volt md:text-[2.6rem]">
                      {CATEGORY_PLURAL[cat]}
                    </h3>
                    <ArrowRight
                      size={20}
                      weight="bold"
                      aria-hidden="true"
                      className="mb-1 shrink-0 text-volt transition-all duration-200 sm:text-steel sm:group-hover:translate-x-1 sm:group-hover:text-volt"
                    />
                  </div>
                </Link>
              );
            })}
          </RevealGrid>
        </div>
      </section>

      {/* ---------- Promises ---------- */}

      {/* ---------- Numbers ---------- */}
      <section className="border-y border-line bg-pitch" aria-labelledby="figs">
        <div className="container-page py-16 md:py-20">
          <h2 id="figs" className="sr-only">ARENA in numbers</h2>
          <Reveal className="grid gap-10 sm:grid-cols-2 lg:grid-cols-4">
            {[
              { v: 1400, suffix: "+", k: "Items shipped since 2019" },
              { v: 41, suffix: "", k: "Countries served" },
              { v: 14, suffix: " days", k: "No-questions returns" },
              { v: 0, suffix: "", k: "Authenticity disputes" },
            ].map((s) => (
              <div key={s.k}>
                <p className="font-display text-[3.4rem] leading-none text-volt">
                  <CountUp value={s.v} suffix={s.suffix} />
                </p>
                <p className="mt-3 max-w-[15rem] text-sm leading-relaxed text-fog">
                  {s.k}
                </p>
              </div>
            ))}
          </Reveal>
        </div>
      </section>

      {/* ---------- Mesh CTA band ---------- */}
    </>
  );
}
