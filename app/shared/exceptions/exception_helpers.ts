import {
  AuthenticationException,
  AuthorizationException,
  UserNotFoundException,
  OrganizationNotFoundException,
  SessionNotFoundException,
  ResourceNotFoundException,
  InvalidCredentialsException,
  ValidationException,
  UserEmailAlreadyExistsException,
  UserNotMemberException,
  InsufficientRoleException,
  SessionNotOwnedException,
  RateLimitException,
  SubscriptionNotFoundException,
  SubscriptionNotSyncedException,
  UploadNotFoundException,
  VirusDetectedException,
  FileTooLargeException,
  InvalidMimeTypeException,
  UploadFailedException,
} from './domain_exceptions.js'
import type { ErrorDetails } from './app_exception.js'

/**
 * Collection d'helpers pour lancer facilement les exceptions courantes
 */
export class ExceptionHelpers {
  // =====================================================
  // AUTH HELPERS
  // =====================================================

  static unauthorized(message?: string, details?: ErrorDetails): never {
    throw new AuthenticationException(message, details)
  }

  static forbidden(action?: string, details?: ErrorDetails): never {
    throw new AuthorizationException(
      action ? `Vous n'avez pas les permissions pour ${action}` : undefined,
      details
    )
  }

  static invalidCredentials(message?: string, details?: ErrorDetails): never {
    throw new InvalidCredentialsException(message, details)
  }

  // =====================================================
  // RESOURCE HELPERS
  // =====================================================

  static notFound(resource: string, id?: string | number, details?: ErrorDetails): never {
    throw new ResourceNotFoundException(resource, id, details)
  }

  static userNotFound(id?: string | number, details?: ErrorDetails): never {
    throw new UserNotFoundException(
      id ? `Utilisateur avec l'ID ${id} introuvable` : undefined,
      details
    )
  }

  static organizationNotFound(id?: string | number, details?: ErrorDetails): never {
    throw new OrganizationNotFoundException(
      id ? `Organisation avec l'ID ${id} introuvable` : undefined,
      details
    )
  }

  static sessionNotFound(id?: string | number, details?: ErrorDetails): never {
    throw new SessionNotFoundException(
      id ? `Session avec l'ID ${id} introuvable` : undefined,
      details
    )
  }

  // =====================================================
  // VALIDATION HELPERS
  // =====================================================

  static validationError(message?: string, field?: string, details?: ErrorDetails): never {
    throw new ValidationException(message, details, field)
  }

  static fieldRequired(field: string, details?: ErrorDetails): never {
    throw new ValidationException(`Le champ ${field} est requis`, details, field)
  }

  static fieldInvalid(field: string, value?: any, details?: ErrorDetails): never {
    const message = `La valeur du champ ${field}${value ? ` (${value})` : ''} est invalide`
    throw new ValidationException(message, details, field)
  }

  static emailAlreadyExists(email?: string, details?: ErrorDetails): never {
    throw new UserEmailAlreadyExistsException(
      email ? `L'email ${email} est déjà utilisé` : undefined,
      details
    )
  }

  // =====================================================
  // ORGANIZATION HELPERS
  // =====================================================

  static userNotMember(organizationName?: string, details?: ErrorDetails): never {
    throw new UserNotMemberException(
      organizationName ? `Vous n'êtes pas membre de l'organisation ${organizationName}` : undefined,
      details
    )
  }

  static insufficientRole(requiredRole?: string, details?: ErrorDetails): never {
    throw new InsufficientRoleException(
      requiredRole ? `Rôle ${requiredRole} requis pour cette action` : undefined,
      details
    )
  }

  // =====================================================
  // SESSION HELPERS
  // =====================================================

  static sessionNotOwned(sessionId?: string | number, details?: ErrorDetails): never {
    throw new SessionNotOwnedException(
      sessionId ? `La session ${sessionId} ne vous appartient pas` : undefined,
      details
    )
  }

  // =====================================================
  // RATE LIMIT HELPERS
  // =====================================================

  static tooManyRequests(message?: string, retryAfter?: number): never {
    throw new RateLimitException(message, { retryAfter })
  }

  // =====================================================
  // UPLOAD HELPERS
  // =====================================================

  static uploadNotFound(id?: string | number, details?: ErrorDetails): never {
    throw new UploadNotFoundException(
      id ? `Fichier avec l'ID ${id} introuvable` : undefined,
      details
    )
  }

  static virusDetected(filename?: string, viruses?: string[], details?: ErrorDetails): never {
    const virusDetails = {
      ...details,
      viruses,
      filename,
    }
    throw new VirusDetectedException(
      filename
        ? `Virus détecté dans le fichier ${filename}${viruses && viruses.length > 0 ? `: ${viruses.join(', ')}` : ''}`
        : undefined,
      virusDetails
    )
  }

  static fileTooLarge(maxSize?: number, actualSize?: number, details?: ErrorDetails): never {
    throw new FileTooLargeException(
      maxSize
        ? `Fichier trop volumineux (max: ${maxSize} bytes${actualSize ? `, reçu: ${actualSize} bytes` : ''})`
        : undefined,
      details
    )
  }

  static invalidMimeType(
    mimeType?: string,
    allowedTypes?: string[],
    details?: ErrorDetails
  ): never {
    throw new InvalidMimeTypeException(
      mimeType
        ? `Type de fichier non autorisé: ${mimeType}${allowedTypes ? `. Types acceptés: ${allowedTypes.join(', ')}` : ''}`
        : undefined,
      details
    )
  }

  static uploadFailed(message?: string, details?: ErrorDetails): never {
    throw new UploadFailedException(message, details)
  }

  // =====================================================
  // SUBSCRIPTION HELPERS
  // =====================================================

  static subscriptionNotFound(id?: string | number, details?: ErrorDetails): never {
    throw new SubscriptionNotFoundException(
      id ? `Abonnement avec l'ID ${id} introuvable` : undefined,
      details
    )
  }

  static subscriptionNotSynced(details?: ErrorDetails): never {
    throw new SubscriptionNotSyncedException(undefined, details)
  }

  // =====================================================
  // GENERIC HELPERS
  // =====================================================

  static throwIf(condition: boolean, exceptionFactory: () => never): void {
    if (condition) {
      exceptionFactory()
    }
  }

  static throwUnless(condition: boolean, exceptionFactory: () => never): void {
    if (!condition) {
      exceptionFactory()
    }
  }

  // =====================================================
  // ASSERTION HELPERS
  // =====================================================

  static assertExists<T>(
    value: T | null | undefined,
    resource: string,
    id?: string | number
  ): asserts value is T {
    if (value === null || value === undefined) {
      this.notFound(resource, id)
    }
  }

  static assertUserExists<T extends { id: any }>(
    user: T | null | undefined,
    id?: string | number
  ): asserts user is T {
    if (user === null || user === undefined) {
      this.userNotFound(id)
    }
  }

  static assertOrganizationExists<T extends { id: any }>(
    org: T | null | undefined,
    id?: string | number
  ): asserts org is T {
    if (org === null || org === undefined) {
      this.organizationNotFound(id)
    }
  }

  static assertSessionExists<T extends { id: any }>(
    session: T | null | undefined,
    id?: string | number
  ): asserts session is T {
    if (session === null || session === undefined) {
      this.sessionNotFound(id)
    }
  }

  static assertUserIsMember(isMember: boolean, organizationName?: string): void {
    if (!isMember) {
      this.userNotMember(organizationName)
    }
  }

  static assertSessionOwnership(isOwner: boolean, sessionId?: string | number): void {
    if (!isOwner) {
      this.sessionNotOwned(sessionId)
    }
  }
}

// Export des helpers sous un nom plus court pour l'usage quotidien
// TS 5.9 requires assertion-function call targets (E.assertUserExists, ...)
// to be declared with an explicit type annotation.
export const E: typeof ExceptionHelpers = ExceptionHelpers
