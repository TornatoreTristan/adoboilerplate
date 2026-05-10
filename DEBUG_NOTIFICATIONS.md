# 🐛 Debug Guide - Notifications Temps Réel

## Problème actuel

✅ **Backend fonctionne** : Notifications créées et broadcastées
✅ **Connexion SSE établie** : Point vert visible
❌ **Messages non reçus** : Pas de badge, pas de toast

---

## Test de diagnostic

### 1. Ouvrir la console navigateur (F12)

Vous devriez voir au chargement de la page :

```
✅ Connected to notifications stream
📬 Initial unread count: X
```

### 2. Dans une autre fenêtre terminal, exécuter :

```bash
# Créer une notification pendant que le navigateur est ouvert
node ace test:notification
```

### 3. Regarder la console navigateur

**Vous devriez voir :**

```
📨 Received notification event: {
  type: "notification:new",
  notification: { ... }
}
```

**Si vous NE voyez PAS ce message**, cela signifie que Transmit ne route pas les messages correctement.

---

## Causes possibles

### Cause 1 : Transmit SSE bloqué par l'auth

**Diagnostic :**

```bash
# Tester l'endpoint SSE sans auth
curl -N http://localhost:3333/__transmit/events
```

Si vous voyez du HTML (page d'erreur), c'est que l'endpoint nécessite une authentification.

**Solution :** Transmit doit passer le cookie de session

### Cause 2 : Canal mal nommé

**Vérification :**

- Backend broadcast vers : `user/28270ec8-c8b7-41ee-8613-dc82d25192d5/notifications`
- Frontend écoute : `user/28270ec8-c8b7-41ee-8613-dc82d25192d5/notifications`

**Les deux doivent être IDENTIQUES**

### Cause 3 : Notifications créées AVANT la connexion SSE

Les notifications créées avec `node ace test:notification` avant d'ouvrir le navigateur ne seront **jamais** reçues en temps réel (c'est normal).

---

## Solution de contournement temporaire

### Option A : Compter uniquement sur le compteur initial

Le badge affichera le bon nombre au chargement de la page grâce au `fetch('/api/notifications/unread-count')`.

### Option B : Tester PENDANT que la page est ouverte

1. Ouvrir le navigateur sur http://localhost:3333
2. Ouvrir la console (F12)
3. Dans un terminal séparé : `node ace test:notification`
4. Regarder si "📨 Received notification event" apparaît dans la console

---

## Checklist de debug

- [ ] Console navigateur affiche "✅ Connected to notifications stream"
- [ ] Console navigateur affiche "📬 Initial unread count: X"
- [ ] Badge 🔔 affiche le bon nombre (X notifications)
- [ ] Terminal backend affiche "📡 Real-time notification sent to user..."
- [ ] Console navigateur affiche "📨 Received notification event" **pendant** l'exécution de `node ace test:notification`
- [ ] Toast notification apparaît
- [ ] Badge se met à jour (X+1)

---

## Si ça ne fonctionne toujours pas

### Debug étape par étape

#### Étape 1 : Vérifier le userId

**Console navigateur :**

```javascript
// Copier-coller dans la console
const props = window.InertiaProps || {}
console.log('User ID:', props.auth?.user?.id)
```

**Terminal :**

```bash
node ace test:notification
# Vérifier que le userId dans le log correspond
```

#### Étape 2 : Vérifier les logs Transmit

**Ajouter des logs dans `app/notifications/services/notification_service.ts` :**

```typescript
transmit.broadcast(`user/${data.userId}/notifications`, payload)
console.log('🔍 Broadcast to channel:', `user/${data.userId}/notifications`)
console.log('🔍 Payload:', JSON.stringify(payload))
```

#### Étape 3 : Vérifier l'autorisation

**Ajouter des logs dans `start/transmit.ts` :**

```typescript
transmit.authorize<{ userId: string }>('user/:userId/notifications', (ctx, { userId }) => {
  console.log('🔍 Authorization check:')
  console.log('  - Requested userId:', userId)
  console.log('  - Authenticated userId:', ctx.auth.user?.id)
  console.log('  - Authorized:', ctx.auth.user?.id === userId)
  return ctx.auth.user?.id === userId
})
```

---

## Test alternatif : Créer notification via API

Au lieu de `node ace test:notification`, utiliser l'endpoint API :

```bash
# Se connecter et obtenir un cookie
curl -c cookies.txt -X POST http://localhost:3333/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"tristan.tornatore@ritmodiag.com","password":"VOTRE_MOT_DE_PASSE"}'

# Créer une notification
curl -b cookies.txt -X POST http://localhost:3333/api/notifications/test
```

Cela teste si le problème vient de l'auth ou du broadcast.

---

## Prochaines étapes

1. ✅ Corriger l'endpoint SSE (déjà fait avec `transmit.registerRoutes()`)
2. ✅ Charger le compteur initial (déjà fait avec `fetch('/api/notifications/unread-count')`)
3. ⏳ **Vérifier que les messages SSE arrivent bien** (à tester maintenant)
4. ⏳ Corriger le routing des messages si nécessaire

---

**Testez maintenant en suivant la procédure étape par étape ci-dessus et dites-moi ce que vous voyez dans la console ! 🔍**
