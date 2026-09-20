# ARENA Collectibles

Sports collectibles storefront — graded cards, sealed wax and signed
memorabilia. Black ground, white and volt-green (`#B5FF00`) accents,
heavy condensed display type. Full shop UI with cart and checkout shell.

Next.js 15 · React 19 · TypeScript · Tailwind v4 · GSAP 3

```bash
npm install
npm run dev     # http://localhost:3000
npm run build   # 25 routes
```

---

## Routes

| Route | |
|---|---|
| `/` | Hero with pointer-trail, ticker, featured rail, categories, numbers |
| `/shop` | 23 products across 4 departments. Search, filters, 5 sorts, deep-linkable |
| `/product/[slug]` | Gallery, quantity, add to cart, spec sheet, history, related |
| `/contact` | Form + shop details |
| `/order/complete` | Order confirmation — verifies the PaymentIntent server-side |
| `/login` | Staff sign-in |
| `/admin` | **Protected** dashboard — metrics, orders, inventory |
| `/api/payment-intent` | Creates/updates the PaymentIntent. Prices the order server-side |

**Cart and checkout are overlays, not routes.** The standalone `/cart` and
`/checkout` pages were removed when the drawer landed — keeping both would
have meant two implementations of the same flow drifting apart. See below.

---

## ⚠️ Your 18 player photos go here

The hero trail is **fully working** — it currently cycles generated card
artwork as a stand-in. To switch to your photography:

1. Drop 18 files into **`public/players/`**
2. List them in `PLAYER_PHOTOS` in **`src/lib/trail-assets.tsx`**

That's it. Nothing else changes.

```ts
export const PLAYER_PHOTOS = [
  { src: "/players/01.png", alt: "" },
  // ... 18 entries
];
```

**Spec:** portrait crops, ~800×1000px, **subject cut out on transparency**
(PNG or WebP). Cut-outs read dramatically better than photo boxes — the
player pops straight off the black instead of sitting in a grey rectangle.
18 is the number Night Kidz uses (17) plus one, which is where repeats
stop being noticeable.

---

## The two signature effects

**Pointer trail** (hero) — images bloom along the cursor path. A recycled
pool of 18 slots; nothing is created or destroyed as you move. On touch it
spawns on drag plus a slow idle autoplay, so a phone never gets a dead
hero. Under reduced motion it renders a static scatter with no listeners.

**Neon mesh** (CTA band, shop + about headers) — the Verlet cloth you
supplied, with nine fixes applied. It did not compile as given, and it had
a resize bug that walked the mesh off-canvas. Full list in
[`design-system/ARENA-DESIGN-SYSTEM.md`](design-system/ARENA-DESIGN-SYSTEM.md) §5.

They never share a viewport. Both are pointer-driven, so running them
together splits attention and halves the frame budget.

---

## Brand

Logo at `public/brand/arena-logo.png` — your original with the green
keyed out and margins trimmed, so it drops onto black cleanly. `next/image`
serves optimised WebP at display size.

**The green is `#B5FF00`**, sampled from your file. Note it is *not* the
`#BEF202` hardcoded in the neon-mesh snippet — that has been replaced
everywhere.

One hard rule: **`#B5FF00` is a light colour** (17.27:1 on black). Black
text on it is 17.27:1; white text on it is **1.22:1**. Every button
variant puts black on green, and no variant can produce white-on-green.

---

## Checklist status

| # | Item | Status |
|---|---|---|
| 01 | Distinct point of view | Black/volt, Anton at 17vw, square corners, sticker badges |
| 02 | Purposeful typography | Anton / Lora / IBM Plex Mono — three faces, three jobs. No Inter, no Roboto |
| 03 | Restrained colour | Three colours as briefed, plus a grey text ramp |
| 04 | Breathing hierarchy | Display runs 2.2rem → 15rem; mono micro-labels at the other end |
| 05 | Intentional imagery | Generated vector artifacts, not stock. **Pending your 18 photos** |
| 06 | Subtle motion | Pointer trail, scrub mesh, masked line reveals, grid stagger — no generic fade-ups |
| 07 | Mobile design | Search gets its own row, mesh grid re-tuned, trail autoplays, copy changes on touch |
| 08 | Invisible technical quality | Below |

### Verified, not assumed

Audited in-browser across all 7 routes, desktop and 375px:

| Check | Result |
|---|---|
| Text contrast (1,600+ nodes, incl. drawer, checkout, confirmation, admin) | **0 failures** at AA |
| Disabled-button contrast | 5.42:1 (exempt from WCAG, fixed anyway) |
| Target size (WCAG 2.2 · 24px) | **0 under minimum** |
| Heading order | No skips, one `h1` per page |
| Form labels / control names | All present |
| Horizontal overflow at 375px | None |
| Build | 25 routes (23 static, 2 dynamic: payment API + confirmation) |

Forms: visible labels, validation on blur not keystroke, inline errors
tied by `aria-describedby`, and a focusable error summary that links to
each field. Cart count is a `role="status"` live region — it announces
without stealing focus.

**Not verified in-browser:** `prefers-reduced-motion` could not be
emulated in the test browser. It is implemented on four layers (global CSS
backstop, `matchMedia` branches in every animation, the head script
skipping pre-reveal hiding, and static-frame paths in both signature
effects) but deserves one pass on a device with the OS setting on.

---

## Cart drawer and checkout overlay

## Header and navigation

**There is no header bar.** Menu, logo and cart float as a layer directly
over the content, which runs underneath them. The header is `fixed` with
no background; a soft gradient scrim fades in once you scroll past 16px so
white-on-content stays readable, and the three controls carry their own
drop shadow for the same reason at scroll-top.

`--header-h` (72px / 84px) is the single token behind this: `main` pads by
it, `.bleed-under-header` cancels that padding on sections meant to run
full-bleed underneath (the hero, the shop and about mesh headers), and the
shop's sticky filter bar offsets by it. Change one value and all four agree.

Layout is **Menu** left, logo centred, **Cart** right — centred by giving
the flanking columns equal width (`grid-cols-[1fr_auto_1fr]`) rather than
`justify-between`, since "Menu" and "Cart 12" are different lengths and the
mark would otherwise drift as the count changes. Measured: 0px off centre.

Menu opens a full-height panel listing the four departments:

| | Department |
|---|---|
| 01 | Sealed Boxes |
| 02 | Cards |
| 03 | Signed Memorabilia |
| 04 | Supplies |

then Everything / Contact, plus Admin when an admin is signed in.
The panel is a real dialog — same `useDialog()` focus trap, Escape, and
focus restore as the cart drawer.

`CATEGORY_ORDER` in `src/lib/types.ts` is the single source of that
ordering; the menu, footer, shop filters and homepage grid all read it.

## Supplies

A fourth product category alongside the collectibles — sleeves,
toploaders, a magnetic one-touch, a slab storage box and a grading
submission kit ($4.50–$59). It also stretches the price ladder down, so
the shop reads like a real hobby store rather than an auction catalogue.

Adding it was one variant on the `Product` union; TypeScript then listed
every place needing a branch (card chip, spec sheet, artwork, blurb map).
The inventory seeder now inserts any catalogue slug it does not already
track, so new products appear without wiping an admin's existing edits.

**Adding anything opens the drawer.** Every `+` on a product tile and the
Add to cart button on a product page run through the same `add()` in
`src/lib/cart.tsx`, which increments the count, kicks the header badge and
slides the drawer in. There is no path that adds silently.

**Drawer** (`CartDrawer.tsx`) — slides from the right. Line items with
thumbnails, increment/decrement, a **Remove text button** (not an icon),
live subtotal, shipping, total, and a high-contrast **Proceed to checkout**
(black on volt, 17.27:1).

**Checkout** (`CheckoutOverlay.tsx`) — overlays the main view. One screen,
four numbered sections, one submit:

```
┌──────────────────────────┬─────────────────────┐
│ ① CONTACT   email        │  ORDER SUMMARY      │
│ ② ADDRESS   name, street │  items, subtotal,   │
│ ③ SHIPPING  std/exp/vault│  shipping, total    │
│ ④ PAYMENT   Stripe       │ ┌─────────────────┐ │
│                          │ │ PLACE ORDER ·$X │ │  <- sticky
│                          │ └─────────────────┘ │
└──────────────────────────┴─────────────────────┘
```

The **Place order button sits under the order summary and stays on
screen** — sticky alongside the summary on desktop, a sticky bottom bar
below `lg`. Both are the same component rendered twice; only one is ever
visible. The `<form>` wraps both columns, so it stays a plain submit
button with no `form="..."` plumbing, and Enter from any field still works.

It is **disabled and dimmed until everything required is done**, and says
why:

| State | Button hint |
|---|---|
| Fields incomplete | "6 more fields to fill in above." |
| Payment element loading | "Loading secure payment…" |
| Card not finished | "Enter your card details to finish." |
| Ready | "You will be charged $X including standard insured shipping." |
| Submitting | "Do not close this window." |

Completeness is live validation of the current values (not the touched
error state), combined with Stripe's own `PaymentElement` `onChange`
`complete` flag — so it only enables when the card really is filled in.

No pagination. Fields validate on blur; on submit, multiple errors raise a
focusable summary that links to each field, while a single error jumps
straight to it (a summary for one error is just an extra stop).

Structurally: `CheckoutForm.tsx` is presentational and knows nothing about
Stripe — it owns the fields and validation, and takes section 4's contents
and the pay handler as props. `StripeCheckout.tsx` supplies both when
Stripe is live. That split is why an unconfigured or failing Stripe
degrades to **section 4 only**, instead of replacing the whole checkout
with an error.

### Why these are dialogs, not just panels

Both use `useDialog()` (`src/lib/use-dialog.ts`): focus moves in on open,
Tab is trapped inside, Escape closes, focus returns to whatever opened it,
body scroll locks with scrollbar compensation so the page behind does not
jump.

Both stay **mounted and `inert`** while closed. Mounted, so the slide
transition works and a part-filled address survives an accidental dismissal
— which is why there is no "discard your changes?" prompt: nothing is ever
discarded. `inert` (a real boolean — React 19 reads `inert=""` as *false*,
which silently leaves a closed panel tabbable) so the hidden panels are
genuinely out of the tab order. Verified by attempting to focus inside a
closed drawer: focus is refused.

---

## Stripe payments

### Setup — you add the keys, not me

```bash
cp .env.example .env.local
```

Fill in your **test** keys from
[dashboard.stripe.com/test/apikeys](https://dashboard.stripe.com/test/apikeys),
then restart the dev server.

```
STRIPE_SECRET_KEY=sk_test_...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
```

`.env.local` is gitignored. Until the keys exist, step 2 shows a setup
panel with these instructions instead of crashing, and links to a preview
of the confirmation screen.

Test card **4242 4242 4242 4242**, any future expiry, any CVC.
[Full list of test cards](https://docs.stripe.com/testing), including
declines (`4000 0000 0000 0002`) and 3DS (`4000 0025 0000 3155`).

### How it is wired

1. When checkout opens, the client POSTs `{ items: [{slug, qty}], delivery }`
   to `/api/payment-intent`.
2. The route **recomputes the amount** from the catalogue and the delivery
   table, creates a PaymentIntent, returns only the `client_secret`.
3. `<PaymentElement>` mounts, themed to the site (square corners, volt
   accent, night theme).
4. Submit → address validates locally → the intent is re-priced for the
   chosen shipping → button becomes **"Processing…"** and disables →
   `confirmPayment` with `redirect: "if_required"`. Email and shipping
   address ride along in `confirmParams`, so they are attached to the
   payment rather than discarded with component state.
5. Success → cart cleared → route to `/order/complete?payment_intent=...`.
6. That page **retrieves the intent server-side** and only renders a
   confirmation if Stripe reports `succeeded`.

3DS cards redirect out and back to the same URL, so both paths land in the
same place.

### Three things worth knowing

**The amount is never trusted from the browser.** The client sends slugs
and quantities; `/api/payment-intent` reads `body.items[].slug`,
`body.items[].qty`, `body.delivery` and nothing else. Price comes from
`getProduct()`, shipping from `deliveryById()`. A tampered request cannot
change what is charged, and quantities are clamped to real stock.

**The secret key cannot reach the browser.** It has no `NEXT_PUBLIC_`
prefix and lives only in `src/lib/stripe-server.ts`, which imports
`server-only` so a client import fails the build. Verified with a canary:
built with a marked secret value and grepped every client asset — **0 hits
for the secret, 3 for the publishable key** (which is meant to be public).

**No card fields exist in this codebase.** Card entry happens inside
Stripe's cross-origin iframe. That is what keeps the integration at PCI
SAQ-A, and it is why you should not "simplify" it into your own inputs.

### The order number

Derived from the PaymentIntent id with a small FNV-1a hash →
`ARN-XXXX-XXXX`. Deterministic, so refreshing or returning later shows the
same reference without needing a database. It is a display reference, not
a token — the PaymentIntent is what actually gets verified.

### Before going live

- Swap test keys for live keys
- Add a **webhook** on `payment_intent.succeeded` as the source of truth
  for fulfilment. The confirmation page is a good UX signal but the user
  can close the tab; webhooks cannot be skipped.
- Decrement real stock on that webhook (`product.stock` is static data today)
- Set `receipt_email` on the intent if you want Stripe to email receipts

## Homepage

The featured section is a **single horizontal rail**, not a grid — a
labelled, focusable scroll region so it can be driven from the keyboard,
with supplementary arrow buttons on desktop that hide themselves when
there is nothing to scroll to.

The slogan is **"Enter the Arena."** — two lines below `md`, one line
above. Under `md` the type is large enough (17vw) that it cannot fit and
breaks naturally at the space; from `md` up it is locked with `nowrap`
and sized in `vw` so it fills the container. That value was tuned by
measuring rendered width against the container rather than estimated:
93–96% fill from 768px to 2560px, with a 13rem cap.

Hero copy is **bottom-aligned at every size**, sitting close to the
ticker below it, which hands the whole upper half of the screen to the
photo trail. There is no scroll hint under the CTA.

## Removed

`/about` and its "How we check" hero button are gone, along with every
link to them (menu, footer). Nothing references the route.

Also removed from the homepage: the **"No mystery / What you actually
get"** promises band, and the **"Can't find it / Tell us what you're
hunting"** mesh CTA. Their dead imports and constants went with them, so
`NeonMesh` is now used only on `/shop`.

> That page also held the **shipping, returns and consignment terms**.
> They are not anywhere else on the site now. Say the word and I will
> move that content onto `/contact` or its own page.

The ticker's pause button is gone too; see the note in `Ticker.tsx` about
what that costs under WCAG 2.2.2.

## Uploading images

There are two separate image slots.

### 1. Product photos — upload from the admin panel

`/admin` → Inventory → **Photo** on any row. Pick a file and it uploads,
replaces the generated vector artwork everywhere (shop, product page,
cart, checkout, admin thumbnail) and shows a **Replace** / bin pair
afterwards. No code, no redeploy.

- **Accepted:** JPG, PNG, WebP, AVIF. Max 6 MB.
- **Best results:** square-ish, subject centred, transparent or dark
  background. Cards render inside a square well, so a 1:1 crop fits best.
- Files land in `public/uploads/` (gitignored) and the path is stored on
  the inventory row. Removing an image clears the row and the product
  falls back to its vector artwork.

The endpoint is hardened, because anything arriving there is
attacker-controlled. Verified by attack:

| Attempt | Result |
|---|---|
| Anonymous POST | `403` |
| Admin + real PNG | uploaded |
| Text file with `Content-Type: image/png` | rejected — magic bytes checked, not the header |
| `.svg` (can carry script) | rejected — not on the allowlist |
| Filename `../../../../etc/pwned.png` | ignored — the stored name is generated, file stayed in `uploads/` |

> On a read-only host (Vercel) the disk write will fail. Swap the
> `fs.writeFile` in `src/app/api/admin/upload/route.ts` for S3 or Vercel
> Blob and return that URL — nothing else changes.

### 2. Hero trail images — a code edit

Not admin-managed, because they are brand art rather than inventory.
Drop files into `public/players/` and list them in `PLAYER_PHOTOS` in
[trail-assets.tsx](src/lib/trail-assets.tsx). Emptying the list falls
back to the original moment posters.

**29 square crops are wired up.** Cells crop with `object-cover`, so 1:1
files fit exactly; anything else is centre-cropped rather than
letterboxed. Images are always upright — no rotation.

### How the trail is spaced

Images are dropped at fixed intervals **along the pointer path**, not one
per `mousemove` event. Each event walks the segment from the last drop
point to the cursor and emits an image every `spacing` px, carrying the
remainder into the next event. That is what keeps the gaps equal: a
one-image-per-event approach bunches them when the cursor crawls and
scatters them when it flies.

Verified with deliberately uneven event steps of 17, 190, 40, 300, 25 and
80 px — the images landed at gaps of **118, 118, 118, 118, 118**.

There is **no time gate**, so the first image lands on the first pointer
movement: measured **44 ms** from `mousemove` to visible. Several images
live at once (typically 6–9) and simply expire after ~1.05s. A
`MAX_PER_EVENT` cap of 4 stops a pointer jump — tab focus, a window drag
— dropping a dozen images in one frame.

### Touch devices

A phone has no cursor, so one is simulated: a point that wanders between
random waypoints and feeds **the same path walker** as a real mouse. The
result is the identical evenly-spaced trail, not unrelated images popping
in one at a time.

It steers toward each waypoint rather than snapping to it, so the path
curves like a hand-moved mouse, and it retargets *before* arriving —
stopping to choose a new waypoint cost a frame each time.

At the edges it **reflects** like a billiard rather than clamping.
Clamping stalled it: pinned against a wall with a target still beyond,
steering dragged it straight back and it travelled almost nothing, which
left stretches of the hero with no images at all.

Measured over 12s at `virtualSpeed = 250`: 230 px/s effective (92%),
3.1 spawns/sec, **3.1 images alive on average, never fewer than 2, and
no empty moments in 60 samples**.

A real finger takes over on `touchmove` and the simulation stands down for
2.6s. It pauses entirely when the hero scrolls offscreen, and never runs
on a fine pointer — verified: 0 spawns in 4s of no input on desktop.

Frame-rate independent down to 10fps. The `dt` clamp is 0.1s rather than
0.05s: at 0.05s the clamp itself becomes the speed limit and the cursor
crawls on any device dropping frames.

Cells are **44% of container width, capped at 338px**: 338px on desktop,
still 165px on a 375px phone — the fraction cap binds there, so making
desktop bigger left mobile untouched. Spacing scales with the cell, so
the overlap ratio is identical at every size.

**At most 6 images are on screen at once.** Spawning a seventh retires
the oldest immediately, which keeps the trail a fixed length however fast
the pointer moves. Verified under a hard sweep: never exceeded 6.

Spacing is 59px against a 338px cell, so each image covers all but ~17%
of the one before it.

Served at `w=448 q60` — **1.15 MB** for all 29 (down from 2.44 MB). Two
things get it there: a 448 entry added to `imageSizes`, and a declared
`sizes` smaller than the real cell, which deliberately caps the fetch at
~1.7× density rather than letting 2× round up to the 640 breakpoint.
Imperceptible on grainy photos on screen for about a second. Only the
first image is `priority`.

> The 29 source files are ~23 MB. Fine locally, but consider committing
> pre-resized originals or moving them to a CDN before this repo grows.

See the licensing note above before sourcing more.

## Admin dashboard

`/admin` — reachable from the **Admin** nav link, which only renders when
an admin is signed in.

**Metrics row** — gross sales revenue (with average order value), orders
processed, and low-stock alerts (at or below 3, with the offenders
listed and sold-out ones flagged).

**Orders table** — every order, searchable and filterable, with a status
dropdown per row cycling *processing → shipped → delivered*. Updates are
optimistic and roll back if the server rejects them.

**Inventory panel** — edit price or stock per product and save. Save is
disabled until a row is actually dirty. Setting stock to **0** marks the
product sold out on the storefront immediately; the product card shows
the live stock count via `StockBadge` ("3 in stock" / "Last one" /
"Sold out").

### Sign in

| Role | Email | Password |
|---|---|---|
| Admin | `admin@arena.test` | `arena-admin-2026` |
| Customer | `customer@arena.test` | `arena-customer-2026` |

The customer account exists to demonstrate the gate — signing in with it
lands on `/shop`, shows no Admin link, and any attempt to reach `/admin`
redirects to `/?denied=admin`.

**Change these before deploying anywhere public.** They are seeded in
`src/lib/db.ts`.

### How access is actually restricted

Three independent layers, because hiding a nav link is not security:

1. **`middleware.ts`** — runs before any admin code loads. Verifies the
   HMAC-signed session cookie and its role claim.
2. **`requireAdmin()`** in the admin layout — re-reads the role *from the
   database*. The Edge runtime cannot query SQLite, so middleware can only
   trust the token; this is what catches a token whose role claim has gone
   stale or been tampered with.
3. **Every server action** calls `requireAdmin()` again. Server actions are
   addressable POST endpoints and middleware does not run for them — being
   rendered only on the admin page protects nothing.

Verified by attack, not assumption:

| Attempt | Result |
|---|---|
| Anonymous `GET /admin` | `307 → /login?next=/admin` |
| Cookie with a garbage signature | `307 → /login` |
| Cookie signed with the wrong secret | `307 → /login` |
| Validly signed, honest `role: customer` | `307 → /?denied=admin` |
| **Validly signed, `role` forged to `admin`** for a customer's uid | **`307 → /?denied=admin`** |
| …and the body of that request | contains no admin content |

The last one is the interesting case: the signature was genuinely valid, so
middleware let it through. The database re-check is what stopped it.

Other hardening: passwords are scrypt-hashed and compared in constant time
(`timingSafeEqual`); a missing user still runs a hash so response timing
does not reveal which emails exist; login is throttled to 8 attempts per
email per 10 minutes; the session cookie is `HttpOnly` + `SameSite=Lax`
(+ `Secure` in production); the `next=` redirect parameter rejects
anything that is not a same-origin absolute path.

## Database

SQLite via **`node:sqlite`** — the Node standard library, so no dependency
and no native build. The file lives at `.data/arena.db` (gitignored) and
seeds itself on first run: two users, inventory from the catalogue, and 28
mock orders generated from a fixed seed so the dashboard looks identical
on every machine.

Tables: `users`, `inventory`, `orders`, `order_items`.

`PRODUCTS` in `src/lib/products.ts` remains the source of copy, imagery and
specs; the database owns the two things that change — **price and stock**.
The storefront reads through `liveProducts()`, and the cart is handed the
live catalogue from the root layout, so an admin edit is reflected in the
shop, on the product page, and in the cart without a rebuild. Those pages
are `force-dynamic` as a result.

Real Stripe orders are recorded on the confirmation page, idempotent on
`payment_intent_id`, and decrement stock in a transaction.

> On a read-only host (Vercel), swap `src/lib/db.ts` for Postgres/Turso.
> Every caller goes through the helpers in `src/lib/store.ts`, so nothing
> else changes.

## Data

`src/lib/types.ts` — discriminated union on `category`; each variant
carries its own `spec` shape. `src/lib/products.ts` — catalogue and all
access helpers. **Prices are in cents**, never floats.

Adding a category = one union variant + one branch in `SpecSheet` + one in
`ProductArtwork`. Moving to a CMS = replace `PRODUCTS`, keep the helpers.

> Catalogue is illustrative. Cert numbers, populations, prices and
> histories are fabricated for demonstration.

---

## Still placeholder

- Contact form submission is stubbed — wire it where marked
- Email, phone and addresses throughout
- Social links point at bare domains
- Seeded admin/customer passwords — change them before any public deploy
- Sessions are stateless (signed cookies); there is no server-side revoke
  list, so a stolen token is valid until it expires. Add one if that matters.
- Login throttling is in-memory — fine for one instance, needs Redis across many

## Verified end to end against the live test account

A real test payment was put through and confirmed server-side via the
Stripe API:

```
status           succeeded
livemode         false
amount           112159500  ($1,121,595)
receipt_email    alex@example.com
shipping         Alex Boudi, 14 Hanover Square, London, W1S 1JJ
metadata         line items + delivery method
```

Security checks, run against the live test API:

| Check | Result |
|---|---|
| Client claims item costs $1 | Ignored — server charged $480,025 |
| Client requests qty 9999 (stock 24) | Clamped to 24 |
| Client adds a sold-out item | `409 out_of_stock` |
| Secret key in client bundle | **0 hits** (publishable: 1, expected) |

## Key rotation

The test keys currently in `.env.local` were shared over chat, so they
exist in that transcript. They are test-mode and cannot move real money,
but roll them in the Stripe dashboard when convenient and put the new
ones straight into `.env.local`.
