import { useState, useEffect } from 'react';
import { Users, UserPlus, UserMinus } from 'lucide-react';
import { wsManager } from '../utils/websocket';

export function PresenceIndicator() {
  const [onlineUsers, setOnlineUsers] = useState([]);
  const [isExpanded, setIsExpanded] = useState(false);

  useEffect(() => {
    // Load initial online users from localStorage
    const saved = localStorage.getItem('online-users');
    if (saved) {
      setOnlineUsers(JSON.parse(saved));
    }

    const unsubOnline = wsManager.on('user.online', (data) => {
      setOnlineUsers((prev) => {
        const updated = [...prev.filter((u) => u.userId !== data.userId), data];
        localStorage.setItem('online-users', JSON.stringify(updated));
        return updated;
      });
    });

    const unsubOffline = wsManager.on('user.offline', (data) => {
      setOnlineUsers((prev) => {
        const updated = prev.filter((u) => u.userId !== data.userId);
        localStorage.setItem('online-users', JSON.stringify(updated));
        return updated;
      });
    });

    const unsubPresence = wsManager.on('presence.update', (data) => {
      setOnlineUsers(data.users || []);
      localStorage.setItem('online-users', JSON.stringify(data.users || []));
    });

    if (!wsManager.isConnected) {
      wsManager.connect();
    }

    wsManager.subscribe('presence');

    return () => {
      unsubOnline();
      unsubOffline();
      unsubPresence();
      wsManager.unsubscribe('presence');
    };
  }, []);

  return (
    <div className="presence-indicator">
      <button
        className="presence-toggle"
        onClick={() => setIsExpanded(!isExpanded)}
        title={`${onlineUsers.length} users online`}
      >
        <Users size={18} />
        <span className="presence-count">{onlineUsers.length}</span>
      </button>

      {isExpanded && (
        <div className="presence-panel">
          <div className="presence-header">
            <h4>Team Online ({onlineUsers.length})</h4>
          </div>
          <div className="presence-list">
            {onlineUsers.length > 0 ? (
              onlineUsers.map((user) => (
                <PresenceUser key={user.userId} user={user} />
              ))
            ) : (
              <div className="presence-empty">No one online</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function PresenceUser({ user }) {
  return (
    <div className="presence-user">
      <div className="presence-avatar">
        {user.avatar ? (
          <img src={user.avatar} alt={user.name} />
        ) : (
          <div className="avatar-initial">
            {user.name?.charAt(0).toUpperCase() || '?'}
          </div>
        )}
        <span className="presence-dot" />
      </div>
      <div className="presence-info">
        <div className="presence-name">{user.name}</div>
        <div className="presence-status">
          {user.status || 'Available'} · {user.location || 'Dashboard'}
        </div>
      </div>
    </div>
  );
}

export function TeamCollaboration() {
  const [activeUsers, setActiveUsers] = useState([]);
  const [sharedItems, setSharedItems] = useState([]);
  const [collaborators, setCollaborators] = useState(() => {
    const saved = localStorage.getItem('collaborators');
    return saved ? JSON.parse(saved) : [];
  });

  useEffect(() => {
    const unsubCollaborate = wsManager.on('collaboration.started', (data) => {
      setCollaborators((prev) => {
        const updated = [...prev, {
          id: `collab_${Date.now()}`,
          ...data,
          startedAt: new Date().toISOString()
        }].slice(-20);
        localStorage.setItem('collaborators', JSON.stringify(updated));
        return updated;
      });
    });

    const unsubShared = wsManager.on('item.shared', (data) => {
      setSharedItems((prev) => {
        const updated = [...prev, {
          id: data.itemId,
          ...data,
          sharedAt: new Date().toISOString()
        }].slice(-50);
        return updated;
      });
    });

    if (!wsManager.isConnected) {
      wsManager.connect();
    }

    return () => {
      unsubCollaborate();
      unsubShared();
    };
  }, []);

  return (
    <div className="team-collaboration">
      <div className="collab-section">
        <h4>Active Collaborations</h4>
        <div className="collab-list">
          {collaborators.length > 0 ? (
            collaborators.map((collab) => (
              <div key={collab.id} className="collab-item">
                <div className="collab-info">
                  <span className="collab-user">{collab.user}</span>
                  <span className="collab-action">
                    {collab.action} {collab.resource}
                  </span>
                </div>
                <span className="collab-time">
                  {new Date(collab.startedAt).toLocaleTimeString()}
                </span>
              </div>
            ))
          ) : (
            <div className="collab-empty">No active collaborations</div>
          )}
        </div>
      </div>

      {sharedItems.length > 0 && (
        <div className="collab-section">
          <h4>Recently Shared</h4>
          <div className="shared-list">
            {sharedItems.slice(-5).map((item) => (
              <div key={item.id} className="shared-item">
                <span className="shared-name">{item.name}</span>
                <span className="shared-by">by {item.sharedBy}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
