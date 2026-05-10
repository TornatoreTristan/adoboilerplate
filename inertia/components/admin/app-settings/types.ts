export interface Upload {
  id: string
  filename: string
  url: string
}

export interface AppSettings {
  id: string
  appName: string
  logoId: string | null
  faviconId: string | null
  termsOfService: string | null
  termsOfSale: string | null
  privacyPolicy: string | null
  logo: Upload | null
  favicon: Upload | null
}

export interface BrandingFormData {
  appName: string
  logoId: string | null
  faviconId: string | null
}

export interface LegalFormData {
  termsOfService: string
  termsOfSale: string
  privacyPolicy: string
}
