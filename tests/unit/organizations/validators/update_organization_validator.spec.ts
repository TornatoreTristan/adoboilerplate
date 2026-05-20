import { test } from '@japa/runner'
import { updateOrganizationValidator } from '#organizations/validators/update_organization_validator'

test.group('updateOrganizationValidator', () => {
  test('accepts the minimal required payload (name only)', async ({ assert }) => {
    const data = await updateOrganizationValidator.validate({
      name: 'Acme Inc.',
    })

    assert.equal(data.name, 'Acme Inc.')
  })

  test('normalizes email and accepts optional contact fields', async ({ assert }) => {
    const data = await updateOrganizationValidator.validate({
      name: 'Acme',
      email: 'Contact@ACME.com',
      phone: '+33 1 23 45 67 89',
      siret: '12345678901234',
      vatNumber: 'FR12345678901',
      address: '1 rue de la Paix',
      website: 'https://acme.example.com',
    })

    assert.equal(data.email, 'contact@acme.com')
    assert.equal(data.website, 'https://acme.example.com')
  })

  test('accepts French + English descriptions for i18n content', async ({ assert }) => {
    const data = await updateOrganizationValidator.validate({
      name: 'Acme',
      description: 'Une organisation de test.',
      descriptionEn: 'A test organization.',
    })

    assert.equal(data.description, 'Une organisation de test.')
    assert.equal(data.descriptionEn, 'A test organization.')
  })

  test('rejects a name shorter than 2 characters', async ({ assert }) => {
    await assert.rejects(() => updateOrganizationValidator.validate({ name: 'A' }))
  })

  test('rejects an invalid email', async ({ assert }) => {
    await assert.rejects(() =>
      updateOrganizationValidator.validate({
        name: 'Acme',
        email: 'not-an-email',
      })
    )
  })

  test('rejects an invalid website URL', async ({ assert }) => {
    await assert.rejects(() =>
      updateOrganizationValidator.validate({
        name: 'Acme',
        website: 'not a url',
      })
    )
  })

  test('rejects a SIRET longer than 14 characters', async ({ assert }) => {
    await assert.rejects(() =>
      updateOrganizationValidator.validate({
        name: 'Acme',
        siret: '123456789012345',
      })
    )
  })

  test('rejects a description longer than 1000 characters', async ({ assert }) => {
    await assert.rejects(() =>
      updateOrganizationValidator.validate({
        name: 'Acme',
        description: 'x'.repeat(1001),
      })
    )
  })
})
