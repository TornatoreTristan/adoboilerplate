import type { HttpContext } from '@adonisjs/core/http'
import { E } from '#shared/exceptions/index'

export default class V1UsersController {
  async me({ user, response }: HttpContext) {
    E.assertUserExists(user)

    return response.json({
      data: {
        id: user.id,
        email: user.email,
        fullName: user.fullName,
        createdAt: user.createdAt.toISO(),
      },
    })
  }
}
