import { test } from '@japa/runner'
import GuestMiddleware from '#middleware/guest_middleware'

function buildCtx(userId: string | null) {
  let redirected: string | null = null
  return {
    redirected: () => redirected,
    ctx: {
      session: { get: (key: string) => (key === 'user_id' ? userId : null) },
      response: {
        redirect: (url: string) => {
          redirected = url
          return undefined
        },
      },
    },
  }
}

test.group('GuestMiddleware', () => {
  test('redirects authenticated users away from guest-only routes', async ({ assert }) => {
    const middleware = new GuestMiddleware()
    const harness = buildCtx('user-id-123')
    let nextCalled = false

    // eslint-disable-next-line @typescript-eslint/no-explicit-any — harness ctx
    await middleware.handle(harness.ctx as any, async () => {
      nextCalled = true
    })

    assert.isFalse(nextCalled, 'next() must NOT be called for authenticated users')
    assert.equal(harness.redirected(), '/')
  })

  test('lets unauthenticated users through', async ({ assert }) => {
    const middleware = new GuestMiddleware()
    const harness = buildCtx(null)
    let nextCalled = false

    // eslint-disable-next-line @typescript-eslint/no-explicit-any — harness ctx
    await middleware.handle(harness.ctx as any, async () => {
      nextCalled = true
    })

    assert.isTrue(nextCalled, 'next() must be called for unauthenticated users')
    assert.isNull(harness.redirected())
  })
})
