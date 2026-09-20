import { ButtonLink } from "@/components/ui";

export default function NotFound() {
  return (
    <div className="container-page flex min-h-[70svh] flex-col items-center justify-center py-28 text-center">
      <p className="kicker text-volt">404</p>
      <h1 className="mt-5 text-[clamp(3rem,12vw,9rem)] leading-[0.85] text-chalk">
        Out of bounds
      </h1>
      <p className="mt-6 max-w-md text-base leading-relaxed text-fog">
        That page has been sold, moved, or never existed. The shelf is always
        up to date.
      </p>
      <div className="mt-10 flex flex-wrap justify-center gap-4">
        <ButtonLink href="/shop" size="lg" arrow>Shop everything</ButtonLink>
        <ButtonLink href="/" variant="outline" size="lg">Back home</ButtonLink>
      </div>
    </div>
  );
}
