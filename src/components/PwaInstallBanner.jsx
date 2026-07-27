import { useState, useEffect } from 'react';
import { Download, X, Smartphone } from 'lucide-react';

export function PwaInstallBanner() {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const isDismissed = localStorage.getItem('tf_pwa_install_dismissed');
    if (isDismissed) return;

    const handleBeforeInstallPrompt = (e) => {
      // Prevent default Chrome 68+ mini-infobar
      e.preventDefault();
      setDeferredPrompt(e);
      setIsVisible(true);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      console.log('User accepted the TurboFix PWA install prompt');
    } else {
      console.log('User dismissed the TurboFix PWA install prompt');
    }
    setDeferredPrompt(null);
    setIsVisible(false);
  };

  const handleDismiss = () => {
    localStorage.setItem('tf_pwa_install_dismissed', 'true');
    setIsVisible(false);
  };

  if (!isVisible || !deferredPrompt) return null;

  return (
    <aside
      aria-label="Install App Prompt"
      className="pwa-install-banner"
      style={{
        position: 'fixed',
        bottom: 20,
        left: '50%',
        transform: 'translateX(-50%)',
        zIndex: 9999,
        width: 'calc(100% - 32px)',
        maxWidth: 480,
        backgroundColor: '#151e28',
        border: '1px solid rgba(71, 191, 255, 0.4)',
        borderRadius: 12,
        padding: '12px 16px',
        boxShadow: '0 12px 32px rgba(0, 0, 0, 0.5)',
        display: 'flex',
        alignItems: 'center',
        justify: 'space-between',
        gap: 12,
        color: '#f8fafc',
        fontFamily: 'Outfit, system-ui, sans-serif'
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, minWidth: 0 }}>
        <div
          style={{
            width: 40,
            height: 40,
            borderRadius: 8,
            backgroundColor: 'rgba(134, 59, 255, 0.2)',
            border: '1px solid rgba(134, 59, 255, 0.4)',
            display: 'grid',
            placeItems: 'center',
            flexShrink: 0
          }}
        >
          <Smartphone size={20} color="#863bff" />
        </div>
        <div style={{ minWidth: 0 }}>
          <strong style={{ fontSize: '0.9rem', display: 'block', fontWeight: 600, color: '#e5edf6' }}>
            Install TurboFix App
          </strong>
          <p style={{ margin: 0, fontSize: '0.75rem', color: '#94a3b8', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            Work offline on factory floors with fast app access
          </p>
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
        <button
          onClick={handleInstallClick}
          style={{
            backgroundColor: '#863bff',
            color: '#ffffff',
            border: 'none',
            borderRadius: 6,
            padding: '6px 12px',
            fontSize: '0.8rem',
            fontWeight: 600,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: 6
          }}
        >
          <Download size={14} />
          Install
        </button>
        <button
          onClick={handleDismiss}
          aria-label="Close install prompt"
          style={{
            backgroundColor: 'transparent',
            border: 'none',
            color: '#64748b',
            cursor: 'pointer',
            padding: 4,
            display: 'grid',
            placeItems: 'center'
          }}
        >
          <X size={18} />
        </button>
      </div>
    </aside>
  );
}
export default PwaInstallBanner;
