import vine from '@vinejs/vine'
import { ALL_API_SCOPES } from '#api/constants/api_scopes'

export const createApiTokenValidator = vine.compile(
  vine.object({
    name: vine.string().trim().minLength(2).maxLength(120),
    scopes: vine.array(vine.enum(ALL_API_SCOPES)).minLength(1),
    expiresAt: vine.date({ formats: ['iso8601'] }).optional(),
  })
)
