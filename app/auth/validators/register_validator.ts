import vine from '@vinejs/vine'

/**
 * Validator pour l'inscription d'un nouvel utilisateur
 */
export const registerValidator = vine.compile(
  vine.object({
    email: vine.string().email().normalizeEmail().trim(),
    password: vine.string().minLength(12).maxLength(128),
    confirmPassword: vine.string(),
    fullName: vine.string().trim().optional(),
  })
)

/**
 * Règle custom pour vérifier que les mots de passe correspondent
 */
vine.messagesProvider = new (class {
  getMessage() {
    return 'Les mots de passe ne correspondent pas'
  }
})()
