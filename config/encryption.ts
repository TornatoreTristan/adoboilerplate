import env from '#start/env'
import { defineConfig, drivers } from '@adonisjs/core/encryption'

/**
 * Encryption configuration
 *
 * The "legacy" driver mirrors the AdonisJS v6 encryption behavior — same
 * algorithm, same APP_KEY-derived secret. We use it during the v6→v7
 * migration to ensure existing encrypted data (signed cookies, signed URLs)
 * remains decryptable without rotation.
 *
 * Once stable, additional drivers can be added (aes256gcm, chacha20…) and
 * keys rotated by promoting a non-legacy driver as the new default.
 */
export default defineConfig({
  default: 'legacy',
  list: {
    legacy: drivers.legacy({
      keys: [env.get('APP_KEY')],
    }),
  },
})
