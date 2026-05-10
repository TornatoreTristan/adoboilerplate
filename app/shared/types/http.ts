import Organization from '#organizations/models/organization'
import User from '#users/models/user'

declare module '@adonisjs/core/http' {
  export interface HttpContext {
    organization?: Organization
    user?: User
  }
}
