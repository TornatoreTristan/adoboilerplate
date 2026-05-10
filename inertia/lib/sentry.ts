import * as Sentry from '@sentry/react'

export function initSentry() {
  // Only initialize in production or if explicitly enabled
  const dsn = import.meta.env.VITE_SENTRY_DSN
  const enabled = import.meta.env.VITE_SENTRY_ENABLED === 'true'

  if (!enabled || !dsn) {
    console.warn('[Sentry] Client-side monitoring disabled')
    return
  }

  Sentry.init({
    dsn,
    environment: import.meta.env.VITE_SENTRY_ENVIRONMENT || import.meta.env.MODE || 'development',

    // Performance Monitoring
    integrations: [
      Sentry.browserTracingIntegration(),
      Sentry.replayIntegration({
        maskAllText: true,
        blockAllMedia: true,
      }),
    ],

    // Performance monitoring sample rate
    tracesSampleRate: Number.parseFloat(import.meta.env.VITE_SENTRY_TRACES_SAMPLE_RATE || '0.1'),

    // Session Replay sample rate
    replaysSessionSampleRate: Number.parseFloat(
      import.meta.env.VITE_SENTRY_REPLAY_SESSION_RATE || '0.1'
    ),
    replaysOnErrorSampleRate: 1.0, // 100% of sessions with errors

    // Filter out certain errors
    beforeSend(event, hint) {
      // Don't send validation errors
      if (event.exception?.values?.[0]?.type === 'ValidationError') {
        return null
      }

      // Don't send network errors from development
      if (import.meta.env.DEV && event.exception?.values?.[0]?.type === 'NetworkError') {
        return null
      }

      return event
    },

    // Ignore certain errors
    ignoreErrors: [
      // Browser extensions
      'top.GLOBALS',
      // Random plugins/extensions
      'originalCreateNotification',
      'canvas.contentDocument',
      'MyApp_RemoveAllHighlights',
      // See: http://blog.errorception.com/2012/03/tale-of-unfindable-js-error.html
      "Can't find variable: ZiteReader",
      'jigsaw is not defined',
      'ComboSearch is not defined',
      // Facebook borked
      'fb_xd_fragment',
      // ISP injected ads
      'bmi_SafeAddOnload',
      'EBCallBackMessageReceived',
      // Chrome extensions
      'chrome-extension://',
      // See: https://blog.sentry.io/2020/01/15/the-case-of-the-mysterious-dead-clicks
      'Non-Error promise rejection captured',
    ],
  })

  console.warn(
    `[Sentry] Client initialized for environment: ${import.meta.env.VITE_SENTRY_ENVIRONMENT || import.meta.env.MODE}`
  )
}

export function setSentryUser(user: { id: string; email: string; username?: string } | null) {
  if (user) {
    Sentry.setUser({
      id: user.id,
      email: user.email,
      username: user.username,
    })
  } else {
    Sentry.setUser(null)
  }
}
