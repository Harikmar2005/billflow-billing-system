export interface AnalyticsEvent {
  id: string;
  eventName: string;
  category: 'navigation' | 'invoice' | 'payment' | 'inventory' | 'export' | 'compliance';
  details?: Record<string, any>;
  timestamp: string;
}

export interface AnalyticsSummary {
  totalPageViews: number;
  invoicesGenerated: number;
  paymentsLogged: number;
  reportsExported: number;
  complianceChecks: number;
  recentEvents: AnalyticsEvent[];
}

const STORAGE_KEY = 'billflow_analytics_events';

export const analytics = {
  track(
    eventName: string,
    category: AnalyticsEvent['category'] = 'navigation',
    details?: Record<string, any>
  ) {
    try {
      const existing: AnalyticsEvent[] = JSON.parse(
        localStorage.getItem(STORAGE_KEY) || '[]'
      );
      const newEvent: AnalyticsEvent = {
        id: `evt-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
        eventName,
        category,
        details,
        timestamp: new Date().toISOString(),
      };
      // Keep up to 200 events
      const updated = [newEvent, ...existing].slice(0, 200);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    } catch {
      // Ignore localStorage errors (e.g. private browsing storage restrictions)
    }
  },

  getSummary(): AnalyticsSummary {
    try {
      const events: AnalyticsEvent[] = JSON.parse(
        localStorage.getItem(STORAGE_KEY) || '[]'
      );
      return {
        totalPageViews: events.filter((e) => e.category === 'navigation').length,
        invoicesGenerated: events.filter((e) => e.eventName.includes('Invoice Created')).length,
        paymentsLogged: events.filter((e) => e.category === 'payment').length,
        reportsExported: events.filter((e) => e.category === 'export').length,
        complianceChecks: events.filter((e) => e.category === 'compliance').length,
        recentEvents: events.slice(0, 30),
      };
    } catch {
      return {
        totalPageViews: 0,
        invoicesGenerated: 0,
        paymentsLogged: 0,
        reportsExported: 0,
        complianceChecks: 0,
        recentEvents: [],
      };
    }
  },

  clear() {
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {
      // Ignore
    }
  },
};
