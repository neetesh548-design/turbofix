// WebSocket manager for real-time communication with automatic reconnection
class WebSocketManager {
  constructor(url = 'ws://localhost:8080') {
    this.url = url;
    this.ws = null;
    this.listeners = new Map();
    this.messageQueue = [];
    this.isConnected = false;
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 5;
    this.reconnectDelay = 1000;
    this.heartbeatInterval = null;
    this.maxQueueSize = 1000; // Prevent unbounded memory growth
    this.sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  connect() {
    if (this.ws?.readyState === WebSocket.OPEN) return;

    try {
      this.ws = new WebSocket(this.url);

      this.ws.onopen = () => {
        this.isConnected = true;
        this.reconnectAttempts = 0;
        this.emit('connected');
        this.flushQueue();
        this.startHeartbeat();
      };

      this.ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          this.handleMessage(data);
        } catch (err) {
          console.error('WebSocket message parse error:', err);
        }
      };

      this.ws.onerror = (error) => {
        console.error('WebSocket error:', error);
        this.emit('error', error);
      };

      this.ws.onclose = () => {
        this.isConnected = false;
        this.stopHeartbeat();
        this.emit('disconnected');
        this.attemptReconnect();
      };
    } catch (err) {
      console.error('WebSocket connection failed:', err);
      this.attemptReconnect();
    }
  }

  attemptReconnect() {
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++;
      const exponentialDelay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1);
      const delay = Math.min(exponentialDelay, 30000); // Cap at 30 seconds
      setTimeout(() => this.connect(), delay);
    }
  }

  handleMessage(data) {
    const { type, event, payload } = data;

    if (type === 'pong') {
      return;
    }

    if (event) {
      this.emit(event, payload);
    }

    this.emit('message', data);
  }

  send(event, payload = {}) {
    const message = {
      type: 'message',
      event,
      payload,
      sessionId: this.sessionId,
      timestamp: new Date().toISOString()
    };

    if (this.isConnected && this.ws?.readyState === WebSocket.OPEN) {
      try {
        this.ws.send(JSON.stringify(message));
      } catch (err) {
        console.error('WebSocket send error:', err);
        this.messageQueue.push(message);
        if (this.messageQueue.length > this.maxQueueSize) {
          this.messageQueue.shift(); // Drop oldest if queue full
        }
      }
    } else {
      this.messageQueue.push(message);
      // Drop oldest messages if queue exceeds max size
      if (this.messageQueue.length > this.maxQueueSize) {
        this.messageQueue.shift();
      }
    }
  }

  flushQueue() {
    while (this.messageQueue.length > 0 && this.isConnected) {
      const message = this.messageQueue.shift();
      this.ws.send(JSON.stringify(message));
    }
  }

  on(event, callback) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    this.listeners.get(event).push(callback);

    return () => this.off(event, callback);
  }

  off(event, callback) {
    if (!this.listeners.has(event)) return;
    const callbacks = this.listeners.get(event);
    const index = callbacks.indexOf(callback);
    if (index > -1) {
      callbacks.splice(index, 1);
    }
  }

  emit(event, data) {
    if (!this.listeners.has(event)) return;
    this.listeners.get(event).forEach(callback => {
      try {
        callback(data);
      } catch (err) {
        console.error(`Error in ${event} listener:`, err);
      }
    });
  }

  startHeartbeat() {
    this.stopHeartbeat();
    this.heartbeatInterval = setInterval(() => {
      if (this.isConnected && this.ws?.readyState === WebSocket.OPEN) {
        this.ws.send(JSON.stringify({ type: 'ping' }));
      }
    }, 30000);
  }

  stopHeartbeat() {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
  }

  disconnect() {
    this.stopHeartbeat();
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    this.isConnected = false;
  }

  subscribe(channel) {
    this.send('subscribe', { channel });
  }

  unsubscribe(channel) {
    this.send('unsubscribe', { channel });
  }

  getStatus() {
    return {
      isConnected: this.isConnected,
      sessionId: this.sessionId,
      queueLength: this.messageQueue.length,
      reconnectAttempts: this.reconnectAttempts
    };
  }
}

export const wsManager = new WebSocketManager();

// Hooks for React components
export function useWebSocket(eventName) {
  const [data, setData] = React.useState(null);

  React.useEffect(() => {
    const unsubscribe = wsManager.on(eventName, (payload) => {
      setData(payload);
    });

    if (!wsManager.isConnected) {
      wsManager.connect();
    }

    return unsubscribe;
  }, [eventName]);

  return data;
}

export function useWebSocketStatus() {
  const [status, setStatus] = React.useState(wsManager.getStatus());

  React.useEffect(() => {
    const unsubConnected = wsManager.on('connected', () => {
      setStatus(wsManager.getStatus());
    });

    const unsubDisconnected = wsManager.on('disconnected', () => {
      setStatus(wsManager.getStatus());
    });

    if (!wsManager.isConnected) {
      wsManager.connect();
    }

    return () => {
      unsubConnected();
      unsubDisconnected();
    };
  }, []);

  return status;
}
