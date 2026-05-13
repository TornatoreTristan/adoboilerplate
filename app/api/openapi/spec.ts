import { ALL_API_SCOPES } from '#api/constants/api_scopes'

const scopesDescription: Record<string, string> = {
  'users:read': 'Read user data',
  'users:write': 'Modify user data',
  'organizations:read': 'Read organization data',
  'organizations:write': 'Modify organization data',
  'uploads:read': 'Read uploads',
  'uploads:write': 'Create or modify uploads',
  'notifications:read': 'Read notifications',
  'notifications:write': 'Create or update notifications',
}

const errorResponse = {
  type: 'object',
  required: ['code', 'message'],
  properties: {
    code: { type: 'string', example: 'API_TOKEN_INVALID' },
    message: { type: 'string', example: 'Token API invalide' },
    details: { type: 'object', additionalProperties: true, nullable: true },
  },
} as const

export const openApiSpec = {
  'openapi': '3.1.0',
  'info': {
    title: 'Adoboilerplate API',
    version: '1.0.0',
    description:
      'Public REST API. Authenticate with an API token generated from `/account/api-tokens`.',
  },
  'servers': [{ url: '/api/v1', description: 'API v1' }],
  'security': [{ bearerAuth: [] }],
  'tags': [{ name: 'Users', description: 'User account endpoints' }],
  'paths': {
    '/users/me': {
      get: {
        tags: ['Users'],
        summary: 'Get the authenticated user',
        operationId: 'getCurrentUser',
        security: [{ bearerAuth: ['users:read'] }],
        responses: {
          '200': {
            description: 'The authenticated user',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['data'],
                  properties: {
                    data: { $ref: '#/components/schemas/User' },
                  },
                },
              },
            },
          },
          '401': { $ref: '#/components/responses/Unauthorized' },
          '403': { $ref: '#/components/responses/Forbidden' },
          '429': { $ref: '#/components/responses/RateLimited' },
        },
      },
    },
  },
  'components': {
    securitySchemes: {
      bearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'opaque',
        description:
          'Use a token generated at `/account/api-tokens`. Token format: `adobp_live_<random>`.',
      },
    },
    schemas: {
      User: {
        type: 'object',
        required: ['id', 'email', 'fullName', 'createdAt'],
        properties: {
          id: { type: 'string', format: 'uuid' },
          email: { type: 'string', format: 'email' },
          fullName: { type: 'string', nullable: true },
          createdAt: { type: 'string', format: 'date-time' },
        },
      },
      Error: errorResponse,
    },
    responses: {
      Unauthorized: {
        description: 'Missing, invalid, expired or revoked API token.',
        content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } },
      },
      Forbidden: {
        description: 'The token lacks one of the required scopes.',
        content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } },
      },
      RateLimited: {
        description: 'Too many requests. Inspect the `Retry-After` header.',
        headers: {
          'Retry-After': {
            schema: { type: 'integer' },
            description: 'Seconds to wait before retrying.',
          },
          'X-RateLimit-Limit': { schema: { type: 'integer' } },
          'X-RateLimit-Remaining': { schema: { type: 'integer' } },
          'X-RateLimit-Reset': {
            schema: { type: 'integer' },
            description: 'Unix timestamp when the limit resets.',
          },
        },
        content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } },
      },
    },
  },
  'x-available-scopes': ALL_API_SCOPES.map((scope) => ({
    name: scope,
    description: scopesDescription[scope] ?? scope,
  })),
} as const

export type OpenApiSpec = typeof openApiSpec
