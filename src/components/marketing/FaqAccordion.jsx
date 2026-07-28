import React, { useState } from 'react';

const DEFAULT_FAQS = [
  { question: 'Can TurboFix read handwritten maintenance registers?', answer: 'Yes. The first version accepts photos and scans of handwritten registers, job cards, inspection sheets, and marked drawings, along with PDF, Excel, Word, CSV, text, manuals, and BOM files.' },
  { question: 'Can AI use extracted data immediately?', answer: 'No. AI creates a review draft first. Your team can correct uncertain fields, and only the Maintenance Head can approve that data before it becomes trusted context for future recommendations.' },
  { question: 'How will old records help future maintenance?', answer: 'Approved history can support breakdown troubleshooting, recurring-failure analysis, spare and consumable preparation, preventive maintenance planning, shutdown decisions, and machine-specific AI answers.' },
  { question: 'Can we export our machine history as a backup?', answer: 'Yes. TurboFix can export original uploads, structured JSON, Excel-ready CSV, approval history, and each machine’s MachineData Markdown knowledge file.' },
  { question: 'Does TurboFix replace our maintenance engineer?', answer: 'No. TurboFix organizes plant knowledge, highlights risk, and supports decisions. Your authorized team remains responsible for approval, safety procedures, and execution.' },
  { question: 'What happens when machine information is missing?', answer: 'TurboFix identifies the gap and can propose internet enrichment. External information is used only after the user approves it, and the source remains distinguishable from uploaded plant data.' },
  { question: 'Do we need to digitize the whole factory first?', answer: 'No. Start with one representative machine and a useful sample of its records, verify the workflow, and then expand in practical batches.' },
];

export default function FaqAccordion({ title = 'Frequently Asked Questions', intro = 'TurboFix is designed to support maintenance judgment, preserve accountability, and make plant knowledge easier to use.', eyebrow = 'Clear before you commit', faqs = DEFAULT_FAQS }) {
  const [openFaqIndex, setOpenFaqIndex] = useState(null);

  return (
    <section className="marketing-section marketing-faq" id="faq">
      <div className="container marketing-faq-grid">
        <div><span>{eyebrow}</span><h2>{title}</h2><p>{intro}</p></div>
        <div className="marketing-faq-list">
          {faqs.map(({ question, answer }, index) => (
            <details
              key={question}
              open={openFaqIndex === index}
              onToggle={(event) => {
                if (event.currentTarget.open) {
                  setOpenFaqIndex(index);
                } else if (openFaqIndex === index) {
                  setOpenFaqIndex(null);
                }
              }}
            >
              <summary>{question}<span>+</span></summary>
              <p>{answer}</p>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}
