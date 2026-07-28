import React from 'react';
import { Check } from 'lucide-react';

export default function CapabilityStrip({ items }) {
  return (
    <div className="marketing-capability-strip">
      <div className="container">
        {items.map((item) => <span key={item}><Check />{item}</span>)}
      </div>
    </div>
  );
}
