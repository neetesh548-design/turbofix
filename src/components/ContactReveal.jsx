import React, { useEffect, useState } from 'react';
import { Eye, EyeOff, Mail, Phone, ShieldAlert } from 'lucide-react';
import { apiFetch } from '@/lib/api';

export default function ContactReveal({ member, compact = false, showIdentity = false }) {
  const [contact, setContact] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!contact) return undefined;
    const timer = window.setTimeout(() => setContact(null), 60000);
    return () => window.clearTimeout(timer);
  }, [contact]);

  if (!member) {
    return <span className="contact-unassigned">Not assigned</span>;
  }

  const reveal = async () => {
    setLoading(true);
    setError('');
    try {
      const response = await apiFetch(`/vault/team/${member.user_id}/contact`);
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.detail || 'Contact details could not be opened.');
      setContact(payload);
    } catch (requestError) {
      setError(requestError.message || 'Contact details could not be opened.');
    } finally {
      setLoading(false);
    }
  };

  const phone = contact?.phone || member.phone_masked || 'Mobile number not available';
  const email = contact?.email || member.email_masked || 'Email not available';
  const hasContact = member.phone_available || member.email_available;

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
      {error && <small className="contact-error">{error}</small>}
      {hasContact && member.can_reveal_contact && (
        <button type="button" className="contact-reveal-button" onClick={contact ? () => setContact(null) : reveal} disabled={loading}>
          {contact ? <EyeOff aria-hidden="true" /> : <Eye aria-hidden="true" />}
          {contact ? 'Hide contact' : loading ? 'Opening…' : 'View contact'}
        </button>
      )}
      {hasContact && !member.can_reveal_contact && (
        <span className="contact-restricted"><ShieldAlert aria-hidden="true" />Restricted by team hierarchy</span>
      )}
    </div>
  );
}
