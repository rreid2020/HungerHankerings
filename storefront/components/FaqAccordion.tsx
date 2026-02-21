"use client"

import { useState } from "react"

const FaqAccordion = ({
  items
}: {
  items: { question: string; answer: string }[]
}) => {
  const [openIndex, setOpenIndex] = useState<number | null>(0)

  return (
    <div className="space-y-3">
      {items.map((item, index) => {
        const isOpen = openIndex === index
        return (
          <div
            key={item.question}
            className="rounded-lg border border-dust_grey-200 bg-white"
          >
            <button
              className="flex w-full items-center justify-between px-5 py-4 text-left"
              onClick={() => setOpenIndex(isOpen ? null : index)}
              type="button"
            >
              <span className="font-semibold text-iron_grey">
                {item.question}
              </span>
              <span className="text-xl text-iron_grey">
                {isOpen ? "–" : "+"}
              </span>
            </button>
            {isOpen && (
              <div className="border-t border-dust_grey-200 px-5 py-4 text-sm text-iron_grey">
                {item.answer}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}

export default FaqAccordion
