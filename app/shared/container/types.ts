/**
 * Types pour l'injection de dépendances
 * Utilisation d'un objet pour éviter les conflits de noms
 */
export const TYPES = {
  // Repositories
  UserRepository: Symbol.for('UserRepository'),
  OrganizationRepository: Symbol.for('OrganizationRepository'),
  SessionRepository: Symbol.for('SessionRepository'),
  PasswordResetRepository: Symbol.for('PasswordResetRepository'),
  EmailVerificationRepository: Symbol.for('EmailVerificationRepository'),
  NotificationRepository: Symbol.for('NotificationRepository'),
  UserNotificationPreferenceRepository: Symbol.for('UserNotificationPreferenceRepository'),
  UploadRepository: Symbol.for('UploadRepository'),
  RoleRepository: Symbol.for('RoleRepository'),
  PermissionRepository: Symbol.for('PermissionRepository'),
  EmailLogRepository: Symbol.for('EmailLogRepository'),
  IntegrationRepository: Symbol.for('IntegrationRepository'),
  PlanRepository: Symbol.for('PlanRepository'),
  SubscriptionRepository: Symbol.for('SubscriptionRepository'),
  OrganizationInvitationRepository: Symbol.for('OrganizationInvitationRepository'),
  AuditLogRepository: Symbol.for('AuditLogRepository'),
  AppSettingsRepository: Symbol.for('AppSettingsRepository'),

  // Services
  AuthService: Symbol.for('AuthService'),
  UserService: Symbol.for('UserService'),
  OrganizationService: Symbol.for('OrganizationService'),
  SessionService: Symbol.for('SessionService'),
  PasswordResetService: Symbol.for('PasswordResetService'),
  EmailVerificationService: Symbol.for('EmailVerificationService'),
  GoogleAuthService: Symbol.for('GoogleAuthService'),
  AccountLockoutService: Symbol.for('AccountLockoutService'),
  TwoFactorService: Symbol.for('TwoFactorService'),
  NotificationService: Symbol.for('NotificationService'),
  UserNotificationPreferenceService: Symbol.for('UserNotificationPreferenceService'),
  UploadService: Symbol.for('UploadService'),
  StorageService: Symbol.for('StorageService'),
  LocalStorageDriver: Symbol.for('LocalStorageDriver'),
  S3StorageDriver: Symbol.for('S3StorageDriver'),
  AntivirusService: Symbol.for('AntivirusService'),
  ImageOptimizationService: Symbol.for('ImageOptimizationService'),
  AuthorizationService: Symbol.for('AuthorizationService'),
  AdminService: Symbol.for('AdminService'),
  StripeConnectService: Symbol.for('StripeConnectService'),
  PlanService: Symbol.for('PlanService'),
  SubscriptionService: Symbol.for('SubscriptionService'),
  PricingCalculatorService: Symbol.for('PricingCalculatorService'),
  AppSettingsService: Symbol.for('AppSettingsService'),

  // Health Checks
  HealthService: Symbol.for('HealthService'),
  DatabaseHealthCheck: Symbol.for('DatabaseHealthCheck'),
  RedisHealthCheck: Symbol.for('RedisHealthCheck'),
  DiskHealthCheck: Symbol.for('DiskHealthCheck'),
  EmailHealthCheck: Symbol.for('EmailHealthCheck'),
  MetricsService: Symbol.for('MetricsService'),
  MonitoringService: Symbol.for('MonitoringService'),
  HealthHistoryService: Symbol.for('HealthHistoryService'),
  HealthHistoryRepository: Symbol.for('HealthHistoryRepository'),

  // Logs
  LogRepository: Symbol.for('LogRepository'),
  LogService: Symbol.for('LogService'),

  // GDPR
  GdprService: Symbol.for('GdprService'),

  // Audit
  AuditLogService: Symbol.for('AuditLogService'),

  // Monitoring
  SentryService: Symbol.for('SentryService'),

  // Infrastructure
  CacheService: Symbol.for('CacheService'),
  EventBus: Symbol.for('EventBus'),
  QueueService: Symbol.for('QueueService'),
  Logger: Symbol.for('Logger'),
  RateLimitService: Symbol.for('RateLimitService'),
  EmailService: Symbol.for('EmailService'),
  MailProvider: Symbol.for('MailProvider'),
  LocaleService: Symbol.for('LocaleService'),

  // Listeners
  NotificationListeners: Symbol.for('NotificationListeners'),
  AuditLogListeners: Symbol.for('AuditLogListeners'),

  // External services
  RedisClient: Symbol.for('RedisClient'),
} as const

export type ServiceType = keyof typeof TYPES
