import { useState, useEffect, useCallback } from 'react';
import { Bell, X, AlertCircle, CheckCircle, Info } from 'lucide-react';
import { wsManager } from '../utils/websocket';

export function RealtimeNotifications() {
  const [notifications, setNotifications] = useState(() => {
    const saved = localStorage.getItem('realtime-notifications');
    return saved ? JSON.parse(saved) : [];
  });
  const [isOpen, setIsOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    const unsubMachine = wsManager.on('machine.status.changed', (data) => {
      addNotification({
        id: `notif_${Date.now()}`,
        type: 'warning',
        title: 'Machine Status Changed',
        message: `${data.machineName} is now ${data.status}`,
        timestamp: new Date().toISOString(),
        data: { machineId: data.machineId }
      });
    });

    const unsubAlert = wsManager.on('alert.triggered', (data) => {
      addNotification({
        id: `notif_${Date.now()}`,
        type: 'error',
        title: 'Critical Alert',
        message: data.alertMessage,
        timestamp: new Date().toISOString(),
        data: { alertId: data.alertId }
      });
    });

    const unsubMaintenance = wsManager.on('maintenance.scheduled', (data) => {
      addNotification({
        id: `notif_${Date.now()}`,
        type: 'info',
        title: 'Maintenance Scheduled',
        message: `Maintenance scheduled for ${data.machineName}`,
        timestamp: new Date().toISOString(),
        data: { maintenanceId: data.maintenanceId }
      });
    });

    const unsubTeam = wsManager.on('team.member.online', (data) => {
      addNotification({
        id: `notif_${Date.now()}`,
        type: 'info',
        title: 'Team Member Online',
        message: `${data.memberName} is now online`,
        timestamp: new Date().toISOString(),
        isUnobtrusive: true
      });
    });

    if (!wsManager.isConnected) {
      wsManager.connect();
    }

    return () => {
      unsubMachine();
      unsubAlert();
      unsubMaintenance();
      unsubTeam();
    };
  }, []);

  const addNotification = useCallback((notification) => {
    setNotifications((prev) => {
      const updated = [notification, ...prev].slice(0, 50);
      localStorage.setItem('realtime-notifications', JSON.stringify(updated));
      return updated;
    });
    setUnreadCount((prev) => prev + 1);
  }, []);

  const dismissNotification = (id) => {
    setNotifications((prev) => {
      const updated = prev.filter((n) => n.id !== id);
      localStorage.setItem('realtime-notifications', JSON.stringify(updated));
      return updated;
    });
  };

  const clearAllNotifications = () => {
    setNotifications([]);
    setUnreadCount(0);
    localStorage.removeItem('realtime-notifications');
  };

  const markAsRead = () => {
    setUnreadCount(0);
  };

  const getIcon = (type) => {
    switch (type) {
      case 'error':
        return <AlertCircle size={18} />;
      case 'success':
        return <CheckCircle size={18} />;
      default:
        return <Info size={18} />;
    }
  };

  const visibleNotifications = notifications.filter((n) => !n.isUnobtrusive).slice(0, 10);

  return (
    <div className="realtime-notifications">
      <button
        className={`notification-bell ${isOpen ? 'open' : ''}`}
        onClick={() => {
          setIsOpen(!isOpen);
          markAsRead();
        }}
        title="Notifications"
      >
        <Bell size={20} />
        {unreadCount > 0 && <span className="notification-badge">{unreadCount > 99 ? '99+' : unreadCount}</span>}
      </button>

      {isOpen && (
        <div className="notification-panel">
          <div className="notification-header">
            <h3>Notifications</h3>
            {notifications.length > 0 && (
              <button
                className="clear-btn"
                onClick={clearAllNotifications}
                title="Clear all"
              >
                <X size={16} />
              </button>
            )}
          </div>

          <div className="notification-list">
            {visibleNotifications.length > 0 ? (
              visibleNotifications.map((notif) => (
                <div key={notif.id} className={`notification-item ${notif.type}`}>
                  <div className="notification-icon">
                    {getIcon(notif.type)}
                  </div>
                  <div className="notification-content">
                    <div className="notification-title">{notif.title}</div>
                    <div className="notification-message">{notif.message}</div>
                    <div className="notification-time">
                      {new Date(notif.timestamp).toLocaleTimeString()}
                    </div>
                  </div>
                  <button
                    className="notification-dismiss"
                    onClick={() => dismissNotification(notif.id)}
                    title="Dismiss"
                  >
                    <X size={14} />
                  </button>
                </div>
              ))
            ) : (
              <div className="notification-empty">
                <Bell size={24} />
                <p>No notifications</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
