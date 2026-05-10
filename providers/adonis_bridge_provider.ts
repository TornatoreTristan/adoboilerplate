import type { ApplicationService } from '@adonisjs/core/types'
import { serviceContainer } from '#shared/container/container'
import { TYPES } from '#shared/container/types'

import AdminService from '#admin/services/admin_service'
import UserRepository from '#users/repositories/user_repository'
import UserService from '#users/services/user_service'
import AuditLogService from '#audit/services/audit_log_service'
import SubscriptionService from '#billing/services/subscription_service'
import StripeConnectService from '#integrations/services/stripe_connect_service'

/**
 * Bridges the Inversify container with the AdonisJS (fold) container.
 *
 * AdonisJS resolves controllers via its own fold container using constructor
 * type reflection (emitDecoratorMetadata). By registering each service class
 * here as a singleton that delegates to Inversify, controllers decorated with
 * @inject() from @adonisjs/fold can receive their dependencies through the
 * constructor without calling getService() inside methods.
 *
 * Only the services consumed by the 6 admin controllers migrated in this POC
 * are registered here. Extend this list as more controllers are migrated.
 */
export default class AdonisBridgeProvider {
  constructor(protected app: ApplicationService) {}

  register() {
    this.app.container.singleton(AdminService, () =>
      serviceContainer.get<AdminService>(TYPES.AdminService)
    )

    this.app.container.singleton(UserRepository, () =>
      serviceContainer.get<UserRepository>(TYPES.UserRepository)
    )

    this.app.container.singleton(UserService, () =>
      serviceContainer.get<UserService>(TYPES.UserService)
    )

    this.app.container.singleton(AuditLogService, () =>
      serviceContainer.get<AuditLogService>(TYPES.AuditLogService)
    )

    this.app.container.singleton(SubscriptionService, () =>
      serviceContainer.get<SubscriptionService>(TYPES.SubscriptionService)
    )

    this.app.container.singleton(StripeConnectService, () =>
      serviceContainer.get<StripeConnectService>(TYPES.StripeConnectService)
    )
  }
}
