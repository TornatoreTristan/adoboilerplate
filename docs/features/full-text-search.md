# 🔍 Full-Text Search

> Système de recherche Full-Text avec PostgreSQL tsvector, GIN indexes et ranking

## 📋 Table des matières

- [Vue d'ensemble](#vue-densemble)
- [Architecture](#architecture)
- [Migrations](#migrations)
- [Utilisation dans les Repositories](#utilisation-dans-les-repositories)
- [Recherche Multi-Tables](#recherche-multi-tables)
- [Optimisation](#optimisation)

## Vue d'ensemble

Le boilerplate intègre un système de recherche Full-Text performant basé sur PostgreSQL. Chaque table dispose d'une colonne `search_vector` de type `tsvector` avec :

- Index GIN pour des performances optimales
- Trigger auto-update pour maintenir les vecteurs de recherche
- Configuration française pour meilleure pertinence
- Système de poids (A=très important → D=peu important)

### Tables indexées

- **Users** : `full_name` (A), `email` (B)
- **Organizations** : `name` (A), `slug` (B), `description` (C), `email` (C), `address` (D)
- **Plans** : `name` (A), `slug` (B), `description` (C), `features` (D)
- **Notifications** : `title` (A), `message` (B), `type` (C)

## Architecture

### Colonne search_vector

```sql
ALTER TABLE users ADD COLUMN search_vector tsvector;
```

La colonne `search_vector` stocke une représentation indexable du contenu searchable.

### Index GIN

```sql
CREATE INDEX users_search_idx ON users USING GIN(search_vector);
```

L'index GIN (Generalized Inverted Index) permet des recherches full-text ultra-rapides.

### Trigger auto-update

```sql
CREATE OR REPLACE FUNCTION users_search_trigger() RETURNS trigger AS $$
BEGIN
  NEW.search_vector :=
    setweight(to_tsvector('french', COALESCE(NEW.full_name, '')), 'A') ||
    setweight(to_tsvector('french', COALESCE(NEW.email, '')), 'B');
  RETURN NEW;
END
$$ LANGUAGE plpgsql;

CREATE TRIGGER users_search_update
BEFORE INSERT OR UPDATE ON users
FOR EACH ROW EXECUTE FUNCTION users_search_trigger();
```

Le trigger met automatiquement à jour `search_vector` à chaque modification.

## Migrations

### Template pour nouvelle table

Lors de la création d'une nouvelle table, **TOUJOURS** ajouter le support Full-Text Search :

```typescript
import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'products'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.uuid('id').primary().defaultTo(this.raw('gen_random_uuid()'))
      table.string('name').notNullable()
      table.text('description').nullable()
      table.string('category').nullable()
      // ... autres colonnes
    })

    // Add Full-Text Search support
    this.schema.raw(`
      ALTER TABLE ${this.tableName} ADD COLUMN search_vector tsvector;

      CREATE INDEX ${this.tableName}_search_idx ON ${this.tableName} USING GIN(search_vector);

      CREATE OR REPLACE FUNCTION ${this.tableName}_search_trigger() RETURNS trigger AS $$
      BEGIN
        NEW.search_vector :=
          setweight(to_tsvector('french', COALESCE(NEW.name, '')), 'A') ||
          setweight(to_tsvector('french', COALESCE(NEW.description, '')), 'B') ||
          setweight(to_tsvector('french', COALESCE(NEW.category, '')), 'C');
        RETURN NEW;
      END
      $$ LANGUAGE plpgsql;

      CREATE TRIGGER ${this.tableName}_search_update
      BEFORE INSERT OR UPDATE ON ${this.tableName}
      FOR EACH ROW EXECUTE FUNCTION ${this.tableName}_search_trigger();

      -- Populate existing data
      UPDATE ${this.tableName} SET search_vector =
        setweight(to_tsvector('french', COALESCE(name, '')), 'A') ||
        setweight(to_tsvector('french', COALESCE(description, '')), 'B') ||
        setweight(to_tsvector('french', COALESCE(category, '')), 'C');
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
}
```

### Choix des poids

Les poids définissent l'importance relative des champs dans le ranking :

- **A** : Champs les plus importants (titres, noms)
- **B** : Champs importants (slugs, emails)
- **C** : Champs moyennement importants (descriptions courtes)
- **D** : Champs peu importants (descriptions longues, métadonnées)

## Utilisation dans les Repositories

### Méthode de recherche simple

```typescript
import { injectable } from 'inversify'
import BaseRepository from '#shared/repositories/base_repository'
import User from '#users/models/user'

@injectable()
export default class UserRepository extends BaseRepository<typeof User> {
  protected model = User

  async search(query: string, limit: number = 20): Promise<User[]> {
    const result = await this.db
      .from(this.tableName)
      .select('*')
      .select(this.db.raw(`ts_rank(search_vector, plainto_tsquery('french', ?)) as rank`, [query]))
      .whereRaw(`search_vector @@ plainto_tsquery('french', ?)`, [query])
      .orderBy('rank', 'desc')
      .limit(limit)

    return result as User[]
  }
}
```

### Méthode avec filtres additionnels

```typescript
async searchActive(query: string, limit: number = 20): Promise<User[]> {
  const result = await this.db
    .from(this.tableName)
    .select('*')
    .select(
      this.db.raw(`ts_rank(search_vector, plainto_tsquery('french', ?)) as rank`, [query])
    )
    .whereRaw(`search_vector @@ plainto_tsquery('french', ?)`, [query])
    .whereNull('deleted_at')
    .where('email_verified_at', '!=', null)
    .orderBy('rank', 'desc')
    .limit(limit)

  return result as User[]
}
```

### Utilisation dans un Service

```typescript
import { injectable, inject } from 'inversify'
import { TYPES } from '#shared/container/types'
import UserRepository from '#users/repositories/user_repository'

@injectable()
export default class SearchService {
  constructor(@inject(TYPES.UserRepository) private userRepo: UserRepository) {}

  async searchUsers(query: string) {
    if (query.length < 2) {
      return []
    }

    return this.userRepo.search(query, 10)
  }
}
```

## Recherche Multi-Tables

### Service de recherche globale

```typescript
import { injectable, inject } from 'inversify'
import { TYPES } from '#shared/container/types'

interface SearchResult {
  type: 'user' | 'organization' | 'plan' | 'notification'
  id: string
  title: string
  description?: string
  rank: number
}

@injectable()
export default class GlobalSearchService {
  constructor(
    @inject(TYPES.UserRepository) private userRepo: UserRepository,
    @inject(TYPES.OrganizationRepository) private orgRepo: OrganizationRepository,
    @inject(TYPES.PlanRepository) private planRepo: PlanRepository
  ) {}

  async search(query: string, limit: number = 20): Promise<SearchResult[]> {
    if (query.length < 2) {
      return []
    }

    const [users, organizations, plans] = await Promise.all([
      this.searchUsers(query),
      this.searchOrganizations(query),
      this.searchPlans(query),
    ])

    const results = [
      ...users.map((u) => this.mapUserToResult(u)),
      ...organizations.map((o) => this.mapOrganizationToResult(o)),
      ...plans.map((p) => this.mapPlanToResult(p)),
    ]

    return results.sort((a, b) => b.rank - a.rank).slice(0, limit)
  }

  private async searchUsers(query: string) {
    return this.userRepo.search(query, 5)
  }

  private async searchOrganizations(query: string) {
    return this.orgRepo.search(query, 5)
  }

  private async searchPlans(query: string) {
    return this.planRepo.search(query, 5)
  }

  private mapUserToResult(user: any): SearchResult {
    return {
      type: 'user',
      id: user.id,
      title: user.fullName || user.email,
      description: user.email,
      rank: user.rank,
    }
  }

  // ... autres mappers
}
```

### Controller de recherche

```typescript
import { HttpContext } from '@adonisjs/core/http'
import { getService } from '#shared/container/container'
import { TYPES } from '#shared/container/types'
import GlobalSearchService from '#search/services/global_search_service'

export default class SearchController {
  async index({ request }: HttpContext) {
    const query = request.input('q', '')
    const limit = request.input('limit', 20)

    const searchService = getService<GlobalSearchService>(TYPES.GlobalSearchService)
    const results = await searchService.search(query, limit)

    return { results }
  }
}
```

## Optimisation

### Performance

1. **Index GIN** : Déjà optimal pour les recherches full-text
2. **Limiter les résultats** : Toujours utiliser `.limit()`
3. **Cache** : Mettre en cache les recherches fréquentes

```typescript
async search(query: string, limit: number = 20): Promise<User[]> {
  const cacheKey = `search:users:${query}:${limit}`

  const cached = await cache.get(cacheKey)
  if (cached) {
    return cached
  }

  const results = await this.db
    .from(this.tableName)
    .select('*')
    .select(
      this.db.raw(`ts_rank(search_vector, plainto_tsquery('french', ?)) as rank`, [query])
    )
    .whereRaw(`search_vector @@ plainto_tsquery('french', ?)`, [query])
    .orderBy('rank', 'desc')
    .limit(limit)

  await cache.set(cacheKey, results, { ttl: 300 }) // 5 minutes

  return results as User[]
}
```

### Requêtes avancées

#### Recherche avec phrase exacte

```typescript
.whereRaw(`search_vector @@ phraseto_tsquery('french', ?)`, [query])
```

#### Recherche avec opérateurs booléens

```typescript
// Recherche "john AND doe"
.whereRaw(`search_vector @@ to_tsquery('french', ?)`, ['john & doe'])

// Recherche "john OR jane"
.whereRaw(`search_vector @@ to_tsquery('french', ?)`, ['john | jane'])

// Recherche "john NOT doe"
.whereRaw(`search_vector @@ to_tsquery('french', ?)`, ['john & !doe'])
```

#### Ranking personnalisé

```typescript
// Normaliser le rank (0-1)
.select(
  this.db.raw(
    `ts_rank_cd(search_vector, plainto_tsquery('french', ?), 32) as rank`,
    [query]
  )
)
```

### Monitoring

Surveiller les performances des recherches :

```sql
-- Voir les stats de l'index
SELECT schemaname, tablename, indexname, idx_scan, idx_tup_read, idx_tup_fetch
FROM pg_stat_user_indexes
WHERE indexname LIKE '%_search_idx';

-- Voir la taille des index
SELECT schemaname, tablename, indexname, pg_size_pretty(pg_relation_size(indexrelid))
FROM pg_stat_user_indexes
WHERE indexname LIKE '%_search_idx';
```

## Checklist pour nouvelle table

Quand vous créez une nouvelle table searchable :

- [ ] Ajouter colonne `search_vector tsvector`
- [ ] Créer index GIN `${tableName}_search_idx`
- [ ] Créer fonction trigger `${tableName}_search_trigger()`
- [ ] Créer trigger `${tableName}_search_update`
- [ ] Utiliser configuration `'french'`
- [ ] Définir poids appropriés (A, B, C, D)
- [ ] Peupler données existantes avec `UPDATE`
- [ ] Implémenter méthode `search()` dans repository
- [ ] Ajouter cleanup dans `down()` de la migration
- [ ] Tester la recherche

---

**Note** : Le Full-Text Search PostgreSQL est performant jusqu'à plusieurs millions de lignes. Pour des volumes très importants (>10M documents), considérer Elasticsearch ou Meilisearch.
