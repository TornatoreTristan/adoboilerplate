# Audit Logs

> Complete audit trail system for tracking all system activities and user actions for compliance and security

## 📋 Overview

The Audit Logs feature provides comprehensive tracking of all important system events and user actions. This is essential for:

- **GDPR Compliance** - Track who accessed/modified what data and when
- **Security Monitoring** - Detect suspicious activities and unauthorized access
- **Debugging** - Understand what happened before an incident
- **User Activity Analytics** - Analyze usage patterns
- **Accountability** - Know who performed which actions

## 🎯 Features

✅ **Automatic Event Tracking**

- All critical actions are automatically logged via event listeners
- No manual logging required for standard operations

✅ **Full-Text Search**

- PostgreSQL tsvector with GIN indexing
- Search across actions, resources, metadata, and IP addresses
- French language support with proper stemming

✅ **Advanced Filtering**

- Filter by user, organization, action, resource type, date range
- Pagination with offset/limit
- Statistics and aggregations

✅ **Immutable Logs**

- Append-only design (no updates or deletes)
- Audit logs cannot be tampered with

✅ **Admin Dashboard**

- View all audit logs with filters
- Real-time statistics
- Search functionality
- User and organization drill-down

## 🏗️ Architecture

### Database Schema

```sql
CREATE TABLE audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  organization_id UUID REFERENCES organizations(id) ON DELETE SET NULL,
  action VARCHAR(100) NOT NULL,           -- e.g., 'user.created', 'login.success'
  resource_type VARCHAR(50),              -- e.g., 'User', 'Organization'
  resource_id VARCHAR(255),
  ip_address VARCHAR(45),                 -- IPv6 compatible
  user_agent TEXT,
  metadata JSONB,                         -- Additional context
  created_at TIMESTAMPTZ NOT NULL,
  search_vector TSVECTOR                  -- Full-text search index
);
```

### Tracked Events

**Authentication:**

- `auth.login.success`
- `auth.login.failed`
- `auth.logout`
- `auth.password.reset.requested`
- `auth.password.reset.completed`
- `auth.password.changed`

**User Management:**

- `user.created`
- `user.updated`
- `user.deleted`
- `user.restored`
- `user.profile.updated`

**Organizations:**

- `organization.created`
- `organization.updated`
- `organization.deleted`
- `organization.member.added`
- `organization.member.removed`
- `organization.member.role.changed`

**Invitations:**

- `invitation.sent`
- `invitation.accepted`
- `invitation.rejected`

**Subscriptions:**

- `subscription.created`
- `subscription.updated`
- `subscription.cancelled`
- `subscription.paused`
- `subscription.resumed`

**GDPR:**

- `gdpr.data.export.requested`
- `gdpr.account.deletion.requested`
- `gdpr.account.deletion.cancelled`
- `gdpr.account.deleted.permanently`

**Uploads:**

- `upload.created`
- `upload.deleted`

## 💻 Usage

### Automatic Logging (via Events)

Most actions are automatically logged by the `AuditLogListeners`:

```typescript
// This will automatically create an audit log entry
await eventBus.emit('user:created', {
  createdBy: currentUserId,
  user: newUser,
})
```

### Manual Logging

For custom actions, use the `AuditLogService`:

```typescript
import { getService } from '#shared/container/container'
import { TYPES } from '#shared/container/types'
import { AuditAction } from '#audit/types/audit'
import type AuditLogService from '#audit/services/audit_log_service'

const auditLogService = getService<AuditLogService>(TYPES.AuditLogService)

// Simple log
await auditLogService.log({
  userId: user.id,
  action: 'custom.action.performed',
  resourceType: 'CustomResource',
  resourceId: '123',
  ipAddress: '127.0.0.1',
  metadata: {
    details: 'Additional context',
  },
})

// Log from HTTP context (automatically extracts IP, user agent, etc.)
await auditLogService.logFromContext(ctx, AuditAction.SETTINGS_UPDATED, {
  resourceType: 'Settings',
  resourceId: settingsId,
  metadata: {
    changes: { theme: 'dark' },
  },
})
```

### Querying Logs

```typescript
const auditLogService = getService<AuditLogService>(TYPES.AuditLogService)

// Get user's audit trail
const userLogs = await auditLogService.getUserLogs(userId, 100)

// Get organization audit trail
const orgLogs = await auditLogService.getOrganizationLogs(organizationId)

// Get logs for a specific resource
const resourceLogs = await auditLogService.getResourceLogs('User', userId)

// Full-text search
const results = await auditLogService.search('password reset')

// Advanced filtering
const { data, total, hasMore } = await auditLogService.findWithFilters({
  userId: 'user-123',
  organizationId: 'org-456',
  action: 'user.updated',
  startDate: new Date('2025-01-01'),
  endDate: new Date('2025-12-31'),
  search: 'email',
  limit: 50,
  offset: 0,
})

// Get statistics
const stats = await auditLogService.getStatistics({
  startDate: new Date('2025-01-01'),
  endDate: new Date('2025-12-31'),
})

console.log({
  totalLogs: stats.totalLogs,
  uniqueUsers: stats.uniqueUsers,
  topActions: stats.topActions, // [{ action: 'login.success', count: 1234 }, ...]
})
```

### Admin Dashboard

Access the audit logs dashboard at `/admin/audit-logs` (requires super-admin role).

Features:

- View all audit logs in a table with DataTable component
- Search across all fields with full-text search
- Filter by date range with DateRangeFilter
- View statistics (total logs, unique users, unique organizations, top actions)
- Color-coded badges for different action types
- Real-time date formatting (relative time)

### User Detail Page

Each user's audit trail is also visible on their detail page at `/admin/users/{userId}`.

Features:

- Last 50 audit logs for the user
- Same badge system and formatting as main dashboard
- "View all" button to see complete audit trail
- Integrated with Sessions section for comprehensive activity tracking

## 🔒 Security Best Practices

### 1. Immutable Logs

Audit logs are **append-only** and cannot be modified or deleted. This ensures the integrity of the audit trail.

### 2. Sensitive Data

Be careful about what you include in `metadata`:

```typescript
// ❌ BAD - Don't log passwords or tokens
await auditLogService.log({
  action: 'auth.password.changed',
  metadata: {
    oldPassword: 'secret123', // NEVER DO THIS!
    newPassword: 'secret456', // NEVER DO THIS!
  },
})

// ✅ GOOD - Only log non-sensitive context
await auditLogService.log({
  action: 'auth.password.changed',
  metadata: {
    method: 'reset_link', // OK
    ipAddress: '127.0.0.1', // OK
  },
})
```

### 3. Data Retention

Consider implementing a retention policy to automatically archive or delete old audit logs:

```typescript
// Example: Archive logs older than 2 years
const twoYearsAgo = DateTime.now().minus({ years: 2 })

await db.from('audit_logs').where('created_at', '<', twoYearsAgo.toJSDate()).delete()
```

## 🌍 Internationalization

The audit logs dashboard is fully internationalized with French and English support.

**Translations files:**

- `resources/lang/en/admin.json` - English translations
- `resources/lang/fr/admin.json` - French translations
- `resources/lang/en/common.json` - Common terms (system, times, none)
- `resources/lang/fr/common.json` - Common terms

**Frontend:**
The React components use the `useI18n()` hook:

```tsx
import { useI18n } from '@/hooks/use-i18n'

const { t, locale } = useI18n()

// Usage
<h1>{t('admin.audit_logs.title')}</h1>
<p>{t('admin.audit_logs.description')}</p>
```

**Available translations:**

- Dashboard title and description
- Statistics labels (total logs, unique users, etc.)
- Table headers (action, user, organization, resource, IP, date)
- Search placeholder
- Common terms (system, none, load more)

## 📊 Performance Considerations

### Indexes

The audit_logs table has the following indexes:

- `id` (PRIMARY KEY)
- `user_id` (for user queries)
- `organization_id` (for organization queries)
- `action` (for action filtering)
- `resource_type` (for resource queries)
- `search_vector` (GIN index for full-text search)

### Partitioning

For high-volume applications, consider partitioning the `audit_logs` table by date:

```sql
-- Example: Partition by month
CREATE TABLE audit_logs_2025_01 PARTITION OF audit_logs
  FOR VALUES FROM ('2025-01-01') TO ('2025-02-01');

CREATE TABLE audit_logs_2025_02 PARTITION OF audit_logs
  FOR VALUES FROM ('2025-02-01') TO ('2025-03-01');
```

### Asynchronous Logging

Audit logs are created synchronously by default. For high-throughput systems, consider using a queue:

```typescript
// Use Queue for async logging
await queueService.add('audit-log', {
  userId: user.id,
  action: 'user.created',
  // ...
})
```

## 🧪 Testing

Run audit log tests:

```bash
npm run test -- --grep "AuditLog"
```

Example tests:

```typescript
import { test } from '@japa/runner'
import AuditLogService from '#audit/services/audit_log_service'
import { AuditAction } from '#audit/types/audit'

test('should create audit log entry', async ({ assert }) => {
  const auditLogService = getService<AuditLogService>(TYPES.AuditLogService)

  const log = await auditLogService.log({
    userId: user.id,
    action: AuditAction.USER_CREATED,
    resourceType: 'User',
    resourceId: user.id,
  })

  assert.equal(log.action, AuditAction.USER_CREATED)
  assert.equal(log.userId, user.id)
})
```

## 📝 Adding New Actions

To track a new action:

1. **Add action constant** to `app/audit/types/audit.ts`:

```typescript
export const AuditAction = {
  // ... existing actions
  CUSTOM_ACTION: 'custom.action.performed',
} as const
```

2. **Emit event** where the action occurs:

```typescript
await eventBus.emit('custom:action:performed', {
  userId: user.id,
  resourceId: '123',
  metadata: { ... },
})
```

3. **Register listener** in `app/audit/listeners/audit_log_listeners.ts`:

```typescript
private registerListeners() {
  // ... existing listeners
  this.eventBus.on('custom:action:performed', this.handleCustomAction.bind(this))
}

private async handleCustomAction(data: any) {
  await this.auditLogService.log({
    userId: data.userId,
    action: AuditAction.CUSTOM_ACTION,
    resourceType: 'CustomResource',
    resourceId: data.resourceId,
    metadata: data.metadata,
  })
}
```

## 🚨 Troubleshooting

### Logs not appearing

Check that:

1. The `AuditLogListenersProvider` is registered in `adonisrc.ts`
2. Events are being emitted correctly
3. Database connection is working
4. No errors in server logs

### Slow queries

If queries are slow:

1. Verify indexes are created: `\d+ audit_logs` in psql
2. Use `EXPLAIN ANALYZE` to check query plans
3. Consider partitioning for large datasets
4. Reduce the search scope with filters

### Full-text search not working

1. Verify the search_vector column exists
2. Check that the trigger is active: `\df audit_logs_search_trigger`
3. Rebuild search vectors: `UPDATE audit_logs SET search_vector = ...`

## 📚 Related Documentation

- [GDPR Compliance](./gdpr-compliance.md)
- [Full-Text Search](./full-text-search.md)
- [Event System](../architecture/event-system.md)
- [Repository Pattern](../architecture/repository-pattern.md)

---

**✅ Audit logs are now fully integrated in your boilerplate!**

All critical actions are automatically tracked. You can view them in the admin dashboard at `/admin/audit-logs`. 🔍
