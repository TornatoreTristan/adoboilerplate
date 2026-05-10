// Export de la classe de base
export { AppException } from './app_exception.js'

// Export de toutes les exceptions par domaine
export * from './domain_exceptions.js'

// Export des helpers
export { ExceptionHelpers, E } from './exception_helpers.js'

// Export des codes d'erreur
export { ERROR_CODES } from '#shared/constants/error_codes'
export type { ErrorCode } from '#shared/constants/error_codes'
