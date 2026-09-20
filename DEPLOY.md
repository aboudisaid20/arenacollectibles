# Deploying ARENA

The site keeps its data on disk: SQLite for the catalogue, orders and
promo codes, and a folder for product photos uploaded through the admin
panel. **It therefore needs a host with a persistent volume.** On a
serverless host both are wiped on every deploy.

Railway is used below. Render, Fly and any small VPS work the same way.

---

## 1. Push the code

```bash
git remote add origin git@github.com:<you>/<repo>.git
git push -u origin main
```

Nothing secret is committed — `.gitignore` already excludes `.env*.local`,
`.data/` and `public/uploads/`.

## 2. Create the service

In Railway: **New Project → Deploy from GitHub repo**, pick the repo.
It reads `railway.json` and builds with `npm run build`.

The build command deliberately does not run `npm ci`. Nixpacks installs
dependencies in its own phase first, and `npm ci` deletes node_modules
wholesale — including the build cache Nixpacks mounts inside it, which
fails with `EBUSY: resource busy or locked, rmdir
'/app/node_modules/.cache'`.

## 3. Attach a volume — do not skip this

Railway allows exactly one volume per service — "Each service can only
have a single volume" — so the database and the uploaded photographs
share it.

Volumes are created from the **project canvas**, not from the service's
Settings tab. Press **⌘K** and type "volume", or right-click empty space
on the canvas. Railway then asks which service to attach it to, and what
mount path to use:

```
/app/.data
```

That single mount holds the catalogue, orders, promo codes and every
product photo uploaded through the admin panel. Without it, each deploy
resets the shop to its seed data and drops the photos.

The uploads folder deliberately sits inside the volume rather than under
`public/`, because anything in `public/` is served as a static file and
that would publish `arena.db` to anyone who guessed the name. Images are
streamed by the `/uploads` route handler instead, which serves only known
image extensions from that one directory.

To put the volume somewhere else, set `DATA_DIR` to the mount path and
the database and uploads both follow it.

## 4. Environment variables

**Variables**, then add:

| Variable | Value |
| --- | --- |
| `STRIPE_SECRET_KEY` | `sk_test_…` or `sk_live_…` |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | `pk_test_…` or `pk_live_…` |
| `SESSION_SECRET` | `node -e "console.log(require('crypto').randomBytes(48).toString('base64url'))"` |
| `ADMIN_EMAIL` | the address you will sign in with |
| `ADMIN_PASSWORD` | 12+ characters, from a password manager |
| `NEXT_PUBLIC_SITE_URL` | `https://arenacollectibles.co` (add once DNS resolves) |
| `DATA_DIR` | only if the volume is mounted somewhere other than `/app/.data` |
| `PORT` | `3000` — must match the port given to the proxy |

`ADMIN_PASSWORD` is mandatory in production — the app refuses to boot
rather than seed itself with the development password. It is read only
when the database is empty; changing it later does not change an
existing login.

### Payments: test mode

This deployment runs on Stripe **test** keys. The checkout works end to
end — address, card entry, processing state, order confirmation with a
tracking number, stock decrementing, the order appearing in admin — but
no money moves and no real card is accepted.

Test cards (any future expiry, any CVC, any postcode):

| Number | Result |
| --- | --- |
| `4242 4242 4242 4242` | succeeds |
| `4000 0000 0000 0002` | declined |
| `4000 0025 0000 3155` | requires 3D Secure |

Going live later is a key swap plus a Stripe account activation: replace
both variables with the `sk_live_` / `pk_live_` pair and redeploy. No
code changes.

## 5. Port

Railway injects a `PORT` variable and its proxy asks which port to route
to. The two have to agree or you get "Application failed to respond".

Enter **3000** when prompted, and add `PORT=3000` alongside the other
variables so nothing is left to inference.

The start command binds explicitly:

```
next start -H 0.0.0.0 -p ${PORT:-3000}
```

`0.0.0.0` matters — a server bound to localhost is unreachable from
outside its own container, which is the usual cause of a 502 here.

## 6. First deploy

Railway gives you a `*.up.railway.app` URL. Check before touching DNS:

- the shop lists products
- `/admin` redirects you to sign in, and your new password works
- adding a product in admin, then redeploying, keeps it (proves the volume)
- uploading a photo, then redeploying, still shows it

## 7. Domain

The domain is **arenacollectibles.co**, registered at Namecheap.

### In Railway

Service → **Settings** → **Public Networking** → **+ Custom Domain**.
Add `arenacollectibles.co`, then repeat for `www.arenacollectibles.co`.

Railway returns **two** records per domain, and both are required:

- a **CNAME** target, something like `g05ns7.up.railway.app` — routes traffic
- a **TXT** record — proves you own the domain

The TXT is not optional. Railway is explicit: "The domain will not verify
with only the CNAME in place", and without it "requests to your custom
domain will return a 404 error even after the CNAME resolves". A 404 on a
domain that clearly resolves is almost always the missing TXT.

### In Namecheap

**Domain List → Manage → Advanced DNS**. Delete the two parking records
Namecheap ships with (a CNAME on `www` to `parkingpage.namecheap.com`,
and a URL Redirect on `@`), then add:

| Type | Host | Value |
| --- | --- | --- |
| ALIAS Record | `@` | Railway's CNAME target for the root |
| CNAME Record | `www` | Railway's CNAME target for www |
| TXT Record | as Railway states | as Railway states |

A CNAME is not legal at the zone apex, which is why the root uses an
ALIAS. Namecheap is one of the providers Railway names as supporting
this, alongside Cloudflare and DNSimple — several registrars do not, and
there the fix is moving nameservers to Cloudflare.

Leave the nameservers on Namecheap BasicDNS.

Wait for the green check beside the domain in Railway. HTTPS is issued
automatically once it verifies, usually within 15–30 minutes. Check with:

```bash
dig +short arenacollectibles.co
dig +short www.arenacollectibles.co
dig +short TXT arenacollectibles.co
```

Until DNS resolves, the site answers on its `*.up.railway.app` URL.

Set `NEXT_PUBLIC_SITE_URL=https://arenacollectibles.co` in Railway once
the domain resolves, so link previews and canonical URLs use it.

---

## Before sharing the link

- **Roll the Stripe keys** if they have ever been pasted into a chat,
  ticket or commit. Test keys cannot move money, but they can read your
  test data and run up API activity under your account — worth a fresh
  pair from the dashboard regardless.
- **Confirm image rights.** The player and department photography is
  press and product work. Commercial use of a recognisable athlete
  generally needs a photo licence *and* personality rights.
- **Add a Stripe webhook** on `payment_intent.succeeded` pointing at your
  domain. Orders are currently recorded when the customer lands on the
  confirmation page, so an order is missed if they close the tab.

## Backups

The whole shop is one file. With a volume attached:

```bash
railway run cat .data/arena.db > arena-backup-$(date +%F).db
```

Worth doing before any deploy that changes the schema.
