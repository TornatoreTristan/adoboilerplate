import type Organization from '#organizations/models/organization'
import type User from '#users/models/user'
import type ApiToken from '#api/models/api_token'

declare module '@adonisjs/core/http' {
  export interface HttpContext {
    organization?: Organization
    user?: User
    apiToken?: ApiToken
  }
}
