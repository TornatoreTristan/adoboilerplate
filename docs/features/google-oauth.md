# Google OAuth Authentication

> Connexion sécurisée avec Google OAuth 2.0

## Vue d'ensemble

Le système d'authentification Google OAuth permet aux utilisateurs de se connecter avec leur compte Google, créant automatiquement un compte ou liant un compte existant.

**Caractéristiques principales :**

- 🔐 **OAuth 2.0** - Protocole standard et sécurisé
- 👤 **Auto-création** - Création automatique du compte utilisateur
- 🔗 **Liaison de compte** - Lie automatiquement les comptes existants par email
- 📸 **Avatar automatique** - Récupération de la photo de profil Google
- 📊 **Session tracking** - Suivi automatique des sessions OAuth
- 🛡️ **Rate limiting** - Protection contre les abus (10 req/min)

## Architecture

```
┌─────────────┐      ┌──────────────────┐      ┌─────────────┐
│   Google    │─────▶│GoogleAuthController│─────▶│   Google    │
│   Button    │      └──────────────────┘      │   OAuth     │
└─────────────┘              │                  └─────────────┘
                              ▼
                     ┌──────────────────┐
                     │GoogleAuthService │
                     └──────────────────┘
                              │
                    ┌─────────┴─────────┐
                    ▼                   ▼
            ┌──────────────┐   ┌──────────────┐
            │UserRepository│   │SessionService│
            └──────────────┘   └──────────────┘
```

### Composants

1. **GoogleAuthService** (`app/auth/services/google_auth_service.ts`)
   - Gère la logique OAuth (création/liaison)
   - Crée automatiquement les sessions
   - Met à jour le profil à chaque connexion

2. **GoogleAuthController** (`app/auth/controllers/google_auth_controller.ts`)
   - Endpoint de redirection OAuth
   - Endpoint de callback OAuth
   - Gestion des erreurs OAuth

3. **Routes** (`start/routes/google_auth_routes.ts`)
   - `GET /auth/google/redirect` - Démarre le flow OAuth
   - `GET /auth/google/callback` - Callback après authentification

## Configuration

### 1. Google Cloud Console

Créez des identifiants OAuth 2.0 :

1. Allez sur [Google Cloud Console](https://console.cloud.google.com/)
2. Créez un nouveau projet ou sélectionnez-en un
3. Activez l'API "Google+ API"
4. Créez des identifiants OAuth 2.0
5. Configurez l'écran de consentement OAuth
6. Ajoutez les URIs de redirection autorisées :
   - Development: `http://localhost:3333/auth/google/callback`
   - Production: `https://yourdomain.com/auth/google/callback`

### 2. Variables d'environnement

```env
# .env
APP_URL=http://localhost:3333

# Google OAuth
GOOGLE_CLIENT_ID=your-google-client-id-here.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-google-client-secret-here
```

### 3. Configuration Ally

Le fichier `config/ally.ts` est déjà configuré :

```typescript
import env from '#start/env'
import { defineConfig, services } from '@adonisjs/ally'

const allyConfig = defineConfig({
  google: services.google({
    clientId: env.get('GOOGLE_CLIENT_ID'),
    clientSecret: env.get('GOOGLE_CLIENT_SECRET'),
    callbackUrl: `${env.get('APP_URL')}/auth/google/callback`,
  }),
})

export default allyConfig
```

## Utilisation

### Flow OAuth complet

```
1. User clicks "Login with Google"
   ↓
2. GET /auth/google/redirect
   → Redirects to Google OAuth
   ↓
3. User authorizes on Google
   ↓
4. Google redirects to /auth/google/callback
   ↓
5. GoogleAuthService.handleGoogleCallback()
   - Find user by Google ID
   - If not found, find by email
   - If not found, create new user
   - Create session
   ↓
6. User is logged in and redirected to /
```

### Frontend (Inertia.js + React)

```tsx
// resources/js/Pages/Login.tsx
export default function Login() {
  const handleGoogleLogin = () => {
    window.location.href = '/auth/google/redirect'
  }

  return (
    <button onClick={handleGoogleLogin}>
      <img src="/google-icon.svg" alt="Google" />
      Continue with Google
    </button>
  )
}
```

### Frontend (Vanilla HTML)

```html
<a href="/auth/google/redirect" class="btn btn-google">
  <img src="/google-icon.svg" alt="Google" />
  Continue with Google
</a>
```

## Scénarios d'utilisation

### 1. Nouvel utilisateur (pas de compte)

```typescript
// Google OAuth data
{
  providerId: "google-12345",
  email: "newuser@gmail.com",
  name: "John Doe",
  avatar: "https://lh3.googleusercontent.com/..."
}

// Résultat
{
  user: { id, email, googleId, fullName, avatarUrl },
  isNewUser: true,
  sessionId: "session-abc"
}
```

**Action** : Création d'un nouveau compte avec :

- ✅ Email vérifié (Google)
- ✅ Pas de password (OAuth only)
- ✅ Google ID stocké
- ✅ Avatar importé
- ✅ Session créée

### 2. Utilisateur existant avec Google ID

```typescript
// User exists with googleId: "google-12345"
// Google OAuth data
{
  providerId: "google-12345",
  email: "existing@gmail.com",
  name: "John Doe Updated",
  avatar: "https://new-avatar.com/..."
}

// Résultat
{
  user: { id, email, googleId, fullName: "John Doe Updated", ... },
  isNewUser: false,
  sessionId: "session-xyz"
}
```

**Action** : Connexion + mise à jour du profil

- ✅ Nom mis à jour
- ✅ Avatar mis à jour
- ✅ Session créée

### 3. Utilisateur existant par email (liaison)

```typescript
// User exists with email but no googleId
// User: { email: "user@gmail.com", password: "hashed", googleId: null }

// Google OAuth data
{
  providerId: "google-67890",
  email: "user@gmail.com",
  name: "John Doe"
}

// Résultat
{
  user: {
    id,
    email,
    password: "hashed", // conservé
    googleId: "google-67890" // ajouté
  },
  isNewUser: false,
  sessionId: "session-def"
}
```

**Action** : Liaison du compte Google

- ✅ Google ID ajouté au compte existant
- ✅ Password conservé (double auth possible)
- ✅ Session créée

## Base de données

### Migration

Les champs OAuth ont été ajoutés à la table `users` :

```typescript
// database/migrations/..._create_users_table.ts
table.string('password').nullable() // nullable pour OAuth
table.string('google_id').nullable().unique()
table.string('avatar_url').nullable()
```

### Modèle User

```typescript
// app/users/models/user.ts
export default class User extends BaseModel {
  @column()
  declare googleId: string | null

  @column()
  declare avatarUrl: string | null

  @column({ serializeAs: null })
  declare password: string | null // nullable
}
```

## API GoogleAuthService

### `handleGoogleCallback(oauthData, sessionContext?)`

Gère le callback OAuth et retourne le résultat.

```typescript
const result = await googleAuthService.handleGoogleCallback(
  {
    providerId: googleUser.id,
    provider: 'google',
    email: googleUser.email,
    name: googleUser.name,
    avatar: googleUser.avatarUrl,
  },
  {
    ipAddress: request.ip(),
    userAgent: request.header('user-agent'),
    utmSource: request.input('utm_source'),
    utmMedium: request.input('utm_medium'),
    utmCampaign: request.input('utm_campaign'),
    referrer: request.header('referer'),
  }
)

// result: { user, isNewUser, sessionId }
```

### `findByGoogleId(googleId)`

Trouve un utilisateur par son Google ID.

```typescript
const user = await googleAuthService.findByGoogleId('google-12345')
// user: User | null
```

## Gestion des erreurs

Le contrôleur gère automatiquement les erreurs OAuth :

```typescript
// GoogleAuthController.callback()

if (google.accessDenied()) {
  // User refused authorization
  return response.redirect('/')
}

if (google.stateMisMatch()) {
  // CSRF protection failed
  return response.redirect('/')
}

if (google.hasError()) {
  // Other OAuth error
  return response.redirect('/')
}
```

Pour une gestion plus fine des erreurs :

```typescript
try {
  const result = await googleAuthService.handleGoogleCallback(oauthData)
  // Success
} catch (error) {
  if (error.code === 'USER_EMAIL_ALREADY_EXISTS') {
    // Email exists with different provider
  }
  // Handle other errors
}
```

## Sécurité

### Rate Limiting

Les routes OAuth sont protégées :

```typescript
// start/routes/google_auth_routes.ts
router
  .group(() => {
    router.get('/google/redirect', ...)
    router.get('/google/callback', ...)
  })
  .use([middleware.throttle({
    maxRequests: 10,
    windowMs: 60000,
    keyPrefix: 'oauth'
  })])
```

### CSRF Protection

AdonisJS Ally gère automatiquement :

- State parameter pour CSRF
- Validation du state au callback
- Expiration du state (10 minutes)

### Validation des données

```typescript
// Le service valide automatiquement
- Email unique (par Google ID et email)
- Provider ID unique
- Email format valide (via Google)
```

## Tests

### Tests unitaires

```bash
npm run test -- tests/unit/auth/services/google_auth_service.spec.ts
```

**Tests couverts** :

- ✅ Création nouveau user OAuth
- ✅ Login user existant (Google ID)
- ✅ Liaison compte existant (email)
- ✅ Mise à jour profil
- ✅ Recherche par Google ID
- ✅ Gestion champs optionnels
- ✅ Création session

## Personnalisation

### Redirection après login

```typescript
// app/auth/controllers/google_auth_controller.ts
async callback({ ally, session, response }: HttpContext) {
  // ...
  const result = await googleAuthService.handleGoogleCallback(...)

  session.put('user_id', result.user.id)

  // Personnaliser la redirection
  if (result.isNewUser) {
    return response.redirect('/onboarding')
  }

  return response.redirect('/dashboard')
}
```

### Scopes additionnels

```typescript
// config/ally.ts
google: services.google({
  clientId: env.get('GOOGLE_CLIENT_ID'),
  clientSecret: env.get('GOOGLE_CLIENT_SECRET'),
  callbackUrl: `${env.get('APP_URL')}/auth/google/callback`,
  scopes: ['openid', 'profile', 'email', 'https://www.googleapis.com/auth/calendar.readonly'],
}),
```

### Données supplémentaires

```typescript
// GoogleAuthController.callback()
const googleUser = await google.user()

// Accéder aux tokens
const { token, refreshToken, expiresAt } = googleUser.token

// Stocker si nécessaire
await userRepository.update(user.id, {
  googleAccessToken: token.token,
  googleRefreshToken: refreshToken,
})
```

## Bonnes pratiques

### 1. Double authentification

Les utilisateurs peuvent avoir à la fois password et Google OAuth :

```typescript
// User peut login avec :
- Email + Password (auth classique)
- Google OAuth (si googleId existe)
```

### 2. Migration users existants

```typescript
// Encourager les users à lier Google
if (!user.googleId) {
  // Show "Link with Google" button
}
```

### 3. Avatar par défaut

```typescript
// Si pas d'avatar Google
const avatar = user.avatarUrl || generateDefaultAvatar(user.fullName)
```

### 4. Email verification

Les emails Google sont déjà vérifiés :

```typescript
if (user.googleId) {
  user.emailVerified = true
}
```

## Debugging

### Tester localement

1. Configurez les credentials Google pour `localhost:3333`
2. Lancez le serveur : `npm run dev`
3. Visitez : `http://localhost:3333/auth/google/redirect`
4. Autorisez l'application
5. Vous serez redirigé vers `/`

### Logs

```typescript
// Ajouter des logs pour déboguer
console.log('Google user:', googleUser)
console.log('OAuth result:', result)
```

### Erreurs courantes

**"redirect_uri_mismatch"**

- Vérifiez que l'URL de callback est identique dans :
  - Google Cloud Console
  - Votre `.env` (APP_URL)
  - `config/ally.ts`

**"invalid_client"**

- Vérifiez GOOGLE_CLIENT_ID et GOOGLE_CLIENT_SECRET

**"access_denied"**

- L'utilisateur a refusé l'autorisation (normal)

## Limitations

1. **Pas de refresh token par défaut** - Ajoutez le scope `access_type=offline`
2. **Pas de révocation automatique** - Implémentez si nécessaire
3. **Un seul provider OAuth** - GitHub, Facebook, etc. nécessitent d'autres services

## Prochaines améliorations

- [ ] Support multi-provider (GitHub, Facebook)
- [ ] Gestion refresh tokens
- [ ] Révocation OAuth
- [ ] Import contacts Google
- [ ] Synchronisation calendrier

## Références

- [AdonisJS Ally Documentation](https://docs.adonisjs.com/guides/auth/social)
- [Google OAuth 2.0](https://developers.google.com/identity/protocols/oauth2)
- [Google Cloud Console](https://console.cloud.google.com/)
