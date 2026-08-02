import React, { useState } from 'react';

const DEFAULT_FAQS = [
  { question: 'Can TurboFix read handwritten records?', answer: 'Yes. You can upload photos, scans, PDFs, spreadsheets, Word files, CSVs, manuals, and job cards.' },
  { question: 'Does AI approve records automatically?', answer: 'No. TurboFix creates a draft first, and the Maintenance Head approves what becomes trusted history.' },
  { question: 'Can we start with one machine?', answer: 'Yes. That is the preferred first step.' },
  { question: 'Can we export our data?', answer: 'Yes. Plant records can be exported for backup and handoff.' },
  { question: 'Does TurboFix replace our team?', answer: 'No. It supports your team’s decision-making and follow-through.' },
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
