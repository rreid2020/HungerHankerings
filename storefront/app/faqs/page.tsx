import FaqAccordion from "../../components/FaqAccordion"

const faqs = [
  {
    question: "What is Hunger Hankerings?",
    answer: "We curate snack boxes and pantry programs for teams, gifts, and fundraising."
  },
  {
    question: "Do you offer subscriptions?",
    answer: "We offer one-time or recurring snack drops based on your schedule."
  },
  {
    question: "Do you have dietary options?",
    answer: "Yes. Vegan, gluten-free, nut-free, and better-for-you options are available."
  },
  {
    question: "What are your shipping timelines?",
    answer: "Most orders ship in 2-4 business days once confirmed."
  },
  {
    question: "What box sizes are available?",
    answer: "We curate boxes based on team size and budget, from small batches to bulk orders."
  },
  {
    question: "Can I request substitutions?",
    answer: "Absolutely. Let us know preferences and we will customize the assortment."
  },
  {
    question: "Do you ship internationally?",
    answer: "We currently ship within Canada only."
  },
  {
    question: "Are the snacks full size?",
    answer: "Yes, most boxes include full-size snacks unless requested otherwise."
  },
  {
    question: "What are the shipping fees?",
    answer: "Shipping is included on most team box orders. Pantry service and bulk orders are quoted."
  },
  {
    question: "How can I contact you?",
    answer: "Use the contact form or email hello@hungerhankerings.com."
  }
]

const FaqsPage = () => {
  return (
    <div className="container-page space-y-10 py-12">
      <div>
        <p className="section-subtitle">FAQs</p>
        <h1 className="text-3xl font-semibold text-iron_grey">
          Frequently asked questions
        </h1>
        <p className="mt-2 text-sm text-iron_grey">
          Everything you need to know about our snack programs.
        </p>
      </div>
      <FaqAccordion items={faqs} />
    </div>
  )
}

export default FaqsPage
