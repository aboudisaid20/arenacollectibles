import type { Metadata } from "next";
import Link from "next/link";
import { ArrowUpRight } from "@phosphor-icons/react/dist/ssr";
import { NeonMesh } from "@/components/ui/neon-mesh";
import { Reveal, CountUp } from "@/components/motion";
import { ButtonLink, SectionHeading } from "@/components/ui";

export const metadata: Metadata = {
  title: "About the Arena",
  description:
    "Who ARENA Collectibles are, how every item is checked before it goes on the shelf, and what happens after you buy.",
};

/** What we do before anything is listed. */
const CHECKS: { n: string; title: string; body: string }[] = [
  {
    n: "01",
    title: "Verified at source",
    body: "Every graded item is matched against the grader's own population report, cert number first. If the cert does not resolve, it does not get listed.",
  },
  {
    n: "02",
    title: "Photographed as-is",
    body: "No stock shots and no retouching. What you see is the exact item, lit plainly, with flaws left in the frame where they exist.",
  },
  {
    n: "03",
    title: "Seals left alone",
    body: "Sealed wax stays sealed. We check wrap, weight and case marks against known factory characteristics, and say plainly when a box has been resealed.",
  },
  {
    n: "04",
    title: "Signatures cross-checked",
    body: "Autographs are compared against dated exemplars and, where possible, against the signing event itself. In-person and witnessed pieces are labelled as such.",
  },
];

const FIGURES = [
  { v: 1400, suffix: "+", k: "Items shipped since 2019" },
  { v: 41, suffix: "", k: "Countries served" },
  { v: 14, suffix: " days", k: "No-questions returns" },
  { v: 0, suffix: "", k: "Authenticity disputes" },
];

/** The practical answers people actually write in to ask. */
const PRACTICAL: { q: string; a: string }[] = [
  {
    q: "Shipping",
    a: "Fully insured worldwide, tracked door to door, and free above $250. Anything over $10,000 ships in a hard case with a signature required on delivery.",
  },
  {
    q: "Returns",
    a: "Fourteen days from delivery, no questions asked, as long as slabs and seals come back untouched. We refund the item and the original shipping.",
  },
  {
    q: "Selling to us",
    a: "We buy outright and take consignment on single pieces and whole collections. Send photos and cert numbers and you get a real number back, usually the same day.",
  },
  {
    q: "Viewings",
    a: "London and New York, by appointment. If you are spending serious money, you should be allowed to hold the thing first.",
  },
];

export default function AboutPage() {
  return (
    <>
      <NeonMesh className="bleed-under-header border-b border-line" intensity={0.6} scrim>
        <div className="container-page py-16 md:py-24">
          <p className="kicker text-volt">About the Arena</p>
          <h1 className="mt-4 max-w-[14ch] text-[clamp(2.8rem,9vw,7rem)] leading-[0.85] text-chalk">
            We only sell what we&rsquo;d keep
          </h1>
          <p className="mt-7 max-w-xl text-lg leading-relaxed text-fog">
            ARENA is a small, dealer-run shop for graded cards, sealed wax and
            signed pieces. Everything on the shelf has been through our hands
            first — checked, photographed and priced in the open.
          </p>
        </div>
      </NeonMesh>

      {/* ---------- The story ---------- */}
      <section className="container-page py-20 md:py-28" aria-labelledby="story">
        <div className="grid gap-12 lg:grid-cols-[0.9fr_1.1fr] lg:gap-20">
          <Reveal>
            <SectionHeading id="story" kicker="The house" title="Why we started" />
          </Reveal>
          <Reveal stagger={0.08} className="space-y-6 text-lg leading-relaxed text-fog">
            <p>
              The hobby got big fast, and a lot of it got worse in the process.
              Listings with no cert number. Photographs that flatter. Prices
              that move depending on how keen you sound on the phone.
            </p>
            <p>
              We started ARENA because the pieces deserve better than that. A
              1986 Fleer Jordan or a sealed box that has survived forty years
              is a genuine artefact, and it should be sold like one — with its
              paperwork visible and its faults stated.
            </p>
            <p className="text-chalk">
              So the rule here is simple: if we would not put it in our own
              case, it does not go on the shelf.
            </p>
          </Reveal>
        </div>
      </section>

      {/* ---------- How we check ---------- */}
      <section className="border-y border-line bg-pitch" aria-labelledby="checks">
        <div className="container-page py-20 md:py-28">
          <Reveal>
            <SectionHeading
              id="checks"
              kicker="Before it is listed"
              title="How every item is checked"
              align="center"
            />
          </Reveal>

          <Reveal stagger={0.07} className="mt-14 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {CHECKS.map((c) => (
              <div key={c.n} className="border border-line bg-void p-7">
                <p className="tnum font-mono text-xs text-volt">{c.n}</p>
                <h3 className="mt-4 font-display text-2xl leading-[0.95] text-chalk">
                  {c.title}
                </h3>
                <p className="mt-3.5 text-sm leading-relaxed text-fog">{c.body}</p>
              </div>
            ))}
          </Reveal>
        </div>
      </section>

      {/* ---------- Figures ---------- */}
      <section className="container-page py-16 md:py-20" aria-labelledby="figs">
        <h2 id="figs" className="sr-only">ARENA in numbers</h2>
        <Reveal className="grid gap-10 sm:grid-cols-2 lg:grid-cols-4">
          {FIGURES.map((s) => (
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
      </section>

      {/* ---------- Practical ---------- */}
      <section className="border-t border-line bg-pitch" aria-labelledby="practical">
        <div className="container-page py-20 md:py-28">
          <div className="grid gap-12 lg:grid-cols-[0.9fr_1.1fr] lg:gap-20">
            <Reveal>
              <SectionHeading
                id="practical"
                kicker="The practical bit"
                title="Shipping, returns, selling"
              />
            </Reveal>

            <Reveal stagger={0.06}>
              <dl className="border-t border-line">
                {PRACTICAL.map((p) => (
                  <div key={p.q} className="border-b border-line py-6">
                    <dt className="font-display text-xl uppercase text-chalk">
                      {p.q}
                    </dt>
                    <dd className="mt-2.5 max-w-2xl text-base leading-relaxed text-fog">
                      {p.a}
                    </dd>
                  </div>
                ))}
              </dl>

              <div className="mt-10 flex flex-wrap items-center gap-4">
                <ButtonLink href="/shop" size="lg" arrow>
                  Shop everything
                </ButtonLink>
                <Link
                  href="/contact"
                  className="group inline-flex min-h-[44px] items-center gap-2 font-mono text-[0.7rem] uppercase tracking-[0.14em] text-fog transition-colors hover:text-volt"
                >
                  Or talk to us
                  <ArrowUpRight
                    size={14}
                    weight="bold"
                    aria-hidden="true"
                    className="transition-transform duration-200 group-hover:translate-x-0.5"
                  />
                </Link>
              </div>
            </Reveal>
          </div>
        </div>
      </section>
    </>
  );
}
