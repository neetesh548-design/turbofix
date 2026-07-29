/**
 * Format raw Supabase / PostgREST error messages into clean, user-friendly natural language messages.
 */
export function formatSupabaseError(err, contextMessage = 'Operation failed', companyQuota = null) {
  if (!err) return '';
  const message = typeof err === 'string' ? err : (err.message || String(err));
  const code = err?.code || '';

  // Check RLS violation (PostgreSQL 42501 or PostgREST RLS policy error message)
  if (message.includes('row-level security policy') || message.includes('row-level security') || code === '42501') {
    if (message.toLowerCase().includes('machines')) {
      const quotaStr = companyQuota ? ` (Quota limit: ${companyQuota} machines)` : '';
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
