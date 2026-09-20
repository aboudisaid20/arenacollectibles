import Link from "next/link";
import Image from "next/image";
import { InstagramLogo, XLogo, TiktokLogo } from "@phosphor-icons/react/dist/ssr";

const COLUMNS = [
  {
    title: "Shop",
    links: [
      { href: "/shop?category=wax", label: "Sealed Boxes" },
      { href: "/shop?category=card", label: "Cards" },
      { href: "/shop?category=signed", label: "Signed Memorabilia" },
      { href: "/shop?category=supplies", label: "Supplies" },
      { href: "/shop", label: "Everything" },
    ],
  },
  {
    title: "The House",
    links: [
      { href: "/about", label: "About the Arena" },
      { href: "/contact", label: "Contact" },
      { href: "/contact", label: "Sell to us" },
      { href: "/login", label: "Staff sign in" },
    ],
  },
];

const SOCIAL = [
  { href: "https://instagram.com", label: "Instagram", Icon: InstagramLogo },
  { href: "https://x.com", label: "X", Icon: XLogo },
  { href: "https://tiktok.com", label: "TikTok", Icon: TiktokLogo },
];

export function SiteFooter() {
  return (
    <footer className="border-t border-line bg-void">
      <div className="container-page py-16 md:py-20">
        <div className="grid gap-12 md:grid-cols-[1.3fr_1fr_1fr] md:gap-10">
          <div className="max-w-sm">
            <Image
              src="/brand/arena-logo.png"
              alt="ARENA Collectibles"
              width={755}
              height={427}
              sizes="220px"
              className="h-12 w-auto"
            />
            <p className="mt-6 text-sm leading-relaxed text-fog">
              Graded cards, sealed wax and signed memorabilia. Checked in
              house, priced in the open, shipped insured worldwide.
            </p>
            <ul className="mt-6 flex gap-2">
              {SOCIAL.map(({ href, label, Icon }) => (
                <li key={label}>
                  <a
                    href={href}
                    target="_blank"
                    rel="noreferrer noopener"
                    className="flex h-11 w-11 items-center justify-center border border-line text-fog transition-colors duration-200 hover:border-volt hover:text-volt"
                  >
                    <span className="sr-only">{label} (opens in a new tab)</span>
                    <Icon size={18} weight="fill" aria-hidden="true" />
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {COLUMNS.map((col) => (
            <nav key={col.title} aria-label={col.title}>
              <h2 className="kicker text-volt">{col.title}</h2>
              <ul className="mt-5 space-y-1.5">
                {col.links.map((l) => (
                  <li key={l.href + l.label}>
                    <Link
                      href={l.href}
                      className="link-sweep tap-pad inline-block text-sm text-fog transition-colors duration-200 hover:text-chalk"
                    >
                      {l.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
          ))}
        </div>

        <div className="mt-14 flex flex-col gap-3 border-t border-line pt-8 font-mono text-xs text-steel sm:flex-row sm:items-center sm:justify-between">
          <p>© {new Date().getFullYear()} ARENA Collectibles.</p>
          <p>Every item authenticated · Insured worldwide shipping</p>
        </div>
      </div>
    </footer>
  );
}
