import React, { useState } from 'react';
import { ArrowRight, Phone, Clock, Factory, Wrench } from 'lucide-react';
import { supabase } from '@/supabaseClient';

const MACHINE_RANGES = ['1–5', '6–15', '16–30', '31–60', '60+'];
const TIME_SLOTS = ['Morning (9am–12pm)', 'Afternoon (12pm–4pm)', 'Evening (4pm–7pm)', 'Anytime'];

export default function HeroLeadForm() {
  const [form, setForm] = useState({ plant: '', city: '', machines: '', time: '' });
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);

  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(false);

    const { error: insertError } = await supabase.from('leads').insert([{
      company: form.plant,
      city: form.city,
      machines: form.machines,
      preferred_time: form.time,
      source: 'hero-form',
      created_at: new Date().toISOString()
    }]);

    if (insertError) {
      console.error('Error inserting lead:', insertError);
      setLoading(false);
      setError(true);
      return;
    }

    // Redirect to contact page with query params pre-filled
    setTimeout(() => {
      const params = new URLSearchParams({
        plant: form.plant,
        city: form.city,
        machines: form.machines,
        time: form.time,
        source: 'hero-form',
      });
      window.location.href = `/contact.html?${params.toString()}`;
    }, 600);
  };

  return (
    <div className="hero-lead-card" style={{ padding: '16px 18px', gap: '10px' }}>
      <div className="hero-lead-card-header">
        <div className="hero-lead-card-icon" style={{ width: '36px', height: '36px' }}>
          <Factory size={18} />
        </div>
        <div>
          <h3 className="hero-lead-card-title" style={{ fontSize: '0.95rem', margin: 0 }}>Book a Plant Walkthrough</h3>
          <p className="hero-lead-card-sub" style={{ fontSize: '0.72rem', margin: 0 }}>We set it up on one machine. No commitment.</p>
        </div>
      </div>

      {!submitted ? (
        <form onSubmit={handleSubmit} className="hero-lead-form" style={{ gap: '8px' }}>
          <div className="hero-lead-field">
            <label htmlFor="hlf-plant">Plant / Company Name</label>
            <input
              id="hlf-plant"
              type="text"
              required
              placeholder="e.g. Pune Hydraulics Pvt Ltd"
              value={form.plant}
              onChange={set('plant')}
            />
          </div>

          <div className="hero-lead-field">
            <label htmlFor="hlf-city">City / Location</label>
            <input
              id="hlf-city"
              type="text"
              required
              placeholder="e.g. Pune, Maharashtra"
              value={form.city}
              onChange={set('city')}
            />
          </div>

          <div className="hero-lead-row">
            <div className="hero-lead-field">
              <label htmlFor="hlf-machines">No. of Machines</label>
              <div className="hero-lead-select-wrap">
                <select
                  id="hlf-machines"
                  required
                  value={form.machines}
                  onChange={set('machines')}
                >
                  <option value="">Select…</option>
                  {MACHINE_RANGES.map((r) => (
                    <option key={r} value={r}>{r} machines</option>
                  ))}
                </select>
                <Wrench size={14} className="hero-lead-select-icon" />
              </div>
            </div>

            <div className="hero-lead-field">
              <label htmlFor="hlf-time">Preferred Call Time</label>
              <div className="hero-lead-select-wrap">
                <select
                  id="hlf-time"
                  required
                  value={form.time}
                  onChange={set('time')}
                >
                  <option value="">Select…</option>
                  {TIME_SLOTS.map((t) => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
                <Clock size={14} className="hero-lead-select-icon" />
              </div>
            </div>
          </div>

          {error ? (
            <p className="hero-lead-error" role="alert" style={{ color: '#f87171', fontSize: '0.8rem', margin: 0 }}>
              Something went wrong sending your request. Please try again, or WhatsApp us directly.
            </p>
          ) : null}

          <button
            type="submit"
            className={`hero-lead-submit ${loading ? 'loading' : ''}`}
            disabled={loading}
          >
            {loading ? (
              <span className="hero-lead-spinner" />
            ) : (
              <>
                Request Walkthrough
                <ArrowRight size={16} />
              </>
            )}
          </button>
        </form>
      ) : null}

      <div className="hero-lead-footer">
        <Phone size={13} />
        <span>No payment required · We call you within 24 hrs</span>
      </div>
    </div>
  );
}
