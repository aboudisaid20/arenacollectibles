import type { Metadata, Viewport } from "next";
import { Anton, Lora, IBM_Plex_Mono } from "next/font/google";
import { CartProvider } from "@/lib/cart";
import { liveProducts } from "@/lib/store";
import { getCurrentUser } from "@/lib/auth";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { CartDrawer } from "@/components/CartDrawer";
import { CheckoutOverlay } from "@/components/CheckoutOverlay";
import "./globals.css";

/* Display: heavy condensed poster face. Only ever uppercase and large. */
const anton = Anton({
  subsets: ["latin"],
  weight: ["400"],
  variable: "--font-anton",
  display: "swap",
});

/* Body: serif, for warmth against all that hard black and green. */
const lora = Lora({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-lora",
  display: "swap",
});

/* Data: prices, grades, cert numbers, scoreboard labels. */
const plexMono = IBM_Plex_Mono({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-plex-mono",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL("https://arenacollectibles.example"),
  title: {
    default: "ARENA Collectibles — Graded Cards, Sealed Wax & Signed",
    template: "%s · ARENA",
  },
  description:
    "Graded cards, sealed wax and signed memorabilia. Every piece checked in house, priced in the open, shipped insured. No mystery, no markup games.",
  openGraph: {
    title: "ARENA Collectibles",
    description:
      "Graded cards, sealed wax and signed memorabilia. Checked in house, priced in the open.",
    type: "website",
    siteName: "ARENA Collectibles",
  },
  twitter: { card: "summary_large_image", title: "ARENA Collectibles" },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#000000",
  // Zoom is deliberately left enabled.
};

/**
 * Runs before first paint. Adds `fx-ready` so reveal targets start hidden
 * only when JS is live and motion is welcome — otherwise the page would
 * paint, then GSAP would hide it, then fade it back (a visible flicker).
 * The 4s timer unhides everything if the motion chunk never boots.
 */
const NO_FLASH = `(function(){try{var d=document.documentElement;if(window.matchMedia('(prefers-reduced-motion: reduce)').matches)return;d.classList.add('fx-ready');setTimeout(function(){if(d.getAttribute('data-motion-ready')!=='1'){d.classList.remove('fx-ready')}},4000)}catch(e){}})();`;

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Live price/stock for the cart, and the session for the admin nav link.
  const products = liveProducts();
  const user = await getCurrentUser();

  return (
    <html
      lang="en"
      className={`${anton.variable} ${lora.variable} ${plexMono.variable}`}
      suppressHydrationWarning
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: NO_FLASH }} />
      </head>
      <body>
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[200] focus:bg-volt focus:px-4 focus:py-3 focus:font-display focus:uppercase focus:text-void"
        >
          Skip to main content
        </a>
        <CartProvider products={products}>
          <SiteHeader isAdmin={user?.role === "admin"} />
          <main id="main">{children}</main>
          <SiteFooter />
          <CartDrawer />
          <CheckoutOverlay />
        </CartProvider>
      </body>
    </html>
  );
}
