import { defineConfig } from '@adonisjs/inertia'

const inertiaConfig = defineConfig({
  /**
   * Path to the Edge view that will be used as the root view for Inertia responses
   */
  rootView: 'inertia_layout',

  /**
   * Shared data is now defined in app/middleware/inertia_middleware.ts
   * (BaseInertiaMiddleware.share override) — see Phase 4 of the v6→v7
   * migration plan in docs/migrations/adonisjs-7.md.
   */

  /**
   * Options for the server-side rendering
   */
  ssr: {
    enabled: true,
    entrypoint: 'inertia/app/ssr.tsx',
  },
})

export default inertiaConfig
