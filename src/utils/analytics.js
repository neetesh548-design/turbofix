export class Analytics {
  constructor(options = {}) {
    this.enabled = options.enabled !== false;
    this.debug = options.debug || false;
    this.batchSize = options.batchSize || 50;
    this.flushInterval = options.flushInterval || 30000;
    this.events = [];
    this.sessionId = this.generateSessionId();
    this.startSession();
  }

  generateSessionId() {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  startSession() {
    this.sessionStart = new Date();
    this.trackEvent('session_start', {
      sessionId: this.sessionId,
      userAgent: navigator.userAgent,
      timestamp: new Date().toISOString()
    });

    setInterval(() => this.flush(), this.flushInterval);
    window.addEventListener('beforeunload', () => this.flush());
  }

  trackEvent(eventName, properties = {}) {
    if (!this.enabled) return;

    const event = {
      name: eventName,
      timestamp: new Date().toISOString(),
      sessionId: this.sessionId,
      properties: {
        url: window.location.pathname,
        ...properties
      }
    };

    this.events.push(event);

    if (this.debug) {
      console.log('[Analytics]', eventName, properties);
    }

    if (this.events.length >= this.batchSize) {
      this.flush();
    }

    return event;
  }

  trackPageView(pageName, properties = {}) {
    return this.trackEvent('page_view', {
      page: pageName,
      ...properties
    });
  }

  trackUserAction(action, category, properties = {}) {
    return this.trackEvent('user_action', {
      action,
      category,
      ...properties
    });
  }

  trackFeatureUsage(feature, action, properties = {}) {
    return this.trackEvent('feature_usage', {
      feature,
      action,
      ...properties
    });
  }

  trackPerformance(metric, value, properties = {}) {
    return this.trackEvent('performance_metric', {
      metric,
      value,
      ...properties
    });
  }

  trackError(error, context = {}) {
    return this.trackEvent('error', {
      message: error.message,
      stack: error.stack,
      context
    });
  }

  trackConversion(type, value, properties = {}) {
    return this.trackEvent('conversion', {
      type,
      value,
      ...properties
    });
  }

  identify(userId, traits = {}) {
    return this.trackEvent('identify', {
      userId,
      traits
    });
  }

  flush() {
    if (this.events.length === 0) return;

    const eventsToSend = [...this.events];
    this.events = [];

    try {
      localStorage.setItem(
        'analytics-events',
        JSON.stringify(eventsToSend)
      );
    } catch (e) {
      console.warn('Failed to save analytics events:', e);
    }
  }

  getEvents() {
    const saved = localStorage.getItem('analytics-events');
    return saved ? JSON.parse(saved) : [];
  }

  clearEvents() {
    this.events = [];
    localStorage.removeItem('analytics-events');
  }

  getSessionDuration() {
    if (!this.sessionStart) return 0;
    return Math.round((new Date() - this.sessionStart) / 1000);
  }

  getEventCount(eventName = null) {
    const allEvents = [...this.events, ...this.getEvents()];
    if (!eventName) return allEvents.length;
    return allEvents.filter(e => e.name === eventName).length;
  }
}

export const analytics = new Analytics({
  enabled: true,
  debug: import.meta.env.DEV
});

export function useAnalytics() {
  return {
    trackEvent: (name, props) => analytics.trackEvent(name, props),
    trackPageView: (page, props) => analytics.trackPageView(page, props),
    trackUserAction: (action, category, props) => analytics.trackUserAction(action, category, props),
    trackFeatureUsage: (feature, action, props) => analytics.trackFeatureUsage(feature, action, props),
    trackError: (error, context) => analytics.trackError(error, context),
    trackConversion: (type, value, props) => analytics.trackConversion(type, value, props),
    identify: (userId, traits) => analytics.identify(userId, traits)
  };
}
