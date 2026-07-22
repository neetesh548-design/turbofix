import { useState, useEffect } from 'react';
import { GripVertical, Settings } from 'lucide-react';
import { DASHBOARD_LAYOUT_STORAGE_KEY, readStoredLayout } from '@/lib/dashboardLayout';

export function DashboardGrid({ widgets, onLayoutChange, editable = false }) {
  const [layout, setLayout] = useState(() => {
    const defaultLayout = widgets.map((w, i) => ({ id: w.id, order: i }));
    return editable ? readStoredLayout(defaultLayout) : defaultLayout;
  });

  const [draggingId, setDraggingId] = useState(null);

  useEffect(() => {
    if (!editable) return;
    localStorage.setItem(DASHBOARD_LAYOUT_STORAGE_KEY, JSON.stringify(layout));
    onLayoutChange?.(layout);
  }, [editable, layout, onLayoutChange]);

  const handleDragStart = (e, id) => {
    if (!editable) return;
    setDraggingId(id);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
  };

  const handleDrop = (e, targetId) => {
    if (!editable || !draggingId || draggingId === targetId) return;
    e.preventDefault();

    const newLayout = [...layout];
    const draggedIndex = newLayout.findIndex(w => w.id === draggingId);
    const targetIndex = newLayout.findIndex(w => w.id === targetId);

    [newLayout[draggedIndex], newLayout[targetIndex]] = [newLayout[targetIndex], newLayout[draggedIndex]];
    setLayout(newLayout);
    setDraggingId(null);
  };

  const orderedWidgets = [...widgets].sort((a, b) => {
    const aOrder = layout.find(w => w.id === a.id)?.order ?? 0;
    const bOrder = layout.find(w => w.id === b.id)?.order ?? 0;
    return aOrder - bOrder;
  });

  return (
    <div className="dashboard-grid" role="main">
      {orderedWidgets.map((widget) => (
        <WidgetContainer
          key={widget.id}
          widget={widget}
          editable={editable}
          onDragStart={(e) => handleDragStart(e, widget.id)}
          onDragOver={handleDragOver}
          onDrop={(e) => handleDrop(e, widget.id)}
          isDragging={draggingId === widget.id}
        />
      ))}
    </div>
  );
}

function WidgetContainer({ widget, editable, onDragStart, onDragOver, onDrop, isDragging }) {
  const [showSettings, setShowSettings] = useState(false);
  const span = Math.max(1, Math.min(12, widget.span || 12));

  if (widget.bare) {
    return (
      <div
        className={`dashboard-widget-bare ${isDragging ? 'dragging' : ''}`}
        style={{ position: 'relative', gridColumn: `span ${span}` }}
        draggable={editable}
        onDragStart={onDragStart}
        onDragOver={onDragOver}
        onDrop={onDrop}
      >
        {editable && (
          <div style={{ position: 'absolute', top: '-10px', right: '10px', zIndex: 10 }}>
            <GripVertical size={20} className="grip-handle" style={{ cursor: 'grab', background: 'var(--slate)', color: '#fff', borderRadius: '4px', padding: '2px' }} />
          </div>
        )}
        {widget.render ? widget.render() : widget.children}
      </div>
    );
  }

  return (
    <div
      className={`dashboard-widget ${isDragging ? 'dragging' : ''}`}
      style={{ gridColumn: `span ${span}` }}
      draggable={editable}
      onDragStart={onDragStart}
      onDragOver={onDragOver}
      onDrop={onDrop}
    >
      <div className="widget-header">
        {editable && <GripVertical size={16} className="grip-handle" />}
        <h3 className="widget-title">{widget.title}</h3>
        {editable && (
          <button
            className="widget-settings"
            onClick={() => setShowSettings(!showSettings)}
            aria-label="Widget settings"
          >
            <Settings size={16} />
          </button>
        )}
      </div>

      <div className="widget-content">
        {widget.render ? widget.render() : widget.children}
      </div>

      {showSettings && widget.settings && (
        <div className="widget-settings-panel">
          {widget.settings}
        </div>
      )}
    </div>
  );
}
