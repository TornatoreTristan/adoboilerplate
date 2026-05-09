# Migration AdonisJS 6 → 7 — adoboilerplate

> Plan complet de migration du boilerplate vers AdonisJS 7.
> Source : guide officiel `docs.adonisjs.com/v6-to-v7`, blog `adonisjs.com/blog/v7`, releases GitHub.
> Date du plan : 2026-05-09 — Version cible : `@adonisjs/core@^7.x` (actuelle 7.3.1, avril 2026).

## Contexte projet

État actuel :
- `@adonisjs/core@^6.18.0`
- Node.js v22.22.2 (CI + dev)
- 19 modèles Lucid, 24 migrations, 21 repositories étendant `BaseRepository<T>`
- 25 controllers, 34 services, 12 middlewares (dont 9 custom)
- 60+ bindings Inversify (`@injectable` + `@inject`)
- Inertia React + SSR avec **6 clés de `sharedData`** chargées via container
- 3 providers custom (Sentry, NotificationListeners, AuditLogListeners)
- 46 tests Japa (unit + functional)

L'annonce officielle parle de "30 minutes à 1h" pour une app standard. **Pour CE projet, table sur 2-3 jours pleins** à cause de la migration `sharedData` Inertia → middleware et de la surface de code à toucher.

---

## Stratégie

```bash
git checkout -b chore/adonisjs-7-migration
git tag pre-adonisjs7-baseline
```

Travail par phases avec un commit par phase pour faciliter le rollback granulaire.

---

## Phase 0 — Baseline (avant toute modif)

- [x] `npm run test` → archiver le résultat
- [ ] `npm run dev` → tester manuellement le golden path (login, org switch, upload, notifications, Stripe webhook)
- [x] `git status` clean
- [x] Tag `pre-adonisjs7-baseline` posé sur HEAD avant branch
- [x] Branche `chore/adonisjs-7-migration` créée

### Résultat baseline (2026-05-09, sous Node 24.15.0)

**334 / 346 passed, 12 failed** — ces 12 échecs sont **préexistants** et non liés à la migration v7. Documentés ici pour comparaison post-migration : si on retrouve les **mêmes** 12 après upgrade → pas de régression ; si plus ou moins → signal.

| # | Test | Cause probable |
|---|---|---|
| 1 | `AuditLogRepository / should search audit logs with full-text search` | Touche `audit-logs` (commit `a39c481`), FTS ne trouve rien (timing trigger ?) |
| 2 | `Notification Listeners / should unregister all listeners properly` | Bug dé-enregistrement listeners EventBus |
| 3 | `UploadService / should upload file with metadata` | Sharp retourne 2 champs en plus (commit `01d4ed2`) |
| 4-7 | `NotificationsController` GET / PATCH ../read / PATCH ../mark-all-read / DELETE | Pattern : controller renvoie `{}` au lieu du JSON |
| 8-9 | `SessionController` DELETE /:id, DELETE /others | Idem pattern `{}` |
| 10 | `Auth Middleware / should allow access to protected route when authenticated` | Idem pattern |
| 11 | `UpdateSessionActivity Middleware / should update last_activity` | Idem pattern |
| 12 | (12e à identifier précisément) | — |

Le pattern dominant (controllers retournant `{}` au lieu de `{ success: true, ... }`) suggère un bug introduit par un refactor récent (probablement `app_settings_middleware` du commit `dcbf8db` qui pourrait court-circuiter des responses). À investiguer **hors migration v7**.

> **Note importante** : l'agent Explore avait estimé 46 tests dans la codebase, mais la réalité est **346 tests** (~7× plus). Effort de validation par tests plus rapide qu'estimé grâce à la couverture étendue.

---

## Phase 1 — Mises à jour mécaniques

### 1.1 Node + tooling de base

| Outil | Avant | Après |
|---|---|---|
| Node.js | v22 | **v24+ (LTS)** |
| TypeScript | `~5.8.3` | `~5.9.x` |
| ESLint | `^9.26.0` | `^10.x` |
| Vite | `^6.3.5` | `^7.x` (cohérent avec `@adonisjs/vite` v7) |

```bash
nvm install 24 && nvm use 24
```

`package.json` :
```json
"engines": { "node": ">=24.0.0" }
```

### 1.2 Bump des packages `@adonisjs/*`

À mettre à jour ensemble (interdépendances) :
- `@adonisjs/core@^7.x`
- `@adonisjs/lucid@^22.x`
- `@adonisjs/auth@^10.x`
- `@adonisjs/session@^8.x`
- `@adonisjs/inertia@^4.x`
- `@adonisjs/vite@^5.x`
- `@adonisjs/redis@^10.x`
- `@adonisjs/shield@^9.x`
- `@adonisjs/static@^2.x`
- `@adonisjs/cors@^3.x`
- `@adonisjs/ally@^6.x`
- `@adonisjs/i18n@^3.x`
- `@adonisjs/transmit@^3.x`
- `@adonisjs/assembler@^8.x`

> ⚠️ Les majors ci-dessus sont **indicatifs**. Vérifier la dernière version compatible v7 avec :
> ```bash
> npm view @adonisjs/<pkg> versions --json | tail -20
> ```

### 1.3 Remplacer `ts-node-maintained` par `@poppinss/ts-exec`

```bash
npm uninstall ts-node-maintained
npm install -D @poppinss/ts-exec
```

`ace.js` (racine) :
```js
// Avant
import 'ts-node-maintained/register/esm'

// Après
import '@poppinss/ts-exec'
```

### 1.4 `adonisrc.ts` — hooks renommés

| Avant | Après |
|---|---|
| `onSourceFileChanged` | `fileChanged` |
| `onDevServerStarted` | `devServerStarted` |
| `onBuildCompleted` | `buildFinished` |
| `onBuildStarting` | `buildStarting` |

Code actuel ligne ~67 :
```ts
// Avant
hooks: {
  onBuildStarting: [() => import('@adonisjs/vite/build_hook')],
}

// Après
hooks: {
  buildStarting: [() => import('@adonisjs/vite/build_hook')],
  init: {
    indexEntities: [() => import('@adonisjs/core/hooks/index_entities')],
  },
}
```

### 1.5 `adonisrc.ts` — supprimer les flags experimental

Les deux flags sont devenus le **comportement par défaut** en v7 :
```ts
// ❌ À supprimer
experimental: {
  mergeMultipartFieldsAndFiles: true,
  shutdownInReverseOrder: true,
}
```

⚠️ Conséquence visible : `request.all()` merge désormais champs ET fichiers multipart. Vérifier qu'aucun controller du codebase ne fait `request.all()` en supposant l'ancien comportement (pas de fichiers).

### 1.6 Test glob pattern

```ts
// Avant
{ files: ['tests/unit/**/*.spec(.ts|.js)'], name: 'unit', timeout: 2000 }
{ files: ['tests/functional/**/*.spec(.ts|.js)'], name: 'functional', timeout: 30000 }

// Après (brace expansion)
{ files: ['tests/unit/**/*.spec.{ts,js}'], name: 'unit', timeout: 2000 }
{ files: ['tests/functional/**/*.spec.{ts,js}'], name: 'functional', timeout: 30000 }
```

### 1.7 `package.json` imports — nouveaux alias

Ajouter aux 17 alias existants :
```json
"#generated/*": "./.adonisjs/generated/*.js",
"#transformers/*": "./app/transformers/*.js",
"#database/*": "./database/*.js"
```

---

## Phase 2 — Renames d'API

### 2.1 `Request`/`Response` → `HttpRequest`/`HttpResponse`

Recherche :
```bash
grep -rn "from '@adonisjs/core/http'" app/ start/ providers/
```

```ts
// Avant
import { Request, Response } from '@adonisjs/core/http'
Request.macro('myHelper', function () { /* ... */ })

// Après
import { HttpRequest, HttpResponse } from '@adonisjs/core/http'
HttpRequest.macro('myHelper', function () { /* ... */ })
```

`HttpContext` reste inchangé. Concerne les **types** `Request`/`Response` et les **macros**, pas l'objet `ctx.request`/`ctx.response` qui garde son API.

### 2.2 URL Builder

```ts
// Avant
import router from '@adonisjs/core/services/router'
const url = router.makeUrl('users.show', { id: 1 })

// Après
import urlFor from '@adonisjs/core/services/url_builder'
const url = urlFor('users.show', { id: 1 })
```

Edge templates :
```edge
{# Avant #}
{{ route('users.show', { id: 1 }) }}

{# Après #}
{{ urlFor('users.show', { id: 1 }) }}
```

À chercher :
```bash
grep -rn "router.makeUrl\|@adonisjs/core/services/router" app/ inertia/ resources/
```

### 2.3 Helpers natifs / supprimés

| Avant | Après |
|---|---|
| `getDirname()` | `import.meta.dirname` |
| `getFilename()` | `import.meta.filename` |
| `slash()` | `stringHelpers.toUnixSlash()` |
| `cuid()` / `isCuid()` | `uuid` (déjà utilisé partout) |

```bash
grep -rn "getDirname\|getFilename\|cuid(" app/ providers/ start/ bin/
```

### 2.4 Flash messages

```ts
// Avant
session.flashMessages.get('errors.email')

// Après
session.flashMessages.get('inputErrorsBag.email')
```

**Frontend Inertia** — concerne tous les composants de formulaire :
```tsx
// Avant
const errors = usePage().props.flash?.errors
errors?.email

// Après
const errors = usePage().props.flash?.inputErrorsBag
errors?.email
```

Fichiers prévisibles à scanner :
- `inertia/pages/auth/login.tsx`
- `inertia/pages/auth/register.tsx`
- `inertia/pages/auth/forgot-password.tsx`
- `inertia/pages/auth/reset-password.tsx`
- `inertia/pages/organizations/create.tsx`
- `inertia/pages/account/*.tsx`
- Tous les forms dans `inertia/components/forms/`

### 2.5 VineJS — `BaseModifiers` retiré

```bash
grep -rn "BaseModifiers" app/
```

Très peu probable d'avoir un usage ; aucun action requise sinon.

### 2.6 Routes — auto-naming

En v7 les routes liées à un controller sont **auto-nommées** (`controller.method`). Si le code appelle `.as('foo')` avec un nom qui collide avec l'auto-name, erreur au boot.

Audit :
```bash
grep -rn "\.as(" start/routes/
```

Pour chaque `.as()`, deux options : (a) supprimer si l'auto-name suffit, (b) garder un nom explicite distinct.

---

## Phase 3 — Encryption module

### 3.1 Créer `config/encryption.ts`

```ts
import env from '#start/env'
import { defineConfig, drivers } from '@adonisjs/core/encryption'

export default defineConfig({
  default: 'legacy',
  list: {
    legacy: drivers.legacy({
      keys: [env.get('APP_KEY')],
    }),
  },
})
```

### 3.2 Retirer `appKey` de `config/app.ts`

```ts
// ❌ Supprimer
export const appKey = env.get('APP_KEY')
```

### 3.3 Vérifier les usages directs d'encryption

```bash
grep -rn "encryption\.encrypt\|encryption\.decrypt" app/
```

Le boilerplate ne semble pas chiffrer de données métier directement — uniquement les cookies de session via Adonis. La migration est mécanique.

⚠️ **Si données chiffrées en BDD ajoutées plus tard** : utiliser le driver `legacy` pour décryptage de l'ancien format puis nouveau driver pour ré-encryption (pattern de rotation supporté par v7).

---

## Phase 4 — Inertia (le plus gros chantier) ⚠️

### 4.1 Restructurer les entry points

```bash
git mv inertia/app/app.tsx inertia/app.tsx
git mv inertia/app/ssr.tsx inertia/ssr.tsx
```

Mettre à jour les imports relatifs dans ces deux fichiers.

### 4.2 Créer `tsconfig.inertia.json`

```json
{
  "extends": "./tsconfig.json",
  "compilerOptions": {
    "module": "ESNext",
    "moduleResolution": "bundler",
    "jsx": "react-jsx",
    "lib": ["DOM", "DOM.Iterable", "ESNext"],
    "types": ["vite/client"]
  },
  "include": ["inertia/**/*", "config/inertia.ts"]
}
```

Ajouter dans `tsconfig.json` racine :
```json
"references": [{ "path": "./tsconfig.inertia.json" }]
```

### 4.3 Mettre à jour `config/inertia.ts`

```ts
// Avant (extrait simplifié)
export default defineConfig({
  rootView: 'inertia_layout',
  entrypoint: 'inertia/app/ssr.tsx',
  history: { encrypt: true },
  sharedData: {
    auth: (ctx) => { /* ... */ },
    organizations: (ctx) => { /* ... */ },
    flash: (ctx) => ctx.session.flashMessages.all(),
    csrfToken: (ctx) => ctx.request.csrfToken,
    i18n: (ctx) => { /* ... */ },
    appSettings: () => { /* ... */ },
  },
})

// Après
export default defineConfig({
  rootView: 'inertia_layout',
  encryptHistory: true,
  ssr: {
    enabled: true,
    entrypoint: 'inertia/ssr.tsx',
  },
  // sharedData supprimé — déplacé en middleware
})
```

### 4.4 Créer `app/middleware/inertia_shared_data_middleware.ts` ⚠️ CRITIQUE

C'est ICI que se concentre l'essentiel du risque de la migration. La logique exacte des 6 clés actuelles doit être portée 1:1, en respectant le pattern container :

```ts
import type { HttpContext } from '@adonisjs/core/http'
import type { NextFn } from '@adonisjs/core/types/http'
import { getService } from '#shared/container/container'
import { TYPES } from '#shared/container/types'
import OrganizationRepository from '#organizations/repositories/organization_repository'
import LocaleService from '#shared/services/locale_service'
import AppSettingsService from '#app_settings/services/app_settings_service'

export default class InertiaSharedDataMiddleware {
  async handle(ctx: HttpContext, next: NextFn) {
    const orgRepo = getService<OrganizationRepository>(TYPES.OrganizationRepository)
    const localeService = getService<LocaleService>(TYPES.LocaleService)
    const appSettingsService = getService<AppSettingsService>(TYPES.AppSettingsService)

    ctx.inertia.share({
      auth: () => {
        const user = ctx.user
        if (!user) return { user: null }
        return {
          user: {
            id: user.id,
            fullName: user.fullName,
            email: user.email,
            avatarUrl: user.avatarUrl,
            googleId: user.googleId,
            isEmailVerified: user.isEmailVerified,
            isSuperAdmin: user.isSuperAdmin,
          },
        }
      },
      organizations: async () => {
        if (!ctx.user) return { current: null, list: [] }
        return orgRepo.getOrganizationsForUser(ctx.user.id)
      },
      flash: () => ctx.session.flashMessages.all(),
      csrfToken: () => ctx.request.csrfToken,
      i18n: async () => ({
        locale: await localeService.getCurrentLocale(ctx),
        messages: await localeService.getMessages(ctx),
      }),
      appSettings: () => appSettingsService.getPublicSettings(),
    })

    return next()
  }
}
```

Enregistrer dans `start/kernel.ts` (router middleware), **après** `inertia_middleware` :
```ts
router.use([
  () => import('@adonisjs/core/bodyparser_middleware'),
  () => import('@adonisjs/shield/shield_middleware'),
  () => import('@adonisjs/auth/initialize_auth_middleware'),
  () => import('@adonisjs/inertia/inertia_middleware'),
  () => import('#middleware/inertia_shared_data_middleware'),
])
```

**Tests à faire après cette étape** : chaque page Inertia doit toujours recevoir les 6 props (vérifier dans devtools que `props.auth`, `props.organizations`, etc. sont présents).

---

## Phase 5 — Sécurité (CVE patches v7)

### 5.1 File uploads — UUID par défaut (CVE-2026-21440)

`request.file().move()` utilise désormais des UUID aléatoires. Auditer `app/uploads/services/upload_service.ts` : si la logique de nommage dépendait de `clientName` brut, rien ne change ; sinon vérifier que les chemins de stockage tiennent compte du nouveau pattern.

### 5.2 Mass assignment — préfixe `$` (CVE-2026-22814)

```bash
grep -rn "declare \\\$" app/
```

Aucun champ avec préfixe `$` dans le boilerplate actuel — pas d'impact attendu.

### 5.3 Multipart parsing (CVE-2026-25754, CVE-2026-25762)

Patches transparents, aucune action côté app.

---

## Phase 6 — Lucid v22 — schema classes (optionnel, post-migration)

### 6.1 Compatibilité immédiate

La syntaxe actuelle des modèles (`declare`, `@column`, `@manyToMany`, etc.) reste 100% supportée. **Aucune réécriture nécessaire pour la migration v7.**

### 6.2 Adoption progressive (V2 du chantier)

V7 introduit des **schema classes auto-générées** depuis les migrations. Les modèles peuvent les étendre pour avoir les colonnes inférées au lieu de les redéclarer.

À planifier comme refactor V2 modèle par modèle. Hors scope de ce plan.

### 6.3 BaseRepository — vérifications

`app/shared/repositories/base_repository.ts` (475 lignes) utilise les APIs Lucid stables :
- query builder (`from`, `select`, `where`, `whereRaw`, `orderBy`, `paginate`)
- `find`, `findBy`, `create`, `merge`, `save`, `delete`
- relations (`preload`, `related`)

Aucune réécriture attendue. Validation par les tests.

---

## Phase 7 — Validation & QA

### 7.1 Type-check & build
```bash
npx tsc --noEmit
npm run build
```

### 7.2 Tests
```bash
npm run test
```
Cible : 46/46 pass.

### 7.3 Golden paths manuels
- [ ] Login (form + Google OAuth)
- [ ] Register + email verification
- [ ] Password reset
- [ ] Création/switch organisation
- [ ] Upload fichier (image + non-image, antivirus ClamAV)
- [ ] Notifications + Transmit SSE temps réel
- [ ] Stripe webhook (test charge avec `stripe trigger`)
- [ ] i18n (switch FR ↔ EN)
- [ ] Health check `GET /health`
- [ ] Admin panel (super admin)
- [ ] GDPR export

### 7.4 Smoke staging
- Déployer sur staging
- Surveiller Sentry 24h
- Vérifier logs (audit, email, sessions)

### 7.5 Rollback plan
- Tag `pre-adonisjs7-baseline` posé en Phase 0
- En cas de régression bloquante : `git revert <merge-commit>` + redeploy

---

## Composants custom — vérifications spécifiques

### Inversify container
- **Risque : 🟢 BAS** — pattern indépendant d'AdonisJS
- `@injectable()` + `@inject()` + `serviceContainer.get()` ne dépendent pas du container Adonis
- Les ~60 bindings restent valides
- ✅ Aucune modif attendue

### Custom providers (Sentry, NotificationListeners, AuditLogListeners)
- **Risque : 🟡 MOYEN**
- Vérifier que la lifecycle `register / boot / start / ready / shutdown` est inchangée en v7
- `app/providers/sentry_provider.ts` : conserver la logique `boot → init`, `start → enable`, `shutdown → flush`

### AuthMiddleware custom
- **Risque : 🟡 MOYEN**
- Pattern actuel : charge user depuis session ID, cache via `CacheService` (TTL 300s)
- Distingue Inertia (redirect) vs API (401)
- À tester : que `ctx.user` reste correctement populé après le bump `@adonisjs/auth`

### BaseRepository
- **Risque : 🟡 MOYEN**
- Couvert par 21 tests (1 par repository) qui doivent rester verts

### Bull queue + Sentry SDK
- Indépendants d'AdonisJS, mises à jour optionnelles
- Bull v4 → v6 possible mais hors scope migration v7

---

## Récapitulatif des risques

| Composant | Risque | Action |
|---|---|---|
| Inertia `sharedData` → middleware | 🔴 HAUT | Réécriture middleware (Phase 4.4) |
| Renames `Request`/`Response` | 🟡 MOYEN | Find & replace dans 25 controllers |
| URL Builder | 🟡 MOYEN | Grep + remplacement |
| Flash messages frontend | 🟡 MOYEN | Scan tous les forms Inertia |
| Lucid v22 / `BaseRepository` | 🟡 MOYEN | Tests de régression |
| Routes auto-naming | 🟡 MOYEN | Audit `.as()` |
| Custom providers (Sentry…) | 🟡 MOYEN | Tester lifecycle |
| Encryption config | 🟢 BAS | Pas d'usage direct |
| Inversify | 🟢 BAS | Indépendant |
| Hooks `adonisrc.ts` | 🟢 BAS | Renames mécaniques |
| Test glob | 🟢 BAS | 1 ligne |
| `ts-node` → `ts-exec` | 🟢 BAS | 1 import |
| Helpers (`getDirname`…) | 🟢 BAS | Grep + remplacement |
| File upload UUID | 🟢 BAS | Probablement déjà conforme |
| Mass assignment `$` | 🟢 BAS | Aucun champ concerné |

---

## Estimation détaillée

| Phase | Estimation |
|---|---|
| Phase 0 — Baseline | 1h |
| Phase 1 — Mécaniques | 2-3h |
| Phase 2 — Renames | 2-3h |
| Phase 3 — Encryption | 30min |
| Phase 4 — Inertia | **4-6h** ⚠️ |
| Phase 5 — Sécurité | 1h |
| Phase 6 — Lucid validation | 1-2h |
| Phase 7 — QA + staging | 4-8h |
| **Total réaliste** | **2-3 jours** |

---

## Ordre de commits suggéré

```
1.  chore(deps): bump Node 24, TS 5.9, ESLint 10
2.  chore(adonisjs7): bump @adonisjs/* packages
3.  refactor(adonisjs7): replace ts-node-maintained by @poppinss/ts-exec
4.  refactor(adonisjs7): rename adonisrc hooks, drop experimental flags
5.  refactor(adonisjs7): update test glob patterns
6.  refactor(adonisjs7): add #generated #transformers #database aliases
7.  refactor(adonisjs7): rename Request/Response to HttpRequest/HttpResponse
8.  refactor(adonisjs7): switch to urlFor, drop router.makeUrl
9.  refactor(adonisjs7): replace getDirname/getFilename helpers
10. refactor(adonisjs7): move encryption config to dedicated file
11. refactor(adonisjs7): restructure Inertia entry points
12. feat(adonisjs7): InertiaSharedDataMiddleware (replaces config sharedData)
13. chore(adonisjs7): update flash messages key (errors → inputErrorsBag)
14. chore(adonisjs7): audit and clean up .as() route naming
15. test: full regression pass v7
```

---

## Hors scope (à planifier après stabilisation v7)

- **Schema classes Lucid** auto-générées — refactor modèle par modèle
- **HTTP Transformers** pour serialisation API typée → réécrire les `serialize`/`serializeAs` côté modèles
- **`@adonisjs/otel`** — observabilité OpenTelemetry, complète Sentry
- **`@adonisjs/content`** — CMS léger, si besoin un jour
- **Tuyau + TanStack Query** type-safe — déjà partiellement en place avec `@tuyau/inertia`, peut être enrichi
- **Bull v4 → BullMQ v5** — modernisation queue
- **Edge-Markdown** — si besoin de Markdown dans les emails ou pages
