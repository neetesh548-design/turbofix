import React, { useEffect, useState } from 'react';
import { Eye, EyeOff, Mail, Phone, ShieldAlert } from 'lucide-react';
import { supabase } from '@/supabaseClient';

export default function ContactReveal({ member, compact = false, showIdentity = false }) {
  const [revealed, setRevealed] = useState(false);
  const [contact, setContact] = useState(null);
  const [loading, setLoading] = useState(false);
  const [revealError, setRevealError] = useState('');

  useEffect(() => {
    if (!revealed) return undefined;
    const timer = window.setTimeout(() => setRevealed(false), 60000);
    return () => window.clearTimeout(timer);
  }, [revealed]);

  if (!member) {
    return <span className="contact-unassigned">Not assigned</span>;
  }

  const phoneAvailable = Boolean(member.has_phone || member.phone || member.phone_masked);
  const emailAvailable = Boolean(member.has_email || member.email || member.email_masked);
  const phone = revealed
    ? (contact?.phone || member.phone || 'Mobile number not available')
    : (member.phone_masked || (phoneAvailable ? 'Mobile number available' : 'Mobile number not available'));
  const email = revealed
    ? (contact?.email || member.email || 'Email not available')
    : (member.email_masked || (emailAvailable ? 'Email available' : 'Email not available'));
  const hasContact = Boolean(member.has_contact || member.phone || member.email || member.phone_masked || member.email_masked);

  const toggleContact = async () => {
    if (revealed) {
      setRevealed(false);
      setContact(null);
      return;
    }
    if (member.phone || member.email) {
      setRevealed(true);
      return;
    }
    setLoading(true);
    setRevealError('');
    try {
      const { data, error } = await supabase.functions.invoke('onboard_team_member', {
        body: { action: 'reveal_contact', user_id: member.user_id },
      });
      if (error) {
        let message = error.message;
        try { message = (await error.context?.json())?.error || message; } catch {}
        throw new Error(message);
      }
      if (data?.error) throw new Error(data.error);
      setContact({ phone: data?.phone || '', email: data?.email || '' });
      setRevealed(true);
    } catch (err) {
      setRevealError(err.message || 'Contact could not be loaded.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={`contact-reveal${compact ? ' compact' : ''}`}>
      {showIdentity && (
        <div className="contact-identity">
          <strong>{member.name || 'Team member'}</strong>
          {member.role && <small>{member.role.replaceAll('_', ' ')}</small>}
        </div>
      )}
      <div className="contact-lines" aria-live="polite">
        <span><Phone aria-hidden="true" />{phone}</span>
        <span><Mail aria-hidden="true" />{email}</span>
      </div>
      {hasContact && (
        <button type="button" className="contact-reveal-button" onClick={toggleContact} disabled={loading}>
          {revealed ? <EyeOff aria-hidden="true" /> : <Eye aria-hidden="true" />}
          {loading ? 'Loading…' : revealed ? 'Hide contact' : 'View contact'}
        </button>
      )}
      {revealError && <span className="contact-restricted"><ShieldAlert aria-hidden="true" />{revealError}</span>}
      {!hasContact && member.can_reveal_contact === false && (
        <span className="contact-restricted"><ShieldAlert aria-hidden="true" />Restricted by team hierarchy</span>
      )}
    </div>
  );
}
