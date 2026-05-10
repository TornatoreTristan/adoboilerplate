import { type HttpContext } from '@adonisjs/core/http'
import i18nManager from '@adonisjs/i18n/services/main'

export default class LocaleController {
  async update({ request, response, session }: HttpContext) {
    const { locale } = request.only(['locale'])

    if (!locale || !i18nManager.supportedLocales().includes(locale)) {
      session.flash('errors', { locale: 'Invalid locale' })
      return response.redirect().back()
    }

    response.cookie('locale', locale, {
      maxAge: 31536000, // 1 year
      path: '/',
      httpOnly: false,
      sameSite: 'lax',
    })

    return response.redirect().back()
  }
}
