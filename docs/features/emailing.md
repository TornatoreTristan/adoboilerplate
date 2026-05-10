# 📧 Système d'Emailing

Système d'envoi d'emails **provider-agnostic** basé sur SMTP, support des queues asynchrones et templates HTML / React Email.

## 🎯 Fonctionnalités

- ✅ Provider-agnostic via interface `MailProvider` (SMTP par défaut, fallback `log` pour dev/test)
- ✅ Compatible avec n'importe quel provider SMTP (Scaleway TEM, Mailgun, SendGrid, Postmark, Brevo, ...)
- ✅ Envoi synchrone et asynchrone via queue
- ✅ Templates HTML et React Email
- ✅ Gestion des priorités (high, normal, low)
- ✅ Support des pièces jointes
- ✅ CC, BCC, Reply-To
- ✅ Tags pour tracking (transmis en headers SMTP `X-Mail-Tag-*`)
- ✅ Retry automatique avec backoff exponentiel

## 📦 Configuration

### Variables d'environnement

```env
# Driver: smtp | log
MAIL_DRIVER=smtp

# Configuration SMTP (Scaleway TEM par défaut)
MAIL_SMTP_HOST=smtp.tem.scw.cloud
MAIL_SMTP_PORT=587
MAIL_SMTP_SECURE=false
MAIL_SMTP_USER=your-smtp-username
MAIL_SMTP_PASSWORD=your-smtp-password

EMAIL_FROM_ADDRESS=noreply@yourdomain.com
EMAIL_FROM_NAME=Mon Application
```

### Drivers disponibles

| Driver | Usage                | Description                                                 |
| ------ | -------------------- | ----------------------------------------------------------- |
| `smtp` | Production / staging | Envoi réel via nodemailer (universel SMTP)                  |
| `log`  | Tests / dev local    | Logue chaque mail dans la sortie applicative, n'envoie rien |

### Changer de provider SMTP

Il suffit de modifier les `MAIL_SMTP_*`. Pour utiliser **SendGrid**, **Mailgun**, **Postmark**, **Brevo**, etc., il n'y a aucun changement de code à faire — uniquement les credentials SMTP.

| Provider     | Host                   | Port | Secure |
| ------------ | ---------------------- | ---- | ------ |
| Scaleway TEM | `smtp.tem.scw.cloud`   | 587  | false  |
| Mailgun      | `smtp.mailgun.org`     | 587  | false  |
| SendGrid     | `smtp.sendgrid.net`    | 587  | false  |
| Postmark     | `smtp.postmarkapp.com` | 587  | false  |
| Brevo        | `smtp-relay.brevo.com` | 587  | false  |

## 🚀 Utilisation

### Envoi simple (synchrone)

```typescript
import { getService } from '#shared/container/container'
import { TYPES } from '#shared/container/types'
import EmailService from '#mailing/services/email_service'

const emailService = getService<EmailService>(TYPES.EmailService)

await emailService.send({
  to: 'user@example.com',
  subject: 'Bienvenue !',
  html: '<h1>Bonjour</h1><p>Bienvenue sur notre plateforme</p>',
})
```

### Envoi asynchrone (via queue)

```typescript
const jobId = await emailService.queue({
  to: 'user@example.com',
  subject: 'Newsletter',
  html: '<p>Contenu de la newsletter</p>',
  priority: 'low',
  delay: 60000, // Délai en ms
})
```

### Templates prédéfinis

#### Welcome Email

```typescript
await emailService.sendWelcomeEmail('user@example.com', {
  userName: 'John Doe',
  loginUrl: 'https://app.example.com/login',
})
```

#### Password Reset Email

```typescript
await emailService.sendPasswordResetEmail('user@example.com', {
  userName: 'John Doe',
  resetUrl: 'https://app.example.com/reset/token123',
  expiresIn: '15 minutes',
})
```

### Options avancées

#### Destinataires multiples

```typescript
await emailService.send({
  to: ['user1@example.com', 'user2@example.com'],
  subject: 'Notification',
  html: '<p>Message</p>',
})
```

#### CC et BCC

```typescript
await emailService.send({
  to: 'user@example.com',
  cc: 'manager@example.com',
  bcc: ['archive@example.com', 'audit@example.com'],
  subject: 'Rapport',
  html: '<p>Contenu du rapport</p>',
})
```

#### Pièces jointes

```typescript
await emailService.send({
  to: 'user@example.com',
  subject: 'Document',
  html: '<p>Voir pièce jointe</p>',
  attachments: [
    {
      filename: 'rapport.pdf',
      content: Buffer.from('...'), // ou base64 string
    },
  ],
})
```

#### Tags pour tracking

```typescript
await emailService.send({
  to: 'user@example.com',
  subject: 'Bienvenue',
  html: '<p>Message</p>',
  tags: {
    category: 'welcome',
    user_id: '123',
    campaign: 'onboarding',
  },
})
```

## 🎨 Créer un nouveau template

### 1. Créer le type

```typescript
// app/mailing/types/email.ts
export interface MyEmailData {
  userName: string
  actionUrl: string
}
```

### 2. Créer le template HTML

```typescript
// app/mailing/templates/my_email.ts
import type { MyEmailData } from '#mailing/types/email'

export function getMyEmailHtml(data: MyEmailData): string {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family: sans-serif; background-color: #f6f9fc;">
  <table width="600" style="margin: 0 auto; background-color: #ffffff; padding: 20px;">
    <tr>
      <td>
        <h1>Bonjour ${data.userName}</h1>
        <p>Votre message personnalisé ici.</p>
        <a href="${data.actionUrl}" style="display: inline-block; background-color: #5469d4; color: #fff; padding: 12px 24px; text-decoration: none; border-radius: 5px;">
          Action
        </a>
      </td>
    </tr>
  </table>
</body>
</html>
  `.trim()
}

export default getMyEmailHtml
```

### 3. Ajouter une méthode au service (optionnel)

```typescript
// app/mailing/services/email_service.ts
async sendMyEmail(to: string, data: MyEmailData): Promise<EmailResult> {
  return this.send({
    to,
    subject: 'Mon Email',
    html: getMyEmailHtml(data),
    tags: { category: 'my-email' },
  })
}
```

## ⚙️ Queue et Retry

Les emails mis en queue bénéficient de :

- **3 tentatives** maximum
- **Backoff exponentiel** : 5s, 25s, 125s
- **Priorités** :
  - `high` = 1 (traité en premier)
  - `normal` = 2 (par défaut)
  - `low` = 3 (traité en dernier)

## 🔍 Monitoring

Les jobs d'email loggent automatiquement :

```
[SendEmailJob] Processing email to user@example.com
[SendEmailJob] Email sent successfully. ID: abc123
```

En cas d'erreur :

```
[SendEmailJob] Failed to send email: Invalid email address
```

## 📊 Architecture

```
app/mailing/
├── providers/
│   ├── mail_provider.ts        # Interface MailProvider (Strategy pattern)
│   ├── smtp_provider.ts        # Driver nodemailer (production)
│   └── log_provider.ts         # Driver dev/test (no-op + log)
├── services/
│   └── email_service.ts        # Service principal — consomme MailProvider via DI
├── jobs/
│   └── send_email_job.ts       # Job queue processor
├── templates/
│   ├── welcome_email.ts        # Template bienvenue
│   └── password_reset_email.ts # Template reset password
└── types/
    └── email.ts                # Types TypeScript
```

`EmailService` ne connaît jamais le provider concret : il reçoit un `MailProvider` via le container IoC. Le binding est conditionnel sur `MAIL_DRIVER` dans `app/shared/container/container.ts`. Pour ajouter un nouveau provider (ex : driver natif d'un SaaS), il suffit d'implémenter `MailProvider` et d'ajouter le binding.

## 🎯 Bonnes pratiques

1. **Toujours utiliser la queue** pour les envois non critiques
2. **Utiliser les tags** pour tracker les emails (transmis en headers SMTP)
3. **Tester les templates** avec différentes tailles de données
4. **Limiter les pièces jointes** à 10MB max
5. **Valider les emails** avant envoi
6. **En tests** : `MAIL_DRIVER=log` évite toute dépendance externe

## 🚨 Gestion d'erreurs

```typescript
const result = await emailService.send({...})

if (!result.success) {
  logger.error(`Email failed: ${result.error}`)
  // Gérer l'erreur
}
```

Pour les queues, les erreurs sont automatiquement retryées 3 fois avant d'échouer définitivement.

## 📝 Types disponibles

```typescript
interface SendEmailData {
  to: string | string[]
  subject: string
  html?: string
  text?: string
  replyTo?: string
  cc?: string | string[]
  bcc?: string | string[]
  attachments?: EmailAttachment[]
  tags?: Record<string, string>
}

interface EmailResult {
  id: string
  success: boolean
  error?: string
}

interface QueueEmailData extends SendEmailData {
  priority?: 'low' | 'normal' | 'high'
  delay?: number // en millisecondes
}
```

## 🔗 Ressources

- [Nodemailer (SMTP)](https://nodemailer.com/about/)
- [Scaleway TEM SMTP](https://www.scaleway.com/en/docs/transactional-email/)
- [Bull Queue](https://github.com/OptimalBits/bull)
- [HTML Email Best Practices](https://www.campaignmonitor.com/css/)
