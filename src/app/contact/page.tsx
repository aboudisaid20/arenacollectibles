import type { Metadata } from "next";
import { EnvelopeSimple, Phone, MapPin, Clock } from "@phosphor-icons/react/dist/ssr";
import { ContactForm } from "@/components/ContactForm";
import { Reveal } from "@/components/motion";

export const metadata: Metadata = {
  title: "Contact",
  description:
    "Hunting something specific, or selling? Talk to ARENA. We reply within one business day.",
};

const DETAILS = [
  { Icon: EnvelopeSimple, label: "Email", value: "hello@arenacollectibles.co", href: "mailto:hello@arenacollectibles.co" },
  { Icon: Phone, label: "Phone", value: "+44 20 7000 0000", href: "tel:+442070000000" },
  { Icon: MapPin, label: "Viewings", value: "London · New York, by appointment" },
  { Icon: Clock, label: "Reply time", value: "Within one business day" },
];

export default function ContactPage() {
  return (
    <div className="pt-12 md:pt-16">
      <div className="container-page pb-20 md:pb-28">
        <header className="max-w-4xl">
          <p className="kicker text-volt">Contact</p>
          <h1 className="mt-4 text-[clamp(2.8rem,9vw,7rem)] leading-[0.85] text-chalk">
            What are you hunting?
          </h1>
          <p className="mt-7 max-w-xl text-lg leading-relaxed text-fog">
            Chasing something specific, selling a piece, or want a second
            opinion on something you already own — this gets read by a person,
            and answered within a day.
          </p>
        </header>

        <div className="mt-14 grid gap-12 lg:grid-cols-[1.3fr_0.7fr] lg:gap-20">
          <Reveal>
            <div className="border border-line bg-pitch p-6 md:p-9">
              <ContactForm />
            </div>
          </Reveal>

          <Reveal stagger={0.07} className="space-y-7">
            {DETAILS.map(({ Icon, label, value, href }) => {
              const body = (
                <>
                  <p className="font-mono text-[0.64rem] uppercase tracking-[0.16em] text-steel">
                    {label}
                  </p>
                  <p className="mt-1.5 break-token text-base text-chalk">{value}</p>
                </>
              );
              return (
                <div key={label} className="flex gap-4">
                  <Icon size={19} weight="light" aria-hidden="true" className="mt-1 shrink-0 text-volt" />
                  <div className="min-w-0">
                    {href ? (
                      <a href={href} className="link-sweep tap-pad inline-block hover:text-volt">
                        {body}
                      </a>
                    ) : body}
                  </div>
                </div>
              );
            })}

            <div className="border border-line bg-pitch p-6">
              <p className="font-display text-xl text-chalk">Selling something?</p>
              <p className="mt-3 text-sm leading-relaxed text-fog">
                Send photos of the front, back and any cert label. We will come
                back with a number and how we got there — no obligation, and no
                lowball theatre.
              </p>
            </div>
          </Reveal>
        </div>
      </div>
    </div>
  );
}
