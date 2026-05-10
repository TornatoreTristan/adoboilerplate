# 🚀 AdonisJS 6 Enterprise Boilerplate

> Un boilerplate AdonisJS 6 moderne avec architecture avancée pour applications d'entreprise

[![AdonisJS](https://img.shields.io/badge/AdonisJS-6.x-purple.svg)](https://adonisjs.com)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-blue.svg)](https://typescriptlang.org)
[![Node.js](https://img.shields.io/badge/Node.js-20+-green.svg)](https://nodejs.org)

**Project start:** 27 sept 2025 | **Last update:** 22 oct 2025 | **Version:** 0.1.5

## ✨ Fonctionnalités

### 🔐 Authentification & Sécurité

- **Authentification complète** - Login/logout avec sessions sécurisées
- **Google OAuth** - Connexion avec Google (auto-création et liaison de compte)
- **Roles & Permissions** - Système RBAC complet avec vérifications granulaires
- **Rate Limiting** - Protection contre les abus avec Redis sliding window
- **GDPR Compliance** - Export données + suppression compte (Articles 17 & 20)

### 👥 Multi-tenancy & Organizations

- **Gestion d'organisations** - Multi-tenant avec contexte utilisateur
- **Invitations** - Système d'invitation avec emails
- **Rôles par organisation** - Permissions contextuelles

### 💳 Billing & Subscriptions

- **Plans & Pricing** - Gestion de plans avec pricing flexible
- **Stripe Integration** - Abonnements et paiements sécurisés
- **Subscription Management** - Pause, annulation, changement de plan

### 📦 Storage & Uploads

- **File Upload System** - Multi-storage (local/S3) avec polymorphic attachments
- **Antivirus Protection** - ClamAV integration pour scanner les fichiers
- **Image Optimization** - Compression, redimensionnement, conversion WebP automatique
- **Validation avancée** - Type MIME, taille, quotas

### 🔔 Notifications & Communication

- **Système de notifications** - Types personnalisables avec préférences utilisateur
- **Real-time Notifications** - Server-Sent Events avec Transmit (SSE)
- **Email System** - Templates + Queue avec Bull + Logs

### 📊 Monitoring & Observability

- **Sentry Integration** - Error tracking production (backend + frontend)
- **Health Checks** - Liveness, readiness, deep health checks
- **Monitoring Dashboard** - Métriques temps réel avec graphiques (CPU, RAM, DB, Redis)
- **System Logs** - Logs centralisés avec full-text search et filtres
- **Audit Logs** - Trail complet des actions utilisateurs avec 41+ événements trackés automatiquement

### 🏗️ Architecture & Performance

- **Repository Pattern** - CRUD avancé avec soft deletes et cache Redis
- **DDD Architecture** - Domain-Driven Design avec IoC Container (Inversify)
- **Cache Redis** - Invalidation par tags et TTL configurable
- **Full-Text Search** - PostgreSQL tsvector, GIN indexes, ranking, multi-langue

### 🌍 Developer Experience

- **Internationalization** - Multi-langue FR/EN (AdonisJS I18n + React i18next)
- **Error Handling** - Système d'exceptions personnalisées robuste
- **Tests complets** - Unit & functional tests avec Japa
- **TypeScript strict** - Types complets pour backend + frontend

## 🛠️ Stack Technique

- **Backend:** AdonisJS 6 + TypeScript
- **Base de données:** PostgreSQL avec Lucid ORM
- **Cache:** Redis avec stratégie de tags
- **Queue:** Bull pour jobs asynchrones (emails, etc.)
- **Storage:** Local filesystem + AWS S3
- **Real-time:** Transmit (Server-Sent Events) pour notifications en temps réel
- **Error Monitoring:** Sentry (backend + frontend)
- **Payments:** Stripe (subscriptions + one-time)
- **DI Container:** Inversify pour l'injection de dépendances
- **Tests:** Japa avec couverture complète
- **Frontend:** Inertia.js + React + TypeScript + shadcn/ui

## 🚀 Installation Rapide

```bash
# 1. Clone et installation
git clone https://github.com/votre-username/boilerplate-adonisjs6.git
cd boilerplate-adonisjs6
npm install

# 2. Configuration
cp .env.example .env
# Configurez vos variables d'environnement

# 3. Services (Docker)
docker-compose up -d

# 4. Base de données
node ace migration:run

# 5. Démarrage
npm run dev
```

## 📖 Documentation

- [📐 Architecture Overview](docs/architecture/overview.md)
- [🏗️ Repository Pattern](docs/architecture/repository-pattern.md)
- [🔐 Authentication System](docs/features/authentication.md)
- [🔑 Google OAuth](docs/features/google-oauth.md)
- [🏢 Organizations & Multi-tenancy](docs/features/organizations.md)
- [📦 File Upload System](docs/features/uploads.md)
- [🔔 Notifications](docs/features/notifications.md)
- [📜 Audit Logs](docs/features/audit-logs.md)
- [⚡ Caching Strategy](docs/architecture/caching.md)
- [🔍 Full-Text Search](docs/features/full-text-search.md)
- [🌍 Internationalization (i18n)](docs/features/i18n.md)
- [🎯 Error Handling](docs/architecture/error-handling.md)
- [🛡️ Rate Limiting](docs/features/rate-limiting.md)

## 🧪 Tests

```bash
# Tous les tests
npm run test

# Tests avec watch
npm run test -- --watch

# Tests spécifiques
npm run test -- --grep "Repository"
```

## 📊 Architecture Highlights

### Repository Pattern avec BaseRepository

```typescript
// CRUD automatique avec cache et événements
const user = await userRepository.create(userData)
await userRepository.delete(userId, { soft: true })
const restored = await userRepository.restore(userId)
```

### Container IoC avec Inversify

```typescript
// Injection de dépendances automatique
@injectable()
class UserService {
  constructor(
    @inject(TYPES.UserRepository) private userRepo: UserRepository,
    @inject(TYPES.CacheService) private cache: CacheService
  ) {}
}
```

### Cache Redis avec Tags

```typescript
// Invalidation intelligente par tags
await cache.set('user:123', user, { tags: ['users', 'user_123'] })
await cache.invalidateTags(['users']) // Invalide tous les utilisateurs
```

### File Upload Multi-Storage

```typescript
// Upload vers S3 avec polymorphic attachment
const upload = await uploadService.uploadFile({
  userId: user.id,
  file: fileBuffer,
  filename: 'avatar.jpg',
  disk: 's3',
  visibility: 'public',
  uploadableType: 'User',
  uploadableId: user.id,
})
```

## 🏗️ Structure du Projet

```
app/
├── auth/                 # Authentification
├── organizations/        # Multi-tenant
├── users/               # Gestion utilisateurs
├── sessions/            # Tracking sessions
├── uploads/             # File upload system
├── notifications/       # Système de notifications
├── audit/               # Audit logs & compliance
├── shared/              # Code partagé
│   ├── container/       # IoC Container
│   ├── repositories/    # BaseRepository
│   ├── services/        # Services métier
│   └── exceptions/      # Gestion erreurs
docs/                    # Documentation
tests/                   # Tests complets
```

## 🎯 Prochaines Étapes

- [x] API Rate Limiting
- [x] Google OAuth Integration
- [x] File Upload System (Local + S3 + Antivirus + Image Optimization)
- [x] Notifications System
- [x] Real-time Notifications (Transmit SSE)
- [x] Full-Text Search (PostgreSQL)
- [x] Internationalization (FR/EN)
- [x] Audit Logs (41+ tracked events)
- [ ] Multi-provider OAuth (GitHub, Facebook)
- [ ] Super-admin Dashboard
- [ ] Email Templates & Mailing

## 🤝 Contribution

Ce boilerplate est conçu pour être un point de départ solide pour vos applications d'entreprise. N'hésitez pas à l'adapter selon vos besoins !

---

**Développé avec ❤️ en utilisant AdonisJS 6**
