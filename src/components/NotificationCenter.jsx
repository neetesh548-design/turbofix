import { createContext, useContext, useState, useCallback } from 'react';
import { X, Check, AlertCircle, Info } from 'lucide-react';

const NotificationContext = createContext();

export function NotificationProvider({ children }) {
  const [notifications, setNotifications] = useState([]);

  const addNotification = useCallback((message, type = 'info', duration = 5000) => {
    const id = Date.now();
    const notification = { id, message, type, timestamp: new Date() };

    setNotifications(prev => [...prev, notification]);

    if (duration > 0) {
      setTimeout(() => {
        removeNotification(id);
      }, duration);
    }

    return id;
  }, []);

  const removeNotification = useCallback((id) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  }, []);

  const clearAll = useCallback(() => {
    setNotifications([]);
  }, []);

  return (
    <NotificationContext.Provider value={{ addNotification, removeNotification, clearAll, notifications }}>
      {children}
      <NotificationCenter />
    </NotificationContext.Provider>
  );
}

export function useNotification() {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotification must be used within NotificationProvider');
  }
  return context;
}

function NotificationCenter() {
  const { notifications, removeNotification } = useContext(NotificationContext);

  const getIcon = (type) => {
    switch (type) {
      case 'success':
        return <Check size={18} />;
      case 'error':
        return <AlertCircle size={18} />;
      case 'info':
        return <Info size={18} />;
      default:
        return null;
    }
  };

  return (
    <div className="notification-center" role="region" aria-label="Notifications" aria-live="polite">
      {notifications.map((notification) => (
        <div
          key={notification.id}
          className={`notification notification-${notification.type}`}
          role="alert"
        >
          <div className="notification-content">
            {getIcon(notification.type)}
            <span>{notification.message}</span>
          </div>
          <button
            className="notification-close"
            onClick={() => removeNotification(notification.id)}
            aria-label="Close notification"
          >
            <X size={16} />
          </button>
        </div>
      ))}
    </div>
  );
}
