import OrderConfirmationClient from "./order-confirmation-client"

/**
 * Order confirmation after checkout. `id` is the Vendure order **code** (e.g. ABC12XYZ), not a UUID.
 * Details load client-side with cookies + optional fallback from checkout localStorage.
 */
export default async function OrderPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  return <OrderConfirmationClient orderCode={decodeURIComponent(id)} />
}
