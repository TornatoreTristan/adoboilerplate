export interface AdminIntegrationDto {
  isActive: boolean
  publicKey: string
  hasSecretKey: boolean
  hasWebhookSecret: boolean
}

export class AdminIntegrationDtoPresenter {
  static presentStripe(integration: {
    isActive: boolean
    config: {
      publicKey?: string
      secretKey?: string
      webhookSecret?: string
    }
  }): AdminIntegrationDto {
    return {
      isActive: integration.isActive,
      publicKey: integration.config.publicKey ?? '',
      hasSecretKey: Boolean(integration.config.secretKey),
      hasWebhookSecret: Boolean(integration.config.webhookSecret),
    }
  }
}
