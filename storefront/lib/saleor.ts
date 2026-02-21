const saleorUrl =
  process.env.SALEOR_API_URL ||
  process.env.NEXT_PUBLIC_SALEOR_API_URL ||
  "http://localhost:8000/graphql/"
const channel =
  process.env.SALEOR_CHANNEL ||
  process.env.NEXT_PUBLIC_SALEOR_CHANNEL ||
  "default-channel"

type GraphQlResponse<T> = {
  data?: T
  errors?: { message: string }[]
}

const SALEOR_REQUEST_TIMEOUT_MS = 10_000

const fetchSaleor = async <T>(
  query: string,
  variables?: Record<string, unknown>,
  authToken?: string
): Promise<T> => {
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), SALEOR_REQUEST_TIMEOUT_MS)

  const headers: Record<string, string> = { "Content-Type": "application/json" }
  if (authToken) {
    headers.Authorization = `Bearer ${authToken}`
  }

  try {
    const res = await fetch(saleorUrl, {
      method: "POST",
      headers,
      body: JSON.stringify({ query, variables }),
      cache: "no-store",
      signal: controller.signal
    })
    clearTimeout(timeoutId)

    // Check if response is OK before parsing JSON
    if (!res.ok) {
      const contentType = res.headers.get("content-type")
      if (contentType?.includes("application/json")) {
        const errorPayload = (await res.json()) as GraphQlResponse<T>
        const msg =
          errorPayload.errors?.[0]?.message ||
          `Saleor request failed: ${res.status} ${res.statusText}`
        throw new Error(msg)
      } else {
        // Response is HTML or other non-JSON format
        const text = await res.text()
        throw new Error(
          `Saleor API returned ${res.status} ${res.statusText}. URL: ${saleorUrl}. Response: ${text.substring(0, 200)}`
        )
      }
    }

    const contentType = res.headers.get("content-type")
    if (!contentType?.includes("application/json")) {
      const text = await res.text()
      throw new Error(
        `Saleor API returned non-JSON response (${contentType}). Response: ${text.substring(0, 200)}`
      )
    }

    const payload = (await res.json()) as GraphQlResponse<T>
    if (payload.errors?.length) {
      throw new Error(payload.errors[0]?.message || "Saleor query failed")
    }

    if (!payload.data) {
      throw new Error("Saleor returned empty response")
    }

    return payload.data
  } catch (err) {
    clearTimeout(timeoutId)
    if (err instanceof Error) {
      if (err.name === "AbortError") {
        throw new Error("Saleor request timed out. Is the API running?")
      }
    }
    throw err
  }
}

/** Attribute value on a variant (e.g. Size: "Large", Gift: "Gift Box") */
export type SaleorVariantAttribute = {
  attribute: { name: string }
  values: { name: string }[]
}

export type SaleorProductVariant = {
  id: string
  name: string
  pricing?: { price?: { gross?: { amount: number; currency: string } } }
  /** Variant attributes (Size, Gift option, etc.). Use deprecated `attributes` for compatibility. */
  attributes?: SaleorVariantAttribute[]
  /** Available quantity; undefined if not queried. 0 = out of stock. */
  quantityAvailable?: number
}

export type SaleorProduct = {
  id: string
  name: string
  slug: string
  description?: string | null
  thumbnail?: { url: string | null } | null
  pricing?: {
    priceRange?: {
      start?: { gross?: { amount: number; currency: string } }
    }
  }
  variants?: SaleorProductVariant[]
}

type CheckoutLine = {
  id: string
  quantity: number
  totalPrice?: { gross?: { amount: number; currency: string } }
  variant: {
    id: string
    name: string
    product: { name: string; thumbnail?: { url: string | null } | null }
    pricing?: { price?: { gross?: { amount: number; currency: string } } }
    media?: { url: string }[]
  }
}

export type SaleorCheckout = {
  id: string
  email?: string | null
  lines: CheckoutLine[]
  subtotalPrice?: { gross?: { amount: number; currency: string } }
  totalPrice?: { gross?: { amount: number; currency: string } }
  shippingPrice?: { gross?: { amount: number; currency: string } }
}

const checkoutFragment = `
  id
  email
  lines {
    id
    quantity
    totalPrice {
      gross {
        amount
        currency
      }
    }
    variant {
      id
      name
      product {
        name
        thumbnail {
          url
        }
      }
      media {
        url
      }
      pricing {
        price {
          gross {
            amount
            currency
          }
        }
      }
    }
  }
  subtotalPrice {
    gross {
      amount
      currency
    }
  }
  shippingPrice {
    gross {
      amount
      currency
    }
  }
  totalPrice {
    gross {
      amount
      currency
    }
  }
`

const assertNoErrors = (
  errors: { message?: string }[] | null | undefined,
  label: string
) => {
  if (!errors?.length) return
  throw new Error(`${label}: ${errors[0]?.message || "Unknown error"}`)
}

export const listProducts = async (): Promise<SaleorProduct[]> => {
  const data = await fetchSaleor<{
    products: { edges: { node: SaleorProduct }[] }
  }>(
    `
      query Products($channel: String!) {
        products(first: 100, channel: $channel) {
          edges {
            node {
              id
              name
              slug
              description
              thumbnail {
                url
              }
              pricing {
                priceRange {
                  start {
                    gross {
                      amount
                      currency
                    }
                  }
                }
              }
              variants {
                id
                name
                pricing {
                  price {
                    gross {
                      amount
                      currency
                    }
                  }
                }
                quantityAvailable
              }
            }
          }
        }
      }
    `,
    { channel }
  )

  return data.products?.edges?.map((edge) => edge.node) ?? []
}

export const getProductByHandle = async (
  slug: string
): Promise<SaleorProduct | null> => {
  const data = await fetchSaleor<{ product: SaleorProduct | null }>(
    `
      query ProductBySlug($slug: String!, $channel: String!) {
        product(slug: $slug, channel: $channel) {
          id
          name
          slug
          description
          thumbnail {
            url
          }
          pricing {
            priceRange {
              start {
                gross {
                  amount
                  currency
                }
              }
            }
          }
          variants {
            id
            name
            pricing {
              price {
                gross {
                  amount
                  currency
                }
              }
            }
            quantityAvailable
            attributes {
              attribute {
                name
              }
              values {
                name
              }
            }
          }
        }
      }
    `,
    { slug, channel }
  )

  return data.product
}

export const getCheckout = async (
  id: string
): Promise<SaleorCheckout | null> => {
  const data = await fetchSaleor<{ checkout: SaleorCheckout | null }>(
    `
      query Checkout($id: ID!) {
        checkout(id: $id) {
          ${checkoutFragment}
        }
      }
    `,
    { id }
  )

  return data.checkout
}

export const createCheckout = async (params: {
  email?: string
  lines: { variantId: string; quantity: number }[]
}): Promise<SaleorCheckout> => {
  const data = await fetchSaleor<{
    checkoutCreate: {
      checkout: SaleorCheckout | null
      errors: { message?: string }[]
    }
  }>(
    `
      mutation CheckoutCreate($input: CheckoutCreateInput!) {
        checkoutCreate(input: $input) {
          checkout {
            ${checkoutFragment}
          }
          errors {
            message
          }
        }
      }
    `,
    {
      input: {
        channel,
        email: params.email,
        lines: params.lines.map((line) => ({
          variantId: line.variantId,
          quantity: line.quantity
        }))
      }
    }
  )

  assertNoErrors(data.checkoutCreate.errors, "CheckoutCreate")
  if (!data.checkoutCreate.checkout) {
    throw new Error("CheckoutCreate returned no checkout")
  }
  return data.checkoutCreate.checkout
}

export const checkoutLinesAdd = async (
  checkoutId: string,
  lines: { variantId: string; quantity: number }[]
): Promise<SaleorCheckout> => {
  const data = await fetchSaleor<{
    checkoutLinesAdd: {
      checkout: SaleorCheckout | null
      errors: { message?: string }[]
    }
  }>(
    `
      mutation CheckoutLinesAdd($id: ID!, $lines: [CheckoutLineInput!]!) {
        checkoutLinesAdd(id: $id, lines: $lines) {
          checkout {
            ${checkoutFragment}
          }
          errors {
            message
          }
        }
      }
    `,
    { id: checkoutId, lines }
  )

  assertNoErrors(data.checkoutLinesAdd.errors, "CheckoutLinesAdd")
  if (!data.checkoutLinesAdd.checkout) {
    throw new Error("CheckoutLinesAdd returned no checkout")
  }
  return data.checkoutLinesAdd.checkout
}

export const checkoutLineUpdate = async (
  checkoutId: string,
  lineId: string,
  quantity: number
): Promise<SaleorCheckout> => {
  const data = await fetchSaleor<{
    checkoutLinesUpdate: {
      checkout: SaleorCheckout | null
      errors: { message?: string }[]
    }
  }>(
    `
      mutation CheckoutLinesUpdate($id: ID!, $lines: [CheckoutLineUpdateInput!]!) {
        checkoutLinesUpdate(id: $id, lines: $lines) {
          checkout {
            ${checkoutFragment}
          }
          errors {
            message
          }
        }
      }
    `,
    { id: checkoutId, lines: [{ lineId, quantity }] }
  )

  assertNoErrors(data.checkoutLinesUpdate.errors, "CheckoutLinesUpdate")
  if (!data.checkoutLinesUpdate.checkout) {
    throw new Error("CheckoutLinesUpdate returned no checkout")
  }
  return data.checkoutLinesUpdate.checkout
}

export const checkoutLineDelete = async (
  checkoutId: string,
  lineId: string
): Promise<SaleorCheckout> => {
  const data = await fetchSaleor<{
    checkoutLineDelete: {
      checkout: SaleorCheckout | null
      errors: { message?: string }[]
    }
  }>(
    `
      mutation CheckoutLineDelete($id: ID!, $lineId: ID!) {
        checkoutLineDelete(id: $id, lineId: $lineId) {
          checkout {
            ${checkoutFragment}
          }
          errors {
            message
          }
        }
      }
    `,
    { id: checkoutId, lineId }
  )

  assertNoErrors(data.checkoutLineDelete.errors, "CheckoutLineDelete")
  if (!data.checkoutLineDelete.checkout) {
    throw new Error("CheckoutLineDelete returned no checkout")
  }
  return data.checkoutLineDelete.checkout
}

/** Address input for Saleor (checkout shipping/billing) */
export type SaleorAddressInput = {
  firstName: string
  lastName: string
  streetAddress1: string
  streetAddress2?: string | null
  city: string
  postalCode: string
  country: string
  countryArea?: string | null
  phone?: string | null
}

export const checkoutEmailUpdate = async (
  checkoutId: string,
  email: string
): Promise<SaleorCheckout> => {
  const data = await fetchSaleor<{
    checkoutEmailUpdate: {
      checkout: SaleorCheckout | null
      errors: { message?: string }[]
    }
  }>(
    `
      mutation CheckoutEmailUpdate($id: ID!, $email: String!) {
        checkoutEmailUpdate(id: $id, email: $email) {
          checkout {
            ${checkoutFragment}
          }
          errors {
            message
          }
        }
      }
    `,
    { id: checkoutId, email }
  )
  assertNoErrors(data.checkoutEmailUpdate.errors, "CheckoutEmailUpdate")
  if (!data.checkoutEmailUpdate.checkout) {
    throw new Error("CheckoutEmailUpdate returned no checkout")
  }
  return data.checkoutEmailUpdate.checkout
}

export const checkoutShippingAddressUpdate = async (
  checkoutId: string,
  address: SaleorAddressInput
): Promise<SaleorCheckout> => {
  const data = await fetchSaleor<{
    checkoutShippingAddressUpdate: {
      checkout: SaleorCheckout | null
      errors: { message?: string }[]
    }
  }>(
    `
      mutation CheckoutShippingAddressUpdate($id: ID!, $shippingAddress: AddressInput!) {
        checkoutShippingAddressUpdate(id: $id, shippingAddress: $shippingAddress) {
          checkout {
            ${checkoutFragment}
          }
          errors {
            message
          }
        }
      }
    `,
    { id: checkoutId, shippingAddress: address }
  )
  assertNoErrors(data.checkoutShippingAddressUpdate.errors, "CheckoutShippingAddressUpdate")
  if (!data.checkoutShippingAddressUpdate.checkout) {
    throw new Error("CheckoutShippingAddressUpdate returned no checkout")
  }
  return data.checkoutShippingAddressUpdate.checkout
}

export const checkoutBillingAddressUpdate = async (
  checkoutId: string,
  address: SaleorAddressInput
): Promise<SaleorCheckout> => {
  const data = await fetchSaleor<{
    checkoutBillingAddressUpdate: {
      checkout: SaleorCheckout | null
      errors: { message?: string }[]
    }
  }>(
    `
      mutation CheckoutBillingAddressUpdate($id: ID!, $billingAddress: AddressInput!) {
        checkoutBillingAddressUpdate(id: $id, billingAddress: $billingAddress) {
          checkout {
            ${checkoutFragment}
          }
          errors {
            message
          }
        }
      }
    `,
    { id: checkoutId, billingAddress: address }
  )
  assertNoErrors(data.checkoutBillingAddressUpdate.errors, "CheckoutBillingAddressUpdate")
  if (!data.checkoutBillingAddressUpdate.checkout) {
    throw new Error("CheckoutBillingAddressUpdate returned no checkout")
  }
  return data.checkoutBillingAddressUpdate.checkout
}

/** Attach the authenticated customer to the checkout so the order is linked to their account */
export const checkoutCustomerAttach = async (
  checkoutId: string,
  authToken: string
): Promise<SaleorCheckout> => {
  const data = await fetchSaleor<{
    checkoutCustomerAttach: {
      checkout: SaleorCheckout | null
      errors: { message?: string }[]
    }
  }>(
    `
      mutation CheckoutCustomerAttach($id: ID!) {
        checkoutCustomerAttach(id: $id) {
          checkout {
            ${checkoutFragment}
          }
          errors {
            message
          }
        }
      }
    `,
    { id: checkoutId },
    authToken
  )
  assertNoErrors(data.checkoutCustomerAttach.errors, "CheckoutCustomerAttach")
  if (!data.checkoutCustomerAttach.checkout) {
    throw new Error("CheckoutCustomerAttach returned no checkout")
  }
  return data.checkoutCustomerAttach.checkout
}

/** Get available shipping methods for a checkout (call after setting shipping address) */
export const getCheckoutShippingMethods = async (
  checkoutId: string
): Promise<{ id: string; name: string }[]> => {
  const data = await fetchSaleor<{
    checkout: { shippingMethods: { id: string; name: string }[] } | null
  }>(
    `
      query CheckoutShippingMethods($id: ID!) {
        checkout(id: $id) {
          shippingMethods {
            id
            name
          }
        }
      }
    `,
    { id: checkoutId }
  )
  if (!data.checkout) return []
  return data.checkout.shippingMethods ?? []
}

/** Set the delivery/shipping method on the checkout (required before checkoutComplete) */
export const checkoutDeliveryMethodUpdate = async (
  checkoutId: string,
  deliveryMethodId: string
): Promise<SaleorCheckout> => {
  const data = await fetchSaleor<{
    checkoutDeliveryMethodUpdate: {
      checkout: SaleorCheckout | null
      errors: { message?: string }[]
    }
  }>(
    `
      mutation CheckoutDeliveryMethodUpdate($id: ID!, $deliveryMethodId: ID!) {
        checkoutDeliveryMethodUpdate(id: $id, deliveryMethodId: $deliveryMethodId) {
          checkout {
            ${checkoutFragment}
          }
          errors {
            message
          }
        }
      }
    `,
    { id: checkoutId, deliveryMethodId }
  )
  assertNoErrors(data.checkoutDeliveryMethodUpdate.errors, "CheckoutDeliveryMethodUpdate")
  if (!data.checkoutDeliveryMethodUpdate.checkout) {
    throw new Error("CheckoutDeliveryMethodUpdate returned no checkout")
  }
  return data.checkoutDeliveryMethodUpdate.checkout
}

/** Get checkout total price (gross amount) for payment creation */
export const getCheckoutTotalPrice = async (checkoutId: string): Promise<number> => {
  const data = await fetchSaleor<{
    checkout: { totalPrice: { gross: { amount: number } } } | null
  }>(
    `
      query CheckoutTotalPrice($id: ID!) {
        checkout(id: $id) {
          totalPrice {
            gross { amount }
          }
        }
      }
    `,
    { id: checkoutId }
  )
  if (!data.checkout?.totalPrice?.gross?.amount) {
    throw new Error("Could not get checkout total")
  }
  return data.checkout.totalPrice.gross.amount
}

/** Create Stripe payment for checkout (required before checkoutComplete when Stripe is enabled) */
export const checkoutPaymentCreate = async (
  checkoutId: string,
  input: { gateway: string; amount: number; token?: string }
): Promise<void> => {
  const data = await fetchSaleor<{
    checkoutPaymentCreate: {
      payment: { id: string } | null
      errors: { message?: string }[]
    }
  }>(
    `
      mutation CheckoutPaymentCreate($checkoutId: ID!, $input: PaymentInput!) {
        checkoutPaymentCreate(checkoutId: $checkoutId, input: $input) {
          payment { id }
          errors { message }
        }
      }
    `,
    { checkoutId, input }
  )
  assertNoErrors(data.checkoutPaymentCreate.errors, "CheckoutPaymentCreate")
}

export type CheckoutCompleteResult = {
  order: SaleorOrder | null
  confirmationNeeded: boolean
  confirmationData?: string | null
  errors: { message?: string }[]
}

export const checkoutComplete = async (
  checkoutId: string,
  redirectUrl: string,
  options?: { paymentData?: string; metadata?: { key: string; value: string }[] }
): Promise<CheckoutCompleteResult> => {
  const paymentData = options?.paymentData ?? null
  const metadata = options?.metadata ?? []
  const data = await fetchSaleor<{
    checkoutComplete: {
      order: SaleorOrder | null
      confirmationNeeded: boolean | null
      confirmationData?: string | null
      errors: { message?: string }[]
    }
  }>(
    `
      mutation CheckoutComplete($id: ID!, $redirectUrl: String!, $paymentData: JSONString, $metadata: [MetadataInput!]) {
        checkoutComplete(id: $id, redirectUrl: $redirectUrl, paymentData: $paymentData, metadata: $metadata) {
          confirmationData
          order {
            id
            token
            number
            created
            status
            total {
              gross {
                amount
                currency
              }
            }
            lines {
              id
              productName
              variantName
              quantity
              unitPrice {
                gross {
                  amount
                  currency
                }
              }
              thumbnail {
                url
              }
            }
            shippingAddress {
              firstName
              lastName
              streetAddress1
              streetAddress2
              city
              postalCode
              country {
                code
                country
              }
              countryArea
            }
            billingAddress {
              firstName
              lastName
              streetAddress1
              streetAddress2
              city
              postalCode
              country {
                code
                country
              }
              countryArea
            }
          }
          confirmationNeeded
          errors {
            message
          }
        }
      }
    `,
    { id: checkoutId, redirectUrl, paymentData, metadata }
  )
  const result = data.checkoutComplete
  if (result.errors?.length) {
    return {
      order: null,
      confirmationNeeded: false,
      errors: result.errors
    }
  }
  return {
    order: result.order ?? null,
    confirmationNeeded: result.confirmationNeeded ?? false,
    confirmationData: result.confirmationData ?? null,
    errors: []
  }
}

// ============================================================================
// Customer Authentication & Account Management
// ============================================================================

export type SaleorCustomer = {
  id: string
  email: string
  firstName: string
  lastName: string
  phone?: string | null
  isConfirmed: boolean
  dateJoined: string
  addresses?: {
    id: string
    firstName: string
    lastName: string
    companyName?: string | null
    streetAddress1: string
    streetAddress2?: string | null
    city: string
    postalCode: string
    country: { code: string; country: string }
    countryArea?: string | null
    phone?: string | null
    isDefaultShippingAddress?: boolean
    isDefaultBillingAddress?: boolean
  }[]
}

export type SaleorOrder = {
  id: string
  token: string
  number: string
  created: string
  status: string
  total: { gross: { amount: number; currency: string } }
  lines: {
    id: string
    productName: string
    variantName?: string | null
    quantity: number
    unitPrice: { gross: { amount: number; currency: string } }
    thumbnail?: { url: string | null } | null
  }[]
  shippingAddress?: {
    firstName: string
    lastName: string
    streetAddress1: string
    streetAddress2?: string | null
    city: string
    postalCode: string
    country: { code: string; country: string }
    countryArea?: string | null
    phone?: string | null
  } | null
  billingAddress?: {
    firstName: string
    lastName: string
    streetAddress1: string
    streetAddress2?: string | null
    city: string
    postalCode: string
    country: { code: string; country: string }
    countryArea?: string | null
    phone?: string | null
  } | null
}

type AuthTokenResponse = {
  token: string
  refreshToken: string
  user: {
    id: string
    email: string
  }
  errors?: { message: string; field?: string }[]
}

/** Authenticate customer with email and password */
export const customerLogin = async (
  email: string,
  password: string
): Promise<AuthTokenResponse> => {
  const data = await fetchSaleor<{
    tokenCreate: AuthTokenResponse & { errors?: { message: string; field?: string }[] }
  }>(
    `
      mutation TokenCreate($email: String!, $password: String!) {
        tokenCreate(email: $email, password: $password) {
          token
          refreshToken
          user {
            id
            email
          }
          errors {
            message
            field
          }
        }
      }
    `,
    { email, password }
  )

  if (data.tokenCreate.errors?.length) {
    throw new Error(data.tokenCreate.errors[0].message || "Login failed")
  }

  if (!data.tokenCreate.token) {
    throw new Error("Login failed: No token returned")
  }

  return {
    token: data.tokenCreate.token,
    refreshToken: data.tokenCreate.refreshToken,
    user: data.tokenCreate.user
  }
}

/** Register new customer account */
export const customerRegister = async (params: {
  email: string
  password: string
  firstName: string
  lastName: string
  redirectUrl?: string
}): Promise<{ user?: SaleorCustomer; errors?: { message: string; field?: string }[] }> => {
  const data = await fetchSaleor<{
    accountRegister: {
      user: SaleorCustomer | null
      errors: { message: string; field?: string }[]
    }
  }>(
    `
      mutation AccountRegister(
        $email: String!
        $password: String!
        $firstName: String!
        $lastName: String!
        $redirectUrl: String
      ) {
        accountRegister(
          input: {
            email: $email
            password: $password
            firstName: $firstName
            lastName: $lastName
            redirectUrl: $redirectUrl
          }
        ) {
          user {
            id
            email
            firstName
            lastName
            isConfirmed
            dateJoined
          }
          errors {
            message
            field
          }
        }
      }
    `,
    {
      email: params.email,
      password: params.password,
      firstName: params.firstName,
      lastName: params.lastName,
      redirectUrl: params.redirectUrl || `${process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000"}/account`
    }
  )

  if (data.accountRegister.errors?.length) {
    return { errors: data.accountRegister.errors }
  }

  return { user: data.accountRegister.user || undefined }
}

/** Get current authenticated customer */
export const getCurrentCustomer = async (token: string): Promise<SaleorCustomer | null> => {
  const data = await fetchSaleor<{
    me: SaleorCustomer | null
  }>(
    `
      query Me {
        me {
          id
          email
          firstName
          lastName
          isConfirmed
          dateJoined
          addresses {
            id
            firstName
            lastName
            companyName
            streetAddress1
            streetAddress2
            city
            postalCode
            country {
              code
              country
            }
            countryArea
            isDefaultShippingAddress
            isDefaultBillingAddress
          }
        }
      }
    `,
    undefined,
    token
  )

  return data.me
}

/** Create a new address for the logged-in customer */
export const accountAddressCreate = async (
  token: string,
  input: SaleorAddressInput,
  type?: "BILLING" | "SHIPPING"
): Promise<{ addressId?: string; errors?: { message: string; field?: string }[] }> => {
  const data = await fetchSaleor<{
    accountAddressCreate: {
      address: { id: string } | null
      errors: { message?: string; field?: string }[]
    }
  }>(
    `
      mutation AccountAddressCreate($input: AddressInput!, $type: AddressTypeEnum) {
        accountAddressCreate(input: $input, type: $type) {
          address { id }
          errors { message field }
        }
      }
    `,
    { input, type: type ?? null },
    token
  )
  if (data.accountAddressCreate.errors?.length) {
    return {
      errors: data.accountAddressCreate.errors.map((e) => ({
        message: e.message ?? "",
        field: e.field
      }))
    }
  }
  return { addressId: data.accountAddressCreate.address?.id ?? undefined }
}

/** Update an address for the logged-in customer */
export const accountAddressUpdate = async (
  token: string,
  addressId: string,
  input: SaleorAddressInput
): Promise<{ errors?: { message: string; field?: string }[] }> => {
  const data = await fetchSaleor<{
    accountAddressUpdate: {
      errors: { message?: string; field?: string }[]
    }
  }>(
    `
      mutation AccountAddressUpdate($id: ID!, $input: AddressInput!) {
        accountAddressUpdate(id: $id, input: $input) {
          errors { message field }
        }
      }
    `,
    { id: addressId, input },
    token
  )
  if (data.accountAddressUpdate.errors?.length) {
    return {
      errors: data.accountAddressUpdate.errors.map((e) => ({
        message: e.message ?? "",
        field: e.field
      }))
    }
  }
  return {}
}

/** Delete an address for the logged-in customer */
export const accountAddressDelete = async (
  token: string,
  addressId: string
): Promise<{ errors?: { message: string }[] }> => {
  const data = await fetchSaleor<{
    accountAddressDelete: {
      errors: { message?: string }[]
    }
  }>(
    `
      mutation AccountAddressDelete($id: ID!) {
        accountAddressDelete(id: $id) {
          errors { message }
        }
      }
    `,
    { id: addressId },
    token
  )
  if (data.accountAddressDelete.errors?.length) {
    return {
      errors: data.accountAddressDelete.errors.map((e) => ({ message: e.message ?? "" }))
    }
  }
  return {}
}

/** Update the logged-in customer's account (firstName, lastName) */
export const accountUpdate = async (
  token: string,
  input: { firstName: string; lastName: string }
): Promise<{ errors?: { message: string; field?: string }[] }> => {
  const data = await fetchSaleor<{
    accountUpdate: {
      errors: { message?: string; field?: string }[]
    }
  }>(
    `
      mutation AccountUpdate($input: AccountInput!) {
        accountUpdate(input: $input) {
          errors { message field }
        }
      }
    `,
    { input },
    token
  )
  if (data.accountUpdate.errors?.length) {
    return {
      errors: data.accountUpdate.errors.map((e) => ({
        message: e.message ?? "",
        field: e.field
      }))
    }
  }
  return {}
}

/** Refresh authentication token */
export const refreshToken = async (refreshToken: string): Promise<AuthTokenResponse> => {
  const data = await fetchSaleor<{
    tokenRefresh: {
      token: string
      user: {
        id: string
        email: string
      }
      errors?: { message: string }[]
    }
  }>(
    `
      mutation TokenRefresh($refreshToken: String!) {
        tokenRefresh(refreshToken: $refreshToken) {
          token
          user {
            id
            email
          }
          errors {
            message
          }
        }
      }
    `,
    { refreshToken }
  )

  if (data.tokenRefresh.errors?.length) {
    throw new Error(data.tokenRefresh.errors[0].message || "Token refresh failed")
  }

  if (!data.tokenRefresh.token) {
    throw new Error("Token refresh failed: No token returned")
  }

  // Note: Saleor tokenRefresh doesn't return a new refreshToken, so we keep the old one
  return {
    token: data.tokenRefresh.token,
    refreshToken: refreshToken, // Keep existing refresh token
    user: data.tokenRefresh.user
  }
}

/** Get customer orders */
export const getCustomerOrders = async (
  token: string,
  first: number = 20,
  after?: string
): Promise<{ orders: SaleorOrder[]; hasNextPage: boolean; endCursor?: string }> => {
  const data = await fetchSaleor<{
    me: {
      orders: {
        edges: { node: SaleorOrder }[]
        pageInfo: { hasNextPage: boolean; endCursor?: string | null }
      } | null
    }
  }>(
    `
      query CustomerOrders($first: Int!, $after: String) {
        me {
          orders(first: $first, after: $after) {
            edges {
              node {
                id
                token
                number
                created
                status
                total {
                  gross {
                    amount
                    currency
                  }
                }
                lines {
                  id
                  productName
                  variantName
                  quantity
                  unitPrice {
                    gross {
                      amount
                      currency
                    }
                  }
                  thumbnail {
                    url
                  }
                }
                shippingAddress {
                  firstName
                  lastName
                  streetAddress1
                  streetAddress2
                  city
                  postalCode
                  country {
                    code
                    country
                  }
                  countryArea
                  phone
                }
                billingAddress {
                  firstName
                  lastName
                  streetAddress1
                  streetAddress2
                  city
                  postalCode
                  country {
                    code
                    country
                  }
                  countryArea
                  phone
                }
              }
            }
            pageInfo {
              hasNextPage
              endCursor
            }
          }
        }
      }
    `,
    { first, after },
    token
  )

  const orders = data.me.orders?.edges.map((edge) => edge.node) ?? []
  const pageInfo = data.me.orders?.pageInfo ?? { hasNextPage: false, endCursor: null }

  return {
    orders,
    hasNextPage: pageInfo.hasNextPage ?? false,
    endCursor: pageInfo.endCursor ?? undefined
  }
}

/** Get order by token (for guest orders or authenticated users) */
export const getOrderByToken = async (token: string): Promise<SaleorOrder | null> => {
  const data = await fetchSaleor<{
    orderByToken: SaleorOrder | null
  }>(
    `
      query OrderByToken($token: UUID!) {
        orderByToken(token: $token) {
          id
          token
          number
          created
          status
          total {
            gross {
              amount
              currency
            }
          }
          lines {
            id
            productName
            variantName
            quantity
            unitPrice {
              gross {
                amount
                currency
              }
            }
            thumbnail {
              url
            }
          }
          shippingAddress {
            firstName
            lastName
            streetAddress1
            streetAddress2
            city
            postalCode
            country {
              code
              country
            }
            countryArea
            phone
          }
          billingAddress {
            firstName
            lastName
            streetAddress1
            streetAddress2
            city
            postalCode
            country {
              code
              country
            }
            countryArea
            phone
          }
        }
      }
    `,
    { token }
  )

  return data.orderByToken
}

/** Request password reset (can be used if account exists but isn't confirmed) */
export const requestPasswordReset = async (email: string, redirectUrl?: string): Promise<{ errors?: { message: string; field?: string }[] }> => {
  const data = await fetchSaleor<{
    requestPasswordReset: {
      errors: { message: string; field?: string }[]
    }
  }>(
    `
      mutation RequestPasswordReset($email: String!, $redirectUrl: String, $channel: String!) {
        requestPasswordReset(email: $email, redirectUrl: $redirectUrl, channel: $channel) {
          errors {
            message
            field
          }
        }
      }
    `,
    {
      email,
      redirectUrl: redirectUrl || `${process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000"}/reset-password`,
      channel
    }
  )

  if (data.requestPasswordReset.errors?.length) {
    return { errors: data.requestPasswordReset.errors }
  }

  return {}
}

/** Confirm account with email and token from confirmation email */
export const confirmAccount = async (email: string, token: string): Promise<{ user?: SaleorCustomer; errors?: { message: string; field?: string }[] }> => {
  const data = await fetchSaleor<{
    confirmAccount: {
      user: SaleorCustomer | null
      errors: { message: string; field?: string }[]
    }
  }>(
    `
      mutation ConfirmAccount($email: String!, $token: String!) {
        confirmAccount(email: $email, token: $token) {
          user {
            id
            email
            firstName
            lastName
            isConfirmed
            dateJoined
          }
          errors {
            message
            field
          }
        }
      }
    `,
    { email, token }
  )

  if (data.confirmAccount.errors?.length) {
    return { errors: data.confirmAccount.errors }
  }

  return { user: data.confirmAccount.user || undefined }
}

