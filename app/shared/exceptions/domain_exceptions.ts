import { AppException, type ErrorDetails } from './app_exception.js'
import { ERROR_CODES } from '#shared/constants/error_codes'

// =====================================================
// EXCEPTIONS D'AUTHENTIFICATION
// =====================================================

export class AuthenticationException extends AppException {
  readonly code = ERROR_CODES.AUTH_FAILED
  readonly status = 401

  constructor(message = 'Authentification échouée', details?: ErrorDetails) {
    super(message, details)
  }
}

export class AuthorizationException extends AppException {
  readonly code = ERROR_CODES.AUTH_INSUFFICIENT_PERMISSIONS
  readonly status = 403

  constructor(message = 'Permissions insuffisantes', details?: ErrorDetails) {
    super(message, details)
  }
}

export class TokenExpiredException extends AppException {
  readonly code = ERROR_CODES.AUTH_TOKEN_EXPIRED
  readonly status = 401

  constructor(message = 'Token expiré', details?: ErrorDetails) {
    super(message, details)
  }
}

export class TokenInvalidException extends AppException {
  readonly code = ERROR_CODES.AUTH_TOKEN_INVALID
  readonly status = 401

  constructor(message = 'Token invalide', details?: ErrorDetails) {
    super(message, details)
  }
}

// =====================================================
// EXCEPTIONS UTILISATEURS
// =====================================================

export class UserNotFoundException extends AppException {
  readonly code = ERROR_CODES.USER_NOT_FOUND
  readonly status = 404

  constructor(message = 'Utilisateur introuvable', details?: ErrorDetails) {
    super(message, details)
  }
}

export class UserEmailAlreadyExistsException extends AppException {
  readonly code = ERROR_CODES.USER_EMAIL_ALREADY_EXISTS
  readonly status = 409

  constructor(message = 'Cet email est déjà utilisé', details?: ErrorDetails) {
    super(message, details)
  }
}

export class InvalidCredentialsException extends AppException {
  readonly code = ERROR_CODES.USER_INVALID_CREDENTIALS
  readonly status = 401

  constructor(message = 'Email ou mot de passe incorrect', details?: ErrorDetails) {
    super(message, details)
  }
}

// =====================================================
// EXCEPTIONS ORGANISATIONS
// =====================================================

export class OrganizationNotFoundException extends AppException {
  readonly code = ERROR_CODES.ORG_NOT_FOUND
  readonly status = 404

  constructor(message = 'Organisation introuvable', details?: ErrorDetails) {
    super(message, details)
  }
}

export class UserNotMemberException extends AppException {
  readonly code = ERROR_CODES.ORG_USER_NOT_MEMBER
  readonly status = 403

  constructor(message = "Vous n'êtes pas membre de cette organisation", details?: ErrorDetails) {
    super(message, details)
  }
}

export class InsufficientRoleException extends AppException {
  readonly code = ERROR_CODES.ORG_INSUFFICIENT_ROLE
  readonly status = 403

  constructor(message = 'Rôle insuffisant pour cette action', details?: ErrorDetails) {
    super(message, details)
  }
}

// =====================================================
// EXCEPTIONS SESSIONS
// =====================================================

export class SessionNotFoundException extends AppException {
  readonly code = ERROR_CODES.SESSION_NOT_FOUND
  readonly status = 404

  constructor(message = 'Session introuvable', details?: ErrorDetails) {
    super(message, details)
  }
}

export class SessionNotOwnedException extends AppException {
  readonly code = ERROR_CODES.SESSION_NOT_OWNED
  readonly status = 403

  constructor(message = 'Cette session ne vous appartient pas', details?: ErrorDetails) {
    super(message, details)
  }
}

// =====================================================
// EXCEPTIONS DE VALIDATION
// =====================================================

export class ValidationException extends AppException {
  readonly code = ERROR_CODES.VALIDATION_ERROR
  readonly status = 422

  constructor(message = 'Données de validation invalides', details?: ErrorDetails, field?: string) {
    super(message, details, field)
  }

  /**
   * Créer une ValidationException depuis des erreurs VineJS
   */
  static fromVineErrors(errors: any[]): ValidationException {
    const fieldErrors = errors.reduce((acc, error) => {
      acc[error.field] = error.message
      return acc
    }, {})

    return new ValidationException('Erreurs de validation', {
      fields: fieldErrors,
    })
  }
}

// =====================================================
// EXCEPTIONS GÉNÉRIQUES
// =====================================================

export class ResourceNotFoundException extends AppException {
  readonly code = ERROR_CODES.USER_NOT_FOUND // On utilise un code générique
  readonly status = 404

  constructor(resource: string, id?: string | number, details?: ErrorDetails) {
    const message = `${resource}${id ? ` avec l'ID ${id}` : ''} introuvable`
    super(message, details)
  }
}

export class ForbiddenException extends AppException {
  readonly code = ERROR_CODES.AUTH_INSUFFICIENT_PERMISSIONS
  readonly status = 403

  constructor(action?: string, details?: ErrorDetails) {
    const message = `Vous n'avez pas les permissions${action ? ` pour ${action}` : ''}`
    super(message, details)
  }
}

export class InternalServerException extends AppException {
  readonly code = ERROR_CODES.INTERNAL_ERROR
  readonly status = 500

  constructor(message = 'Une erreur interne est survenue', details?: ErrorDetails) {
    super(message, details)
  }
}

export class RateLimitException extends AppException {
  readonly code = ERROR_CODES.RATE_LIMIT_EXCEEDED
  readonly status = 429

  constructor(message = 'Trop de requêtes, veuillez réessayer plus tard', details?: ErrorDetails) {
    super(message, details)
  }
}

// =====================================================
// EXCEPTIONS ABONNEMENTS (BILLING)
// =====================================================

export class SubscriptionNotFoundException extends AppException {
  readonly code = ERROR_CODES.USER_NOT_FOUND
  readonly status = 404

  constructor(message = 'Abonnement introuvable', details?: ErrorDetails) {
    super(message, details)
  }
}

export class SubscriptionNotSyncedException extends AppException {
  readonly code = ERROR_CODES.INTERNAL_ERROR
  readonly status = 500

  constructor(message = "L'abonnement n'est pas synchronisé avec Stripe", details?: ErrorDetails) {
    super(message, details)
  }
}

// =====================================================
// EXCEPTIONS UPLOADS
// =====================================================

export class UploadNotFoundException extends AppException {
  readonly code = ERROR_CODES.UPLOAD_NOT_FOUND
  readonly status = 404

  constructor(message = 'Fichier introuvable', details?: ErrorDetails) {
    super(message, details)
  }
}

export class VirusDetectedException extends AppException {
  readonly code = ERROR_CODES.UPLOAD_VIRUS_DETECTED
  readonly status = 422

  constructor(message = 'Virus détecté dans le fichier', details?: ErrorDetails) {
    super(message, details)
  }
}

export class FileTooLargeException extends AppException {
  readonly code = ERROR_CODES.UPLOAD_FILE_TOO_LARGE
  readonly status = 413

  constructor(message = 'Fichier trop volumineux', details?: ErrorDetails) {
    super(message, details)
  }
}

export class InvalidMimeTypeException extends AppException {
  readonly code = ERROR_CODES.UPLOAD_INVALID_MIME_TYPE
  readonly status = 422

  constructor(message = 'Type de fichier non autorisé', details?: ErrorDetails) {
    super(message, details)
  }
}

export class UploadFailedException extends AppException {
  readonly code = ERROR_CODES.UPLOAD_FAILED
  readonly status = 500

  constructor(message = "Échec de l'upload du fichier", details?: ErrorDetails) {
    super(message, details)
  }
}
