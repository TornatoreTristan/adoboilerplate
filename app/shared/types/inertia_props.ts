import type { JSONDataTypes } from '@adonisjs/http-transformers/types'

/**
 * Helper type pour les props Inertia.
 *
 * AdonisJS/Inertia exige que les props soient conformes à JSONDataTypes
 * (index signature `[key: string]: JSONDataTypes`). Les interfaces TypeScript
 * sans index signature ne satisfont pas ce contrat même si elles sont
 * serialisables en JSON.
 *
 * Ce helper permet de caster proprement des objets structurés en props Inertia
 * sans perdre la validation à la construction (le presenter continue de typer
 * le retour, le cast est uniquement au moment du passage à inertia.render).
 */
export type InertiaProps = { [key: string]: JSONDataTypes }

/**
 * Marque un objet structuré comme props Inertia valides.
 * Usage : return inertia.render('page', asInertiaProps({ key: value }))
 */
export function asInertiaProps<T extends object>(props: T): InertiaProps {
  return props as unknown as InertiaProps
}
