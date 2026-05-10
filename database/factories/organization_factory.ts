import factory from '@adonisjs/lucid/factories'
import { faker } from '@faker-js/faker'
import Organization from '#organizations/models/organization'

export const OrganizationFactory = factory
  .define(Organization, async () => {
    const name = faker.company.name()
    const slug = name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .substring(0, 50)
      .concat('-', faker.string.alphanumeric(6))

    return {
      name,
      slug,
      descriptionI18n: null,
      website: null,
      logoUrl: null,
      email: null,
      phone: null,
      siret: null,
      vatNumber: null,
      address: null,
      isActive: true,
    }
  })
  .state('withDescription', (organization) => {
    organization.descriptionI18n = {
      fr: faker.company.catchPhrase(),
      en: faker.company.catchPhrase(),
    }
  })
  .state('withContact', (organization) => {
    organization.website = faker.internet.url()
    organization.email = faker.internet.email()
    organization.phone = faker.phone.number()
  })
  .state('withAddress', (organization) => {
    organization.address = faker.location.streetAddress({ useFullAddress: true })
    organization.siret = faker.string.numeric(14)
    organization.vatNumber = `FR${faker.string.numeric(11)}`
  })
  .state('inactive', (organization) => {
    organization.isActive = false
  })
  .build()
