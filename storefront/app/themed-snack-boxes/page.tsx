import CheckoutButton from "../../components/CheckoutButton"
import LandingPageSections from "../../components/landing/LandingPageSections"

export const dynamic = "force-dynamic"

const ThemedSnackBoxesPage = () => {
  return (
    <div>
      <div className="border-b border-border bg-background">
        <div className="container-page flex justify-end py-3">
          <CheckoutButton />
        </div>
      </div>
      <LandingPageSections />
    </div>
  )
}

export default ThemedSnackBoxesPage
