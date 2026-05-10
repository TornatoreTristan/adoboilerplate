import factory from '@adonisjs/lucid/factories'
import { faker } from '@faker-js/faker'
import Role from '#roles/models/role'

const SYSTEM_ROLES = ['super-admin', 'admin', 'member'] as const
type SystemRole = (typeof SYSTEM_ROLES)[number]

function buildSystemRoleData(slug: SystemRole) {
  const labels: Record<SystemRole, { name: string; description: string }> = {
    'super-admin': { name: 'Super Administrateur', description: 'Accès total au système' },
    'admin': { name: 'Administrateur', description: "Administrateur de l'organisation" },
    'member': { name: 'Membre', description: "Membre standard de l'organisation" },
  }
  return { ...labels[slug], slug, isSystem: true }
}

export const RoleFactory = factory
  .define(Role, async () => {
    const name = faker.helpers.arrayElement(['Editor', 'Viewer', 'Contributor', 'Manager', 'Guest'])
    const uniqueSuffix = faker.string.alphanumeric(6).toLowerCase()
    const slug = `${name.toLowerCase()}-${uniqueSuffix}`

    return {
      name,
      slug,
      description: faker.lorem.sentence(),
      isSystem: false,
    }
  })
  .state('superAdmin', (role) => {
    Object.assign(role, buildSystemRoleData('super-admin'))
  })
  .state('admin', (role) => {
    Object.assign(role, buildSystemRoleData('admin'))
  })
  .state('member', (role) => {
    Object.assign(role, buildSystemRoleData('member'))
  })
  .state('system', (role) => {
    role.isSystem = true
  })
  .state('withoutDescription', (role) => {
    role.description = null
  })
  .build()
