import React, { useState } from 'react';
import { ArrowRight, CheckCircle2, LockKeyhole } from 'lucide-react';
import { Link } from 'react-router-dom';

const SALES_WHATSAPP = import.meta.env.VITE_SALES_WHATSAPP || '919637438044';

export default function PricingCalculator() {
  const [machineCount, setMachineCount] = useState(15);
  const [isAnnual, setIsAnnual] = useState(false);

  const discountFactor = isAnnual ? 0.85 : 1;
  const liteUnitPrice = Math.round(499 * discountFactor);
  const growthUnitPrice = Math.round(699 * discountFactor);
  const enterpriseUnitPrice = Math.round(499 * discountFactor);

  const liteMonthly = machineCount * liteUnitPrice;
  const growthMonthly = machineCount * growthUnitPrice;
  const enterpriseMonthly = machineCount * enterpriseUnitPrice;

  return (
    <section className="marketing-section marketing-pricing-section" id="pricing">
      <div className="container">
        <div className="marketing-calculator-box">
        <div className="marketing-calculator-header">
          <div>
              <strong>Estimate monthly investment</strong>
              <p>Choose the number of machines you want to cover.</p>
          </div>
          <div className="marketing-billing-toggle">
            <span className={!isAnnual ? 'active' : ''}>Monthly</span>
              <button
                type="button"
                className={`marketing-toggle-switch ${isAnnual ? 'annual' : ''}`}
                onClick={() => setIsAnnual(!isAnnual)}
                aria-label="Toggle annual billing 15% discount"
              >
                <span className="marketing-toggle-knob" />
              </button>
              <span className={isAnnual ? 'active' : ''}>Annual <b className="discount-badge">Save 15%</b></span>
            </div>
          </div>

          <div className="marketing-slider-row">
            <div className="marketing-slider-label">
              <span>Factory Machine Count:</span>
              <strong>{machineCount} Machines</strong>
            </div>
            <input
              type="range"
              min="5"
              max="100"
              step="1"
              value={machineCount}
              onChange={(e) => setMachineCount(parseInt(e.target.value, 10))}
              className="marketing-machine-slider"
              aria-label="Number of machines in plant"
            />
            <div className="marketing-slider-marks">
              <span>5 machines</span>
              <span>25 machines</span>
              <span>50 machines</span>
              <span>100+ machines</span>
            </div>
          </div>
        </div>

        <div className="marketing-pricing-grid">
          <div className={`marketing-pricing-card ${machineCount < 10 ? 'recommended' : ''}`}>
            <span className="marketing-plan-badge">Lite</span>
            <div className="marketing-plan-price">
              <span className="original-price">₹999</span>
              <span className="current-price">₹{liteUnitPrice}</span>
              <span className="period">/machine/month</span>
            </div>
            <div className="marketing-plan-total">
              Total: <strong>₹{liteMonthly.toLocaleString('en-IN')}</strong> / month for {machineCount} machines
            </div>
            <p className="marketing-plan-desc">For small workshops. Minimum 5 machines.</p>
            <ul className="marketing-plan-features">
              {['Machine breakdown tickets', 'WhatsApp notifications', 'Basic maintenance records', 'Mobile-ready web app'].map(f => (
                <li key={f}><CheckCircle2 size={14} />{f}</li>
              ))}
            </ul>
            <Link to="/login.html" className="marketing-btn marketing-btn-ghost marketing-plan-cta">Start trial <ArrowRight size={14} /></Link>
          </div>

          <div className={`marketing-pricing-card growth ${machineCount >= 10 && machineCount < 50 ? 'recommended' : ''}`}>
            <span className="popular-tag">Most Popular</span>
            <span className="marketing-plan-badge growth-badge">Growth</span>
            <div className="marketing-plan-price">
              <span className="original-price">₹1,299</span>
              <span className="current-price">₹{growthUnitPrice}</span>
              <span className="period">/machine/month</span>
            </div>
            <div className="marketing-plan-total">
              Total: <strong>₹{growthMonthly.toLocaleString('en-IN')}</strong> / month for {machineCount} machines
            </div>
            <p className="marketing-plan-desc">For growing plants. Minimum 10 machines.</p>
            <ul className="marketing-plan-features">
              {['Ticket and SLA management', 'AI maintenance assistant', 'Shutdown planning', 'Records upload', 'Downtime reports', 'CSV export'].map(f => (
                <li key={f}><CheckCircle2 size={14} />{f}</li>
              ))}
            </ul>
            <Link to="/login.html" className="marketing-btn marketing-btn-primary marketing-plan-cta">Start trial <ArrowRight size={14} /></Link>
          </div>

          <div className={`marketing-pricing-card ${machineCount >= 50 ? 'recommended' : ''}`}>
            <span className="marketing-plan-badge">Enterprise</span>
            <div className="marketing-plan-price">
              <span className="original-price">₹699</span>
              <span className="current-price">₹{enterpriseUnitPrice}</span>
              <span className="period">/machine/month</span>
            </div>
            <div className="marketing-plan-total">
              Total: <strong>₹{enterpriseMonthly.toLocaleString('en-IN')}</strong> / month for {machineCount} machines
            </div>
            <p className="marketing-plan-desc">Starting price for 50+ machines on an annual contract.</p>
            <ul className="marketing-plan-features">
              {['Multi-plant hierarchy', 'Dedicated onboarding', 'Custom SLA setup', 'Priority support', 'Bulk CSV import', 'Annual contract pricing'].map(f => (
                <li key={f}><CheckCircle2 size={14} />{f}</li>
              ))}
            </ul>
            <a href={`https://wa.me/${SALES_WHATSAPP}?text=I'd like to discuss an Enterprise plan for ${machineCount} machines`} className="marketing-btn marketing-btn-ghost marketing-plan-cta" target="_blank" rel="noopener noreferrer">Talk to sales <ArrowRight size={14} /></a>
          </div>
        </div>

        <p className="marketing-pricing-note">
          Prices exclude GST. Save 15% with annual billing. Fair-use limits apply to WhatsApp and AI features.
          <br />
          <LockKeyhole size={12} style={{ display: 'inline', marginRight: 5, verticalAlign: 'middle' }} />
          All data stored in Supabase (AWS ap-south-1 — Mumbai). Your plant data is never shared with other companies.
          · <a href={`https://wa.me/${SALES_WHATSAPP}`} style={{ color: 'var(--muted-foreground)', textDecoration: 'underline' }}>Privacy questions? WhatsApp us</a>
        </p>
      </div>
    </section>
  );
}
