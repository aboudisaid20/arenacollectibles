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

`ADMIN_PASSWORD` is mandatory in production — the app refuses to boot
rather than seed itself with the development password. It is read only
when the database is empty; changing it later does not change an
existing login.

Test keys mean nobody can actually pay. Live keys require an activated
Stripe account.

## 5. First deploy

Railway gives you a `*.up.railway.app` URL. Check before touching DNS:

- the shop lists products
- `/admin` redirects you to sign in, and your new password works
- adding a product in admin, then redeploying, keeps it (proves the volume)

## 6. Domain

Add the domain in Railway; it returns a DNS target. Then in Namecheap
under **Advanced DNS**:

| Type | Host | Value |
| --- | --- | --- |
| CNAME | `www` | the Railway target |
| ALIAS | `@` | the Railway target |

A CNAME is not legal at the zone root, which is what the ALIAS record is
for. Namecheap supports it; some registrars do not.

HTTPS is issued automatically once DNS resolves. Usually 15–30 minutes.

---

## Before sharing the link

- **Roll the Stripe keys** if they have ever been pasted into a chat,
  ticket or commit.
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
