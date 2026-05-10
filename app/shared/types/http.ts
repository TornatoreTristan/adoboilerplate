import type Organization from '#organizations/models/organization'
import type User from '#users/models/user'

declare module '@adonisjs/core/http' {
  export interface HttpContext {
    organization?: Organization
    user?: User
  }
}
