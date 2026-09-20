import Image from "next/image";
import type { Product } from "@/lib/types";

/**
 * Vector stand-ins for product photography.
 *
 * Each category renders as a recognisable physical object — a graded
 * slab, a sealed wax box, a framed signed product. Deterministic (no
 * randomness → no hydration drift), themeable off `product.accent`, and
 * resolution-independent.
 *
 * When a product has an uploaded photograph (`product.image`, set from
 * the admin panel) that is rendered instead and the vector is skipped
 * entirely. The vector is the fallback, not the default.
 */

export function ProductArtwork({
  product,
  className = "",
  priority = false,
}: {
  product: Product;
  className?: string;
  priority?: boolean;
}) {
  const id = product.slug.replace(/[^a-z0-9]/gi, "");
  const common = { id, accent: product.accent, product };

  if (product.image) {
    return (
      <div className={`relative ${className}`}>
        <Image
          src={product.image}
          // Decorative here: every caller renders the product name in
          // adjacent text, so alt would only duplicate it.
          alt=""
          fill
          priority={priority}
          sizes="(min-width: 1280px) 22vw, (min-width: 640px) 45vw, 90vw"
          className="object-contain"
        />
      </div>
    );
  }

  return (
    <div className={`relative ${className}`} aria-hidden="true">
      {product.category === "card" && <SlabArt {...common} priority={priority} />}
      {product.category === "wax" && <WaxArt {...common} />}
      {product.category === "signed" && <SignedArt {...common} />}
      {product.category === "supplies" && <SuppliesArt {...common} />}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Graded card slab                                                    */
/* ------------------------------------------------------------------ */

function SlabArt({
  id,
  accent,
  product,
}: {
  id: string;
  accent: string;
  product: Product;
  priority?: boolean;
}) {
  const spec = product.category === "card" ? product.spec : null;
  const grader = spec?.grader ?? "PSA";
  const grade = spec?.grade ?? "";
  const gradeNum = grade.match(/[\d.]+$/)?.[0] ?? "";

  return (
    <svg
      viewBox="0 0 400 560"
      className="h-full w-full"
      role="presentation"
      focusable="false"
    >
      <defs>
        <linearGradient id={`holder-${id}`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#3a3a40" />
          <stop offset="35%" stopColor="#1e1e22" />
          <stop offset="65%" stopColor="#26262b" />
          <stop offset="100%" stopColor="#141417" />
        </linearGradient>
        <linearGradient id={`glass-${id}`} x1="0" y1="0" x2="0.7" y2="1">
          <stop offset="0%" stopColor="#ffffff" stopOpacity="0.16" />
          <stop offset="45%" stopColor="#ffffff" stopOpacity="0.02" />
          <stop offset="100%" stopColor="#ffffff" stopOpacity="0.07" />
        </linearGradient>
        <linearGradient id={`card-${id}`} x1="0" y1="0" x2="0.4" y2="1">
          <stop offset="0%" stopColor={accent} stopOpacity="0.95" />
          <stop offset="55%" stopColor={accent} stopOpacity="0.62" />
          <stop offset="100%" stopColor="#0d0d0f" stopOpacity="0.9" />
        </linearGradient>
        <radialGradient id={`figure-${id}`} cx="0.5" cy="0.32" r="0.72">
          <stop offset="0%" stopColor="#ffffff" stopOpacity="0.42" />
          <stop offset="60%" stopColor="#ffffff" stopOpacity="0.08" />
          <stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
        </radialGradient>
        <clipPath id={`clip-${id}`}>
          <rect x="46" y="150" width="308" height="356" rx="4" />
        </clipPath>
      </defs>

      {/* Holder shell */}
      <rect x="18" y="14" width="364" height="532" rx="14" fill={`url(#holder-${id})`} />
      <rect
        x="18.5"
        y="14.5"
        width="363"
        height="531"
        rx="14"
        fill="none"
        stroke="#4a4a52"
        strokeOpacity="0.55"
      />

      {/* Label */}
      <rect x="40" y="36" width="320" height="96" rx="3" fill="#F4F1EA" />
      <rect x="40" y="36" width="320" height="4" rx="2" fill={accent} />
      <text
        x="58"
        y="66"
        fontFamily="Montserrat, sans-serif"
        fontSize="15"
        fontWeight="700"
        letterSpacing="2.4"
        fill="#16151a"
      >
        {grader}
      </text>
      <text
        x="58"
        y="90"
        fontFamily="Montserrat, sans-serif"
        fontSize="12"
        fontWeight="600"
        fill="#2c2b31"
      >
        {truncate(product.subject, 22)}
      </text>
      <text
        x="58"
        y="110"
        fontFamily="Montserrat, sans-serif"
        fontSize="9.5"
        fontWeight="500"
        letterSpacing="0.6"
        fill="#615f68"
      >
        {truncate(spec?.set ?? "", 34)}
      </text>

      {/* Grade block */}
      <rect x="286" y="52" width="60" height="64" rx="3" fill="#16151a" />
      <text
        x="316"
        y="80"
        textAnchor="middle"
        fontFamily="Montserrat, sans-serif"
        fontSize="8"
        fontWeight="600"
        letterSpacing="1.2"
        fill="#c9c6bf"
      >
        GRADE
      </text>
      <text
        x="316"
        y="107"
        textAnchor="middle"
        fontFamily="Montserrat, sans-serif"
        fontSize="24"
        fontWeight="700"
        fill="#F4F1EA"
      >
        {gradeNum}
      </text>

      {/* Card window */}
      <g clipPath={`url(#clip-${id})`}>
        <rect x="46" y="150" width="308" height="356" fill={`url(#card-${id})`} />
        {/* Inner card border, period style */}
        <rect
          x="60"
          y="164"
          width="280"
          height="328"
          fill="none"
          stroke="#ffffff"
          strokeOpacity="0.5"
          strokeWidth="3"
        />
        {/* Abstract figure */}
        <ellipse cx="200" cy="286" rx="118" ry="132" fill={`url(#figure-${id})`} />
        <path
          d="M200 214c19 0 34 15 34 34s-15 36-34 36-34-17-34-36 15-34 34-34z"
          fill="#ffffff"
          fillOpacity="0.34"
        />
        <path
          d="M136 392c0-40 29-72 64-72s64 32 64 72v34H136z"
          fill="#ffffff"
          fillOpacity="0.28"
        />
        {/* Nameplate */}
        <rect x="60" y="440" width="280" height="52" fill="#0b0b0c" fillOpacity="0.62" />
        <text
          x="200"
          y="464"
          textAnchor="middle"
          fontFamily="Montserrat, sans-serif"
          fontSize="15"
          fontWeight="700"
          letterSpacing="1.4"
          fill="#F4F1EA"
        >
          {truncate(product.subject.toUpperCase(), 20)}
        </text>
        <text
          x="200"
          y="481"
          textAnchor="middle"
          fontFamily="Montserrat, sans-serif"
          fontSize="9"
          fontWeight="500"
          letterSpacing="2"
          fill={accent}
        >
          {product.year}
        </text>
      </g>

      {/* Glass */}
      <rect x="18" y="14" width="364" height="532" rx="14" fill={`url(#glass-${id})`} />
      <path
        d="M52 546 L296 14 L354 14 L110 546 Z"
        fill="#ffffff"
        fillOpacity="0.028"
      />
    </svg>
  );
}

/* ------------------------------------------------------------------ */
/* Sealed wax box                                                      */
/* ------------------------------------------------------------------ */

function WaxArt({ id, accent, product }: { id: string; accent: string; product: Product }) {
  const spec = product.category === "wax" ? product.spec : null;

  return (
    <svg viewBox="0 0 400 560" className="h-full w-full" role="presentation" focusable="false">
      <defs>
        <linearGradient id={`front-${id}`} x1="0" y1="0" x2="0.3" y2="1">
          <stop offset="0%" stopColor={accent} stopOpacity="0.95" />
          <stop offset="100%" stopColor={accent} stopOpacity="0.55" />
        </linearGradient>
        <linearGradient id={`side-${id}`} x1="0" y1="0" x2="1" y2="0.2">
          <stop offset="0%" stopColor="#000000" stopOpacity="0.55" />
          <stop offset="100%" stopColor="#000000" stopOpacity="0.3" />
        </linearGradient>
        <linearGradient id={`top-${id}`} x1="0" y1="0" x2="0.6" y2="1">
          <stop offset="0%" stopColor="#ffffff" stopOpacity="0.28" />
          <stop offset="100%" stopColor="#ffffff" stopOpacity="0.1" />
        </linearGradient>
        <linearGradient id={`cello-${id}`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#ffffff" stopOpacity="0.3" />
          <stop offset="28%" stopColor="#ffffff" stopOpacity="0.03" />
          <stop offset="52%" stopColor="#ffffff" stopOpacity="0.22" />
          <stop offset="74%" stopColor="#ffffff" stopOpacity="0.02" />
          <stop offset="100%" stopColor="#ffffff" stopOpacity="0.16" />
        </linearGradient>
      </defs>

      <g transform="translate(0,-28)">
      {/* Box body, slight 3/4 view */}
      <path d="M92 196 L268 162 L268 470 L92 504 Z" fill={`url(#front-${id})`} />
      <path d="M268 162 L330 196 L330 440 L268 470 Z" fill={`url(#side-${id})`} />
      <path d="M92 196 L268 162 L330 196 L152 232 Z" fill={`url(#top-${id})`} />

      {/* Front graphics */}
      <rect
        x="112"
        y="232"
        width="136"
        height="3"
        fill="#ffffff"
        fillOpacity="0.72"
        transform="rotate(-11 112 232)"
      />
      <text
        x="112"
        y="272"
        fontFamily="Montserrat, sans-serif"
        fontSize="19"
        fontWeight="700"
        letterSpacing="1.6"
        fill="#ffffff"
        fillOpacity="0.95"
        transform="rotate(-11 112 272)"
      >
        {product.year}
      </text>
      <text
        x="112"
        y="296"
        fontFamily="Montserrat, sans-serif"
        fontSize="11"
        fontWeight="600"
        letterSpacing="1"
        fill="#ffffff"
        fillOpacity="0.85"
        transform="rotate(-11 112 296)"
      >
        {truncate(spec?.set.replace(/^\d{4}(–\d{2})?\s*/, "") ?? "", 18)}
      </text>
      <rect
        x="112"
        y="316"
        width="96"
        height="1.5"
        fill="#ffffff"
        fillOpacity="0.45"
        transform="rotate(-11 112 316)"
      />
      <text
        x="112"
        y="366"
        fontFamily="Montserrat, sans-serif"
        fontSize="9"
        fontWeight="600"
        letterSpacing="1.4"
        fill="#ffffff"
        fillOpacity="0.8"
        transform="rotate(-11 112 366)"
      >
        {spec?.packCount ?? ""}
      </text>
      <text
        x="112"
        y="386"
        fontFamily="Montserrat, sans-serif"
        fontSize="8"
        fontWeight="500"
        letterSpacing="2"
        fill="#ffffff"
        fillOpacity="0.6"
        transform="rotate(-11 112 386)"
      >
        UNOPENED
      </text>

      {/* Cellophane sheen over the whole form */}
      <path
        d="M92 196 L268 162 L330 196 L330 440 L268 470 L92 504 Z"
        fill={`url(#cello-${id})`}
      />
      <path d="M124 196 L200 180 L142 504 L92 470 Z" fill="#ffffff" fillOpacity="0.05" />

      {/* Seal tab */}
      {spec?.grader && spec.grader !== "None" && (
        <g>
          <rect x="112" y="406" width="118" height="46" rx="2" fill="#F4F1EA" transform="rotate(-11 112 406)" />
          <rect x="112" y="406" width="118" height="3" fill="#a16207" transform="rotate(-11 112 406)" />
          <text
            x="171"
            y="430"
            textAnchor="middle"
            fontFamily="Montserrat, sans-serif"
            fontSize="10"
            fontWeight="700"
            letterSpacing="1.6"
            fill="#16151a"
            transform="rotate(-11 171 430)"
          >
            {spec.grader}
          </text>
          <text
            x="171"
            y="442"
            textAnchor="middle"
            fontFamily="Montserrat, sans-serif"
            fontSize="6.5"
            fontWeight="500"
            letterSpacing="0.8"
            fill="#615f68"
            transform="rotate(-11 171 442)"
          >
            AUTHENTICATED
          </text>
        </g>
      )}
      </g>
    </svg>
  );
}

/* ------------------------------------------------------------------ */
/* Signed memorabilia, framed                                          */
/* ------------------------------------------------------------------ */

function SignedArt({ id, accent, product }: { id: string; accent: string; product: Product }) {
  const spec = product.category === "signed" ? product.spec : null;
  const isGlove = /glove/i.test(spec?.item ?? "");
  const isFlag = /flag/i.test(spec?.item ?? "");

  return (
    <svg viewBox="0 0 400 560" className="h-full w-full" role="presentation" focusable="false">
      <defs>
        <linearGradient id={`frame-${id}`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#4a3f31" />
          <stop offset="50%" stopColor="#2b241c" />
          <stop offset="100%" stopColor="#3b3226" />
        </linearGradient>
        <linearGradient id={`mat-${id}`} x1="0" y1="0" x2="0.5" y2="1">
          <stop offset="0%" stopColor="#1a1a1d" />
          <stop offset="100%" stopColor="#0e0e10" />
        </linearGradient>
        <linearGradient id={`fabric-${id}`} x1="0.2" y1="0" x2="0.8" y2="1">
          <stop offset="0%" stopColor={accent} stopOpacity="0.92" />
          <stop offset="100%" stopColor={accent} stopOpacity="0.5" />
        </linearGradient>
        <linearGradient id={`glaze-${id}`} x1="0" y1="0" x2="0.8" y2="1">
          <stop offset="0%" stopColor="#ffffff" stopOpacity="0.1" />
          <stop offset="40%" stopColor="#ffffff" stopOpacity="0.01" />
          <stop offset="100%" stopColor="#ffffff" stopOpacity="0.06" />
        </linearGradient>
      </defs>

      {/* Frame */}
      <rect x="26" y="40" width="348" height="480" rx="3" fill={`url(#frame-${id})`} />
      <rect x="44" y="58" width="312" height="444" rx="2" fill={`url(#mat-${id})`} />
      <rect x="44.5" y="58.5" width="311" height="443" fill="none" stroke={accent} strokeOpacity="0.3" />

      {isGlove && (
        <g>
          <path
            d="M200 176c-42 0-74 30-74 72v58c0 34 26 60 60 60h30c34 0 60-26 60-60v-58c0-42-32-72-76-72z"
            fill={`url(#fabric-${id})`}
          />
          <path d="M256 208c16 0 26 12 26 28s-10 28-26 28z" fill={`url(#fabric-${id})`} />
          <path
            d="M150 300h100"
            stroke="#000000"
            strokeOpacity="0.28"
            strokeWidth="3"
            strokeLinecap="round"
          />
          <path
            d="M148 330h104"
            stroke="#000000"
            strokeOpacity="0.2"
            strokeWidth="2"
            strokeLinecap="round"
          />
        </g>
      )}

      {isFlag && (
        <g>
          <path d="M104 172h192v190l-192 14z" fill={`url(#fabric-${id})`} />
          <circle cx="200" cy="248" r="44" fill="#ffffff" fillOpacity="0.16" />
          <path d="M104 172v204" stroke="#ffffff" strokeOpacity="0.4" strokeWidth="3" />
        </g>
      )}

      {!isGlove && !isFlag && (
        <g>
          {/* Shirt */}
          <path
            d="M200 162c-16 0-26-8-30-12l-58 30 22 48 26-12v168c0 6 4 10 10 10h60c6 0 10-4 10-10V216l26 12 22-48-58-30c-4 4-14 12-30 12z"
            fill={`url(#fabric-${id})`}
          />
          <path
            d="M178 152c6 10 14 16 22 16s16-6 22-16"
            fill="none"
            stroke="#ffffff"
            strokeOpacity="0.45"
            strokeWidth="3"
          />
          <text
            x="200"
            y="300"
            textAnchor="middle"
            fontFamily="Montserrat, sans-serif"
            fontSize="46"
            fontWeight="700"
            fill="#ffffff"
            fillOpacity="0.32"
          >
            10
          </text>
        </g>
      )}

      {/* The signature — the whole point of the piece */}
      <path
        d="M112 420c18-26 28-34 36-30s2 26 12 28 22-24 34-22 4 24 16 26 20-18 30-20 12 14 24 12 18-12 24-18"
        fill="none"
        stroke="#E8E4DC"
        strokeOpacity="0.92"
        strokeWidth="3.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M132 440c26-6 52-8 74-6"
        fill="none"
        stroke="#E8E4DC"
        strokeOpacity="0.55"
        strokeWidth="2"
        strokeLinecap="round"
      />

      {/* Plaque */}
      <rect x="132" y="462" width="136" height="28" rx="2" fill={accent} fillOpacity="0.22" />
      <text
        x="200"
        y="480"
        textAnchor="middle"
        fontFamily="Montserrat, sans-serif"
        fontSize="9"
        fontWeight="600"
        letterSpacing="1.8"
        fill="#F4F1EA"
        fillOpacity="0.85"
      >
        {truncate(product.subject.toUpperCase(), 22)}
      </text>

      {/* Glazing */}
      <rect x="44" y="58" width="312" height="444" fill={`url(#glaze-${id})`} />
    </svg>
  );
}

/* ------------------------------------------------------------------ */
/* Supplies — a packaged product with a window                         */
/* ------------------------------------------------------------------ */

function SuppliesArt({ id, accent, product }: { id: string; accent: string; product: Product }) {
  const spec = product.category === "supplies" ? product.spec : null;

  return (
    <svg viewBox="0 0 400 560" className="h-full w-full" role="presentation" focusable="false">
      <defs>
        <linearGradient id={`packf-${id}`} x1="0" y1="0" x2="0.3" y2="1">
          <stop offset="0%" stopColor={accent} stopOpacity="0.9" />
          <stop offset="100%" stopColor={accent} stopOpacity="0.45" />
        </linearGradient>
        <linearGradient id={`packs-${id}`} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#000000" stopOpacity="0.5" />
          <stop offset="100%" stopColor="#000000" stopOpacity="0.28" />
        </linearGradient>
        <linearGradient id={`win-${id}`} x1="0" y1="0" x2="0.6" y2="1">
          <stop offset="0%" stopColor="#ffffff" stopOpacity="0.26" />
          <stop offset="100%" stopColor="#ffffff" stopOpacity="0.08" />
        </linearGradient>
      </defs>

      <g transform="translate(0,-8)">
        {/* Pack body, slight 3/4 */}
        <path d="M96 168 L272 148 L272 452 L96 472 Z" fill={`url(#packf-${id})`} />
        <path d="M272 148 L322 178 L322 424 L272 452 Z" fill={`url(#packs-${id})`} />
        <path d="M96 168 L272 148 L322 178 L146 199 Z" fill="#ffffff" fillOpacity="0.16" />

        {/* Window showing stacked contents */}
        <rect x="118" y="236" width="128" height="122" rx="2" fill={`url(#win-${id})`}
          transform="rotate(-6 118 236)" />
        {[0, 1, 2].map((i) => (
          <rect key={i} x={126 + i * 5} y={250 + i * 7} width="104" height="88" rx="2"
            fill="#ffffff" fillOpacity={0.3 - i * 0.07}
            transform={`rotate(-6 ${126 + i * 5} ${250 + i * 7})`} />
        ))}
        <rect x="118" y="236" width="128" height="122" rx="2" fill="none"
          stroke="#ffffff" strokeOpacity="0.5" strokeWidth="2"
          transform="rotate(-6 118 236)" />

        {/* Label */}
        <text x="116" y="212" fontFamily="Montserrat, sans-serif" fontSize="15" fontWeight="700"
          letterSpacing="1.8" fill="#ffffff" fillOpacity="0.95" transform="rotate(-6 116 212)">
          ARENA
        </text>
        <text x="116" y="398" fontFamily="Montserrat, sans-serif" fontSize="11" fontWeight="600"
          letterSpacing="0.8" fill="#ffffff" fillOpacity="0.88" transform="rotate(-6 116 398)">
          {truncate(product.subject.toUpperCase(), 18)}
        </text>
        <rect x="116" y="410" width="96" height="1.5" fill="#ffffff" fillOpacity="0.45"
          transform="rotate(-6 116 410)" />
        <text x="116" y="434" fontFamily="Montserrat, sans-serif" fontSize="9" fontWeight="500"
          letterSpacing="1.2" fill="#ffffff" fillOpacity="0.72" transform="rotate(-6 116 434)">
          {truncate(spec?.contents ?? "", 22)}
        </text>
      </g>
    </svg>
  );
}

function truncate(s: string, n: number) {
  return s.length > n ? `${s.slice(0, n - 1)}…` : s;
}
