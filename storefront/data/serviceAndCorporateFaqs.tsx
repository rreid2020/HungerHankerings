import type { FaqItem } from "../components/service-landings/shared/FaqSection"

export const generalFaqItems: FaqItem[] = [
  {
    question: "What is Hunger Hankerings?",
    answer: (
      <p>
        We curate snack boxes and pantry programs for teams, gifts, and fundraising—so you get
        thoughtful assortments without chasing vendors or packing boxes yourself.
      </p>
    ),
    schemaAnswer:
      "We curate snack boxes and pantry programs for teams, gifts, and fundraising so you get thoughtful assortments without chasing vendors or packing boxes yourself."
  },
  {
    question: "Do you offer subscriptions?",
    answer: (
      <p>
        We offer one-time orders and recurring snack drops based on your schedule. Corporate
        programs use custom cadences rather than a single fixed “subscription” for every product.
      </p>
    ),
    schemaAnswer:
      "We offer one-time orders and recurring snack drops based on your schedule. Corporate programs use custom cadences rather than one fixed subscription for every product."
  },
  {
    question: "Do you have dietary options?",
    answer: (
      <p>
        Yes. Vegan, gluten-free, nut-aware, and better-for-you options are available—tell us what
        your team needs and we&apos;ll tailor where we can.
      </p>
    ),
    schemaAnswer:
      "Yes. Vegan, gluten-free, nut-aware, and better-for-you options are available; tell us what your team needs and we will tailor where we can."
  },
  {
    question: "What are your shipping timelines?",
    answer: (
      <p>
        Most orders ship in about 2–4 business days once confirmed. Corporate and bulk timelines
        depend on volume and customization—we&apos;ll align with your event or campaign dates.
      </p>
    ),
    schemaAnswer:
      "Most orders ship in about 2–4 business days once confirmed. Corporate and bulk timelines depend on volume and customization; we align with your event or campaign dates."
  },
  {
    question: "What box sizes are available?",
    answer: (
      <p>
        We curate boxes based on team size and budget, from small batches to bulk and pallet
        programs.
      </p>
    ),
    schemaAnswer:
      "We curate boxes based on team size and budget, from small batches to bulk and pallet programs."
  },
  {
    question: "Can I request substitutions?",
    answer: (
      <p>
        Absolutely. Let us know preferences and we&apos;ll customize the assortment when possible.
      </p>
    ),
    schemaAnswer: "Yes. Tell us your preferences and we will customize the assortment when possible."
  },
  {
    question: "Do you ship internationally?",
    answer: <p>We currently ship within Canada only.</p>,
    schemaAnswer: "We currently ship within Canada only."
  },
  {
    question: "Are the snacks full size?",
    answer: (
      <p>Yes, most boxes include full-size snacks unless you request otherwise.</p>
    ),
    schemaAnswer: "Yes, most boxes include full-size snacks unless you request otherwise."
  },
  {
    question: "What are the shipping fees?",
    answer: (
      <p>
        Shipping is included on most team box orders. Pantry service and bulk orders are quoted
        based on your program.
      </p>
    ),
    schemaAnswer:
      "Shipping is included on most team box orders. Pantry service and bulk orders are quoted based on your program."
  },
  {
    question: "How can I contact you?",
    answer: (
      <p>
        Use our{" "}
        <a
          href="/contact?reason=general"
          className="font-medium text-primary underline-offset-2 hover:underline"
        >
          contact form
        </a>{" "}
        or email{" "}
        <a
          href="mailto:hello@hungerhankerings.com"
          className="font-medium text-primary underline-offset-2 hover:underline"
        >
          hello@hungerhankerings.com
        </a>
        .
      </p>
    ),
    schemaAnswer:
      "Use the contact form on hungerhankerings.com/contact (select a reason for your inquiry) or email hello@hungerhankerings.com."
  }
]

export const teamSnackFaqItems: FaqItem[] = [
  {
    question: "How much do team snack boxes cost?",
    answer: (
      <p>
        Pricing depends on the box size you choose. For corporate orders, pricing typically starts
        around $42.99 per box (including shipping, excluding tax), with volume discounts available.
      </p>
    ),
    schemaAnswer:
      "Pricing depends on box size. Corporate orders typically start around $42.99 per box including shipping excluding tax, with volume discounts available."
  },
  {
    question: "Can you ship to multiple employee addresses?",
    answer: (
      <p>
        Yes. We specialize in multi-address shipping across Canada, making it easy to send snack
        boxes to remote or hybrid teams.
      </p>
    ),
    schemaAnswer:
      "Yes. We specialize in multi-address shipping across Canada for remote or hybrid teams."
  },
  {
    question: "Do you offer subscriptions for team snack boxes?",
    answer: (
      <>
        <p>No—we don&apos;t use traditional subscriptions.</p>
        <p className="mt-3 font-medium text-foreground">You can:</p>
        <ul>
          <li>Order anytime as needed</li>
          <li>Set up a custom delivery schedule if you&apos;re sending regularly</li>
        </ul>
      </>
    ),
    schemaAnswer:
      "We do not use traditional subscriptions. You can order anytime or set up a custom delivery schedule for regular sends."
  },
  {
    question: "What's included in a team snack box?",
    answer: (
      <>
        <p>Each box includes a curated mix of:</p>
        <ul>
          <li>Chocolate and candy</li>
          <li>Chips and popcorn</li>
          <li>Granola and protein bars</li>
          <li>Nuts and better-for-you snacks</li>
        </ul>
        <p className="mt-3">All items are individually packaged and name-brand.</p>
      </>
    ),
    schemaAnswer:
      "Each box includes chocolate and candy, chips and popcorn, granola and protein bars, nuts and better-for-you snacks. Items are individually packaged and name-brand."
  },
  {
    question: "Can we customize the boxes for our team?",
    answer: (
      <>
        <p>Yes. We offer:</p>
        <ul>
          <li>Custom snack selections</li>
          <li>Branded inserts or messaging</li>
          <li>Themed boxes (onboarding, holidays, appreciation)</li>
        </ul>
      </>
    ),
    schemaAnswer:
      "Yes. We offer custom snack selections, branded inserts or messaging, and themed boxes for onboarding, holidays, and appreciation."
  },
  {
    question: "How long does delivery take?",
    answer: (
      <p>
        Delivery timelines depend on order size and shipping locations, but we coordinate timing to
        meet your event or campaign schedule.
      </p>
    ),
    schemaAnswer:
      "Delivery timelines depend on order size and locations; we coordinate timing to meet your event or campaign schedule."
  },
  {
    question: "Are these good for onboarding or client gifting?",
    answer: (
      <>
        <p>Absolutely. Team snack boxes are commonly used for:</p>
        <ul>
          <li>Employee onboarding</li>
          <li>Holiday gifts</li>
          <li>Team appreciation</li>
          <li>Client thank-you packages</li>
        </ul>
      </>
    ),
    schemaAnswer:
      "Yes. Common uses include employee onboarding, holiday gifts, team appreciation, and client thank-you packages."
  },
  {
    question: "What if someone has allergies?",
    answer: (
      <p>
        We can accommodate requests where possible, but we recommend reviewing product labels, as
        snacks come from multiple manufacturers.
      </p>
    ),
    schemaAnswer:
      "We accommodate requests where possible; always review product labels because snacks come from multiple manufacturers."
  }
]

export const officePantryFaqItems: FaqItem[] = [
  {
    question: "How does your office snack pantry service work?",
    answer: (
      <p>
        We supply curated snacks to your office on a custom schedule based on your team size and
        consumption.
      </p>
    ),
    schemaAnswer:
      "We supply curated snacks to your office on a custom schedule based on team size and consumption."
  },
  {
    question: "Is this a subscription service?",
    answer: (
      <>
        <p>No fixed subscriptions. Instead:</p>
        <ul>
          <li>We create a custom restocking schedule</li>
          <li>You can adjust quantities and frequency anytime</li>
        </ul>
      </>
    ),
    schemaAnswer:
      "There are no fixed subscriptions. We create a custom restocking schedule and you can adjust quantities and frequency anytime."
  },
  {
    question: "What types of snacks are included?",
    answer: (
      <>
        <p>We provide a mix of:</p>
        <ul>
          <li>Chips and popcorn</li>
          <li>Chocolate and candy</li>
          <li>Granola and protein bars</li>
          <li>Nuts and healthier options</li>
        </ul>
        <p className="mt-3">We balance indulgent and better-for-you snacks.</p>
      </>
    ),
    schemaAnswer:
      "Mix includes chips and popcorn, chocolate and candy, granola and protein bars, nuts and healthier options, balancing indulgent and better-for-you snacks."
  },
  {
    question: "Can we customize what goes into our office snack program?",
    answer: (
      <>
        <p>Yes. We tailor:</p>
        <ul>
          <li>Snack mix</li>
          <li>Quantities</li>
          <li>Frequency of delivery</li>
        </ul>
        <p className="mt-3">Based on your team&apos;s preferences and usage patterns.</p>
      </>
    ),
    schemaAnswer:
      "Yes. We tailor snack mix, quantities, and delivery frequency based on your team's preferences and usage."
  },
  {
    question: "Do you deliver across Canada?",
    answer: <p>Yes, with a focus on reliable delivery to offices and workplaces.</p>,
    schemaAnswer: "Yes, with reliable delivery to offices and workplaces across Canada."
  },
  {
    question: "What size companies do you support?",
    answer: (
      <>
        <p>We support:</p>
        <ul>
          <li>Small teams</li>
          <li>Growing companies</li>
          <li>Large offices with ongoing snack needs</li>
        </ul>
      </>
    ),
    schemaAnswer: "We support small teams, growing companies, and large offices with ongoing snack needs."
  },
  {
    question: "Can we scale up or down over time?",
    answer: (
      <p>
        Absolutely. Our service is designed to scale with your team—no rigid contracts.
      </p>
    ),
    schemaAnswer: "Yes. The service scales with your team without rigid contracts."
  },
  {
    question: "How is pricing structured?",
    answer: (
      <>
        <p>Pricing is based on:</p>
        <ul>
          <li>Volume</li>
          <li>Snack mix</li>
          <li>Delivery frequency</li>
        </ul>
      </>
    ),
    schemaAnswer: "Pricing is based on volume, snack mix, and delivery frequency."
  }
]

export const bulkPalletFaqItems: FaqItem[] = [
  {
    question: "What is a bulk or pallet snack order?",
    answer: (
      <>
        <p>Bulk orders are large-scale shipments delivered to a single location, such as:</p>
        <ul>
          <li>Office</li>
          <li>Warehouse</li>
          <li>Distribution center</li>
        </ul>
        <p className="mt-3">Ideal for internal distribution or events.</p>
      </>
    ),
    schemaAnswer:
      "Bulk orders are large shipments to one location such as an office, warehouse, or distribution center—ideal for internal distribution or events."
  },
  {
    question: "What is the minimum order size?",
    answer: (
      <p>
        Bulk orders are designed for larger volume programs. Minimums vary depending on customization
        and logistics—contact us for details.
      </p>
    ),
    schemaAnswer:
      "Bulk programs are for larger volumes; minimums vary by customization and logistics—contact us for details."
  },
  {
    question: "Can we fully customize the snack boxes?",
    answer: (
      <>
        <p>Yes—this is our specialty.</p>
        <p className="mt-3 font-medium text-foreground">You can customize:</p>
        <ul>
          <li>Box size and configuration</li>
          <li>Snack selection</li>
          <li>Branding and packaging</li>
          <li>Inserts and messaging</li>
        </ul>
      </>
    ),
    schemaAnswer:
      "Yes. Customize box size and configuration, snack selection, branding and packaging, and inserts or messaging."
  },
  {
    question: "How is pricing structured for bulk orders?",
    answer: (
      <>
        <p>Bulk pricing is customized, but typically starts around:</p>
        <ul>
          <li>$42.99+ per box (including shipping, excluding tax)</li>
          <li>Lower per-unit pricing at higher volumes</li>
        </ul>
      </>
    ),
    schemaAnswer:
      "Bulk pricing is customized; it often starts around $42.99+ per box including shipping excluding tax, with lower per-unit pricing at higher volumes."
  },
  {
    question: "Do you offer pallet delivery?",
    answer: (
      <>
        <p>Yes. We can deliver:</p>
        <ul>
          <li>Full pallets</li>
          <li>Large batch shipments</li>
          <li>Scheduled bulk deliveries</li>
        </ul>
      </>
    ),
    schemaAnswer: "Yes. We deliver full pallets, large batch shipments, and scheduled bulk deliveries."
  },
  {
    question: "How long does fulfillment take?",
    answer: (
      <>
        <p>Timelines depend on:</p>
        <ul>
          <li>Order size</li>
          <li>Level of customization</li>
          <li>Delivery location</li>
        </ul>
        <p className="mt-3">We coordinate closely to meet your deadlines.</p>
      </>
    ),
    schemaAnswer:
      "Fulfillment time depends on order size, customization level, and delivery location; we coordinate to meet your deadlines."
  },
  {
    question: "Can these be used for events or large campaigns?",
    answer: (
      <>
        <p>Yes—perfect for:</p>
        <ul>
          <li>Conferences</li>
          <li>Employee events</li>
          <li>Large-scale gifting programs</li>
          <li>Internal distribution</li>
        </ul>
      </>
    ),
    schemaAnswer:
      "Yes. Suitable for conferences, employee events, large-scale gifting programs, and internal distribution."
  },
  {
    question: "Do you handle national rollouts?",
    answer: (
      <>
        <p>Yes. We support both:</p>
        <ul>
          <li>Centralized pallet delivery</li>
          <li>Multi-location distribution strategies</li>
        </ul>
      </>
    ),
    schemaAnswer: "Yes. We support centralized pallet delivery and multi-location distribution strategies."
  }
]
