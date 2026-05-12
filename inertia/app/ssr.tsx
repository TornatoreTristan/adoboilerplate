import '../css/app.css'
import ReactDOMServer from 'react-dom/server'
import { createInertiaApp } from '@inertiajs/react'
import type { Page } from '@inertiajs/core'
import { ThemeProvider } from '@/components/theme-provider'
import { AppWrapper } from '@/components/app-wrapper'

export default function render(page: Page) {
  return createInertiaApp({
    page,
    render: ReactDOMServer.renderToString,
    resolve: (name) => {
      const pages = import.meta.glob('../pages/**/*.tsx', { eager: true })
      return pages[`../pages/${name}.tsx`]
    },
    setup: ({ App, props }) => (
      <ThemeProvider defaultTheme="system" storageKey="app-theme">
        <AppWrapper>
          <App {...props} />
        </AppWrapper>
      </ThemeProvider>
    ),
  })
}
