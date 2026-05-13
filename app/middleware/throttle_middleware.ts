import type { HttpContext } from '@adonisjs/core/http'
import type { NextFn } from '@adonisjs/core/types/http'
import RateLimitService from '#shared/services/rate_limit_service'
import type { RateLimitConfig } from '#shared/types/rate_limit'
import { E } from '#shared/exceptions/index'

export default class ThrottleMiddleware {
  private rateLimitService: RateLimitService

  constructor() {
    this.rateLimitService = new RateLimitService()
  }

  async handle(ctx: HttpContext, next: NextFn, options: RateLimitConfig) {
    const identifier = this.getIdentifier(ctx, options.strategy || 'ip')
    const config: RateLimitConfig = {
      maxRequests: options.maxRequests,
      windowMs: options.windowMs,
      keyPrefix: options.keyPrefix || ctx.request.url(),
      strategy: options.strategy || 'ip',
      skipSuccessfulRequests: options.skipSuccessfulRequests,
      skipFailedRequests: options.skipFailedRequests,
    }

    const result = await this.rateLimitService.checkLimit(identifier, config)

    ctx.response.header('X-RateLimit-Limit', result.total.toString())
    ctx.response.header('X-RateLimit-Remaining', result.remaining.toString())
    ctx.response.header('X-RateLimit-Reset', Math.floor(result.resetAt.getTime() / 1000).toString())

    if (!result.allowed) {
      const retryAfter = Math.ceil((result.resetAt.getTime() - Date.now()) / 1000)
      ctx.response.header('Retry-After', retryAfter.toString())

      E.tooManyRequests(`Too many requests. Please try again in ${retryAfter} seconds.`, retryAfter)
    }

    return next()
  }

  private getIdentifier(ctx: HttpContext, strategy: string): string {
    switch (strategy) {
      case 'token':
        return ctx.apiToken?.id || ctx.user?.id || this.getIpAddress(ctx)
      case 'user':
        return ctx.user?.id || this.getIpAddress(ctx)
      case 'global':
        return 'global'
      case 'ip':
      default:
        return this.getIpAddress(ctx)
    }
  }

  private getIpAddress(ctx: HttpContext): string {
    return ctx.request.ip() || 'unknown'
  }
}
