import { useState, useMemo } from 'react';
import { ChevronLeft, ChevronRight, AlertCircle, CheckCircle2, Clock, Zap } from 'lucide-react';

export function CompanyCalendar() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(null);

  const events = useMemo(() => {
    // Mock company-wide events - in production, fetch from backend
    const mockEvents = [
      { date: '2026-07-22', type: 'maintenance', machine: 'CNC Lathe 1', title: 'Preventive Maintenance', priority: 'high' },
      { date: '2026-07-23', type: 'alert', machine: 'Hydraulic Press', title: 'Urgent: Oil Check Required', priority: 'critical' },
      { date: '2026-07-24', type: 'ticket', machine: 'Assembly Line A', title: 'Belt Replacement Scheduled', priority: 'medium' },
      { date: '2026-07-25', type: 'shutdown', machine: 'Multiple', title: 'Plant Shutdown Planning', priority: 'high' },
      { date: '2026-07-26', type: 'completed', machine: 'Pump Station', title: 'Seal Replacement Completed', priority: 'low' },
      { date: '2026-07-28', type: 'alert', machine: 'Compressor', title: 'Temperature Alert', priority: 'high' },
      { date: '2026-07-30', type: 'maintenance', machine: 'Drill Press', title: 'Quarterly Inspection', priority: 'medium' },
      { date: '2026-08-01', type: 'shutdown', machine: 'All Machines', title: 'Monthly Safety Review', priority: 'high' },
    ];

    return mockEvents;
  }, []);

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

  const handleToday = () => {
    setCurrentDate(new Date());
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
      case 'shutdown':
        return <Zap size={14} />;
      default:
        return <Clock size={14} />;
    }
  };

  const getEventColor = (type) => {
    switch (type) {
      case 'alert':
        return 'alert';
      case 'completed':
        return 'success';
      case 'shutdown':
        return 'warning';
      case 'maintenance':
        return 'info';
      default:
        return 'default';
    }
  };

  const selectedDateEvents = selectedDate ? getEventsForDate(selectedDate) : [];
  const isToday = (day) => {
    const today = new Date();
    return day === today.getDate() &&
           currentDate.getMonth() === today.getMonth() &&
           currentDate.getFullYear() === today.getFullYear();
  };

  return (
    <div className="company-calendar">
      <div className="calendar-header">
        <h3>Company Maintenance Calendar</h3>
        <div className="calendar-controls">
          <button className="control-btn" onClick={handlePrevMonth} title="Previous month">
            <ChevronLeft size={18} />
          </button>
          <div className="calendar-month">{monthName}</div>
          <button className="control-btn" onClick={handleNextMonth} title="Next month">
            <ChevronRight size={18} />
          </button>
          <button className="today-btn" onClick={handleToday}>Today</button>
        </div>
      </div>

      <div className="calendar-container">
        <div className="calendar-main">
          <div className="weekdays">
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
              <div key={day} className="weekday">{day}</div>
            ))}
          </div>

          <div className="calendar-grid">
            {days.map((day, index) => {
              const dayEvents = day ? getEventsForDate(day) : [];
              const isCurrentDay = isToday(day);

              return (
                <div
                  key={index}
                  className={`calendar-day ${!day ? 'empty' : ''} ${isCurrentDay ? 'today' : ''} ${selectedDate === day ? 'selected' : ''}`}
                  onClick={() => day && setSelectedDate(day)}
                >
                  {day && (
                    <>
                      <div className={`day-number ${isCurrentDay ? 'current' : ''}`}>{day}</div>
                      <div className="day-events">
                        {dayEvents.length > 0 && (
                          <>
                            {dayEvents.slice(0, 2).map((event, idx) => (
                              <div key={idx} className={`event-dot ${getEventColor(event.type)}`} title={event.title}>
                                {getEventIcon(event.type)}
                              </div>
                            ))}
                            {dayEvents.length > 2 && (
                              <div className="event-more">+{dayEvents.length - 2}</div>
                            )}
                          </>
                        )}
                      </div>
                    </>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        <div className="calendar-sidebar">
          <div className="sidebar-section">
            <h4>Legend</h4>
            <div className="legend">
              <div className="legend-item alert">
                <AlertCircle size={14} />
                <span>Alerts</span>
              </div>
              <div className="legend-item info">
                <Clock size={14} />
                <span>Maintenance</span>
              </div>
              <div className="legend-item warning">
                <Zap size={14} />
                <span>Shutdown</span>
              </div>
              <div className="legend-item success">
                <CheckCircle2 size={14} />
                <span>Completed</span>
              </div>
            </div>
          </div>

          {selectedDateEvents.length > 0 && (
            <div className="sidebar-section">
              <h4>
                Events on {selectedDate} {monthName.split(' ')[0]}
              </h4>
              <div className="events-list">
                {selectedDateEvents.map((event, idx) => (
                  <div key={idx} className={`event-item ${event.type}`}>
                    <div className="event-header">
                      <span className="event-machine">{event.machine}</span>
                      <span className={`event-priority ${event.priority}`}>{event.priority}</span>
                    </div>
                    <div className="event-title">{event.title}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="sidebar-section">
            <h4>Summary</h4>
            <div className="summary-stats">
              <div className="stat">
                <span className="stat-label">Total Events</span>
                <span className="stat-value">{events.length}</span>
              </div>
              <div className="stat">
                <span className="stat-label">This Month</span>
                <span className="stat-value">{events.filter(e => {
                  const eventDate = new Date(e.date);
                  return eventDate.getMonth() === currentDate.getMonth() &&
                         eventDate.getFullYear() === currentDate.getFullYear();
                }).length}</span>
              </div>
              <div className="stat">
                <span className="stat-label">Alerts</span>
                <span className="stat-value">{events.filter(e => e.type === 'alert').length}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export function CalendarEventSummary() {
  const upcomingEvents = [
    { date: '2026-07-22', title: 'CNC Lathe 1 Preventive Maintenance', type: 'maintenance', machines: 1 },
    { date: '2026-07-23', title: 'Hydraulic Press Oil Check Required', type: 'alert', machines: 1 },
    { date: '2026-07-25', title: 'Plant Shutdown Planning', type: 'shutdown', machines: 4 },
    { date: '2026-07-28', title: 'Compressor Temperature Alert', type: 'alert', machines: 1 },
    { date: '2026-08-01', title: 'Monthly Safety Review', type: 'shutdown', machines: 10 },
  ];

  const getTypeColor = (type) => {
    switch (type) {
      case 'alert':
        return 'alert';
      case 'shutdown':
        return 'warning';
      default:
        return 'info';
    }
  };

  return (
    <div className="calendar-summary">
      <h4>Upcoming Events (Next 14 Days)</h4>
      <div className="summary-list">
        {upcomingEvents.map((event, idx) => (
          <div key={idx} className={`summary-item ${getTypeColor(event.type)}`}>
            <div className="summary-date">{new Date(event.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</div>
            <div className="summary-content">
              <div className="summary-title">{event.title}</div>
              <div className="summary-meta">{event.machines} machine{event.machines > 1 ? 's' : ''}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
