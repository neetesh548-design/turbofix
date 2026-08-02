import React, { useState } from 'react';
import { ArrowRight, Check, CheckCircle2, Factory, LockKeyhole } from 'lucide-react';
import { useLanguage } from '../../LanguageContext';
import { contentByLanguage } from '../../data/marketingContent';

const SALES_WHATSAPP = import.meta.env.VITE_SALES_WHATSAPP || '919637438044';

export default function ContactCard() {
  const { lang } = useLanguage();
  const copy = contentByLanguage[lang] || contentByLanguage.en;
  const [formSent, setFormSent] = useState(false);
  const [machineCount, setMachineCount] = useState(15);

  const handleLeadSubmit = (event) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const name = formData.get('name')?.trim();
    const phone = formData.get('phone')?.trim();
    if (!name || !phone) return;

    const message = [
      'Hi, I would like a guided TurboFix plant walkthrough.',
      '',
      `Name: ${name}`,
      `Phone: ${phone}`,
      `Company: ${formData.get('company')?.trim() || '—'}`,
      `Approx. machines: ${formData.get('machines')?.trim() || '—'}`,
      `Biggest challenge: ${formData.get('challenge') || '—'}`,
    ].join('\n');

    window.open(`https://wa.me/${SALES_WHATSAPP}?text=${encodeURIComponent(message)}`, '_blank', 'noopener,noreferrer');
    setFormSent(true);
  };

  return (
    <section className="marketing-section marketing-contact" id="contact">
      <div className="container marketing-contact-grid">
        <div className="marketing-contact-copy">
          <span>What happens next</span>
          <p>We map TurboFix to one representative machine so you can see the workflow before you commit to a full rollout.</p>
          <ul>{copy.contactPoints.map((item) => <li key={item}><Check />{item}</li>)}</ul>
        </div>
        <div className="marketing-lead-card">
          {formSent ? (
            <div className="marketing-success"><CheckCircle2 /><h3>{copy.successTitle}</h3><p>{copy.successBody}</p><button type="button" onClick={() => setFormSent(false)}>Send another request</button></div>
          ) : (
            <form onSubmit={handleLeadSubmit}>
                <div className="marketing-form-heading"><span><Factory /></span><div><h3>{copy.formTitle}</h3><p>{copy.formNote}</p></div></div>
              <div className="marketing-form-grid">
                <label htmlFor="lead-name"><span>{copy.name}</span></label>
                <input id="lead-name" name="name" type="text" placeholder="Rakesh Shah" autoComplete="name" required aria-required="true" />

                <label htmlFor="lead-phone"><span>{copy.phone}</span></label>
                <input id="lead-phone" name="phone" type="tel" placeholder="+91 98765 43210" autoComplete="tel" required aria-required="true" />

                <label htmlFor="lead-company"><span>{copy.company}</span></label>
                <input id="lead-company" name="company" type="text" placeholder="Acme Forge Pvt Ltd" autoComplete="organization" />

                <label htmlFor="lead-machines"><span>{copy.machines}</span></label>
                <input id="lead-machines" name="machines" type="number" min="1" placeholder="25" value={machineCount} onChange={(e) => setMachineCount(parseInt(e.target.value, 10) || 1)} />

                <label htmlFor="lead-challenge" className="marketing-form-wide"><span>{copy.challenge}</span></label>
                <select id="lead-challenge" name="challenge" defaultValue="" className="marketing-form-wide"><option value="" disabled>{copy.challengePlaceholder}</option>{copy.challengeOptions.map((option) => <option key={option} value={option}>{option}</option>)}</select>
              </div>
                <button className="marketing-btn marketing-btn-primary marketing-submit" type="submit">{copy.submit}<ArrowRight /></button>
              <small className="marketing-privacy"><LockKeyhole />{copy.formNote}</small>
            </form>
          )}
        </div>
      </div>
    </section>
  );
}
