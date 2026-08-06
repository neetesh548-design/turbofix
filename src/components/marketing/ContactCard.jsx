import React, { useState, useEffect } from 'react';
import { ArrowRight, Check, CheckCircle2, Factory, LockKeyhole } from 'lucide-react';
import { useLanguage } from '../../LanguageContext';
import { contentByLanguage } from '../../data/marketingContent';
import { supabase } from '@/supabaseClient';

const SALES_WHATSAPP = import.meta.env.VITE_SALES_WHATSAPP || '919637438044';

export default function ContactCard() {
  const { lang } = useLanguage();
  const copy = contentByLanguage[lang] || contentByLanguage.en;
  const [formSent, setFormSent] = useState(false);
  const [machineCount, setMachineCount] = useState(15);
  const [company, setCompany] = useState('');
  const [time, setTime] = useState('');

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const plantParam = params.get('plant');
    const cityParam = params.get('city');
    const machinesParam = params.get('machines');
    const timeParam = params.get('time');

    if (plantParam) {
      setCompany(cityParam ? `${plantParam}, ${cityParam}` : plantParam);
    }
    if (machinesParam) {
      setMachineCount(parseInt(machinesParam, 10) || 15);
    }
    if (timeParam) {
      setTime(timeParam);
    }
  }, []);

  const handleLeadSubmit = async (event) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    
    if (formData.get('website')) return;

    const name = formData.get('name')?.trim();
    const phone = formData.get('phone')?.trim();
    if (!name || !phone) return;

    const companyVal = formData.get('company')?.trim() || '—';
    const machinesVal = formData.get('machines')?.trim() || '—';
    const challengeVal = formData.get('challenge') || '—';
    const timeVal = formData.get('time') || '';

    try {
      await supabase.from('leads').insert([{
        name,
        phone,
        company: companyVal,
        machines: machinesVal,
        challenge: challengeVal,
        source: 'contact-form',
        created_at: new Date().toISOString()
      }]);
    } catch (error) {
      console.error('Error inserting lead:', error);
    }

    const message = [
      'Hi, I would like a guided TurboFix plant walkthrough.',
      '',
      `Name: ${name}`,
      `Phone: ${phone}`,
      `Company: ${companyVal}`,
      `Approx. machines: ${machinesVal}`,
      `Biggest challenge: ${challengeVal}`,
    ].join('\n');

    window.open(`https://wa.me/${SALES_WHATSAPP}?text=${encodeURIComponent(message)}`, '_blank', 'noopener,noreferrer');
    setFormSent(true);
  };

  return (
    <section className="marketing-section marketing-contact" id="contact">
      <div className="container marketing-contact-grid">
        <div className="marketing-contact-copy">
          <div style={{ background: 'rgba(30, 41, 59, 0.6)', border: '1px solid rgba(56, 189, 248, 0.25)', borderRadius: '12px', padding: '20px', marginBottom: '24px' }}>
            <span style={{ fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.08em', color: '#38bdf8', fontWeight: 700, display: 'block', marginBottom: '6px' }}>Official Corporate Contact</span>
            <h3 style={{ margin: 0, fontSize: '1.25rem', color: '#f8fafc', fontWeight: 700 }}>TurboFix Technologies</h3>
            <p style={{ margin: '4px 0 12px', fontSize: '0.9rem', color: '#10b981', fontWeight: 600 }}>"{copy.slogan}"</p>
            
            <div style={{ fontSize: '0.85rem', color: '#cbd5e1', display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <div><strong>Leadership:</strong> {copy.founderName} ({copy.founderTitle})</div>
              <div><strong>Email:</strong> <a href="mailto:info@turbofix.co.in" style={{ color: '#38bdf8' }}>info@turbofix.co.in</a></div>
              <div><strong>Website:</strong> <a href="https://www.turbofix.co.in" target="_blank" rel="noopener noreferrer" style={{ color: '#38bdf8' }}>www.turbofix.co.in</a></div>
              <div style={{ marginTop: '6px', fontSize: '0.8rem', color: '#94a3b8', fontStyle: 'italic' }}>
                {copy.description || 'Helping manufacturers reduce machine downtime, improve reliability, and protect production through intelligent maintenance.'}
              </div>
              <div style={{ fontSize: '0.8rem', color: '#34d399', fontWeight: 600 }}>
                {copy.tagline || 'Less Downtime • More Production • Better Profits'}
              </div>
            </div>
          </div>

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
                <input type="text" name="website" style={{ display: 'none' }} tabIndex={-1} autoComplete="off" />
                <input type="hidden" name="time" value={time} />

                <label htmlFor="lead-name"><span>{copy.name}</span></label>
                <input id="lead-name" name="name" type="text" placeholder="Rakesh Shah" autoComplete="name" required aria-required="true" />

                <label htmlFor="lead-phone"><span>{copy.phone}</span></label>
                <input id="lead-phone" name="phone" type="tel" placeholder="+91 98765 43210" autoComplete="tel" required aria-required="true" />

                <label htmlFor="lead-company"><span>{copy.company}</span></label>
                <input id="lead-company" name="company" type="text" placeholder="Acme Forge Pvt Ltd" autoComplete="organization" value={company} onChange={(e) => setCompany(e.target.value)} />

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
