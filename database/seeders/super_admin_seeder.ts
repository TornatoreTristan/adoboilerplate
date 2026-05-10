import { BaseSeeder } from '@adonisjs/lucid/seeders'
import User from '#users/models/user'
import db from '@adonisjs/lucid/services/db'

export default class extends BaseSeeder {
  async run() {
    // Trouver le premier utilisateur ou créer un super-admin par défaut
    let superAdmin = await User.query().where('email', 'admin@example.com').first()

    if (!superAdmin) {
      // Si pas de user avec cet email, prendre le premier user
      superAdmin = await User.query().firstOrFail()
    }

    // Vérifier si le rôle super-admin existe déjà
    const existingRole = await db
      .from('user_roles')
      .where('user_id', superAdmin.id)
      .where('role_slug', 'super-admin')
      .first()

    if (!existingRole) {
      await db.table('user_roles').insert({
        id: crypto.randomUUID(),
        user_id: superAdmin.id,
        role_slug: 'super-admin',
        granted_at: new Date(),
      })

      console.log(`✅ Super-admin assigné à ${superAdmin.email}`)
    } else {
      console.log(`ℹ️  ${superAdmin.email} est déjà super-admin`)
    }
  }
}
