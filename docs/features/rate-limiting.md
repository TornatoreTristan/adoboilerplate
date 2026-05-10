# Rate Limiting

> Protection contre les abus d'API avec Redis sliding window algorithm

## Vue d'ensemble

Le système de rate limiting protège votre application contre les abus en limitant le nombre de requêtes qu'un client peut effectuer dans un intervalle de temps donné.

**Caractéristiques principales :**

- ⚡ **Sliding window algorithm** - Limite précise sans pics de trafic
- 🎯 **Stratégies multiples** - Par IP, par utilisateur, ou globale
- 🚀 **Performant** - Basé sur Redis avec opérations atomiques
- 📊 **Headers standards** - `X-RateLimit-*` et `Retry-After`
- 🔧 **Configurable** - Limites et fenêtres personnalisables par route

## Architecture

```
┌─────────────┐      ┌──────────────────┐      ┌─────────────┐
│   Request   │─────▶│ ThrottleMiddleware│─────▶│    Redis    │
└─────────────┘      └──────────────────┘      └─────────────┘
                              │
                              ▼
                     ┌─────────────────┐
                     │ RateLimitService │
                     └─────────────────┘
```

### Composants

1. **RateLimitService** (`app/shared/services/rate_limit_service.ts`)
   - Logique de limitation avec sliding window
   - Opérations atomiques Redis (MULTI/EXEC)
   - Gestion des clés avec TTL automatique

2. **ThrottleMiddleware** (`app/middleware/throttle_middleware.ts`)
   - Middleware AdonisJS configurable
   - Extraction de l'identifiant (IP/User/Global)
   - Ajout des headers HTTP standards

3. **Types** (`app/shared/types/rate_limit.ts`)
   - `RateLimitConfig` - Configuration du middleware
   - `RateLimitResult` - Résultat de la vérification
   - `RateLimitStrategy` - Stratégies disponibles

## Utilisation

### Configuration de base

```typescript
import { middleware } from '#start/kernel'

// Dans vos routes
router.post('/api/endpoint', [Controller, 'method']).use([
  middleware.throttle({
    maxRequests: 100, // Maximum de requêtes
    windowMs: 60000, // Fenêtre en millisecondes (1 minute)
  }),
])
```

### Stratégies disponibles

#### 1. Par IP (défaut)

Limite basée sur l'adresse IP du client.

```typescript
middleware.throttle({
  maxRequests: 100,
  windowMs: 60000,
  strategy: 'ip', // Par défaut
})
```

**Utilisation recommandée :** Routes publiques, APIs non-authentifiées

#### 2. Par utilisateur

Limite basée sur l'ID de l'utilisateur authentifié.

```typescript
router.post('/api/user-action', [Controller, 'action']).use([
  middleware.auth(), // Requis
  middleware.throttle({
    maxRequests: 50,
    windowMs: 60000,
    strategy: 'user',
  }),
])
```

**Utilisation recommandée :** Actions utilisateur authentifié, prévention spam

#### 3. Globale

Limite partagée pour tous les clients.

```typescript
middleware.throttle({
  maxRequests: 1000,
  windowMs: 60000,
  strategy: 'global',
})
```

**Utilisation recommandée :** Protection ressources limitées, quotas globaux

### Préfixes de clés

Utilisez `keyPrefix` pour isoler les limites par route :

```typescript
// Route 1
router.post('/login', [AuthController, 'login']).use([
  middleware.throttle({
    maxRequests: 5,
    windowMs: 60000,
    keyPrefix: 'login',
  }),
])

// Route 2 (limite indépendante)
router.post('/register', [AuthController, 'register']).use([
  middleware.throttle({
    maxRequests: 3,
    windowMs: 60000,
    keyPrefix: 'register',
  }),
])
```

## Exemples de configuration

### Routes d'authentification

```typescript
// Login - strict (5 tentatives / minute)
router.post('/auth/login', [AuthController, 'login']).use([
  middleware.throttle({
    maxRequests: 5,
    windowMs: 60000,
    keyPrefix: 'login',
  }),
])

// Logout - permissif (20 requêtes / minute)
router.post('/auth/logout', [AuthController, 'logout']).use([
  middleware.throttle({
    maxRequests: 20,
    windowMs: 60000,
  }),
])
```

### Réinitialisation de mot de passe

```typescript
// Forgot password - très strict (3 demandes / 5 minutes)
router.post('/password/forgot', [PasswordResetController, 'forgot']).use([
  middleware.throttle({
    maxRequests: 3,
    windowMs: 300000, // 5 minutes
    keyPrefix: 'password-forgot',
  }),
])

// Reset password - modéré (5 tentatives / 5 minutes)
router.post('/password/reset', [PasswordResetController, 'reset']).use([
  middleware.throttle({
    maxRequests: 5,
    windowMs: 300000,
    keyPrefix: 'password-reset',
  }),
])
```

### API générale

```typescript
// API publique - standard (100 requêtes / minute)
router
  .group(() => {
    router.get('/posts', [PostController, 'index'])
    router.get('/posts/:id', [PostController, 'show'])
  })
  .prefix('/api')
  .use([
    middleware.throttle({
      maxRequests: 100,
      windowMs: 60000,
      strategy: 'ip',
    }),
  ])

// API authentifiée - plus permissif (200 requêtes / minute)
router
  .group(() => {
    router.post('/posts', [PostController, 'store'])
    router.put('/posts/:id', [PostController, 'update'])
  })
  .prefix('/api')
  .use([
    middleware.auth(),
    middleware.throttle({
      maxRequests: 200,
      windowMs: 60000,
      strategy: 'user',
    }),
  ])
```

## Headers HTTP

### Requête autorisée

```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1735566000  (timestamp Unix)
```

### Requête bloquée (429 Too Many Requests)

```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 0
X-RateLimit-Reset: 1735566000
Retry-After: 45  (secondes)
```

### Réponse d'erreur

```json
{
  "error": "Too many requests. Please try again in 45 seconds.",
  "code": "RATE_LIMIT_EXCEEDED",
  "status": 429
}
```

## Implémentation technique

### Sliding Window Algorithm

Le service utilise Redis Sorted Sets pour implémenter un sliding window précis :

```typescript
// Pseudo-code
1. Supprimer les entrées expirées (ZREMRANGEBYSCORE)
2. Ajouter nouvelle requête avec timestamp (ZADD)
3. Compter les requêtes dans la fenêtre (ZCARD)
4. Définir expiration de la clé (PEXPIRE)

// Toutes les opérations sont atomiques (MULTI/EXEC)
```

**Avantages :**

- ✅ Pas de pics de trafic en début de fenêtre
- ✅ Limite exacte en temps réel
- ✅ Performant (O(log N) par requête)
- ✅ Opérations atomiques (thread-safe)

### Structure des clés Redis

```
ratelimit:{prefix}:{identifier}
│         │        │
│         │        └─▶ IP, User ID, ou "global"
│         └──────────▶ Préfixe personnalisé (login, api, etc.)
└────────────────────▶ Namespace global

Exemples:
ratelimit:login:192.168.1.1
ratelimit:api:user-abc123
ratelimit:default:global
```

### Gestion de la concurrence

Le service gère correctement les requêtes concurrentes grâce à :

- **Opérations atomiques Redis** (MULTI/EXEC)
- **Pas de race conditions** entre lecture/écriture
- **Compteur précis** même sous charge

## Tests

### Tests unitaires

```bash
npm run test -- tests/unit/shared/services/rate_limit_service.spec.ts
```

Tests couverts :

- ✅ Autorisation sous la limite
- ✅ Blocage au-dessus de la limite
- ✅ Sliding window fonctionnel
- ✅ Préfixes de clés personnalisés
- ✅ Requêtes concurrentes
- ✅ Reset après expiration
- ✅ Timestamps précis
- ✅ Identifiants indépendants

### Tests fonctionnels

```bash
npm run test -- tests/functional/middlewares/throttle_middleware.spec.ts
```

## Monitoring et débogage

### Vérifier les clés Redis

```bash
# Voir toutes les clés de rate limiting
redis-cli KEYS "ratelimit:*"

# Voir le contenu d'une clé spécifique
redis-cli ZRANGE "ratelimit:login:192.168.1.1" 0 -1 WITHSCORES

# Voir le TTL restant
redis-cli TTL "ratelimit:login:192.168.1.1"
```

### Logs

Le middleware log automatiquement les requêtes bloquées :

```
WARN: Too many requests. Please try again in 45 seconds.
  request_id: "abc123"
  x-request-id: "abc123"
```

## Bonnes pratiques

### 1. Choisir les bonnes limites

```typescript
// ❌ Trop permissif - vulnérable aux abus
middleware.throttle({ maxRequests: 10000, windowMs: 60000 })

// ✅ Équilibré - protège sans frustrer les utilisateurs
middleware.throttle({ maxRequests: 100, windowMs: 60000 })

// ⚠️ Très strict - seulement pour actions sensibles
middleware.throttle({ maxRequests: 3, windowMs: 300000 })
```

### 2. Stratégies par cas d'usage

| Cas d'usage               | Stratégie | Limite recommandée |
| ------------------------- | --------- | ------------------ |
| Login                     | IP        | 5 req/min          |
| Forgot password           | IP        | 3 req/5min         |
| API lecture publique      | IP        | 100 req/min        |
| API écriture authentifiée | User      | 50 req/min         |
| Webhook externe           | Global    | 1000 req/min       |

### 3. Préfixes de clés

Toujours utiliser `keyPrefix` pour isoler les limites :

```typescript
// ✅ Limites indépendantes
router.post('/login', ...).use([
  middleware.throttle({ ..., keyPrefix: 'login' })
])

// ❌ Partage la même limite
router.post('/login', ...).use([
  middleware.throttle({ ... }) // keyPrefix = URL (peut varier)
])
```

### 4. Combinaison avec auth

Pour les routes authentifiées, utilisez `strategy: 'user'` :

```typescript
// ✅ Limite par utilisateur
router.use([
  middleware.auth(),
  middleware.throttle({ strategy: 'user', ... })
])

// ⚠️ Limite par IP (moins précis pour users authentifiés)
router.use([
  middleware.auth(),
  middleware.throttle({ strategy: 'ip', ... })
])
```

## Configuration IoC

Le service est automatiquement enregistré dans le container :

```typescript
// app/shared/container/types.ts
RateLimitService: Symbol.for('RateLimitService')

// app/shared/container/container.ts
container.bind<RateLimitService>(TYPES.RateLimitService).to(RateLimitService).inSingletonScope()
```

## Limitations connues

1. **Dépendance Redis** - Requiert Redis disponible
2. **Pas de persistance** - Reset si Redis redémarre
3. **Pas de whitelist** - Tous les clients sont limités

## Prochaines améliorations

- [ ] Whitelist d'IPs/Users exemptés
- [ ] Dashboard de monitoring temps réel
- [ ] Alertes sur abus détectés
- [ ] Stratégies adaptatives (augmente limite pour bons clients)
- [ ] Export métriques (Prometheus/Grafana)

## Références

- [Redis Sorted Sets](https://redis.io/docs/data-types/sorted-sets/)
- [RFC 6585 - HTTP Status Code 429](https://tools.ietf.org/html/rfc6585)
- [Rate Limiting Best Practices](https://cloud.google.com/architecture/rate-limiting-strategies-techniques)
