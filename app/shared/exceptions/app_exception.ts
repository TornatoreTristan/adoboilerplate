import { Exception } from '@adonisjs/core/exceptions'
import type { ErrorCode } from '#shared/constants/error_codes'
import app from '@adonisjs/core/services/app'

export interface ErrorDetails {
  [key: string]: unknown
}

export interface ErrorResponse {
  success: false
  error: {
    message: string
    code: ErrorCode
    details?: ErrorDetails
    field?: string
  }
}

/**
 * Exception de base pour toute l'application
 */
export abstract class AppException extends Exception {
  abstract readonly code: ErrorCode
  abstract readonly status: number

  protected details?: ErrorDetails
  protected field?: string

  constructor(message: string, details?: ErrorDetails, field?: string) {
    super(message)
    this.details = details
    this.field = field
  }

  /**
   * Détermine si cette exception doit être loggée
   * Les erreurs 5xx sont loggées, pas les 4xx (erreurs utilisateur)
   */
  shouldLog(): boolean {
    return this.status >= 500
  }

  /**
   * Détermine le niveau de log à utiliser
   */
  getLogLevel(): 'error' | 'warn' | 'info' {
    if (this.status >= 500) return 'error'
    if (this.status >= 400) return 'warn'
    return 'info'
  }

  /**
   * Formate l'exception en réponse JSON
   */
  toJSON(): ErrorResponse {
    const isDev = !app.inProduction

    const response: ErrorResponse = {
      success: false,
      error: {
        message: this.message,
        code: this.code,
      },
    }

    // Ajouter les détails si disponibles
    if (this.details) {
      response.error.details = this.details
    }

    // Ajouter le champ pour les erreurs de validation
    if (this.field) {
      response.error.field = this.field
    }

    // En développement, ajouter des infos supplémentaires
    if (isDev && this.status >= 500) {
      response.error.details = {
        ...response.error.details,
        stack: this.stack,
      }
    }

    return response
  }

  /**
   * Méthode pour ajouter des détails supplémentaires
   */
  withDetails(details: ErrorDetails): this {
    this.details = { ...this.details, ...details }
    return this
  }

  /**
   * Méthode pour spécifier un champ en erreur
   */
  withField(field: string): this {
    this.field = field
    return this
  }
}
