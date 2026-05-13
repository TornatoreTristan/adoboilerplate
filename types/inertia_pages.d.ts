/**
 * Inertia page registry — module augmentation
 *
 * In v7, `inertia.render('foo')` is type-checked against the InertiaPages
 * interface. Each entry maps a page name (relative to inertia/pages/, no
 * extension) to its expected props type. Empty registry → `keyof InertiaPages`
 * is `never` → every render call fails with TS2345.
 *
 * For the v7 migration we declare a permissive `ComponentProps` shape on
 * each page (Record<string, JSONDataTypes>). Tightening the prop type
 * page-by-page is a follow-up.
 *
 * NOTE: this file lives at /types/ (not /inertia/) because tsconfig.json
 * excludes ./inertia/**\/* from server-side TypeScript compilation.
 */
import type { ComponentProps } from '@adonisjs/inertia/types'

declare module '@adonisjs/inertia/types' {
  interface InertiaPages {
    'account/api-tokens': ComponentProps
    'account/data-privacy': ComponentProps
    'account/preferences': ComponentProps
    'account/profile': ComponentProps
    'account/security': ComponentProps
    'account/sessions': ComponentProps
    'admin/audit-logs/index': ComponentProps
    'admin/audit-logs/show': ComponentProps
    'admin/queues/index': ComponentProps
    'admin/queues/show': ComponentProps
    'admin/index': ComponentProps
    'admin/integrations': ComponentProps
    'admin/logs': ComponentProps
    'admin/mails': ComponentProps
    'admin/monitoring': ComponentProps
    'admin/organization-detail': ComponentProps
    'admin/organizations': ComponentProps
    'admin/plans/create': ComponentProps
    'admin/plans/edit': ComponentProps
    'admin/plans/index': ComponentProps
    'admin/plans/show': ComponentProps
    'admin/role-detail': ComponentProps
    'admin/roles': ComponentProps
    'admin/settings': ComponentProps
    'admin/subscriptions': ComponentProps
    'admin/user-detail': ComponentProps
    'admin/users': ComponentProps
    'auth/email-verification-result': ComponentProps
    'auth/login': ComponentProps
    'auth/register': ComponentProps
    'auth/two-factor-challenge': ComponentProps
    'auth/verify-email-notice': ComponentProps
    'errors/not_found': ComponentProps
    'errors/server_error': ComponentProps
    'home': ComponentProps
    'notifications': ComponentProps
    'organizations/create': ComponentProps
    'organizations/pricing': ComponentProps
    'organizations/settings': ComponentProps
    'organizations/settings-integrations': ComponentProps
    'organizations/settings-subscriptions': ComponentProps
    'organizations/settings-users': ComponentProps
    'organizations/subscription-success': ComponentProps
  }
}
