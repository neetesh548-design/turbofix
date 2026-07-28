import { describe, expect, it } from 'vitest';
import { launcherCategories, visibleAppNavItems } from '../lib/navigation';

describe('app navigation', () => {
  it('uses one role-filtered source for shell and launcher navigation', () => {
    const operatorIds = visibleAppNavItems('operator').map((item) => item.id);
    expect(operatorIds).toContain('report');
    expect(operatorIds).toContain('machines');
    expect(operatorIds).not.toContain('settings');

    const launcherIds = launcherCategories('operator').flatMap((category) => category.apps.map((item) => item.id));
    expect(launcherIds).toEqual(operatorIds);
  });
});
