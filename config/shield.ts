import { defineConfig } from '@adonisjs/shield'

const shieldConfig = defineConfig({
  /**
   * Configure CSP policies for your app. Refer documentation
   * to learn more
   */
  csp: {
    enabled: true,
    directives: {
      defaultSrc: [`'self'`],
      scriptSrc: [`'self'`, `'@nonce'`],
      styleSrc: [`'self'`, `'unsafe-inline'`, 'https://fonts.bunny.net'],
      imgSrc: [`'self'`, 'data:', 'https:'],
      fontSrc: [`'self'`, 'data:', 'https://fonts.bunny.net'],
      connectSrc: [
        `'self'`,
        ...(process.env.NODE_ENV === 'development' ? ['ws://localhost:*', 'ws://127.0.0.1:*'] : []),
      ],
      frameAncestors: [`'none'`],
    },
    reportOnly: false,
  },

  /**
   * Configure CSRF protection options. Refer documentation
   * to learn more
   */
  csrf: {
    enabled: true,
    exceptRoutes: (ctx) => {
      const url = ctx.request.url()
      return (
        url.startsWith('/api/') ||
        url === '/password/forgot' ||
        url === '/password/reset' ||
        url.startsWith('/password/reset/') ||
        url.startsWith('/auth/email/') ||
        url === '/webhooks/stripe' ||
        url === '/locale'
      )
    },
    enableXsrfCookie: true,
    methods: ['POST', 'PUT', 'PATCH', 'DELETE'],
  },

  /**
   * Control how your website should be embedded inside
   * iFrames
   */
  xFrame: {
    enabled: true,
    action: 'DENY',
  },

  /**
   * Force browser to always use HTTPS
   */
  hsts: {
    enabled: true,
    maxAge: '365 days',
    includeSubDomains: true,
  },

  /**
   * Disable browsers from sniffing the content type of a
   * response and always rely on the "content-type" header.
   */
  contentTypeSniffing: {
    enabled: true,
  },
})

export default shieldConfig
