import { test } from '@japa/runner'
import testUtils from '@adonisjs/core/services/test_utils'
import { render } from '@react-email/render'
import { getService } from '#shared/container/container'
import { TYPES } from '#shared/container/types'
import type EmailService from '#mailing/services/email_service'

test.group('Email templates - i18n translations', (group) => {
  group.each.setup(() => testUtils.db().withGlobalTransaction())

  test('welcome template EN: rendered HTML contains "Welcome" not "Bienvenue"', async ({
    assert,
  }) => {
    const emailService = getService<EmailService>(TYPES.EmailService)
    const { default: WelcomeEmail } = await import('../../../../inertia/emails/welcome_email.js')

    const translations = emailService.buildWelcomeTranslations('en', { userName: 'Alice' })
    const html = await render(WelcomeEmail({ translations, loginUrl: 'https://example.com/login' }))

    assert.include(html, 'Welcome')
    assert.notInclude(html, 'Bienvenue')
  })

  test('welcome template FR: rendered HTML contains "Bienvenue" not "Welcome Alice"', async ({
    assert,
  }) => {
    const emailService = getService<EmailService>(TYPES.EmailService)
    const { default: WelcomeEmail } = await import('../../../../inertia/emails/welcome_email.js')

    const translations = emailService.buildWelcomeTranslations('fr', { userName: 'Alice' })
    const html = await render(WelcomeEmail({ translations, loginUrl: 'https://example.com/login' }))

    assert.include(html, 'Bienvenue')
    assert.notInclude(html, 'Welcome Alice')
  })
})
