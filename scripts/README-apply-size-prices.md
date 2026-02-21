# Apply one set of box-size prices to all products

The script `apply-size-prices.mjs` sets the **same** price per box size (Small, Medium, Large, X-Large) on every product variant in Saleor. Run it once after adding products, or whenever you change your standard size prices.

## 1. Get a staff API token (one-time)

In Saleor Dashboard:

1. Go to **Configuration → Staff** (or your account menu).
2. Open your staff user → **Create token** (or use an existing token).
3. Grant **MANAGE_PRODUCTS**.
4. Copy the token.

Alternatively you can use email + password (see below).

## 2. Set your size prices

Default mapping (override with env):

- Small → 10  
- Medium → 15  
- Large → 20  
- X-Large → 25  

To use your own prices, set `SIZE_PRICES` (no spaces):

```bash
SIZE_PRICES='Small:12,Medium:18,Large:24,X-Large:30'
```

## 3. Run the script

From the project root (or anywhere with env set):

**Using a token:**

```bash
SALEOR_API_URL=http://142.93.146.26:8000/graphql/ SALEOR_STAFF_TOKEN=your_token node scripts/apply-size-prices.mjs
```

**Using email + password:**

```bash
SALEOR_API_URL=http://142.93.146.26:8000/graphql/ SALEOR_STAFF_EMAIL=admin@example.com SALEOR_STAFF_PASSWORD=yourpassword node scripts/apply-size-prices.mjs
```

**With custom sizes/prices and channel:**

```bash
SALEOR_API_URL=http://142.93.146.26:8000/graphql/ SALEOR_STAFF_TOKEN=your_token SIZE_PRICES='Small:10,Medium:15,Large:20,X-Large:25' SALEOR_CHANNEL_SLUG=default-channel node scripts/apply-size-prices.mjs
```

## Env reference

| Variable | Required | Description |
|----------|----------|-------------|
| `SALEOR_API_URL` | Yes | GraphQL endpoint (e.g. `http://142.93.146.26:8000/graphql/`) |
| `SALEOR_STAFF_TOKEN` | Yes* | Staff API token with MANAGE_PRODUCTS |
| `SALEOR_STAFF_EMAIL` | Yes* | Staff email (if not using token) |
| `SALEOR_STAFF_PASSWORD` | Yes* | Staff password (if not using token) |
| `SIZE_PRICES` | No | `Small:10,Medium:15,Large:20,X-Large:25` |
| `SALEOR_CHANNEL_SLUG` | No | Channel slug (default: `default-channel`) |
| `BOX_SIZE_ATTRIBUTE_SLUG` | No | Attribute slug for box size (default: `box-size`) |

\* Use either token or email+password.

## Attribute slug

The script finds variants by the **variant attribute** for box size. In Saleor the slug is usually the attribute name lowercased and hyphenated (e.g. "Box Size" → `box-size`). If your attribute has a different slug, set `BOX_SIZE_ATTRIBUTE_SLUG` to match.
