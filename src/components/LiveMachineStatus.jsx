import { useState, useEffect } from 'react';
import { AlertCircle, CheckCircle2, Clock, Zap, TrendingUp } from 'lucide-react';
import { wsManager } from '../utils/websocket';

export function LiveMachineStatus({ machineId = null }) {
  const [machines, setMachines] = useState(() => {
    const saved = localStorage.getItem('live-machine-status');
    return saved ? JSON.parse(saved) : [];
  });
  const [selectedMachine, setSelectedMachine] = useState(machineId || null);

  useEffect(() => {
    const handleStatusUpdate = (data) => {
      setMachines((prev) => {
        const updated = prev.map((m) =>
          m.id === data.machineId ? { ...m, ...data, lastUpdate: new Date().toISOString() } : m
        );

        // Add new machine if not found
        if (!updated.find((m) => m.id === data.machineId)) {
          updated.push({
            id: data.machineId,
            ...data,
            lastUpdate: new Date().toISOString()
          });
        }

        localStorage.setItem('live-machine-status', JSON.stringify(updated.slice(-50)));
        return updated.slice(-50);
      });
    };

    const handleHealthUpdate = (data) => {
      setMachines((prev) => {
        const updated = prev.map((m) =>
          m.id === data.machineId
            ? {
                ...m,
                health: data.health,
                metrics: { ...m.metrics, ...data.metrics },
                lastUpdate: new Date().toISOString()
              }
            : m
        );
        localStorage.setItem('live-machine-status', JSON.stringify(updated.slice(-50)));
        return updated.slice(-50);
      });
    };

    const unsubs = [
      wsManager.on('machine.status.updated', handleStatusUpdate),
      wsManager.on('machine.health.updated', handleHealthUpdate),
      wsManager.on('machine.metrics.updated', handleHealthUpdate)
    ];

    if (!wsManager.isConnected) {
      wsManager.connect();
    }

    wsManager.subscribe('machines');

    return () => {
      unsubs.forEach((unsub) => unsub());
      wsManager.unsubscribe('machines');
    };
  }, []);

  const displayMachines = selectedMachine
    ? machines.filter((m) => m.id === selectedMachine)
    : machines.slice(0, 5);

  return (
    <div className="live-machine-status">
      <div className="status-header">
        <h3>Machine Status</h3>
        {machines.length > 0 && (
          <span className="status-count">{machines.length} machines</span>
        )}
      </div>

      <div className="machine-grid">
        {displayMachines.length > 0 ? (
          displayMachines.map((machine) => (
            <MachineCard key={machine.id} machine={machine} />
          ))
        ) : (
          <div className="status-empty">
            <Zap size={32} />
            <p>No machine data available</p>
          </div>
        )}
      </div>
    </div>
  );
}

function MachineCard({ machine }) {
  const getStatusIcon = (status) => {
    switch (status?.toLowerCase()) {
      case 'running':
      case 'active':
        return <CheckCircle2 size={20} className="status-icon running" />;
      case 'alert':
      case 'warning':
        return <AlertCircle size={20} className="status-icon warning" />;
      case 'idle':
      case 'stopped':
        return <Clock size={20} className="status-icon idle" />;
      default:
        return <Zap size={20} className="status-icon" />;
    }
  };

  const getHealthColor = (health) => {
    if (health >= 80) return 'excellent';
    if (health >= 60) return 'good';
    if (health >= 40) return 'fair';
    return 'poor';
  };

  const uptime = machine.metrics?.uptime || 'N/A';
  const temperature = machine.metrics?.temperature ? `${machine.metrics.temperature}°C` : 'N/A';
  const pressure = machine.metrics?.pressure ? `${machine.metrics.pressure} bar` : 'N/A';
  const health = machine.health || 85;

  return (
    <div className={`machine-card status-${machine.status?.toLowerCase() || 'unknown'}`}>
      <div className="machine-header">
        <div className="machine-title">
          {getStatusIcon(machine.status)}
          <span>{machine.name || machine.id}</span>
        </div>
        <span className="machine-status-badge">
          {machine.status || 'Unknown'}
        </span>
      </div>

      <div className="machine-metrics">
        <div className="metric-row">
          <span className="metric-label">Uptime</span>
          <span className="metric-value">{uptime}</span>
        </div>
        <div className="metric-row">
          <span className="metric-label">Temperature</span>
          <span className="metric-value">{temperature}</span>
        </div>
        <div className="metric-row">
          <span className="metric-label">Pressure</span>
          <span className="metric-value">{pressure}</span>
        </div>
      </div>

      <div className="machine-health">
        <div className="health-label">
          <span>Health</span>
          <span className="health-value">{health}%</span>
        </div>
        <div className={`health-bar ${getHealthColor(health)}`}>
          <div className="health-fill" style={{ width: `${health}%` }} />
        </div>
      </div>

      <div className="machine-footer">
        <span className="update-time">
          Updated {getTimeAgo(machine.lastUpdate)}
        </span>
      </div>
    </div>
  );
}

function getTimeAgo(timestamp) {
  if (!timestamp) return 'never';
  const now = new Date();
  const time = new Date(timestamp);
  const seconds = Math.floor((now - time) / 1000);

  if (seconds < 60) return 'just now';
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  return 'earlier';
}

export function MachineAlerts() {
  const [alerts, setAlerts] = useState(() => {
    const saved = localStorage.getItem('machine-alerts');
    return saved ? JSON.parse(saved) : [];
  });

  useEffect(() => {
    const handleAlert = (data) => {
      const alert = {
        id: `alert_${Date.now()}`,
        machineId: data.machineId,
        machineName: data.machineName,
        level: data.level || 'warning',
        message: data.message,
        timestamp: new Date().toISOString(),
        resolved: false
      };

      setAlerts((prev) => {
        const updated = [alert, ...prev].slice(0, 100);
        localStorage.setItem('machine-alerts', JSON.stringify(updated));
        return updated;
      });
    };

    const handleResolved = (data) => {
      setAlerts((prev) => {
        const updated = prev.map((a) =>
          a.id === data.alertId ? { ...a, resolved: true } : a
        );
        localStorage.setItem('machine-alerts', JSON.stringify(updated));
        return updated;
      });
    };

    const unsubs = [
      wsManager.on('machine.alert', handleAlert),
      wsManager.on('alert.resolved', handleResolved)
    ];

    if (!wsManager.isConnected) {
      wsManager.connect();
    }

    return () => unsubs.forEach((unsub) => unsub());
  }, []);

  const activeAlerts = alerts.filter((a) => !a.resolved);

  return (
    <div className="machine-alerts">
      <div className="alerts-header">
        <h4>Active Alerts</h4>
        {activeAlerts.length > 0 && (
          <span className="alert-badge">{activeAlerts.length}</span>
        )}
      </div>

      <div className="alerts-list">
        {activeAlerts.length > 0 ? (
          activeAlerts.slice(0, 10).map((alert) => (
            <div key={alert.id} className={`alert-item ${alert.level}`}>
              <AlertCircle size={16} />
              <div className="alert-content">
                <span className="alert-machine">{alert.machineName}</span>
                <span className="alert-message">{alert.message}</span>
              </div>
              <span className="alert-time">
                {new Date(alert.timestamp).toLocaleTimeString()}
              </span>
            </div>
          ))
        ) : (
          <div className="alerts-empty">All systems operational</div>
        )}
      </div>
    </div>
  );
}
