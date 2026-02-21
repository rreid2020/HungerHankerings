import Link from "next/link"

const SiteFooter = () => {
  return (
    <footer className="bg-footer text-footer-foreground border-t border-white/20">
      <div className="container-page grid gap-8 py-12 md:grid-cols-2 lg:grid-cols-4">
        <div>
          <h3 className="text-lg font-semibold text-white">About us</h3>
          <p className="mt-3 text-sm text-white/90">
            Let us help you discover an exciting and surprising assortment of snack products that will satisfy everyone&apos;s dietary preferences. Choose to receive our snacks monthly, bi-monthly, weekly, or one time only - although we&apos;re sure you&apos;ll come back for more!
          </p>
        </div>
        <div>
          <h3 className="text-lg font-semibold text-white">Our Mission</h3>
          <p className="mt-3 text-sm text-white/90">
            Hunger Hankerings offers curated snack boxes that aim to make snacking moments meaningful, fueling both the mind and body. From guilt free, gluten free, vegan, sweet tooth, salty, nutty, and more, you can select from our professionally curated box themes or curate your very own box by selecting the snacks. Each box is filled with an array of high quality assortment of snack products, aimed to calm your hunger and keep you focused.
          </p>
        </div>
        <div className="text-sm">
          <h3 className="text-lg font-semibold text-white">Site Links</h3>
          <ul className="mt-3 space-y-2 text-cyan-200">
            <li>
              <Link href="/office-pantry-snack-service" className="transition hover:text-white">Office Pantry Snack Service</Link>
              <ul className="ml-4 mt-1 space-y-1">
                <li>
                  <Link href="/contact" className="transition hover:text-white">Pantry Snacks Enquiry Form</Link>
                </li>
              </ul>
            </li>
            <li>
              <Link href="/team-snacks-delivered" className="transition hover:text-white">Team Snacks</Link>
            </li>
          </ul>
        </div>
        <div className="text-sm">
          <h3 className="text-lg font-semibold text-white">Contact Info</h3>
          <div className="mt-3 space-y-1 text-cyan-200">
            <p>Ottawa, Canada</p>
            <a href="tel:613-702-0262" className="block transition hover:text-white">613-702-0262</a>
            <a href="mailto:hello@hungerhankerings.com" className="block transition hover:text-white">hello@hungerhankerings.com</a>
            <p>Mon-Fri 9-5pm</p>
            <p>Sat 9-2pm</p>
          </div>
        </div>
      </div>
      <div className="border-t border-white/20 py-6">
        <div className="container-page text-xs text-white/80">
          © 2026 Hunger Hankerings. All rights reserved.
        </div>
      </div>
    </footer>
  )
}

export default SiteFooter
