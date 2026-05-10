# 🤖 Claude Code Guidelines

> Instructions pour maintenir la cohérence architecturale du boilerplate AdonisJS 6

## 🎯 Architecture Obligatoire

### Repository Pattern
- **TOUJOURS** utiliser `BaseRepository<T>` pour les nouveaux modèles
- **JAMAIS** faire du Lucid direct dans les services
- Hériter et étendre : `class FooRepository extends BaseRepository<typeof Foo>`

```typescript
// ✅ CORRECT
@injectable()
export default class UserRepository extends BaseRepository<typeof User> {
  protected model = User

  async findByEmail(email: string) {
    return this.findOneBy({ email })
  }
}

// ❌ INCORRECT - Lucid direct
const user = await User.findBy('email', email)
```

### Injection de Dépendances (Inversify)
- **TOUJOURS** utiliser `@injectable()` sur les services/repositories
- **TOUJOURS** injecter avec `@inject(TYPES.ServiceName)`
- **TOUJOURS** récupérer via `getService<T>(TYPES.ServiceName)`

```typescript
// ✅ CORRECT
@injectable()
export default class UserService {
  constructor(
    @inject(TYPES.UserRepository) private userRepo: UserRepository,
    @inject(TYPES.CacheService) private cache: CacheService
  ) {}
}

// Dans controller
const userService = getService<UserService>(TYPES.UserService)
```

### Gestion d'Erreurs
- **TOUJOURS** utiliser les exceptions personnalisées : `E.methodName()`
- **JAMAIS** throw Error() direct
- Suivre la hiérarchie : `ValidationException`, `NotFoundException`, etc.

```typescript
// ✅ CORRECT
if (!user) {
  E.userNotFound(userId)
}

// ❌ INCORRECT
throw new Error('User not found')
```

## 🗂️ Structure des Modules

### Organisation par Domaine
```
app/domain_name/
├── controllers/     # HTTP handlers
├── services/        # Business logic
├── repositories/    # Data access (extends BaseRepository)
├── models/          # Lucid models
├── validators/      # Vine validators
└── types/           # TypeScript interfaces
```

### Nommage des Fichiers
- Controllers : `domain_controller.ts` (ex: `users_controller.ts`)
- Services : `domain_service.ts` (ex: `user_service.ts`)
- Repositories : `domain_repository.ts` (ex: `user_repository.ts`)
- Models : `domain.ts` (ex: `user.ts`)

## 📊 Base de Données

### Migrations
- **JAMAIS** créer de nouvelles migrations sans demander
- **TOUJOURS** modifier les migrations existantes si possible
- **TOUJOURS** rollback avant modification : utilisateur confirme

### Soft Deletes
- Si le modèle a `deleted_at: DateTime`, le soft delete est automatique
- **TOUJOURS** utiliser `repository.delete(id, { soft: true })` par défaut
- Utiliser `{ soft: false }` seulement si explicitement demandé

```typescript
// ✅ Par défaut - soft delete
await userRepo.delete(userId)

// ✅ Si hard delete explicitement demandé
await userRepo.delete(userId, { soft: false })
```

### Full-Text Search (PostgreSQL)
- **TOUJOURS** ajouter `search_vector` tsvector lors de la création d'une table
- **TOUJOURS** créer un index GIN sur `search_vector`
- **TOUJOURS** créer un trigger auto-update pour maintenir `search_vector`
- **TOUJOURS** utiliser la configuration `french` pour le français
- **TOUJOURS** définir des poids (A=le plus important, D=le moins important)

```typescript
// ✅ Template pour nouvelle table avec Full-Text Search
async up() {
  this.schema.createTable(this.tableName, (table) => {
    table.uuid('id').primary().defaultTo(this.raw('gen_random_uuid()'))
    // ... autres colonnes ...
  })

  // Add Full-Text Search support
  this.schema.raw(`
    ALTER TABLE ${this.tableName} ADD COLUMN search_vector tsvector;

    CREATE INDEX ${this.tableName}_search_idx ON ${this.tableName} USING GIN(search_vector);

    CREATE OR REPLACE FUNCTION ${this.tableName}_search_trigger() RETURNS trigger AS $$
    BEGIN
      NEW.search_vector :=
        setweight(to_tsvector('french', COALESCE(NEW.column_important, '')), 'A') ||
        setweight(to_tsvector('french', COALESCE(NEW.column_medium, '')), 'B') ||
        setweight(to_tsvector('french', COALESCE(NEW.column_low, '')), 'C');
      RETURN NEW;
    END
    $$ LANGUAGE plpgsql;

    CREATE TRIGGER ${this.tableName}_search_update
    BEFORE INSERT OR UPDATE ON ${this.tableName}
    FOR EACH ROW EXECUTE FUNCTION ${this.tableName}_search_trigger();

    -- Populate existing data
    UPDATE ${this.tableName} SET search_vector =
      setweight(to_tsvector('french', COALESCE(column_important, '')), 'A') ||
      setweight(to_tsvector('french', COALESCE(column_medium, '')), 'B') ||
      setweight(to_tsvector('french', COALESCE(column_low, '')), 'C');
  `)
}

async down() {
  this.schema.raw(`
    DROP TRIGGER IF EXISTS ${this.tableName}_search_update ON ${this.tableName};
    DROP FUNCTION IF EXISTS ${this.tableName}_search_trigger();
    DROP INDEX IF EXISTS ${this.tableName}_search_idx;
  `)
  this.schema.dropTable(this.tableName)
}
```

#### Utilisation dans les Repositories
```typescript
// ✅ Recherche Full-Text dans un repository
async search(query: string, limit: number = 20): Promise<User[]> {
  const result = await this.db
    .from(this.tableName)
    .select('*')
    .select(
      this.db.raw(`ts_rank(search_vector, plainto_tsquery('french', ?)) as rank`, [query])
    )
    .whereRaw(`search_vector @@ plainto_tsquery('french', ?)`, [query])
    .orderBy('rank', 'desc')
    .limit(limit)

  return result as User[]
}
```

## ⚡ Cache & Performance

### Cache Redis
- **TOUJOURS** utiliser les options cache dans les repositories
- **TOUJOURS** définir des tags pertinents pour invalidation
- TTL par défaut : 1800s (30min) pour les entités, 3600s (1h) pour les listes

```typescript
// ✅ CORRECT
const user = await userRepo.findById(id, {
  cache: { ttl: 1800, tags: [`user_${id}`, 'users'] }
})

// ✅ Invalidation lors des mutations
await userRepo.create(data, {
  cache: { tags: ['users'] }
})
```

### Events & Hooks
- Les événements sont automatiques via BaseRepository
- **Sync** : `eventBus.on('model.before_create', handler)` - Validation, transformation
- Events disponibles :
  - Sync : `before_create`, `before_update`, `before_delete`

## 🧪 Test-Driven Development (TDD)

### Workflow TDD OBLIGATOIRE
1. **RED** : Écrire le test qui échoue d'abord
2. **GREEN** : Implémenter le minimum pour que le test passe
3. **REFACTOR** : Améliorer le code en gardant les tests verts

### Exemple TDD Complet
```typescript
// 1. RED - Test d'abord (doit échouer)
test('should create user with hashed password', async ({ assert }) => {
  const userService = getService<UserService>(TYPES.UserService)
  const userData = { email: 'test@example.com', password: 'plain123' }

  const result = await userService.create(userData)

  assert.notEqual(result.password, 'plain123') // Should be hashed
  assert.equal(result.email, userData.email)
})

// 2. GREEN - Implémentation minimale
async create(data: CreateUserData): Promise<User> {
  const hashedPassword = await hash.make(data.password)
  return this.userRepo.create({ ...data, password: hashedPassword })
}

// 3. REFACTOR - Améliorer (validation, cache, etc.)
async create(data: CreateUserData): Promise<User> {
  // Validation métier
  await this.validateUniqueEmail(data.email)

  // Hash password
  const hashedPassword = await hash.make(data.password)

  // Création avec cache
  return this.userRepo.create({
    ...data,
    password: hashedPassword
  }, {
    cache: { tags: ['users'] }
  })
}
```

### Commands de Test
```bash
# TOUJOURS utiliser cette commande simple
npm run test

# Tests en mode watch pour TDD
npm run test -- --watch

# JAMAIS des commandes complexes
# ❌ npm run test -- --grep "specific"
```

### Structure des Tests
- Tests unitaires : `tests/unit/domain/`
- Tests fonctionnels : `tests/functional/domain/`
- **TOUJOURS** écrire les tests AVANT l'implémentation (TDD)
- **TOUJOURS** vérifier que le test échoue d'abord (RED)
- **TOUJOURS** implémenter le minimum (GREEN)
- **TOUJOURS** refactorer après (REFACTOR)

### Mocking pour Tests
```typescript
// ✅ Mock des repositories pour tests unitaires
const mockUserRepo = {
  findById: jest.fn(),
  create: jest.fn(),
  findByEmail: jest.fn(),
} as jest.Mocked<UserRepository>

container.rebind(TYPES.UserRepository).toConstantValue(mockUserRepo)

// ✅ Setup des mocks avant test
mockUserRepo.create.mockResolvedValue(expectedUser)
mockUserRepo.findByEmail.mockResolvedValue(null) // Email unique
```

## 🚀 Development Workflow

### Commandes Principales
```bash
# Développement
npm run dev

# Tests
npm run test

# Linting (si disponible)
npm run lint

# Build (si disponible)
npm run build

# Base de données
node ace migration:run
node ace migration:rollback
```

### Workflow TDD pour Nouvelles Fonctionnalités
1. **RED** : Écrire le test qui échoue
2. **GREEN** : Implémenter le minimum pour passer
3. **REFACTOR** : Améliorer le code
4. **TOUJOURS** run `npm run test`
5. **TOUJOURS** run lint si disponible
6. **JAMAIS** commit sans validation

## 📝 Code Patterns

### Controllers
```typescript
export default class UsersController {
  async store({ request }: HttpContext) {
    // 1. Récupérer service
    const userService = getService<UserService>(TYPES.UserService)

    // 2. Validation (Vine validator)
    const data = await request.validateUsing(createUserValidator)

    // 3. Appel service
    const user = await userService.create(data)

    // 4. Response
    return { user }
  }
}
```

### Services
```typescript
@injectable()
export default class UserService {
  constructor(
    @inject(TYPES.UserRepository) private userRepo: UserRepository
  ) {}

  async create(data: CreateUserData): Promise<User> {
    // 1. Validation métier
    await this.validateUniqueEmail(data.email)

    // 2. Transformation données
    const hashedPassword = await hash.make(data.password)

    // 3. Création via repository
    return this.userRepo.create({
      ...data,
      password: hashedPassword
    })
  }
}
```

### Repositories
```typescript
@injectable()
export default class UserRepository extends BaseRepository<typeof User> {
  protected model = User

  // Méthodes domaine spécifiques
  async findByEmail(email: string): Promise<User | null> {
    return this.findOneBy({ email })
  }

  async findActiveUsers(): Promise<User[]> {
    return this.findBy({ status: 'active' })
  }
}
```

## 🔒 Sécurité

### Authentification
- **TOUJOURS** utiliser le middleware `auth` pour les routes protégées
- **TOUJOURS** accéder à l'utilisateur via `ctx.user` (injecté par AuthMiddleware)
- Session tracking automatique avec `UpdateSessionActivityMiddleware`

### Validation
- **TOUJOURS** utiliser Vine validators
- **JAMAIS** faire confiance aux données utilisateur
- **TOUJOURS** valider format email avec `.email().normalizeEmail()`

## 🎯 Conventions Spécifiques

### Clean Code OBLIGATOIRE

#### Nommage
- **Variables/Méthodes** : `camelCase` explicite (`getUserById` vs `get`)
- **Classes** : `PascalCase` avec intention claire (`UserService` vs `Service`)
- **Constantes** : `UPPER_SNAKE_CASE` (`MAX_RETRY_COUNT`)
- **JAMAIS** d'abréviations (`user` vs `usr`, `calculate` vs `calc`)

#### Fonctions
- **Une responsabilité** par fonction
- **Maximum 20 lignes** par fonction
- **Noms explicites** qui décrivent l'action (`validateUserEmail` vs `validate`)
- **Paramètres** : maximum 3-4, sinon utiliser un objet

```typescript
// ✅ CORRECT - Clean
async createUserWithValidation(userData: CreateUserData): Promise<User> {
  await this.validateUniqueEmail(userData.email)
  const hashedPassword = await this.hashPassword(userData.password)
  return this.persistUser({ ...userData, password: hashedPassword })
}

// ❌ INCORRECT - Pas clean
async create(d: any): Promise<any> {
  if (!d.email) throw new Error('Invalid')
  const u = await User.findBy('email', d.email)
  if (u) throw new Error('Exists')
  const p = await hash.make(d.password)
  return User.create({ ...d, password: p })
}
```

#### Principes SOLID
- **S**ingle Responsibility : Une classe = une responsabilité
- **O**pen/Closed : Extensible sans modification (interfaces)
- **L**iskov Substitution : Les sous-classes remplacent les classes parentes
- **I**nterface Segregation : Interfaces spécialisées vs généralistes
- **D**ependency Inversion : Dépendre d'abstractions (injection)

#### TypeScript
- **TOUJOURS** typer explicitement les paramètres publics
- **TOUJOURS** utiliser les interfaces du domaine
- **JAMAIS** `any` sauf cas exceptionnels avec commentaire
- **TOUJOURS** définir des types métier clairs

```typescript
// ✅ CORRECT
interface CreateUserData {
  email: string
  password: string
  fullName?: string
}

async createUser(userData: CreateUserData): Promise<User>

// ❌ INCORRECT
async createUser(data: any): Promise<any>
```

### Imports
- **TOUJOURS** utiliser les alias : `#shared/`, `#users/`, etc.
- **JAMAIS** d'imports relatifs profonds : `../../../`

### Comments
- **JAMAIS** ajouter de commentaires sauf demande explicite
- Le code doit être self-documenting
- **Exception** : Logique métier complexe nécessitant explication

## 🚫 À NE JAMAIS FAIRE

### Architecture
1. ❌ Bypass du Repository pattern (Lucid direct)
2. ❌ Créer migrations sans permission
3. ❌ Ignorer le container IoC
4. ❌ Créer des exceptions custom sans hiérarchie
5. ❌ Hard delete par défaut
6. ❌ Oublier le cache sur les read operations

### Base de Données
7. ❌ Créer une table sans `search_vector` tsvector
8. ❌ Oublier le GIN index sur `search_vector`
9. ❌ Oublier le trigger auto-update pour `search_vector`
10. ❌ Utiliser autre chose que 'french' pour la langue

### TDD & Tests
11. ❌ Implémenter sans écrire le test d'abord
12. ❌ Tester après implémentation (faire TDD inverse)
13. ❌ Commit sans que tous les tests passent
14. ❌ Ignorer un test qui échoue

### Clean Code
15. ❌ Utiliser `any` sans justification
16. ❌ Fonctions > 20 lignes sans refactoring
17. ❌ Noms non explicites (`d`, `u`, `calc`, `mgr`)
18. ❌ Plus de 4 paramètres dans une fonction
19. ❌ Mélanger les responsabilités dans une classe
20. ❌ Commentaires pour expliquer du code illisible

## 🌍 Internationalization (i18n)

### ⚠️ RÈGLE ABSOLUE : TOUT DOIT ÊTRE MULTILINGUE

**JAMAIS** de texte hardcodé dans les composants React, layouts ou templates !
**TOUJOURS** utiliser `useI18n()` et les clés de traduction pour TOUT texte affiché.

### Langues supportées
- Français (défaut)
- Anglais

### Deux systèmes complémentaires
1. **AdonisJS I18n** : Textes statiques (labels, messages d'erreur)
2. **Champs JSON `_i18n`** : Contenu dynamique (créé par utilisateurs)

### Champs traduisibles en base

- **TOUJOURS** utiliser `TranslatableField` pour contenu dynamique
- **TOUJOURS** fournir FR et EN lors de la création
- **TOUJOURS** adapter les triggers Full-Text Search pour FR + EN

```typescript
// ✅ CORRECT - Création de plan
await planRepository.create({
  nameI18n: { fr: 'Pro', en: 'Pro' },
  descriptionI18n: { fr: 'Plan professionnel', en: 'Professional plan' },
  // ...
})

// ✅ CORRECT - Récupération traduction
import { getTranslation } from '#shared/helpers/translatable'

const locale = localeService.getCurrentLocale()
const name = getTranslation(plan.nameI18n, locale)
```

### Nouvelle table avec champs traduisibles

1. **Migration** : Colonnes `_i18n` en JSONB

```typescript
table.jsonb('name_i18n').notNullable()
table.jsonb('description_i18n').nullable()

// Trigger Full-Text Search multi-langue
this.schema.raw(`
  CREATE OR REPLACE FUNCTION ${this.tableName}_search_trigger() RETURNS trigger AS $$
  BEGIN
    NEW.search_vector :=
      setweight(to_tsvector('french', COALESCE(NEW.name_i18n->>'fr', '')), 'A') ||
      setweight(to_tsvector('english', COALESCE(NEW.name_i18n->>'en', '')), 'A');
    RETURN NEW;
  END
  $$ LANGUAGE plpgsql;
`)
```

2. **Modèle** : Utiliser `TranslatableField`

```typescript
import type { TranslatableField, TranslatableFieldNullable } from '#shared/helpers/translatable'

@column({
  prepare: (value: TranslatableField) => JSON.stringify(value),
  consume: (value: string | TranslatableField) =>
    typeof value === 'string' ? JSON.parse(value) : value,
})
declare nameI18n: TranslatableField

@column({
  prepare: (value: TranslatableFieldNullable | null) =>
    value ? JSON.stringify(value) : null,
  consume: (value: string | TranslatableFieldNullable | null) => {
    if (value === null) return null
    return typeof value === 'string' ? JSON.parse(value) : value
  },
})
declare descriptionI18n: TranslatableFieldNullable | null
```

3. **Tests** : Fournir les deux traductions

```typescript
const plan = await planRepository.create({
  nameI18n: { fr: 'Starter', en: 'Starter' },
  descriptionI18n: { fr: 'Plan de démarrage', en: 'Starter plan' },
  // ...
})

assert.deepEqual(plan.nameI18n, { fr: 'Starter', en: 'Starter' })
```

### Frontend (React i18next)

```tsx
import { useTranslation } from 'react-i18next'
import { getTranslation } from '@/lib/translatable'

export function PlanCard({ plan }) {
  const { t, i18n } = useTranslation()

  return (
    <div>
      {/* Texte statique */}
      <h2>{t('common.welcome')}</h2>

      {/* Champ traduisible */}
      <h3>{getTranslation(plan.nameI18n, i18n.language as 'fr' | 'en')}</h3>
    </div>
  )
}
```

### Ajouter nouvelles traductions statiques

1. **Backend** : `resources/lang/{locale}/{namespace}.json`
2. **Frontend** : `inertia/lib/i18n.ts`

### Frontend (React) - OBLIGATOIRE

**TOUJOURS** importer et utiliser `useI18n()` dans TOUS les composants qui affichent du texte :

```tsx
// ✅ CORRECT - Texte traduit
import { useI18n } from '@/hooks/use-i18n'

export function MyComponent() {
  const { t } = useI18n()

  return <h1>{t('common.my_title')}</h1>
}

// ❌ INCORRECT - Texte hardcodé
export function MyComponent() {
  return <h1>Mon titre</h1>
}
```

**Checklist nouveau composant React :**
1. ✅ Importer `useI18n` en haut du fichier
2. ✅ Appeler `const { t } = useI18n()` dans le composant
3. ✅ Remplacer TOUS les textes par `t('namespace.key')`
4. ✅ Vérifier que les clés existent dans `/resources/lang/fr/*.json` ET `/resources/lang/en/*.json`

### À NE PAS FAIRE

21. ❌ Créer champs traduisibles sans fournir FR et EN
22. ❌ **Hardcoder les textes affichables (titre, label, bouton, etc.)**
23. ❌ Oublier d'adapter les triggers Full-Text Search pour multi-langue
24. ❌ Utiliser string simple au lieu de `TranslatableField`
25. ❌ **Créer un composant React sans `useI18n()` si il affiche du texte**

## 📚 Documentation de Référence

- [Architecture Overview](docs/architecture/overview.md)
- [Repository Pattern](docs/architecture/repository-pattern.md)
- [Authentication System](docs/features/authentication.md)
- [Internationalization (i18n)](docs/features/i18n.md)
- [Full-Text Search](docs/features/full-text-search.md)

---

**Important** : Ces guidelines assurent la cohérence, performance et maintenabilité du codebase. Toujours les respecter dans les futures implémentations.