import vine from '@vinejs/vine'

/**
 * Validator pour la demande de réinitialisation de mot de passe
 */
export const forgotPasswordValidator = vine.compile(
  vine.object({
    email: vine.string().email().normalizeEmail().trim(),
  })
)

/**
 * Validator pour la réinitialisation du mot de passe
 */
export const resetPasswordValidator = vine.compile(
  vine.object({
    token: vine.string().minLength(64).maxLength(64),
    password: vine.string().minLength(8).maxLength(255),
    passwordConfirmation: vine.string().sameAs('password'),
  })
)
