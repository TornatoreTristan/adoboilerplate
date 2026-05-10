import { BaseSeeder } from '@adonisjs/lucid/seeders'
import Role from '#roles/models/role'
import Permission from '#roles/models/permission'

export default class extends BaseSeeder {
  async run() {
    // ==========================================
    // PERMISSIONS
    // ==========================================

    const permissions = [
      // Users management
      {
        name: 'Voir les utilisateurs',
        slug: 'users.view',
        resource: 'users',
        action: 'view',
        description: 'Voir la liste des utilisateurs',
      },
      {
        name: 'Créer des utilisateurs',
        slug: 'users.create',
        resource: 'users',
        action: 'create',
        description: 'Créer de nouveaux utilisateurs',
      },
      {
        name: 'Modifier les utilisateurs',
        slug: 'users.update',
        resource: 'users',
        action: 'update',
        description: 'Modifier les utilisateurs existants',
      },
      {
        name: 'Supprimer les utilisateurs',
        slug: 'users.delete',
        resource: 'users',
        action: 'delete',
        description: 'Supprimer des utilisateurs',
      },

      // Posts management
      {
        name: 'Voir les posts',
        slug: 'posts.view',
        resource: 'posts',
        action: 'view',
        description: 'Voir la liste des posts',
      },
      {
        name: 'Créer des posts',
        slug: 'posts.create',
        resource: 'posts',
        action: 'create',
        description: 'Créer de nouveaux posts',
      },
      {
        name: 'Modifier les posts',
        slug: 'posts.update',
        resource: 'posts',
        action: 'update',
        description: 'Modifier les posts existants',
      },
      {
        name: 'Supprimer les posts',
        slug: 'posts.delete',
        resource: 'posts',
        action: 'delete',
        description: 'Supprimer des posts',
      },
      {
        name: 'Publier les posts',
        slug: 'posts.publish',
        resource: 'posts',
        action: 'publish',
        description: 'Publier des posts',
      },

      // Settings management
      {
        name: 'Voir les paramètres',
        slug: 'settings.view',
        resource: 'settings',
        action: 'view',
        description: "Voir les paramètres de l'organisation",
      },
      {
        name: 'Modifier les paramètres',
        slug: 'settings.update',
        resource: 'settings',
        action: 'update',
        description: "Modifier les paramètres de l'organisation",
      },

      // Roles & Permissions management
      {
        name: 'Gérer les rôles',
        slug: 'roles.manage',
        resource: 'roles',
        action: 'manage',
        description: 'Gérer les rôles et permissions',
      },

      // Billing management
      {
        name: 'Voir la facturation',
        slug: 'billing.view',
        resource: 'billing',
        action: 'view',
        description: 'Voir les informations de facturation',
      },
      {
        name: 'Gérer la facturation',
        slug: 'billing.manage',
        resource: 'billing',
        action: 'manage',
        description: 'Gérer les informations de facturation',
      },
    ]

    const createdPermissions = await Permission.updateOrCreateMany('slug', permissions)

    // ==========================================
    // ROLES
    // ==========================================

    const adminRole = await Role.updateOrCreate(
      { slug: 'admin' },
      {
        name: 'Administrateur',
        slug: 'admin',
        description: 'Accès complet à toutes les fonctionnalités',
        isSystem: true,
      }
    )

    const editorRole = await Role.updateOrCreate(
      { slug: 'editor' },
      {
        name: 'Éditeur',
        slug: 'editor',
        description: 'Peut gérer le contenu mais pas les utilisateurs',
        isSystem: true,
      }
    )

    const memberRole = await Role.updateOrCreate(
      { slug: 'member' },
      {
        name: 'Membre',
        slug: 'member',
        description: 'Accès limité en lecture/écriture',
        isSystem: true,
      }
    )

    const viewerRole = await Role.updateOrCreate(
      { slug: 'viewer' },
      {
        name: 'Lecteur',
        slug: 'viewer',
        description: 'Accès en lecture seule',
        isSystem: true,
      }
    )

    // ==========================================
    // ASSIGN PERMISSIONS TO ROLES
    // ==========================================

    // Admin: ALL permissions
    const allPermissionIds = createdPermissions.map((p) => p.id)
    await adminRole.related('permissions').sync(allPermissionIds)

    // Editor: content management
    const editorPermissions = createdPermissions
      .filter((p) =>
        [
          'posts.view',
          'posts.create',
          'posts.update',
          'posts.delete',
          'posts.publish',
          'users.view',
          'settings.view',
        ].includes(p.slug)
      )
      .map((p) => p.id)
    await editorRole.related('permissions').sync(editorPermissions)

    // Member: basic content access
    const memberPermissions = createdPermissions
      .filter((p) => ['posts.view', 'posts.create', 'posts.update', 'users.view'].includes(p.slug))
      .map((p) => p.id)
    await memberRole.related('permissions').sync(memberPermissions)

    // Viewer: read-only
    const viewerPermissions = createdPermissions
      .filter((p) => ['posts.view', 'users.view', 'settings.view'].includes(p.slug))
      .map((p) => p.id)
    await viewerRole.related('permissions').sync(viewerPermissions)

    console.log('✅ Roles et permissions créés avec succès')
    console.log(`   - ${createdPermissions.length} permissions`)
    console.log('   - 4 rôles (Admin, Editor, Member, Viewer)')
  }
}
