/**
 * Format raw Supabase / PostgREST error messages into clean, user-friendly natural language messages.
 */
export function formatSupabaseError(err, contextMessage = 'Operation failed', quotaInfo = null) {
  if (!err) return '';
  const message = typeof err === 'string' ? err : (err.message || String(err));
  const code = err?.code || '';

  // Check RLS violation (PostgreSQL 42501 or PostgREST RLS policy error message)
  if (message.includes('row-level security policy') || message.includes('row-level security') || code === '42501') {
    if (message.toLowerCase().includes('machines')) {
      // quotaInfo is a plain number for backward compatibility (just the
      // quota, no current count) — in that shape we can't rule out quota as
      // the cause, so keep the quota message. Only when the caller passes
      // {current, quota} AND we can see current is still under quota do we
      // know for certain this RLS rejection has nothing to do with quota —
      // it's almost always the account's company_id/auth link being broken
      // (e.g. auth.uid() not matching any public.users row), and telling
      // someone to "upgrade their plan" for that wastes everyone's time.
      const current = quotaInfo && typeof quotaInfo === 'object' ? quotaInfo.current : null;
      const quota = quotaInfo && typeof quotaInfo === 'object' ? quotaInfo.quota : quotaInfo;
      const definitelyNotQuota = current != null && quota != null && current < quota;
      if (definitelyNotQuota) {
        return `Permission Denied: Your account isn't authorized to add machines for this company (this is below your ${quota}-machine quota, so it isn't a quota issue). This usually means the account's company link is broken — contact TurboFix support with this message so it can be corrected.`;
      }
      const quotaStr = quota ? ` (Quota limit: ${quota} machines)` : '';
      return `Machine Limit Reached: You are trying to onboard more machines than approved for your company plan${quotaStr}. Please contact your platform administrator to upgrade your plan.`;
    }
    return `Permission Denied: Your account role does not have permission to perform this action. Please contact your workspace administrator.`;
  }

  // Check unique constraint violation
  if (code === '23505' || message.includes('violates unique constraint') || message.includes('already exists')) {
    return `Duplicate Entry: A record with this code or name already exists in your workspace.`;
  }

  // Check foreign key constraint violation
  if (code === '23503' || message.includes('violates foreign key constraint')) {
    return `Invalid Reference: The referenced machine, user, or factory could not be found.`;
  }

  return message || contextMessage;
}
