import 'reflect-metadata'
import { Container } from 'inversify'
import { Redis as IoRedis } from 'ioredis'
import logger from '@adonisjs/core/services/logger'
import app from '@adonisjs/core/services/app'
import env from '#start/env'
import { TYPES } from './types.js'

// Services
import CacheService from '#shared/services/cache_service'
import EventBusService from '#shared/services/event_bus_service'
import QueueService from '#shared/services/queue_service'
import RateLimitService from '#shared/services/rate_limit_service'
import EmailService from '#mailing/services/email_service'
import type { MailProvider } from '#mailing/providers/mail_provider'
import SmtpMailProvider from '#mailing/providers/smtp_provider'
import LogMailProvider from '#mailing/providers/log_provider'
import LocaleService from '#shared/services/locale_service'

// Repositories
import UserRepository from '#users/repositories/user_repository'
import OrganizationRepository from '#organizations/repositories/organization_repository'
import SessionRepository from '#sessions/repositories/session_repository'
import PasswordResetRepository from '#auth/repositories/password_reset_repository'
import EmailVerificationRepository from '#auth/repositories/email_verification_repository'
import NotificationRepository from '#notifications/repositories/notification_repository'
import UserNotificationPreferenceRepository from '#notifications/repositories/user_notification_preference_repository'
import UploadRepository from '#uploads/repositories/upload_repository'
import RoleRepository from '#roles/repositories/role_repository'
import PermissionRepository from '#roles/repositories/permission_repository'
import EmailLogRepository from '#mailing/repositories/email_log_repository'
import IntegrationRepository from '#integrations/repositories/integration_repository'
import PlanRepository from '#billing/repositories/plan_repository'
import SubscriptionRepository from '#billing/repositories/subscription_repository'
import OrganizationInvitationRepository from '#organizations/repositories/organization_invitation_repository'

// Upload Services
import StorageService from '#uploads/services/storage_service'
import LocalStorageDriver from '#uploads/services/storage/local_storage_driver'
import S3StorageDriver from '#uploads/services/storage/s3_storage_driver'
import UploadService from '#uploads/services/upload_service'
import AntivirusService from '#uploads/services/antivirus_service'
import ImageOptimizationService from '#uploads/services/image_optimization_service'

// Domain Services
import AuthService from '#auth/services/auth_service'
import PasswordResetService from '#auth/services/password_reset_service'
import UserService from '#users/services/user_service'
import OrganizationService from '#organizations/services/organization_service'
import SessionService from '#sessions/services/session_service'
import GoogleAuthService from '#auth/services/google_auth_service'
import EmailVerificationService from '#auth/services/email_verification_service'
import NotificationService from '#notifications/services/notification_service'
import UserNotificationPreferenceService from '#notifications/services/user_notification_preference_service'
import AuthorizationService from '#roles/services/authorization_service'
import AdminService from '#admin/services/admin_service'
import StripeConnectService from '#integrations/services/stripe_connect_service'
import PlanService from '#billing/services/plan_service'
import SubscriptionService from '#billing/services/subscription_service'
import PricingCalculatorService from '#billing/services/pricing_calculator_service'

// Listeners
import NotificationListeners from '#notifications/listeners/notification_listeners'
import AuditLogListeners from '#audit/listeners/audit_log_listeners'

// Health Checks
import HealthService from '#health/services/health_service'
import DatabaseHealthCheck from '#health/services/health_checks/database_health_check'
import RedisHealthCheck from '#health/services/health_checks/redis_health_check'
import DiskHealthCheck from '#health/services/health_checks/disk_health_check'
import EmailHealthCheck from '#health/services/health_checks/email_health_check'
import MetricsService from '#health/services/metrics_service'
import MonitoringService from '#health/services/monitoring_service'
import HealthHistoryService from '#health/services/health_history_service'
import HealthHistoryRepository from '#health/repositories/health_history_repository'

// Logs
import LogRepository from '#logs/repositories/log_repository'
import LogService from '#logs/services/log_service'

// GDPR
import GdprService from '#gdpr/services/gdpr_service'

// Audit
import AuditLogRepository from '#audit/repositories/audit_log_repository'
import AuditLogService from '#audit/services/audit_log_service'

// App Settings
import AppSettingsRepository from '#app_settings/repositories/app_settings_repository'
import AppSettingsService from '#app_settings/services/app_settings_service'

// Monitoring
import SentryService from '#monitoring/services/sentry_service'

// Create container
const container = new Container()

/**
 * Configuration du container IoC
 */
export function configureContainer(): Container {
  // ==========================================
  // INFRASTRUCTURE
  // ==========================================

  // Redis client
  container
    .bind<IoRedis>(TYPES.RedisClient)
    .toDynamicValue(() => {
      const redisConfig = {
        host: env.get('REDIS_HOST'),
        port: env.get('REDIS_PORT'),
        password: env.get('REDIS_PASSWORD') || undefined,
        db: 0,
        retryDelayOnFailover: 100,
        enableReadyCheck: false,
        maxRetriesPerRequest: null,
      }

      return new IoRedis(redisConfig)
    })
    .inSingletonScope()

  // Logger
  container.bind(TYPES.Logger).toConstantValue(logger)

  // Cache Service
  container.bind<CacheService>(TYPES.CacheService).to(CacheService).inSingletonScope()

  // Queue Service
  container.bind<QueueService>(TYPES.QueueService).to(QueueService).inSingletonScope()

  // Event Bus (depends on QueueService)
  container.bind<EventBusService>(TYPES.EventBus).to(EventBusService).inSingletonScope()

  // Rate Limit Service
  container.bind<RateLimitService>(TYPES.RateLimitService).to(RateLimitService).inSingletonScope()

  // Mail Provider (driver-based, swappable via MAIL_DRIVER env)
  const mailDriver = env.get('MAIL_DRIVER')
  if (mailDriver === 'log') {
    container.bind<MailProvider>(TYPES.MailProvider).to(LogMailProvider).inSingletonScope()
  } else {
    container.bind<MailProvider>(TYPES.MailProvider).to(SmtpMailProvider).inSingletonScope()
  }

  // Email Service
  container.bind<EmailService>(TYPES.EmailService).to(EmailService).inSingletonScope()

  // Locale Service
  container.bind<LocaleService>(TYPES.LocaleService).to(LocaleService).inSingletonScope()

  // ==========================================
  // HEALTH CHECKS & MONITORING
  // ==========================================

  container.bind<HealthHistoryRepository>(TYPES.HealthHistoryRepository).to(HealthHistoryRepository)
  container
    .bind<DatabaseHealthCheck>(TYPES.DatabaseHealthCheck)
    .to(DatabaseHealthCheck)
    .inSingletonScope()
  container.bind<RedisHealthCheck>(TYPES.RedisHealthCheck).to(RedisHealthCheck).inSingletonScope()
  container.bind<DiskHealthCheck>(TYPES.DiskHealthCheck).to(DiskHealthCheck).inSingletonScope()
  container.bind<EmailHealthCheck>(TYPES.EmailHealthCheck).to(EmailHealthCheck).inSingletonScope()
  container.bind<HealthService>(TYPES.HealthService).to(HealthService).inSingletonScope()
  container.bind<MetricsService>(TYPES.MetricsService).to(MetricsService).inSingletonScope()
  container.bind<HealthHistoryService>(TYPES.HealthHistoryService).to(HealthHistoryService)
  container
    .bind<MonitoringService>(TYPES.MonitoringService)
    .to(MonitoringService)
    .inSingletonScope()

  // ==========================================
  // LOGS
  // ==========================================

  container.bind<LogRepository>(TYPES.LogRepository).to(LogRepository)
  container.bind<LogService>(TYPES.LogService).to(LogService)

  // ==========================================
  // GDPR
  // ==========================================

  container.bind<GdprService>(TYPES.GdprService).to(GdprService)

  // ==========================================
  // AUDIT
  // ==========================================

  container.bind<AuditLogRepository>(TYPES.AuditLogRepository).to(AuditLogRepository)
  container.bind<AuditLogService>(TYPES.AuditLogService).to(AuditLogService)

  // ==========================================
  // APP SETTINGS
  // ==========================================

  container.bind<AppSettingsRepository>(TYPES.AppSettingsRepository).to(AppSettingsRepository)
  container.bind<AppSettingsService>(TYPES.AppSettingsService).to(AppSettingsService)

  // ==========================================
  // MONITORING
  // ==========================================

  container.bind<SentryService>(TYPES.SentryService).to(SentryService).inSingletonScope()

  // ==========================================
  // LISTENERS
  // ==========================================

  container
    .bind<NotificationListeners>(TYPES.NotificationListeners)
    .to(NotificationListeners)
    .inSingletonScope()
  container
    .bind<AuditLogListeners>(TYPES.AuditLogListeners)
    .to(AuditLogListeners)
    .inSingletonScope()

  // ==========================================
  // REPOSITORIES
  // ==========================================

  container.bind(TYPES.UserRepository).to(UserRepository)
  container.bind(TYPES.OrganizationRepository).to(OrganizationRepository)
  container.bind(TYPES.SessionRepository).to(SessionRepository)
  container.bind(TYPES.PasswordResetRepository).to(PasswordResetRepository)
  container.bind(TYPES.EmailVerificationRepository).to(EmailVerificationRepository)
  container.bind(TYPES.NotificationRepository).to(NotificationRepository)
  container
    .bind(TYPES.UserNotificationPreferenceRepository)
    .to(UserNotificationPreferenceRepository)
  container.bind(TYPES.UploadRepository).to(UploadRepository)
  container.bind(TYPES.RoleRepository).to(RoleRepository)
  container.bind(TYPES.PermissionRepository).to(PermissionRepository)
  container.bind(TYPES.EmailLogRepository).to(EmailLogRepository)
  container.bind(TYPES.IntegrationRepository).to(IntegrationRepository)
  container.bind(TYPES.PlanRepository).to(PlanRepository)
  container.bind(TYPES.SubscriptionRepository).to(SubscriptionRepository)
  container.bind(TYPES.OrganizationInvitationRepository).to(OrganizationInvitationRepository)

  // ==========================================
  // DOMAIN SERVICES
  // ==========================================

  container.bind<AuthService>(TYPES.AuthService).to(AuthService)
  container.bind<PasswordResetService>(TYPES.PasswordResetService).to(PasswordResetService)
  container.bind<UserService>(TYPES.UserService).to(UserService)
  container.bind<OrganizationService>(TYPES.OrganizationService).to(OrganizationService)
  container.bind<SessionService>(TYPES.SessionService).to(SessionService)
  container.bind<GoogleAuthService>(TYPES.GoogleAuthService).to(GoogleAuthService)
  container
    .bind<EmailVerificationService>(TYPES.EmailVerificationService)
    .to(EmailVerificationService)
  container.bind<NotificationService>(TYPES.NotificationService).to(NotificationService)
  container
    .bind<UserNotificationPreferenceService>(TYPES.UserNotificationPreferenceService)
    .to(UserNotificationPreferenceService)
  container.bind<AuthorizationService>(TYPES.AuthorizationService).to(AuthorizationService)
  container.bind<AdminService>(TYPES.AdminService).to(AdminService)
  container.bind<StripeConnectService>(TYPES.StripeConnectService).to(StripeConnectService)
  container.bind<PlanService>(TYPES.PlanService).to(PlanService)
  container.bind<SubscriptionService>(TYPES.SubscriptionService).to(SubscriptionService)
  container
    .bind<PricingCalculatorService>(TYPES.PricingCalculatorService)
    .to(PricingCalculatorService)

  // ==========================================
  // UPLOAD SERVICES
  // ==========================================

  container
    .bind<LocalStorageDriver>(TYPES.LocalStorageDriver)
    .to(LocalStorageDriver)
    .inSingletonScope()
  container.bind<S3StorageDriver>(TYPES.S3StorageDriver).to(S3StorageDriver).inSingletonScope()
  container.bind<StorageService>(TYPES.StorageService).to(StorageService).inSingletonScope()
  container.bind<UploadService>(TYPES.UploadService).to(UploadService)

  // Upload Security Services
  container.bind(TYPES.AntivirusService).to(AntivirusService).inSingletonScope()
  container.bind(TYPES.ImageOptimizationService).to(ImageOptimizationService).inSingletonScope()

  return container
}

// Export du container configuré
export const serviceContainer = configureContainer()

// Helper pour récupérer un service
export function getService<T>(serviceIdentifier: symbol): T {
  return serviceContainer.get<T>(serviceIdentifier)
}

// Helper pour checker si l'app est en test
export function isTestEnvironment(): boolean {
  return app.inTest
}
