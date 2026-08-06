import React, { useEffect, useState } from 'react';
import { ArrowRight, PlayCircle, X } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function FloatingCTADock() {
  const [visible, setVisible] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    const onScroll = () => {
      setVisible(window.scrollY > 320);
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  if (dismissed) return null;

  return (
    <div
      className={`float-dock ${visible ? 'float-dock-visible' : ''}`}
      role="complementary"
      aria-label="Quick actions"
    >
      <div className="float-dock-inner">
        <Link to="/contact.html" className="float-dock-btn float-dock-primary">
          Book a Plant Walkthrough
          <ArrowRight size={15} />
        </Link>

        <span className="float-dock-sep" aria-hidden="true" />

        <Link to="/demo.html" className="float-dock-btn float-dock-ghost">
          <PlayCircle size={15} />
          Try Live Demo
        </Link>

        <span className="float-dock-sep" aria-hidden="true" />

        <button
          className="float-dock-icon-btn"
          onClick={() => setDismissed(true)}
          aria-label="Dismiss"
        >
          <X size={14} />
        </button>
      </div>
    </div>
  );
}
