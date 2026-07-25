/**
 * Feature Flag System for Gradual Rollouts
 *
 * Enables controlled deployment of features (e.g., refactored Machines page)
 * with easy rollback and A/B testing capabilities.
 *
 * Usage:
 *   const isEnabled = isFeatureFlagEnabled('use_refactored_machines');
 *   if (isEnabled) {
 *     return <MachinesRefactored />;
 *   } else {
 *     return <Machines />;
 *   }
 */

export type FeatureFlag = 'use_refactored_machines' | 'use_refactored_dashboard';

export interface FlagConfig {
  enabledForRoles?: string[];      // e.g., ['owner', 'supervisor']
  enabledForEmails?: string[];     // e.g., ['user@example.com']
  rolloutPercentage?: number;      // 0-100, based on user ID hash
  forceEnabled?: boolean;          // Force on for all users
  forceDisabled?: boolean;         // Force off for all users
  description?: string;
}

/**
 * Feature flag configurations
 * Update these values to control rollout behavior
 */
const FLAGS: Record<FeatureFlag, FlagConfig> = {
  use_refactored_machines: {
    enabledForRoles: [],
    enabledForEmails: [],
    rolloutPercentage: 0, // Start at 0%, increase gradually
    forceEnabled: false,
    forceDisabled: false,
    description: 'New Machines page with improved UX',
  },
  use_refactored_dashboard: {
    enabledForRoles: [],
    enabledForEmails: [],
    rolloutPercentage: 0,
    forceEnabled: false,
    forceDisabled: false,
    description: 'Refactored Dashboard with new layout',
  },
};

/**
 * Get current user from localStorage
 */
function getCurrentUser(): { role?: string; email?: string; user_id?: string } | null {
  try {
    const userJson = localStorage.getItem('tf_user');
    return userJson ? JSON.parse(userJson) : null;
  } catch {
    return null;
  }
}

/**
 * Hash a user ID to a percentage (0-100)
 * Consistent: same user always gets same hash
 */
function getUserPercentage(userId: string): number {
  if (!userId) return Math.random() * 100;

  // Sum ASCII values for consistent hashing
  const hash = Array.from(userId).reduce((sum, char) => {
    return sum + char.charCodeAt(0);
  }, 0);

  return (hash % 100) + 1; // Returns 1-100
}

/**
 * Check if a feature flag is enabled for current user
 *
 * Priority (highest to lowest):
 * 1. Force enabled/disabled
 * 2. Manual override in localStorage
 * 3. Role-based access
 * 4. Email-based access
 * 5. Percentage rollout
 */
export function isFeatureFlagEnabled(flag: FeatureFlag): boolean {
  const config = FLAGS[flag];
  if (!config) return false;

  // 1. Check for manual override first (dev/testing)
  const override = localStorage.getItem(`ff_override_${flag}`);
  if (override === 'true') return true;
  if (override === 'false') return false;

  // 2. Force overrides
  if (config.forceEnabled) return true;
  if (config.forceDisabled) return false;

  const user = getCurrentUser();
  if (!user) return false;

  // 3. Role-based access
  if (config.enabledForRoles && config.enabledForRoles.length > 0) {
    if (user.role && config.enabledForRoles.includes(user.role)) {
      return true;
    }
  }

  // 4. Email-based access (for specific users)
  if (config.enabledForEmails && config.enabledForEmails.length > 0) {
    if (user.email && config.enabledForEmails.includes(user.email)) {
      return true;
    }
  }

  // 5. Percentage-based rollout
  if (config.rolloutPercentage && config.rolloutPercentage > 0) {
    const userId = user.user_id || user.email || 'anonymous';
    const userPercentage = getUserPercentage(userId);
    return userPercentage <= config.rolloutPercentage;
  }

  return false;
}

/**
 * Get current configuration for a flag
 */
export function getFeatureFlagConfig(flag: FeatureFlag): FlagConfig {
  return { ...FLAGS[flag] };
}

/**
 * Update feature flag configuration
 * NOTE: Changes are in-memory only. For persistence, update the FLAGS object above.
 */
export function setFeatureFlagConfig(flag: FeatureFlag, updates: Partial<FlagConfig>) {
  if (!FLAGS[flag]) return;
  FLAGS[flag] = { ...FLAGS[flag], ...updates };

  // Log change for debugging
  console.log(`[FeatureFlag] Updated ${flag}:`, FLAGS[flag]);
}

/**
 * Manually override a flag for testing (stored in localStorage)
 * Useful for QA/testing specific paths
 */
export function setFeatureFlagOverride(flag: FeatureFlag, enabled: boolean | null) {
  if (enabled === null) {
    localStorage.removeItem(`ff_override_${flag}`);
    console.log(`[FeatureFlag] Cleared override for ${flag}`);
  } else {
    localStorage.setItem(`ff_override_${flag}`, enabled ? 'true' : 'false');
    console.log(`[FeatureFlag] Set override for ${flag}: ${enabled}`);
  }
}

/**
 * Get manual override status (if any)
 */
export function getFeatureFlagOverride(flag: FeatureFlag): boolean | null {
  const override = localStorage.getItem(`ff_override_${flag}`);
  if (override === 'true') return true;
  if (override === 'false') return false;
  return null;
}

/**
 * Get all flags status
 * Useful for debugging UI
 */
export function getAllFeatureFlags(): Record<FeatureFlag, boolean> {
  return Object.keys(FLAGS).reduce((acc, flag) => {
    acc[flag as FeatureFlag] = isFeatureFlagEnabled(flag as FeatureFlag);
    return acc;
  }, {} as Record<FeatureFlag, boolean>);
}

/**
 * Log all feature flags to console for debugging
 */
export function logFeatureFlagsDebug() {
  console.group('[FeatureFlags Debug]');
  const user = getCurrentUser();
  console.log('Current User:', user);

  Object.entries(FLAGS).forEach(([flag, config]) => {
    const enabled = isFeatureFlagEnabled(flag as FeatureFlag);
    const override = getFeatureFlagOverride(flag as FeatureFlag);
    const userPercentage = user?.user_id ? getUserPercentage(user.user_id) : 'N/A';

    console.group(flag);
    console.log('Enabled:', enabled);
    console.log('Override:', override);
    console.log('Config:', config);
    console.log('User Percentage:', userPercentage);
    console.groupEnd();
  });

  console.groupEnd();
}

/**
 * Metrics tracking for A/B testing
 */
export interface MetricEvent {
  timestamp: Date;
  flag: FeatureFlag;
  enabled: boolean;
  event: string; // 'page_load', 'action_completed', 'error'
  duration?: number; // ms
  userId?: string;
  metadata?: Record<string, any>;
}

const metrics: MetricEvent[] = [];

/**
 * Record a metric event for A/B testing
 */
export function recordMetric(event: Omit<MetricEvent, 'timestamp'>) {
  const metric: MetricEvent = {
    timestamp: new Date(),
    userId: getCurrentUser()?.user_id,
    ...event,
  };

  metrics.push(metric);

  // Store in localStorage (keep last 100)
  const stored = JSON.parse(localStorage.getItem('tf_metrics') || '[]');
  stored.push(metric);
  localStorage.setItem('tf_metrics', JSON.stringify(stored.slice(-100)));
}

/**
 * Get metrics summary for a specific flag
 */
export function getMetricsSummary(flag: FeatureFlag): {
  totalEvents: number;
  avgDuration?: number;
  errorCount: number;
  lastEvent?: Date;
} {
  const all = [...metrics, ...JSON.parse(localStorage.getItem('tf_metrics') || '[]')];
  const relevant = all.filter((m: MetricEvent) => m.flag === flag);

  return {
    totalEvents: relevant.length,
    avgDuration: relevant.length > 0
      ? relevant.reduce((sum: number, m: MetricEvent) => sum + (m.duration || 0), 0) / relevant.length
      : undefined,
    errorCount: relevant.filter((m: MetricEvent) => m.event === 'error').length,
    lastEvent: relevant.length > 0 ? new Date(relevant[relevant.length - 1].timestamp) : undefined,
  };
}

export default {
  isFeatureFlagEnabled,
  getFeatureFlagConfig,
  setFeatureFlagConfig,
  setFeatureFlagOverride,
  getFeatureFlagOverride,
  getAllFeatureFlags,
  logFeatureFlagsDebug,
  recordMetric,
  getMetricsSummary,
};
