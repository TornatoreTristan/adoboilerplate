# Handoff — session AdonisJS 7 (2026-05-09)

> Reprends ici quand tu rentres. Ce doc résume tout ce qui a été fait
> aujourd'hui et ce qui reste, par ordre de priorité, avec les commandes
> et les fichiers concernés.

---

## État actuel du repo

```
Branche : main (à jour avec origin/main)
Working tree : clean
Tag de rollback : pre-adonisjs7-baseline (sur le commit pré-migration)

3 derniers commits sur main :
21f5179 Merge pull request #2 from TornatoreTristan/chore/adonisjs-7-ts-debt
f8c389d chore(ts): null-safety guards and cleanup across test files
b0f309f chore(ts): cast inertia.render props + bump Stripe apiVersion
```

**Adonis** : core 7.3.2, lucid 22.4.2, auth 10.1.0, session 8.1.0,
inertia 4.2.0, vite 5.1.1 (et toutes les autres deps majeures à v7).
**Node** : 24 (épinglé via `.nvmrc` + `engines.node` dans `package.json`).

---

## Ce qui a été fait aujourd'hui (2 PR mergées)

### PR #1 — Migration runtime AdonisJS 6 → 7 (mergée → `f5584292`)

13 commits, scope : faire booter et passer les tests sous v7.
- Bump Node 24, TS 5.9, ESLint 10, Vite 7, tous les `@adonisjs/*` v7
- `ts-node-maintained` → `@poppinss/ts-exec` dans `ace.js`
- `adonisrc.ts` : hooks renommés, `experimental` flags retirés, glob `{ts,js}`
- `cuid()` → `randomUUID()`, `getDirname()` → `import.meta.dirname`
- `config/encryption.ts` créé avec le driver `legacy`
- `app/middleware/inertia_middleware.ts` créé étendant
  `BaseInertiaMiddleware` avec les 6 clés `sharedData` (auth,
  organizations, flash, errors, csrfToken, i18n, appSettings)
- Routes `/api/sessions/*` et `/account/sessions/*` qui partagaient le
  controller avec auto-naming v7 → noms explicites `.as()` distincts
- `vite.config.ts` : `@adonisjs/inertia/client` → `/vite`
- Stripe v19 deferred type drift (TODO casts)
- Sentry exception handler `render` → `handle`

**Résultat** : 334/346 tests pass (= baseline v6, aucune régression).

### PR #2 — Cleanup dette TypeScript (mergée → `21f51791`)

8 commits, scope : `tsc --noEmit` plus propre.
- `types/inertia_pages.d.ts` : registry des 38 pages Inertia
- `inertia.render('foo')` 1-arg → `('foo', {})` (12 sites)
- `export const E: typeof ExceptionHelpers` (TS 5.9 assertion-function rule, **-64 erreurs d'un coup**)
- Imports/params/locals unused supprimés
- `findByIdOrFail` à la place de `findById` dans admin_controller
- `this.cache?.invalidateTags(...)` (cache est optional dans BaseRepository)
- Inertia render props castés `as any` (types métier non JSON-serializables)
- Stripe apiVersion `2024-11-20.acacia` → `2025-10-29.clover`
- Tests : null guards (`!`), DateTime instanceOf, méthode `getNotifications`
  → `getUserNotifications`, `Plan as any` pour code mort, etc.

**Résultat** : **357 → 123 erreurs TS (-65.5%), tests 100% propres**.

---

## Ce qui reste à faire (par priorité)

### 🔴 Priorité 1 — Bugs préexistants (probablement faciles)

Découverts pendant la migration, **pas liés à v7** mais ils traînent :

#### A. `.env.example` désaligné avec `start/env.ts` et `docker-compose.yml`

- Manque `RESEND_API_KEY`, `EMAIL_FROM_ADDRESS`, `EMAIL_FROM_NAME`,
  `TEST_DB_HOST/PORT/USER/PASSWORD/DATABASE`
- `DB_USER=root, DB_PASSWORD=root, DB_DATABASE=app` ne match pas le
  compose qui utilise `dev / password / bp_adonis6_dev`
- Effort : **15 min**. Une PR d'un commit qui resync.

#### B. 12 tests qui retournent `{}` au lieu de `{ success: true, ... }`

Pattern dominant dans `NotificationsController` (GET, PATCH x2, DELETE),
`SessionController` (DELETE x2), `AuthMiddleware`, `UpdateSessionActivity`.
Cause probable : `app_settings_middleware` (commit `dcbf8db`) qui
court-circuite la response. À investiguer dans cet ordre :

```bash
# Tests qui échouent encore
npm run test 2>&1 | grep -B 1 "containsSubset.*success: true"

# Le middleware suspect
cat app/middleware/app_settings_middleware.ts
cat start/kernel.ts | grep app_settings

# Voir si le middleware mute la response avant que le controller la finalize
```

Effort : **1-3h** selon la difficulté du root cause.

#### C. Routes dupliquées intentionnelles à consolider

`/api/sessions/*` et `/account/sessions/*` partagent les mêmes handlers
de `SessionController`. Idem pour `/notifications` (page Inertia) vs
`/api/notifications` (JSON). Workaround actuel : `.as()` distincts.
Décision à prendre : garder la duplication ou unifier.

Effort : **1h** si on garde le statu quo (on a déjà mis les `.as()`).

---

### 🟡 Priorité 2 — Dette TS restante (123 erreurs)

Distribution :

| Code | Count | Type de fix |
|---|---|---|
| TS2339 | 35 | Property does not exist |
| TS2345 | 18 | Argument incompatible |
| TS2322 | 11 | Type mismatch |
| TS7006 | 9 | Implicit any |
| TS2551 | 9 | Méthodes renommées |
| TS2353 | 6 | Unknown property |
| Autres | 35 | Variés |

Suggestion d'ordre des PR :

#### A. `getNotifications` → `getUserNotifications` (TS2551, 9 erreurs)

Le service expose `getUserNotifications()` mais plusieurs sites
appellent `getNotifications()`. Rename simple :

```bash
grep -rn "\.getNotifications(" app/ --include="*.ts"
# Pour chaque site, vérifier que c'est bien notificationService et faire le rename
```

Effort : **30 min**.

#### B. Implicit-any sweep (TS7006, 9 erreurs)

```bash
npx tsc --noEmit 2>&1 | grep "TS7006"
```

Annoter chaque param. Rapide, mécanique. Effort : **1h**.

#### C. Plan model dead code (TS2339, ~8 erreurs)

`app/billing/services/pricing_calculator_service.ts` référence
`Plan.baseUsers`, `Plan.price`, `Plan.pricePerUser` qui n'existent pas
sur le modèle. Le service est registered dans le container mais
**jamais consommé**. Décision :
- **Suppression** du service + son binding dans `container.ts` (le plus simple)
- OU compléter le modèle avec les 3 champs + une migration

Effort : **30 min** pour suppression, **2h** pour compléter le modèle.

#### D. Stripe SDK v19 audit (~12 erreurs)

Le code a des `// TODO Stripe SDK v19 type drift` à plusieurs endroits :
- `app/billing/controllers/stripe_webhook_controller.ts`
- `app/admin/controllers/admin_controller.ts:175` (`Invoice.paid`)

Lire le [Stripe v19 changelog](https://github.com/stripe/stripe-node/releases) pour confirmer la nouvelle shape de :
- `Subscription.current_period_start` / `current_period_end` (probablement déplacés vers `subscription.items.data[0]`)
- `Invoice.subscription` (déplacé ou renommé)
- `Invoice.paid` (probablement remplacé par `status === 'paid'`)

Une fois confirmé, retirer les `as any` et utiliser la nouvelle shape.

Effort : **2-3h** (essentiellement de la lecture de doc + tests).

#### E. Le reste (TS2322, TS2345, TS2353, etc., ~50 erreurs)

Dispersées, à attaquer par fichier au fil de l'eau. Pas de quick win
massif identifié.

---

### 🟢 Priorité 3 — Cosmétique (Phase 4 du plan v7)

Restructure des fichiers Inertia pour suivre la convention v7 :

```bash
git mv inertia/app/app.tsx inertia/app.tsx
git mv inertia/app/ssr.tsx inertia/ssr.tsx
# Mettre à jour les imports relatifs (1 niveau de moins)
# Créer tsconfig.inertia.json à la racine
# Mettre à jour vite.config.ts (entrypoints) et config/inertia.ts (ssr.entrypoint)
```

⚠️ Ne BLOQUE rien — les paths actuels marchent en v7. C'est juste pour
suivre la convention.

Effort : **1-2h** (avec test manuel du dev server après).

---

### 🔵 Priorité 4 — Nouvelles features v7 (long terme)

Pas urgent du tout, mais bonus si tu veux exploiter v7 à fond :

- **Schema classes Lucid** auto-générées depuis migrations (refactor modèle par modèle)
- **HTTP Transformers** pour serialisation API typée (remplace `serializeAs`)
- **`@adonisjs/otel`** — observabilité OpenTelemetry, complète Sentry
- **Tuyau + TanStack Query** — `@tuyau/inertia` est déjà en deps mais peu exploité
- **Bull v4 → BullMQ v5** — modernisation queue
- **`@adonisjs/content`** — CMS léger si besoin un jour

---

## Commandes pour reprendre

```bash
# Activer Node 24
nvm use 24   # ou: source ~/.nvm/nvm.sh && nvm use 24

# Démarrer Docker (Postgres dev/test + Redis)
docker-compose up -d
# (les conteneurs sont probablement déjà up depuis ce matin)

# Vérifier l'état
git log --oneline -5
git status
node -v  # doit être v24

# Travailler sur un follow-up — créer une branche
git checkout -b chore/<nom-du-followup>

# Lancer les tests
npm run test

# Lancer le dev server (avec accès aux logs dans ton terminal)
npm run dev
# → http://localhost:3333

# Compter les erreurs TS restantes
npx tsc --noEmit 2>&1 | grep -cE "error TS"
```

---

## Fichiers de référence

| Fichier | Quoi |
|---|---|
| `docs/migrations/adonisjs-7.md` | Plan complet de la migration v6→v7 (avec récap des résultats) |
| `docs/migrations/adonisjs-7-handoff.md` | Ce doc (handoff) |
| `types/inertia_pages.d.ts` | Registry des pages Inertia (ajout PR #2) |
| `app/middleware/inertia_middleware.ts` | InertiaMiddleware avec sharedData (ajout PR #1) |
| `config/encryption.ts` | Encryption v7 driver legacy (ajout PR #1) |
| `.nvmrc` | Pin Node 24 (ajout PR #1) |

---

## Sources externes utiles

- [AdonisJS v7 announcement](https://adonisjs.com/blog/v7)
- [v6→v7 upgrade guide](https://docs.adonisjs.com/v6-to-v7)
- [Stripe Node SDK releases](https://github.com/stripe/stripe-node/releases) — pour Priority 2.D

---

Bonne reprise ! 🎉
