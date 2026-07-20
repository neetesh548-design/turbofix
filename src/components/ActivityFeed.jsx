import { useState, useEffect } from 'react';
import { Clock, User, Zap, AlertTriangle, CheckCircle2, Edit3, Trash2, Share2 } from 'lucide-react';
import { wsManager } from '../utils/websocket';

export function ActivityFeed() {
  const [activities, setActivities] = useState(() => {
    const saved = localStorage.getItem('activity-feed');
    return saved ? JSON.parse(saved) : [];
  });
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    const handleActivity = (data) => {
      const activity = {
        id: `activity_${Date.now()}`,
        type: data.type || 'action',
        user: data.user || 'System',
        action: data.action,
        target: data.target,
        timestamp: new Date().toISOString(),
        details: data.details
      };

      setActivities((prev) => {
        const updated = [activity, ...prev].slice(0, 100);
        localStorage.setItem('activity-feed', JSON.stringify(updated));
        return updated;
      });
    };

    const unsubs = [
      wsManager.on('activity.recorded', handleActivity),
      wsManager.on('ticket.created', (data) => handleActivity({ ...data, action: 'created', target: 'Ticket' })),
      wsManager.on('ticket.updated', (data) => handleActivity({ ...data, action: 'updated', target: 'Ticket' })),
      wsManager.on('machine.updated', (data) => handleActivity({ ...data, action: 'updated', target: 'Machine' })),
      wsManager.on('team.action', handleActivity)
    ];

    if (!wsManager.isConnected) {
      wsManager.connect();
    }

    return () => unsubs.forEach(unsub => unsub());
  }, []);

  const getActivityIcon = (type) => {
    switch (type) {
      case 'alert':
        return <AlertTriangle size={16} />;
      case 'success':
        return <CheckCircle2 size={16} />;
      case 'urgent':
        return <Zap size={16} />;
      default:
        return <Edit3 size={16} />;
    }
  };

  const getActivityColor = (type) => {
    switch (type) {
      case 'alert':
        return 'warning';
      case 'success':
        return 'success';
      case 'urgent':
        return 'error';
      default:
        return 'info';
    }
  };

  const filteredActivities = filter === 'all'
    ? activities
    : activities.filter((a) => a.type === filter);

  const uniqueTypes = ['all', ...new Set(activities.map((a) => a.type))];

  return (
    <div className="activity-feed">
      <div className="activity-header">
        <h3>Activity Feed</h3>
        <p className="activity-subtitle">{filteredActivities.length} activities</p>
      </div>

      <div className="activity-filters">
        {uniqueTypes.map((type) => (
          <button
            key={type}
            className={`filter-btn ${filter === type ? 'active' : ''}`}
            onClick={() => setFilter(type)}
          >
            {type.charAt(0).toUpperCase() + type.slice(1)}
          </button>
        ))}
      </div>

      <div className="activity-list">
        {filteredActivities.length > 0 ? (
          filteredActivities.map((activity) => (
            <ActivityItem
              key={activity.id}
              activity={activity}
              icon={getActivityIcon(activity.type)}
              color={getActivityColor(activity.type)}
            />
          ))
        ) : (
          <div className="activity-empty">
            <Clock size={32} />
            <p>No activities</p>
          </div>
        )}
      </div>
    </div>
  );
}

function ActivityItem({ activity, icon, color }) {
  const timeAgo = getTimeAgo(activity.timestamp);

  return (
    <div className={`activity-item ${color}`}>
      <div className="activity-icon">
        {icon}
      </div>
      <div className="activity-content">
        <div className="activity-main">
          <span className="activity-user">
            <User size={14} />
            {activity.user}
          </span>
          <span className="activity-action">
            {activity.action} {activity.target}
          </span>
        </div>
        {activity.details && (
          <div className="activity-details">
            {activity.details}
          </div>
        )}
      </div>
      <div className="activity-time">{timeAgo}</div>
    </div>
  );
}

function getTimeAgo(timestamp) {
  const now = new Date();
  const time = new Date(timestamp);
  const seconds = Math.floor((now - time) / 1000);

  if (seconds < 60) return 'just now';
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  return time.toLocaleDateString();
}
