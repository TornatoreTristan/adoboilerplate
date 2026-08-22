import { test } from '@japa/runner'
import { readFile, readdir } from 'node:fs/promises'
import { join, extname } from 'node:path'
import testUtils from '@adonisjs/core/services/test_utils'
import { getService } from '#shared/container/container'
import { TYPES } from '#shared/container/types'
import type EventBusService from '#shared/services/event_bus_service'
import AuditLog from '#audit/models/audit_log'
import User from '#users/models/user'
import Organization from '#organizations/models/organization'

const APP_DIR = new URL('../../../app/', import.meta.url).pathname
const LISTENERS_FILE = join(APP_DIR, 'audit/listeners/audit_log_listeners.ts')

/**
 * Événements écoutés par l'audit qui n'ont volontairement pas encore de
 * producteur, parce que la fonctionnalité correspondante n'existe pas dans
 * l'application. Retirer une entrée d'ici le jour où la feature arrive.
 */
const KNOWN_WITHOUT_PRODUCER = new Set([
  // Aucun parcours de refus d'invitation : l'invité accepte ou laisse expirer.
  'invitation:rejected',
  // Aucun écran de changement de mot de passe en session (seulement le reset
  // par email, couvert par auth:password:reset:completed).
  'auth:password:changed',
  // Aucun parcours de suppression d'organisation : ni l'admin ni le
  // propriétaire ne peuvent supprimer un tenant aujourd'hui.
  'organization:deleted',
])

async function collectTsFiles(dir: string, acc: string[] = []): Promise<string[]> {
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name)
    if (entry.isDirectory()) {
      await collectTsFiles(full, acc)
    } else if (extname(entry.name) === '.ts') {
      acc.push(full)
    }
  }
  return acc
}

test.group('Audit event wiring', (group) => {
  group.each.setup(() => testUtils.db().withGlobalTransaction())

  /**
   * Test de contrat producteur/consommateur.
   *
   * Le système d'audit a longtemps été silencieusement mort : les listeners
   * s'abonnaient à `user:created` (deux-points) alors que les seuls émetteurs
   * du code, dans BaseRepository, publiaient `user.created` (point). Aucun
   * test ne reliait les deux, donc la table restait vide sans qu'aucune
   * erreur ne remonte. Ce test ferme cette porte.
   */
  test('every audited event has at least one producer in the app', async ({ assert }) => {
    const listenersSource = await readFile(LISTENERS_FILE, 'utf-8')
    const listened = [...listenersSource.matchAll(/this\.eventBus\.on\(\s*'([^']+)'/g)].map(
      (m) => m[1]
    )

    assert.isAbove(listened.length, 0, 'aucun listener détecté — le parsing a changé ?')

    const files = await collectTsFiles(APP_DIR)
    const sources = await Promise.all(files.map((f) => readFile(f, 'utf-8')))
    const emitted = new Set<string>()
    for (const source of sources) {
      for (const match of source.matchAll(/\.emit\(\s*'([^']+)'/g)) {
        emitted.add(match[1])
      }
    }

    const orphans = listened.filter(
      (event) => !emitted.has(event) && !KNOWN_WITHOUT_PRODUCER.has(event)
    )

    assert.deepEqual(
      orphans,
      [],
      `Ces événements sont écoutés par l'audit mais jamais émis : ${orphans.join(', ')}. ` +
        `Soit le producteur manque, soit le nom diverge entre émetteur et listener.`
    )
  })

  test('the allowlist stays honest — listed events really have no producer', async ({ assert }) => {
    const files = await collectTsFiles(APP_DIR)
    const sources = await Promise.all(files.map((f) => readFile(f, 'utf-8')))
    const emitted = new Set<string>()
    for (const source of sources) {
      for (const match of source.matchAll(/\.emit\(\s*'([^']+)'/g)) {
        emitted.add(match[1])
      }
    }

    const staleEntries = [...KNOWN_WITHOUT_PRODUCER].filter((event) => emitted.has(event))

    assert.deepEqual(
      staleEntries,
      [],
      `Ces événements ont maintenant un producteur, il faut les retirer de ` +
        `KNOWN_WITHOUT_PRODUCER : ${staleEntries.join(', ')}`
    )
  })

  /**
   * Vérifie le bout de chaîne : un emit réel doit produire une ligne en base.
   * Le test de contrat ci-dessus compare des chaînes de caractères ; celui-ci
   * prouve que le listener est bien enregistré au runtime et que l'écriture
   * aboutit.
   */
  test('emitting an audited event writes a row in audit_logs', async ({ assert }) => {
    const eventBus = getService<EventBusService>(TYPES.EventBus)

    const user = await User.create({
      email: 'audit-wiring@example.com',
      password: 'password123',
      fullName: 'Audit Wiring',
    })

    await eventBus.emit('auth:login:success', {
      userId: user.id,
      method: 'credentials',
      ipAddress: '127.0.0.1',
      userAgent: 'japa',
    })

    const log = await AuditLog.query().where('user_id', user.id).first()

    assert.isNotNull(log, "aucune ligne d'audit écrite pour auth:login:success")
    assert.equal(log!.action, 'auth.login.success')
    assert.equal(log!.ipAddress, '127.0.0.1')
  })

  test('organization events carry the organization id', async ({ assert }) => {
    const eventBus = getService<EventBusService>(TYPES.EventBus)

    const user = await User.create({
      email: 'audit-org@example.com',
      password: 'password123',
      fullName: 'Audit Org',
    })

    const organization = await Organization.create({
      name: 'Audit Org',
      slug: 'audit-org-wiring',
    })

    await eventBus.emit('organization:created', {
      createdBy: user.id,
      organization: { id: organization.id, name: organization.name },
    })

    const log = await AuditLog.query().where('organization_id', organization.id).first()

    assert.isNotNull(log, "aucune ligne d'audit écrite pour organization:created")
    assert.equal(log!.userId, user.id)
    assert.equal(log!.resourceType, 'Organization')
  })
})
