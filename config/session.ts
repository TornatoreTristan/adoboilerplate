import env from '#start/env'
import app from '@adonisjs/core/services/app'
import { defineConfig, stores } from '@adonisjs/session'

const sessionConfig = defineConfig({
  enabled: true,
  cookieName: 'adonis-session',

  /**
   * When set to true, the session id cookie will be deleted
   * once the user closes the browser.
   */
  clearWithBrowser: false,

  /**
   * Define how long to keep the session data alive without
   * any activity.
   */
  age: '24h',

  /**
   * Configuration for session cookie and the
   * cookie store
   */
  cookie: {
    path: '/',
    httpOnly: true,
    secure: app.inProduction,
    /**
     * 'lax' et non 'strict' : les callbacks OAuth (Google) arrivent via une
     * redirection cross-site depuis accounts.google.com. En 'strict', Chrome
     * refuse d'envoyer le cookie de session sur toute la chaîne de redirection,
     * l'utilisateur est authentifié côté serveur mais renvoyé sur /login.
     * 'lax' n'autorise que les navigations GET de premier niveau : les POST
     * cross-site restent sans cookie, la protection CSRF est conservée.
     */
    sameSite: 'lax',
  },

  /**
   * The store to use. Make sure to validate the environment
   * variable in order to infer the store name without any
   * errors.
   */
  store: env.get('SESSION_DRIVER'),

  /**
   * List of configured stores. Refer documentation to see
   * list of available stores and their config.
   */
  stores: {
    cookie: stores.cookie(),
    redis: stores.redis({
      connection: 'main',
    }),
  },
})

export default sessionConfig
