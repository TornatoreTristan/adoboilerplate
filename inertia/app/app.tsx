/// <reference path="../../adonisrc.ts" />
/// <reference path="../../config/inertia.ts" />

import '../css/app.css'
import { hydrateRoot } from 'react-dom/client'
import { createInertiaApp } from '@inertiajs/react'
import { resolvePageComponent } from '@adonisjs/inertia/helpers'
import { TuyauProvider } from '@adonisjs/inertia/react'
import { ThemeProvider } from '@/components/theme-provider'
import { AppWrapper } from '@/components/app-wrapper'
import { SentryErrorBoundary } from '@/components/sentry-error-boundary'
import { initSentry } from '@/lib/sentry'
import { tuyau } from '@/lib/tuyau'

// Initialize Sentry as early as possible
initSentry()

const appName = import.meta.env.VITE_APP_NAME || 'AdonisJS'

createInertiaApp({
  progress: { color: '#5468FF' },

  title: (title) => `${title} - ${appName}`,

  resolve: (name) => {
    return resolvePageComponent(`../pages/${name}.tsx`, import.meta.glob('../pages/**/*.tsx'))
  },

  setup({ el, App, props }) {
    hydrateRoot(
      el,
      <SentryErrorBoundary>
        <TuyauProvider client={tuyau}>
          <ThemeProvider defaultTheme="system" storageKey="app-theme">
            <AppWrapper>
              <App {...props} />
            </AppWrapper>
          </ThemeProvider>
        </TuyauProvider>
      </SentryErrorBoundary>
    )
  },
})
