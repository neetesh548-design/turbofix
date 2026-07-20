import { useState, useMemo } from 'react';
import { ChevronLeft, ChevronRight, AlertCircle, CheckCircle2, Clock, Zap, TrendingDown, Activity, Calendar } from 'lucide-react';

export function MachineCalendar({ machineId = null }) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(null);
  const [selectedMachine, setSelectedMachine] = useState(machineId || 'machine-001');
  const [viewMode, setViewMode] = useState('calendar'); // 'calendar' or 'timeline'

  // Mock machines data
  const machines = [
    { id: 'machine-001', name: 'CNC Lathe 1', status: 'running', health: 85 },
    { id: 'machine-002', name: 'Hydraulic Press', status: 'alert', health: 62 },
    { id: 'machine-003', name: 'Assembly Line A', status: 'idle', health: 90 },
    { id: 'machine-004', name: 'Drill Press', status: 'running', health: 78 },
  ];

  const currentMachine = machines.find(m => m.id === selectedMachine) || machines[0];

  // Machine-specific events
  const getMachineEvents = () => {
    const allEvents = {
      'machine-001': [
        { date: '2026-07-22', type: 'maintenance', title: 'Oil Change', duration: '2h', tech: 'John Doe' },
        { date: '2026-07-25', type: 'alert', title: 'Temperature High', duration: '1h', severity: 'high' },
        { date: '2026-07-28', type: 'completed', title: 'Bearing Replacement', duration: '3h', tech: 'Jane Smith' },
        { date: '2026-08-01', type: 'scheduled', title: 'Quarterly Inspection', duration: '4h', tech: 'John Doe' },
      ],
      'machine-002': [
        { date: '2026-07-23', type: 'alert', title: 'Pressure Alert', duration: '2h', severity: 'critical' },
        { date: '2026-07-26', type: 'completed', title: 'Seal Replacement', duration: '2h', tech: 'Bob Wilson' },
        { date: '2026-07-30', type: 'maintenance', title: 'Filter Cleaning', duration: '1h', tech: 'Jane Smith' },
      ],
      'machine-003': [
        { date: '2026-07-20', type: 'completed', title: 'Belt Adjustment', duration: '1.5h', tech: 'John Doe' },
        { date: '2026-07-27', type: 'scheduled', title: 'Lubrication', duration: '1h', tech: 'Jane Smith' },
      ],
      'machine-004': [
        { date: '2026-07-24', type: 'maintenance', title: 'Drill Bit Replacement', duration: '1h', tech: 'Bob Wilson' },
        { date: '2026-07-29', type: 'scheduled', title: 'Alignment Check', duration: '2h', tech: 'John Doe' },
      ],
    };

    return allEvents[selectedMachine] || [];
  };

  const events = getMachineEvents();

  const getDaysInMonth = (date) => {
    return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  };

  const getFirstDayOfMonth = (date) => {
    return new Date(date.getFullYear(), date.getMonth(), 1).getDay();
  };

  const getEventsForDate = (day) => {
    const dateStr = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    return events.filter(e => e.date === dateStr);
  };

  const handlePrevMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1));
  };

  const handleNextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1));
  };

  const daysInMonth = getDaysInMonth(currentDate);
  const firstDay = getFirstDayOfMonth(currentDate);
  const monthName = currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

  const days = [];
  for (let i = 0; i < firstDay; i++) {
    days.push(null);
  }
  for (let i = 1; i <= daysInMonth; i++) {
    days.push(i);
  }

  const getEventIcon = (type) => {
    switch (type) {
      case 'alert':
        return <AlertCircle size={14} />;
      case 'completed':
        return <CheckCircle2 size={14} />;
      case 'scheduled':
        return <Clock size={14} />;
      case 'maintenance':
        return <Zap size={14} />;
      default:
        return <Activity size={14} />;
    }
  };

  const getEventColor = (type) => {
    switch (type) {
      case 'alert':
        return 'alert';
      case 'completed':
        return 'success';
      case 'scheduled':
        return 'warning';
      case 'maintenance':
        return 'info';
      default:
        return 'default';
    }
  };

  const selectedDateEvents = selectedDate ? getEventsForDate(selectedDate) : [];

  const getStatusColor = (status) => {
    switch (status) {
      case 'running':
        return 'success';
      case 'alert':
        return 'alert';
      case 'idle':
        return 'warning';
      default:
        return 'default';
    }
  };

  const getStatusLabel = (status) => {
    return status.charAt(0).toUpperCase() + status.slice(1);
  };

  const upcomingEvents = events
    .filter(e => new Date(e.date) >= new Date())
    .sort((a, b) => new Date(a.date) - new Date(b.date))
    .slice(0, 5);

  const maintenanceHistory = events
    .filter(e => e.type === 'completed')
    .sort((a, b) => new Date(b.date) - new Date(a.date))
    .slice(0, 5);

  return (
    <div className="machine-calendar">
      <div className="calendar-wrapper">
        {/* Machine Selector & Info */}
        <div className="machine-header">
          <div className="machine-selector">
            <label>Select Machine:</label>
            <select value={selectedMachine} onChange={(e) => setSelectedMachine(e.target.value)}>
              {machines.map(machine => (
                <option key={machine.id} value={machine.id}>
                  {machine.name} ({machine.id})
                </option>
              ))}
            </select>
          </div>

          <div className="machine-status">
            <div className="status-item">
              <span className="status-label">Status</span>
              <span className={`status-badge ${getStatusColor(currentMachine.status)}`}>
                {getStatusLabel(currentMachine.status)}
              </span>
            </div>
            <div className="status-item">
              <span className="status-label">Health</span>
              <div className="health-bar">
                <div className="health-fill" style={{ width: `${currentMachine.health}%` }}></div>
              </div>
              <span className="health-percent">{currentMachine.health}%</span>
            </div>
          </div>
        </div>

        {/* View Mode Toggle */}
        <div className="view-toggle">
          <button
            className={`toggle-btn ${viewMode === 'calendar' ? 'active' : ''}`}
            onClick={() => setViewMode('calendar')}
          >
            <Calendar size={16} />
            Calendar View
          </button>
          <button
            className={`toggle-btn ${viewMode === 'timeline' ? 'active' : ''}`}
            onClick={() => setViewMode('timeline')}
          >
            <Clock size={16} />
            Timeline View
          </button>
        </div>

        {/* Calendar View */}
        {viewMode === 'calendar' && (
          <div className="calendar-view">
            <div className="calendar-controls">
              <button className="control-btn" onClick={handlePrevMonth}>
                <ChevronLeft size={18} />
              </button>
              <h3>{monthName}</h3>
              <button className="control-btn" onClick={handleNextMonth}>
                <ChevronRight size={18} />
              </button>
            </div>

            <div className="weekdays">
              {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                <div key={day} className="weekday">{day}</div>
              ))}
            </div>

            <div className="calendar-grid">
              {days.map((day, index) => {
                const dayEvents = day ? getEventsForDate(day) : [];

                return (
                  <div
                    key={index}
                    className={`calendar-day ${!day ? 'empty' : ''} ${selectedDate === day ? 'selected' : ''}`}
                    onClick={() => day && setSelectedDate(day)}
                  >
                    {day && (
                      <>
                        <div className="day-number">{day}</div>
                        <div className="day-events-mini">
                          {dayEvents.length > 0 && (
                            <div className="event-indicator" title={`${dayEvents.length} event(s)`}>
                              {dayEvents[0].type === 'alert' && <AlertCircle size={12} className="alert" />}
                              {dayEvents[0].type === 'completed' && <CheckCircle2 size={12} className="success" />}
                              {dayEvents[0].type === 'maintenance' && <Zap size={12} className="info" />}
                              {dayEvents.length > 1 && <span className="event-count">+{dayEvents.length - 1}</span>}
                            </div>
                          )}
                        </div>
                      </>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Timeline View */}
        {viewMode === 'timeline' && (
          <div className="timeline-view">
            <h4>Maintenance Timeline</h4>
            <div className="timeline">
              {events.map((event, idx) => (
                <div key={idx} className={`timeline-item ${getEventColor(event.type)}`}>
                  <div className="timeline-date">{new Date(event.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</div>
                  <div className="timeline-icon">{getEventIcon(event.type)}</div>
                  <div className="timeline-content">
                    <div className="timeline-title">{event.title}</div>
                    <div className="timeline-meta">
                      <span className="meta-item">⏱ {event.duration}</span>
                      {event.tech && <span className="meta-item">👤 {event.tech}</span>}
                      {event.severity && <span className={`meta-item severity-${event.severity}`}>{event.severity}</span>}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Right Sidebar */}
      <div className="calendar-sidebar">
        {/* Machine Quick Stats */}
        <div className="sidebar-section stats-section">
          <h4>Machine Statistics</h4>
          <div className="quick-stats">
            <div className="stat-card">
              <span className="stat-label">Total Events</span>
              <span className="stat-value">{events.length}</span>
            </div>
            <div className="stat-card">
              <span className="stat-label">Upcoming</span>
              <span className="stat-value">{upcomingEvents.length}</span>
            </div>
            <div className="stat-card">
              <span className="stat-label">Completed</span>
              <span className="stat-value">{events.filter(e => e.type === 'completed').length}</span>
            </div>
            <div className="stat-card">
              <span className="stat-label">Alerts</span>
              <span className="stat-value alert">{events.filter(e => e.type === 'alert').length}</span>
            </div>
          </div>
        </div>

        {/* Selected Date Events */}
        {selectedDateEvents.length > 0 && (
          <div className="sidebar-section">
            <h4>Events on {selectedDate ? `${selectedDate} ${monthName.split(' ')[0]}` : 'Selected Date'}</h4>
            <div className="events-list">
              {selectedDateEvents.map((event, idx) => (
                <div key={idx} className={`event-detail ${event.type}`}>
                  <div className="event-title-detail">{event.title}</div>
                  <div className="event-meta">
                    <span>⏱ {event.duration}</span>
                    {event.tech && <span>👤 {event.tech}</span>}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Upcoming Maintenance */}
        <div className="sidebar-section">
          <h4>🔔 Next Scheduled</h4>
          <div className="upcoming-list">
            {upcomingEvents.length > 0 ? (
              upcomingEvents.map((event, idx) => (
                <div key={idx} className={`upcoming-item ${getEventColor(event.type)}`}>
                  <div className="upcoming-date">{new Date(event.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</div>
                  <div className="upcoming-title">{event.title}</div>
                  <div className="upcoming-duration">{event.duration}</div>
                </div>
              ))
            ) : (
              <div className="no-events">No upcoming events</div>
            )}
          </div>
        </div>

        {/* Maintenance History */}
        <div className="sidebar-section">
          <h4>✅ Recent Work</h4>
          <div className="history-list">
            {maintenanceHistory.length > 0 ? (
              maintenanceHistory.map((event, idx) => (
                <div key={idx} className="history-item">
                  <div className="history-date">{new Date(event.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</div>
                  <div className="history-info">
                    <div className="history-title">{event.title}</div>
                    {event.tech && <div className="history-tech">{event.tech}</div>}
                  </div>
                </div>
              ))
            ) : (
              <div className="no-events">No completed work</div>
            )}
          </div>
        </div>

        {/* Service Intervals */}
        <div className="sidebar-section">
          <h4>⚙️ Service Intervals</h4>
          <div className="intervals">
            <div className="interval-item">
              <span className="interval-label">Oil Change</span>
              <span className="interval-status">45 days</span>
            </div>
            <div className="interval-item">
              <span className="interval-label">Inspection</span>
              <span className="interval-status">30 days</span>
            </div>
            <div className="interval-item">
              <span className="interval-label">Calibration</span>
              <span className="interval-status">60 days</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
