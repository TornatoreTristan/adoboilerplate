# Sentry Setup Guide

This boilerplate comes with **Sentry** pre-configured for production-ready error monitoring.

## 📋 Features

✅ **Backend Monitoring** (AdonisJS)

- Automatic exception capture
- Performance monitoring (APM)
- Profiling
- Request context tracking
- User identification
- Breadcrumbs

✅ **Frontend Monitoring** (React)

- React Error Boundary
- Automatic error capture
- Performance monitoring
- Session Replay
- Source maps support

## 🚀 Quick Start

### 1. Create a Sentry Account

1. Go to [sentry.io](https://sentry.io) and create a free account
2. Create a new project:
   - Platform: **Node.js** (for backend)
   - Platform: **React** (for frontend)
3. Copy your **DSN** (looks like `https://xxx@xxx.ingest.sentry.io/xxx`)

### 2. Configure Environment Variables

Add to your `.env` file:

```env
# Backend Sentry
SENTRY_DSN=https://your-dsn@sentry.io/project-id
SENTRY_ENABLED=true
SENTRY_ENVIRONMENT=production
SENTRY_TRACES_SAMPLE_RATE=0.1    # 10% of requests
SENTRY_PROFILES_SAMPLE_RATE=0.1  # 10% profiling

# Frontend Sentry (exposed to browser)
VITE_SENTRY_DSN=https://your-frontend-dsn@sentry.io/project-id
VITE_SENTRY_ENABLED=true
VITE_SENTRY_ENVIRONMENT=production
VITE_SENTRY_TRACES_SAMPLE_RATE=0.1
VITE_SENTRY_REPLAY_SESSION_RATE=0.1  # 10% session replay
```

**Important Notes:**

- Set `SENTRY_ENABLED=false` in development to disable
- Use **different DSNs** for backend and frontend (create 2 projects in Sentry)
- Sample rates control how many events are sent (lower = less quota used)

### 3. Deploy and Test

Once deployed, Sentry will automatically:

- Capture all unhandled exceptions
- Track performance metrics
- Record user sessions on errors
- Send email/Slack alerts

## 🎯 What Gets Captured

### Backend

✅ **All exceptions** (except filtered ones)

- Database errors
- API errors
- Uncaught exceptions

❌ **Filtered out** (not critical)

- Validation errors (VineJS)
- 404 errors
- User authentication failures

**Context included:**

```json
{
  "user": { "id": "123", "email": "user@example.com" },
  "request": {
    "method": "POST",
    "url": "/api/users",
    "headers": { "..." },
    "body": { "..." }
  },
  "route": "/api/users/:id",
  "environment": "production"
}
```

### Frontend

✅ **React errors**

- Component crashes
- Rendering errors
- Async errors

✅ **Network errors**

- Failed API calls (in production)

❌ **Filtered out**

- Browser extension errors
- Third-party script errors

**Fallback UI:**
When an error occurs, users see a friendly error page with:

- Error message
- "Try again" button
- Error ID (for support)

## 📊 Sentry Dashboard

After deploying, you'll see in Sentry:

```
⚠️ TypeError: Cannot read property 'id' of undefined
   at UserService.getProfile (user_service.ts:42)

👤 User: john@example.com
🌍 Environment: production
📍 Release: v1.2.3
📈 Occurrences: 127 times (last 24h)
🕐 First seen: 2 hours ago
```

## 🔔 Alerts

Sentry sends notifications for:

- New errors (never seen before)
- Regressions (errors that returned)
- Spike detection (sudden increase)

Configure alerts in: **Alerts > Create Alert Rule**

## 🎨 Advanced Usage

### Manual error capture (Backend)

```typescript
import { getService } from '#shared/container/container'
import { TYPES } from '#shared/container/types'
import type SentryService from '#monitoring/services/sentry_service'

const sentry = getService<SentryService>(TYPES.SentryService)

// Capture exception with context
try {
  await riskyOperation()
} catch (error) {
  sentry.captureException(error, {
    operation: 'payment',
    orderId: '123',
  })
}

// Capture message
sentry.captureMessage('Important event happened', 'info')

// Add breadcrumb
sentry.addBreadcrumb({
  message: 'User clicked export button',
  category: 'user-action',
  level: 'info',
})

// Set user context
sentry.setUser({
  id: user.id,
  email: user.email,
  username: user.fullName,
})
```

### Manual error capture (Frontend)

```tsx
import * as Sentry from '@sentry/react'

// Capture exception
try {
  riskyFunction()
} catch (error) {
  Sentry.captureException(error)
}

// Add breadcrumb
Sentry.addBreadcrumb({
  category: 'navigation',
  message: 'User navigated to /dashboard',
  level: 'info',
})

// Set user context
Sentry.setUser({
  id: user.id,
  email: user.email,
})
```

## 🏷️ Releases & Deployments

Track which version introduced an error:

```bash
# Install Sentry CLI
npm install -g @sentry/cli

# Set environment variables
export SENTRY_AUTH_TOKEN=your-auth-token
export SENTRY_ORG=your-org
export SENTRY_PROJECT=your-project

# Create release
sentry-cli releases new v1.2.3
sentry-cli releases files v1.2.3 upload-sourcemaps ./build
sentry-cli releases finalize v1.2.3

# Associate with deployment
sentry-cli releases deploys v1.2.3 new -e production
```

Or use GitHub Actions (see `.github/workflows/deploy.yml`)

## 📈 Performance Monitoring

### Backend (APM)

Sentry automatically tracks:

- Request duration
- Database query performance
- External API calls
- Memory usage

### Frontend (Web Vitals)

Automatically tracks:

- **LCP** (Largest Contentful Paint)
- **FID** (First Input Delay)
- **CLS** (Cumulative Layout Shift)
- Page load time
- API response time

## 💾 Session Replay

When an error occurs, Sentry records a video replay showing:

- User actions before the crash
- Network requests
- Console logs
- DOM changes

**Privacy:**

- All text is masked by default
- All media is blocked by default

## 🔧 Troubleshooting

### Sentry not capturing errors

1. Check `SENTRY_ENABLED=true` in `.env`
2. Check DSN is correct
3. Check errors in console: `[Sentry] ...`
4. Verify environment: Sentry only captures in production by default

### Too many events

Reduce sample rates:

```env
SENTRY_TRACES_SAMPLE_RATE=0.05  # 5% instead of 10%
VITE_SENTRY_REPLAY_SESSION_RATE=0.05
```

### Missing source maps (frontend)

Ensure Vite builds source maps in production:

```ts
// vite.config.ts
export default {
  build: {
    sourcemap: true, // Enable source maps
  },
}
```

## 📚 Resources

- [Sentry Docs](https://docs.sentry.io/)
- [Node.js Integration](https://docs.sentry.io/platforms/node/)
- [React Integration](https://docs.sentry.io/platforms/javascript/guides/react/)
- [Performance Monitoring](https://docs.sentry.io/product/performance/)
- [Session Replay](https://docs.sentry.io/product/session-replay/)

## 💰 Pricing

- **Free**: 5,000 errors/month, 10,000 performance events
- **Team**: $26/month for 50,000 errors
- **Business**: Custom pricing

For most apps, the free tier is sufficient to start!

---

**✅ Sentry is now fully integrated in your boilerplate!**

Just add your DSN and deploy. You'll get instant alerts when something breaks in production. 🚨
