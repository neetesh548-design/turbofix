import { useState, useRef, useEffect } from 'react';
import './Tooltip.css';

export function Tooltip({ children, content, position = 'top', delay = 0 }) {
  const [isVisible, setIsVisible] = useState(false);
  const tooltipRef = useRef(null);
  const triggerRef = useRef(null);

  const showTooltip = () => {
    setTimeout(() => setIsVisible(true), delay);
  };

  const hideTooltip = () => {
    setIsVisible(false);
  };

  useEffect(() => {
    const trigger = triggerRef.current;
    if (!trigger) return;

    trigger.addEventListener('mouseenter', showTooltip);
    trigger.addEventListener('mouseleave', hideTooltip);
    trigger.addEventListener('focus', showTooltip);
    trigger.addEventListener('blur', hideTooltip);

    return () => {
      trigger.removeEventListener('mouseenter', showTooltip);
      trigger.removeEventListener('mouseleave', hideTooltip);
      trigger.removeEventListener('focus', showTooltip);
      trigger.removeEventListener('blur', hideTooltip);
    };
  }, [delay]);

  return (
    <div className="tooltip-wrapper" ref={triggerRef}>
      {children}
      {isVisible && (
        <div
          className={`tooltip tooltip-${position}`}
          ref={tooltipRef}
          role="tooltip"
        >
          {content}
          <div className="tooltip-arrow" />
        </div>
      )}
    </div>
  );
}
