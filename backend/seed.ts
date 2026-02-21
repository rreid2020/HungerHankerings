import "dotenv/config"

const backendUrl = process.env.MEDUSA_BACKEND_URL || "http://localhost:9000"
const adminEmail = process.env.ADMIN_EMAIL || "admin@hungerhankerings.com"
const adminPassword = process.env.ADMIN_PASS || "admin123"
const stripeSecret = process.env.STRIPE_SECRET || ""
const stripeWebhookSecret = process.env.STRIPE_WEBHOOK_SECRET || ""
const stripeEnabled =
  stripeSecret && !stripeSecret.includes("...") && stripeWebhookSecret

const products = [
  {
    title: "Classic Guilt Free Box",
    handle: "classic-guilt-free-box",
    description:
      "A balanced mix of better-for-you snacks packed with flavor.",
    tags: ["guilt-free", "classic"]
  },
  {
    title: "Movie Night Snack Box",
    handle: "movie-night-snack-box",
    description: "Sweet and salty favorites for the perfect movie night.",
    tags: ["movie-night", "sweet", "salty"]
  },
  {
    title: "Munchies Box",
    handle: "munchies-box",
    description: "Crunchy, craveable bites for any time snacking.",
    tags: ["munchies", "crunchy"]
  },
  {
    title: "Sweet & Salty Box",
    handle: "sweet-salty-box",
    description: "The perfect balance of sweet treats and savory bites.",
    tags: ["sweet", "salty"]
  },
  {
    title: "Vegan Gluten Free Snack Box",
    handle: "vegan-gluten-free-snack-box",
    description: "Plant-based and gluten-free snacks that taste amazing.",
    tags: ["vegan", "gluten-free"]
  },
  {
    title: "All Canadian Snack Box",
    handle: "all-canadian-snack-box",
    description: "A curated selection of Canadian-made snack favorites.",
    tags: ["canadian"]
  },
  {
    title: "Guilt Free Movie Night Box",
    handle: "guilt-free-movie-night-box",
    description: "Better-for-you snacks for a movie night you can feel good about.",
    tags: ["guilt-free", "movie-night"]
  }
]

const createRequest = async (
  path: string,
  auth: { token?: string; cookie?: string },
  body?: unknown
) => {
  const res = await fetch(`${backendUrl}${path}`, {
    method: body ? "POST" : "GET",
    headers: {
      "Content-Type": "application/json",
      ...(auth.token ? { Authorization: `Bearer ${auth.token}` } : {}),
      ...(auth.cookie ? { Cookie: auth.cookie } : {})
    },
    body: body ? JSON.stringify(body) : undefined
  })

  if (!res.ok) {
    const text = await res.text()
    throw new Error(`${path} failed: ${res.status} ${text}`)
  }

  return await res.json()
}

const run = async () => {
  const loginRes = await fetch(`${backendUrl}/admin/auth`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: adminEmail, password: adminPassword })
  })

  if (!loginRes.ok) {
    const text = await loginRes.text()
    throw new Error(`Login failed: ${loginRes.status} ${text}`)
  }

  const loginData = await loginRes.json()
  const token = loginData?.access_token || loginData?.token
  const cookie = loginRes.headers.get("set-cookie") || undefined

  if (!token && !cookie) {
    throw new Error("Admin login did not return a token or session cookie")
  }

  const auth = { token: token || undefined, cookie }

  await createRequest("/admin/store", auth, {
    default_currency_code: "cad",
    currencies: ["cad"]
  })

  const regions = await createRequest("/admin/regions", auth)
  let region = regions?.regions?.[0]

  if (!region) {
    const regionRes = await createRequest("/admin/regions", auth, {
      name: "Canada",
      currency_code: "cad",
      countries: ["ca"],
      tax_rate: 0,
      payment_providers: [stripeEnabled ? "stripe" : "manual"],
      fulfillment_providers: ["manual"]
    })
    region = regionRes.region
  }

  const profiles = await createRequest("/admin/shipping-profiles", auth)
  let profile = profiles?.shipping_profiles?.[0]

  if (!profile) {
    const profileRes = await createRequest("/admin/shipping-profiles", auth, {
      name: "Default",
      type: "default"
    })
    profile = profileRes.shipping_profile
  }

  const options = await createRequest("/admin/shipping-options", auth)
  if (!options?.shipping_options?.length) {
    await createRequest("/admin/shipping-options", auth, {
      name: "Standard Shipping",
      region_id: region.id,
      profile_id: profile.id,
      provider_id: "manual",
      price_type: "flat_rate",
      amount: 0,
      data: {}
    })
  }

  const existing = await createRequest("/admin/products", auth)
  const existingHandles = new Set(
    (existing?.products || []).map((product) => product.handle)
  )

  for (const product of products) {
    if (existingHandles.has(product.handle)) {
      continue
    }

    await createRequest("/admin/products", auth, {
      title: product.title,
      handle: product.handle,
      description: product.description,
      status: "published",
      images: ["https://placehold.co/800x600?text=Hunger+Hankerings"],
      tags: product.tags.map((value) => ({ value })),
      options: [{ title: "Default" }],
      variants: [
        {
          title: "Default",
          sku: product.handle,
          inventory_quantity: 1000,
          options: [{ value: "Default" }],
          prices: [{ currency_code: "cad", amount: 3999 }]
        }
      ]
    })
  }

  console.log("Seed completed")
}

run().catch((error) => {
  console.error(error)
  process.exit(1)
})
