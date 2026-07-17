import React, { useEffect, useState } from 'react';
import { Eye, EyeOff, Mail, Phone, ShieldAlert } from 'lucide-react';

export default function ContactReveal({ member, compact = false, showIdentity = false }) {
  const [revealed, setRevealed] = useState(false);

  useEffect(() => {
    if (!revealed) return undefined;
    const timer = window.setTimeout(() => setRevealed(false), 60000);
    return () => window.clearTimeout(timer);
  }, [revealed]);

  if (!member) {
    return <span className="contact-unassigned">Not assigned</span>;
  }

  const phone = revealed ? (member.phone || 'Mobile number not available') : (member.phone_masked || 'Mobile number not available');
  const email = revealed ? (member.email || 'Email not available') : (member.email_masked || 'Email not available');
  const hasContact = member.phone || member.email;

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
        <button type="button" className="contact-reveal-button" onClick={() => setRevealed(!revealed)}>
          {revealed ? <EyeOff aria-hidden="true" /> : <Eye aria-hidden="true" />}
          {revealed ? 'Hide contact' : 'View contact'}
        </button>
      )}
      {!hasContact && member.can_reveal_contact === false && (
        <span className="contact-restricted"><ShieldAlert aria-hidden="true" />Restricted by team hierarchy</span>
      )}
    </div>
  );
}
