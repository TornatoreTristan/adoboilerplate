# 📐 Architecture Overview

Ce boilerplate utilise une architecture moderne inspirée du **Domain-Driven Design (DDD)** avec des patterns éprouvés pour créer des applications maintenables et scalables.

## 🏗️ Principes Architecturaux

### 1. Domain-Driven Design (DDD)

L'application est organisée par domaines métier :

- `auth/` - Authentification et autorisation
- `users/` - Gestion des utilisateurs
- `organizations/` - Multi-tenancy et organisations
- `sessions/` - Tracking et audit des sessions
- `shared/` - Code partagé entre domaines

### 2. Inversion of Control (IoC)

Utilisation d'**Inversify** pour l'injection de dépendances :

- Découplage des composants
- Tests plus faciles avec mocking
- Configuration centralisée dans `shared/container/`

### 3. Repository Pattern

Abstraction de la couche données avec **BaseRepository** :

- CRUD standardisé pour tous les modèles
- Cache automatique avec Redis
- Soft deletes intégrés
- Hooks pour événements

## 🎯 Structure par Couches

```
┌─────────────────────────────────────┐
│            Presentation             │  ← Controllers, Middleware
├─────────────────────────────────────┤
│             Application             │  ← Services, Use Cases
├─────────────────────────────────────┤
│              Domain                 │  ← Models, Entities
├─────────────────────────────────────┤
│           Infrastructure            │  ← Repositories, Cache, Queue
└─────────────────────────────────────┘
```

### Presentation Layer

- **Controllers** : Gestion des requêtes HTTP
- **Middleware** : Auth, validation, contexte organisation
- **Validators** : Validation des données entrantes

### Application Layer

- **Services** : Logique métier et use cases
- **Events** : Événements domaine avec Bull queues
- **DTOs** : Objets de transfert de données

### Domain Layer

- **Models** : Entités Lucid avec relations
- **Exceptions** : Erreurs métier personnalisées
- **Types** : Interfaces et types TypeScript

### Infrastructure Layer

- **Repositories** : Accès données avec BaseRepository
- **Cache** : Redis avec invalidation par tags
- **Queue** : Bull pour événements asynchrones
- **Database** : PostgreSQL avec migrations

## 🔧 Container IoC avec Inversify

### Configuration

```typescript
// shared/container/container.ts
const container = new Container()

// Services
container.bind<CacheService>(TYPES.CacheService).to(RedisCacheService)
container.bind<EventBusService>(TYPES.EventBus).to(BullEventBusService)

// Repositories
container.bind<UserRepository>(TYPES.UserRepository).to(UserRepository)
```

### Injection dans les Services

```typescript
@injectable()
export class UserService {
  constructor(
    @inject(TYPES.UserRepository) private userRepo: UserRepository,
    @inject(TYPES.CacheService) private cache: CacheService,
    @inject(TYPES.EventBus) private eventBus: EventBusService
  ) {}
}
```

### Utilisation dans les Controllers

```typescript
export default class UsersController {
  async store({ request }: HttpContext) {
    const userService = getService<UserService>(TYPES.UserService)
    return userService.create(request.only(['email', 'password']))
  }
}
```

## 🗄️ Repository Pattern

### BaseRepository Générique

Tous les repositories héritent du `BaseRepository<T>` qui fournit :

```typescript
class UserRepository extends BaseRepository<typeof User> {
  protected model = User

  // Méthodes automatiques disponibles :
  // findById, create, update, delete, restore
  // findAll, findBy, exists, count, paginate

  // Méthodes personnalisées
  async findByEmail(email: string) {
    return this.findOneBy({ email })
  }
}
```

### Fonctionnalités Intégrées

- **CRUD complet** avec validation
- **Soft deletes** automatiques si `deleted_at` existe
- **Cache Redis** avec invalidation intelligente
- **Hooks** : `beforeCreate`, `afterUpdate`, etc.
- **Events** : Émission automatique d'événements

## ⚡ Système de Cache

### Cache avec Tags Redis

```typescript
// Cache avec tags pour invalidation groupée
await cache.set('user:123', user, {
  ttl: 3600,
  tags: ['users', 'user_123'],
})

// Invalidation par tag
await cache.invalidateTags(['users']) // Invalide tous les utilisateurs
```

### Stratégie de Cache

- **Entités** : `model:id` (ex: `user:123`)
- **Listes** : `model_list` avec critères (ex: `users_active`)
- **Invalidation** : Par tags lors des mutations

## 🎪 Système d'Événements

### Event Bus avec Bull Queues

```typescript
// Émission d'événement
await eventBus.emit('user.created', { user })

// Écoute d'événement
eventBus.on('user.created', async ({ user }) => {
  // Envoyer email de bienvenue
  await emailService.sendWelcome(user)
})
```

### Types d'Événements

- **Synchrones** : Validation, transformation
- **Asynchrones** : Emails, notifications, analytics

## 🔐 Gestion des Erreurs

### Hiérarchie d'Exceptions

```typescript
AppException (base)
├── ValidationException (400)
├── AuthenticationException (401)
├── AuthorizationException (403)
├── NotFoundException (404)
└── BusinessException (422)
```

### Utilisation

```typescript
// Dans un service
if (!user) {
  E.userNotFound(userId) // Throw NotFoundException
}

// Validation automatique
E.validateEmail(email) // Throw ValidationException si invalide
```

## 🧪 Testing Strategy

### Organisation des Tests

```
tests/
├── unit/              # Tests unitaires
│   ├── auth/
│   ├── users/
│   └── shared/
└── functional/        # Tests d'intégration
    ├── auth/
    └── middleware/
```

### Mocking avec Container

```typescript
// Test avec mock services
const mockCache = createMockCache()
container.rebind(TYPES.CacheService).toConstantValue(mockCache)
```

## 🚀 Avantages de cette Architecture

### Maintenabilité

- **Séparation des responsabilités** claire
- **Code réutilisable** avec BaseRepository
- **Testing** facilité par l'injection de dépendances

### Performance

- **Cache intelligent** avec invalidation par tags
- **Événements asynchrones** pour les tâches lourdes
- **Soft deletes** pour préserver les performances

### Scalabilité

- **Architecture modulaire** par domaine
- **Services découplés** via IoC
- **Queue system** pour la charge

### Developer Experience

- **TypeScript** pour la sécurité des types
- **Patterns cohérents** dans tout le projet
- **Documentation** intégrée

---

Cette architecture fournit une base solide pour des applications d'entreprise complexes tout en gardant une simplicité d'utilisation au quotidien.
