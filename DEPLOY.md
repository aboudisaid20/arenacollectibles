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
It reads `railway.json` and builds with `npm ci && npm run build`.

## 3. Attach a volume — do not skip this

**Settings → Volumes**, add one mount for each path:

| Mount path        | Holds                                  |
| ----------------- | -------------------------------------- |
| `/app/.data`      | catalogue, orders, promo codes         |
| `/app/public/uploads` | product photos uploaded in admin   |

Without these, every deploy resets the shop to its seed data and drops
every uploaded photo.

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

## 5. First deploy

Railway gives you a `*.up.railway.app` URL. Check before touching DNS:

- the shop lists products
- `/admin` redirects you to sign in, and your new password works
- adding a product in admin, then redeploying, keeps it (proves the volume)

## 6. Domain

The domain is **arenacollectibles.co**, registered at Namecheap.

In Railway: **Settings → Networking → Custom Domain**. Add both
`arenacollectibles.co` and `www.arenacollectibles.co`. Railway returns a
target hostname ending in `.up.railway.app` for each — copy them.

Then Namecheap → **Domain List → Manage → Advanced DNS**. Delete the two
parking records Namecheap adds by default (a CNAME on `www` pointing at
`parkingpage.namecheap.com`, and a URL Redirect on `@`), then add:

| Type | Host | Value | TTL |
| --- | --- | --- | --- |
| ALIAS Record | `@` | the Railway target for the root | Automatic |
| CNAME Record | `www` | the Railway target for www | Automatic |

A CNAME is not legal at the zone apex, which is what the ALIAS record is
for. Namecheap supports it; several registrars do not.

Leave **Namecheap BasicDNS** as the nameserver set. Do not switch to
custom nameservers — the records above are all that is needed.

HTTPS is issued automatically once DNS resolves, usually within 15–30
minutes. Check with:

```bash
dig +short arenacollectibles.co
dig +short www.arenacollectibles.co
```

Both should return a Railway address. Until they do, the site answers on
its `*.up.railway.app` URL.

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
