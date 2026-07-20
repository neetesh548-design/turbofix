import { useState, useCallback } from 'react';
import { FileText, Trash2, Mail, Download, Plus } from 'lucide-react';

export function ReportCenter({ reports = [] }) {
  const [showNew, setShowNew] = useState(false);

  return (
    <div className="report-center">
      <div className="report-header">
        <h2>Report Center</h2>
        <button
          className="btn-primary"
          onClick={() => setShowNew(!showNew)}
        >
          <Plus size={16} />
          New Report
        </button>
      </div>

      {showNew && <NewReportForm onClose={() => setShowNew(false)} />}

      <div className="reports-list">
        {reports.length > 0 ? (
          reports.map((report, idx) => (
            <ReportItem key={idx} report={report} />
          ))
        ) : (
          <div className="reports-empty">
            <FileText size={48} />
            <p>No reports yet</p>
            <small>Create your first report to get started</small>
          </div>
        )}
      </div>
    </div>
  );
}

function ReportItem({ report }) {
  const [showSchedule, setShowSchedule] = useState(false);

  return (
    <div className="report-item">
      <div className="report-item-header">
        <div className="report-info">
          <h4>{report.name}</h4>
          <p className="report-description">{report.description}</p>
        </div>
        <span className="report-type">{report.type}</span>
      </div>

      <div className="report-meta">
        <span className="meta-label">Created:</span>
        <span>{new Date(report.createdAt).toLocaleDateString()}</span>
        <span className="meta-label">Last Generated:</span>
        <span>{report.lastGenerated ? new Date(report.lastGenerated).toLocaleDateString() : 'Never'}</span>
        {report.scheduled && (
          <>
            <span className="meta-label">Frequency:</span>
            <span className="frequency-badge">{report.frequency}</span>
          </>
        )}
      </div>

      <div className="report-actions">
        <button className="action-btn download" title="Download report">
          <Download size={16} />
          Download
        </button>
        <button className="action-btn email" title="Email report">
          <Mail size={16} />
          Email
        </button>
        <button
          className="action-btn schedule"
          onClick={() => setShowSchedule(!showSchedule)}
          title="Schedule report"
        >
          Schedule
        </button>
        <button className="action-btn delete" title="Delete report">
          <Trash2 size={16} />
        </button>
      </div>

      {showSchedule && <ScheduleReportForm report={report} />}
    </div>
  );
}

function NewReportForm({ onClose }) {
  const [form, setForm] = useState({
    name: '',
    description: '',
    type: 'analytics',
    schedule: 'never'
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    console.log('Creating report:', form);
    onClose();
  };

  return (
    <form className="new-report-form" onSubmit={handleSubmit}>
      <div className="form-group">
        <label>Report Name</label>
        <input
          type="text"
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
          placeholder="e.g., Weekly Performance Report"
          required
        />
      </div>

      <div className="form-group">
        <label>Description</label>
        <textarea
          value={form.description}
          onChange={(e) => setForm({ ...form, description: e.target.value })}
          placeholder="Describe what this report contains..."
          rows={3}
        />
      </div>

      <div className="form-group">
        <label>Report Type</label>
        <select
          value={form.type}
          onChange={(e) => setForm({ ...form, type: e.target.value })}
        >
          <option value="analytics">Analytics</option>
          <option value="performance">Performance</option>
          <option value="usage">Usage</option>
          <option value="custom">Custom</option>
        </select>
      </div>

      <div className="form-group">
        <label>Schedule</label>
        <select
          value={form.schedule}
          onChange={(e) => setForm({ ...form, schedule: e.target.value })}
        >
          <option value="never">Never (Manual Only)</option>
          <option value="daily">Daily</option>
          <option value="weekly">Weekly</option>
          <option value="monthly">Monthly</option>
        </select>
      </div>

      <div className="form-actions">
        <button type="button" className="btn-secondary" onClick={onClose}>
          Cancel
        </button>
        <button type="submit" className="btn-primary">
          Create Report
        </button>
      </div>
    </form>
  );
}

function ScheduleReportForm({ report }) {
  const [schedule, setSchedule] = useState({
    frequency: 'weekly',
    day: 'monday',
    time: '09:00',
    recipients: []
  });

  return (
    <div className="schedule-form">
      <h4>Schedule {report.name}</h4>

      <div className="form-group">
        <label>Frequency</label>
        <select
          value={schedule.frequency}
          onChange={(e) => setSchedule({ ...schedule, frequency: e.target.value })}
        >
          <option value="daily">Daily</option>
          <option value="weekly">Weekly</option>
          <option value="monthly">Monthly</option>
        </select>
      </div>

      {schedule.frequency === 'weekly' && (
        <div className="form-group">
          <label>Day of Week</label>
          <select
            value={schedule.day}
            onChange={(e) => setSchedule({ ...schedule, day: e.target.value })}
          >
            <option value="monday">Monday</option>
            <option value="tuesday">Tuesday</option>
            <option value="wednesday">Wednesday</option>
            <option value="thursday">Thursday</option>
            <option value="friday">Friday</option>
            <option value="saturday">Saturday</option>
            <option value="sunday">Sunday</option>
          </select>
        </div>
      )}

      <div className="form-group">
        <label>Time</label>
        <input
          type="time"
          value={schedule.time}
          onChange={(e) => setSchedule({ ...schedule, time: e.target.value })}
        />
      </div>

      <div className="form-group">
        <label>Email Recipients</label>
        <input
          type="email"
          placeholder="Add email addresses (comma-separated)"
          onBlur={(e) => {
            const emails = e.target.value.split(',').map(e => e.trim()).filter(Boolean);
            setSchedule({ ...schedule, recipients: emails });
          }}
        />
      </div>

      <button className="btn-primary" style={{ width: '100%' }}>
        Save Schedule
      </button>
    </div>
  );
}

export function useSavedReports() {
  const [reports, setReports] = useState(() => {
    const saved = localStorage.getItem('saved-reports');
    return saved ? JSON.parse(saved) : [];
  });

  const saveReport = useCallback((report) => {
    const newReport = {
      id: Date.now(),
      ...report,
      createdAt: new Date().toISOString()
    };

    const updated = [...reports, newReport];
    setReports(updated);
    localStorage.setItem('saved-reports', JSON.stringify(updated));
    return newReport;
  }, [reports]);

  const deleteReport = useCallback((id) => {
    const updated = reports.filter(r => r.id !== id);
    setReports(updated);
    localStorage.setItem('saved-reports', JSON.stringify(updated));
  }, [reports]);

  return { reports, saveReport, deleteReport };
}
