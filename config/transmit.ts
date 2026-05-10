import { defineConfig } from '@adonisjs/transmit'

export default defineConfig({
  // Keep-alive ping every 30 seconds to prevent connection timeout
  pingInterval: '30s',

  // Transport null = en mémoire (fonctionne seulement dans le même processus)
  // Pour tester : utiliser l'endpoint POST /api/notifications/test au lieu de la commande ace
  transport: null,
})
