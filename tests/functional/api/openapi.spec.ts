import { test } from '@japa/runner'
import { ALL_API_SCOPES } from '#api/constants/api_scopes'

test.group('OpenAPI docs', () => {
  test('GET /api/v1/openapi.json returns a valid OpenAPI 3.1 spec', async ({ client, assert }) => {
    const response = await client.get('/api/v1/openapi.json')

    response.assertStatus(200)
    const body = response.body() as {
      'openapi': string
      'info': { title: string }
      'paths': Record<string, unknown>
      'components': { securitySchemes: Record<string, unknown> }
      'x-available-scopes': Array<{ name: string }>
    }

    assert.equal(body.openapi, '3.1.0')
    assert.exists(body.info.title)
    assert.property(body.paths, '/users/me')
    assert.property(body.components.securitySchemes, 'bearerAuth')

    const exposedScopeNames = body['x-available-scopes'].map((entry) => entry.name)
    assert.sameMembers(exposedScopeNames, [...ALL_API_SCOPES])
  })

  test('GET /api/docs returns HTML referencing the spec URL', async ({ client, assert }) => {
    const response = await client.get('/api/docs')

    response.assertStatus(200)
    assert.match(response.header('content-type') as string, /text\/html/)

    const html = response.text()
    assert.include(html, '/api/v1/openapi.json')
    assert.include(html, '@scalar/api-reference')
  })

  test('OpenAPI docs routes are publicly accessible (no auth required)', async ({ client }) => {
    // No Authorization header — these are intentionally public.
    const specResponse = await client.get('/api/v1/openapi.json')
    specResponse.assertStatus(200)

    const docsResponse = await client.get('/api/docs')
    docsResponse.assertStatus(200)
  })
})
