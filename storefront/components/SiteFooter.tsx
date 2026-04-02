import Link from "next/link"

const SiteFooter = () => {
  return (
    <footer className="bg-footer text-footer-foreground border-t border-white/20">
      <div className="container-page grid gap-8 py-12 md:grid-cols-2 lg:grid-cols-4">
        <div>
          <h3 className="text-lg font-semibold text-white">About us</h3>
          <div className="mt-3 space-y-3 text-sm text-white/90">
            <p>We make snacking simple, enjoyable, and tailored to every craving.</p>
            <p>
              At Hunger Hankerings, we curate snack boxes filled with a mix of recognizable favorites
              and better-for-you options—carefully selected to suit different tastes, dietary
              preferences, and occasions.
            </p>
            <p>
              Whether you&apos;re treating yourself, sending a gift, or fueling a team, our goal is
              to deliver a snack experience that feels thoughtful, convenient, and worth coming back
              to.
            </p>
          </div>
        </div>
        <div>
          <h3 className="text-lg font-semibold text-white">Our Mission</h3>
          <div className="mt-3 space-y-3 text-sm text-white/90">
            <p>To make snacking more meaningful—without sacrificing taste or convenience.</p>
            <p>
              We believe great snacks should do more than just satisfy hunger. That&apos;s why we
              curate a balanced mix of indulgent and better-for-you options, giving you the freedom
              to enjoy what you love while discovering something new.
            </p>
            <p>
              From individual orders to corporate programs, we&apos;re focused on delivering
              high-quality, curated snack experiences that bring people together, create moments, and
              fit seamlessly into everyday life.
            </p>
          </div>
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
