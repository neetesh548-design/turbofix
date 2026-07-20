import { useState, useCallback, useEffect } from 'react';
import { GripVertical, X, Settings } from 'lucide-react';

export function DashboardGrid({ widgets, onLayoutChange, editable = false }) {
  const [layout, setLayout] = useState(() => {
    const saved = localStorage.getItem('dashboard-layout');
    return saved ? JSON.parse(saved) : widgets.map((w, i) => ({ id: w.id, order: i }));
  });

  const [draggingId, setDraggingId] = useState(null);

  useEffect(() => {
    localStorage.setItem('dashboard-layout', JSON.stringify(layout));
    onLayoutChange?.(layout);
  }, [layout, onLayoutChange]);

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

  return (
    <div
      className={`dashboard-widget ${isDragging ? 'dragging' : ''}`}
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

export function useWidgetLayout(defaultLayout = []) {
  const [layout, setLayout] = useState(() => {
    const saved = localStorage.getItem('dashboard-layout');
    return saved ? JSON.parse(saved) : defaultLayout;
  });

  const saveLayout = useCallback((newLayout) => {
    setLayout(newLayout);
    localStorage.setItem('dashboard-layout', JSON.stringify(newLayout));
  }, []);

  const resetLayout = useCallback(() => {
    setLayout(defaultLayout);
    localStorage.setItem('dashboard-layout', JSON.stringify(defaultLayout));
  }, [defaultLayout]);

  return { layout, saveLayout, resetLayout };
}
