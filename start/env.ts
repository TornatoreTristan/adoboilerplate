/*
|--------------------------------------------------------------------------
| Environment variables service
|--------------------------------------------------------------------------
|
| The `Env.create` method creates an instance of the Env service. The
| service validates the environment variables and also cast values
| to JavaScript data types.
|
*/

import { Env } from '@adonisjs/core/env'

export default await Env.create(new URL('../', import.meta.url), {
  NODE_ENV: Env.schema.enum(['development', 'production', 'test'] as const),
  PORT: Env.schema.number(),
  APP_KEY: Env.schema.string(),
  HOST: Env.schema.string({ format: 'host' }),
  LOG_LEVEL: Env.schema.string(),

  /*
  |----------------------------------------------------------
  | Variables for configuring session package
  |----------------------------------------------------------
  */
  SESSION_DRIVER: Env.schema.enum(['cookie', 'memory', 'redis'] as const),

  /*
  |----------------------------------------------------------
  | Variables for configuring database connection
  |----------------------------------------------------------
  */
  DB_HOST: Env.schema.string({ format: 'host' }),
  DB_PORT: Env.schema.number(),
  DB_USER: Env.schema.string(),
  DB_PASSWORD: Env.schema.string.optional(),
  DB_DATABASE: Env.schema.string(),

  TEST_DB_HOST: Env.schema.string({ format: 'host' }),
  TEST_DB_PORT: Env.schema.number(),
  TEST_DB_USER: Env.schema.string(),
  TEST_DB_PASSWORD: Env.schema.string.optional(),
  TEST_DB_DATABASE: Env.schema.string(),

  REDIS_HOST: Env.schema.string({ format: 'host' }),
  REDIS_PORT: Env.schema.number(),
  REDIS_PASSWORD: Env.schema.string.optional(),

  /*
  |----------------------------------------------------------
  | Variables for configuring ally package
  |----------------------------------------------------------
  */
  GOOGLE_CLIENT_ID: Env.schema.string(),
  GOOGLE_CLIENT_SECRET: Env.schema.string(),

  /*
  |----------------------------------------------------------
  | Variables for configuring the app
  |----------------------------------------------------------
  */
  APP_URL: Env.schema.string(),

  /*
  |----------------------------------------------------------
  | Variables for configuring email
  |----------------------------------------------------------
  | Provider-agnostic: SMTP works with Scaleway TEM, Mailgun,
  | SendGrid, Postmark, Brevo, etc. Switch to `log` driver in
  | development/test to capture mails without sending.
  */
  MAIL_DRIVER: Env.schema.enum(['smtp', 'log'] as const),
  MAIL_SMTP_HOST: Env.schema.string.optionalWhen(process.env.MAIL_DRIVER !== 'smtp'),
  MAIL_SMTP_PORT: Env.schema.number.optionalWhen(process.env.MAIL_DRIVER !== 'smtp'),
  MAIL_SMTP_SECURE: Env.schema.boolean.optionalWhen(process.env.MAIL_DRIVER !== 'smtp'),
  MAIL_SMTP_USER: Env.schema.string.optionalWhen(process.env.MAIL_DRIVER !== 'smtp'),
  MAIL_SMTP_PASSWORD: Env.schema.string.optionalWhen(process.env.MAIL_DRIVER !== 'smtp'),
  EMAIL_FROM_ADDRESS: Env.schema.string(),
  EMAIL_FROM_NAME: Env.schema.string(),

  /*
  |----------------------------------------------------------
  | Variables for configuring file uploads
  |----------------------------------------------------------
  */
  UPLOADS_DISK: Env.schema.enum(['local', 's3'] as const),
  UPLOADS_MAX_SIZE: Env.schema.number(),
  UPLOADS_ALLOWED_MIMES: Env.schema.string(),

  /*
  |----------------------------------------------------------
  | Variables for ClamAV antivirus scanning
  |----------------------------------------------------------
  */
  CLAMAV_ENABLED: Env.schema.string.optional(),
  CLAMAV_SOCKET: Env.schema.string.optional(),
  CLAMAV_HOST: Env.schema.string.optional(),
  CLAMAV_PORT: Env.schema.string.optional(),
  // When true, an init failure or scan error rejects the upload instead of
  // letting it through (fail-closed). Recommended in production.
  CLAMAV_REQUIRED: Env.schema.string.optional(),

  /*
  |----------------------------------------------------------
  | Password policy
  |----------------------------------------------------------
  */
  // Set to 'false' to skip the HIBP pwned-passwords range API at registration
  // / reset. Local complexity rules still apply.
  PWNED_PASSWORD_CHECK_ENABLED: Env.schema.string.optional(),

  /*
  |----------------------------------------------------------
  | Variables for image optimization
  |----------------------------------------------------------
  */
  IMAGE_MAX_WIDTH: Env.schema.string.optional(),
  IMAGE_MAX_HEIGHT: Env.schema.string.optional(),
  IMAGE_QUALITY: Env.schema.string.optional(),
  IMAGE_CONVERT_TO_WEBP: Env.schema.string.optional(),
  IMAGE_STRIP_METADATA: Env.schema.string.optional(),

  AWS_ACCESS_KEY_ID: Env.schema.string.optional(),
  AWS_SECRET_ACCESS_KEY: Env.schema.string.optional(),
  AWS_REGION: Env.schema.string.optional(),
  AWS_BUCKET: Env.schema.string.optional(),
  AWS_ENDPOINT: Env.schema.string.optional(),

  /*
  |----------------------------------------------------------
  | Variables for configuring Stripe Connect
  |----------------------------------------------------------
  */
  STRIPE_CONNECT_CLIENT_ID: Env.schema.string(),
  STRIPE_CONNECT_CLIENT_SECRET: Env.schema.string(),
  STRIPE_CONNECT_REDIRECT_URI: Env.schema.string(),

  /*
  |----------------------------------------------------------
  | Variables for Stripe Application (Niveau A)
  |----------------------------------------------------------
  */
  STRIPE_SECRET_KEY: Env.schema.string(),
  STRIPE_PUBLIC_KEY: Env.schema.string(),
  STRIPE_WEBHOOK_SECRET: Env.schema.string(),

  /*
  |----------------------------------------------------------
  | Variables for configuring Sentry error monitoring
  |----------------------------------------------------------
  | All optional: Sentry is disabled when SENTRY_ENABLED is absent/false.
  */
  SENTRY_DSN: Env.schema.string.optional(),
  SENTRY_ENABLED: Env.schema.string.optional(),
  SENTRY_ENVIRONMENT: Env.schema.string.optional(),
  SENTRY_TRACES_SAMPLE_RATE: Env.schema.string.optional(),
  SENTRY_PROFILES_SAMPLE_RATE: Env.schema.string.optional(),

  /*
  |----------------------------------------------------------
  | Variables for configuring CORS
  |----------------------------------------------------------
  | Comma-separated list of allowed origins.
  | Example: https://app.example.com,https://admin.example.com
  | If not set: permissive in development, restrictive in production.
  */
  CORS_ALLOWED_ORIGINS: Env.schema.string.optional(),

  /*
  |----------------------------------------------------------
  | Variables for protecting /health/ready endpoint
  |----------------------------------------------------------
  | If set, the /health/ready endpoint requires:
  |   Authorization: Bearer <HEALTH_CHECK_TOKEN>
  | If not set, /health/ready returns a minimal response.
  */
  HEALTH_CHECK_TOKEN: Env.schema.string.optional(),
})
