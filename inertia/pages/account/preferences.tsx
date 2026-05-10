import { Head, router } from '@inertiajs/react'
import AccountLayout from '@/components/layouts/account-layout'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { Switch } from '@/components/ui/switch'
import { Moon, Sun, Monitor } from 'lucide-react'
import { useTheme } from '@/components/theme-provider'
import { cn } from '@/lib/utils'
import { useI18n } from '@/hooks/use-i18n'
import { useState, useEffect } from 'react'
import { toast } from 'sonner'

interface CommunicationPreferences {
  newsletter_enabled: boolean
  tips_enabled: boolean
  promotional_offers_enabled: boolean
}

interface PreferencesProps {
  user: CommunicationPreferences
}

type NotificationType =
  | 'user.mentioned'
  | 'org.invitation'
  | 'org.member_joined'
  | 'org.member_left'
  | 'system.announcement'
  | 'system.maintenance'

type NotificationChannel = 'in_app' | 'email' | 'push'

interface NotificationPreference {
  id: string
  notification_type: NotificationType
  channel: NotificationChannel
  enabled: boolean
}

interface PreferenceRowProps {
  label: string
  notifType: NotificationType
  channels: NotificationChannel[]
  isEnabled: (notifType: NotificationType, channel: NotificationChannel) => boolean
  onToggle: (notifType: NotificationType, channel: NotificationChannel) => void
  t: (key: string) => string
}

function PreferenceRow({ label, notifType, channels, isEnabled, onToggle, t }: PreferenceRowProps) {
  return (
    <div className="space-y-2">
      <Label className="text-sm">{label}</Label>
      <div className="flex gap-6">
        {channels.map((channel) => (
          <div key={channel} className="flex items-center gap-2">
            <Switch
              checked={isEnabled(notifType, channel)}
              onCheckedChange={() => onToggle(notifType, channel)}
              id={`${notifType}-${channel}`}
            />
            <Label
              htmlFor={`${notifType}-${channel}`}
              className="text-muted-foreground cursor-pointer text-xs font-normal"
            >
              {t(`notifications.preferences.channels.${channel}`)}
            </Label>
          </div>
        ))}
      </div>
    </div>
  )
}

export default function Preferences({ user }: PreferencesProps) {
  const { t } = useI18n()
  const { theme, setTheme } = useTheme()
  const [preferences, setPreferences] = useState<NotificationPreference[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [commPreferences, setCommPreferences] = useState<CommunicationPreferences>(user)
  const [savingComm, setSavingComm] = useState(false)

  // Charger les préférences au montage
  useEffect(() => {
    loadPreferences()
  }, [])

  const loadPreferences = async () => {
    try {
      const response = await fetch('/api/notifications/preferences')
      const data = await response.json()
      setPreferences(data.preferences || [])
    } catch (error) {
      console.error('Failed to load preferences:', error)
    } finally {
      setLoading(false)
    }
  }

  const togglePreference = (notifType: NotificationType, channel: NotificationChannel) => {
    setPreferences((prev) => {
      const existing = prev.find((p) => p.notification_type === notifType && p.channel === channel)
      if (existing) {
        return prev.map((p) =>
          p.notification_type === notifType && p.channel === channel
            ? { ...p, enabled: !p.enabled }
            : p
        )
      } else {
        return [
          ...prev,
          {
            id: crypto.randomUUID(),
            notification_type: notifType,
            channel,
            enabled: false,
          },
        ]
      }
    })
  }

  const isEnabled = (notifType: NotificationType, channel: NotificationChannel): boolean => {
    const pref = preferences.find((p) => p.notification_type === notifType && p.channel === channel)
    return pref ? pref.enabled : true // Défaut: activé
  }

  const savePreferences = async () => {
    setSaving(true)
    try {
      const response = await fetch('/api/notifications/preferences/bulk', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          preferences: preferences.map((p) => ({
            notification_type: p.notification_type,
            channel: p.channel,
            enabled: p.enabled,
          })),
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to save preferences')
      }

      toast.success(t('notifications.preferences.save_success'))

      // Reload page to show success
      router.reload({
        onFinish: () => setSaving(false),
      })
    } catch (error) {
      console.error('Failed to save preferences:', error)
      toast.error(t('notifications.preferences.save_error'))
      setSaving(false)
    }
  }

  const saveCommunicationPreferences = async () => {
    setSavingComm(true)
    try {
      const response = await fetch('/account/communication-preferences', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(commPreferences),
      })

      if (!response.ok) {
        throw new Error('Failed to save communication preferences')
      }

      toast.success(t('account.preferences.communication_save_success'))

      router.reload({
        onFinish: () => setSavingComm(false),
      })
    } catch (error) {
      console.error('Failed to save communication preferences:', error)
      toast.error(t('account.preferences.communication_save_error'))
      setSavingComm(false)
    }
  }

  return (
    <>
      <Head title={t('account.preferences.title')} />
      <AccountLayout>
        <div className="max-w-2xl space-y-10">
          {/* Thème */}
          <div className="space-y-4">
            <div>
              <h3 className="text-base font-medium">{t('account.preferences.appearance')}</h3>
              <p className="text-muted-foreground mt-1 text-sm">
                {t('account.preferences.appearance_description')}
              </p>
            </div>

            <div className="grid gap-3">
              <Label>{t('account.preferences.theme')}</Label>
              <div className="grid grid-cols-3 gap-3">
                <button
                  onClick={() => setTheme('light')}
                  className={cn(
                    'flex flex-col items-center gap-2 rounded-lg border-2 p-4 transition-colors',
                    theme === 'light'
                      ? 'border-primary bg-secondary'
                      : 'border-transparent hover:bg-secondary/50'
                  )}
                >
                  <Sun className="h-5 w-5" />
                  <span className="text-sm font-medium">{t('account.preferences.light')}</span>
                </button>
                <button
                  onClick={() => setTheme('dark')}
                  className={cn(
                    'flex flex-col items-center gap-2 rounded-lg border-2 p-4 transition-colors',
                    theme === 'dark'
                      ? 'border-primary bg-secondary'
                      : 'border-transparent hover:bg-secondary/50'
                  )}
                >
                  <Moon className="h-5 w-5" />
                  <span className="text-sm font-medium">{t('account.preferences.dark')}</span>
                </button>
                <button
                  onClick={() => setTheme('system')}
                  className={cn(
                    'flex flex-col items-center gap-2 rounded-lg border-2 p-4 transition-colors',
                    theme === 'system'
                      ? 'border-primary bg-secondary'
                      : 'border-transparent hover:bg-secondary/50'
                  )}
                >
                  <Monitor className="h-5 w-5" />
                  <span className="text-sm font-medium">{t('account.preferences.system')}</span>
                </button>
              </div>
            </div>
          </div>

          <Separator />

          {/* Notifications */}
          <div className="space-y-4">
            <div>
              <h3 className="text-base font-medium">{t('notifications.preferences.title')}</h3>
              <p className="text-muted-foreground mt-1 text-sm">
                {t('notifications.preferences.description')}
              </p>
            </div>

            {loading ? (
              <div className="text-muted-foreground py-8 text-center text-sm">Loading...</div>
            ) : (
              <div className="space-y-6">
                {/* Notifications Utilisateur */}
                <div className="space-y-3">
                  <h4 className="text-sm font-medium">
                    {t('notifications.preferences.types.user.title')}
                  </h4>
                  <div className="space-y-3">
                    <PreferenceRow
                      label={t('notifications.preferences.types.user.mentioned')}
                      notifType="user.mentioned"
                      channels={['in_app', 'email', 'push']}
                      isEnabled={isEnabled}
                      onToggle={togglePreference}
                      t={t}
                    />
                  </div>
                </div>

                <Separator />

                {/* Notifications Organisation */}
                <div className="space-y-3">
                  <h4 className="text-sm font-medium">
                    {t('notifications.preferences.types.org.title')}
                  </h4>
                  <div className="space-y-3">
                    <PreferenceRow
                      label={t('notifications.preferences.types.org.invitation')}
                      notifType="org.invitation"
                      channels={['in_app', 'email', 'push']}
                      isEnabled={isEnabled}
                      onToggle={togglePreference}
                      t={t}
                    />
                    <PreferenceRow
                      label={t('notifications.preferences.types.org.member_joined')}
                      notifType="org.member_joined"
                      channels={['in_app', 'email', 'push']}
                      isEnabled={isEnabled}
                      onToggle={togglePreference}
                      t={t}
                    />
                    <PreferenceRow
                      label={t('notifications.preferences.types.org.member_left')}
                      notifType="org.member_left"
                      channels={['in_app', 'email', 'push']}
                      isEnabled={isEnabled}
                      onToggle={togglePreference}
                      t={t}
                    />
                  </div>
                </div>

                <Separator />

                {/* Notifications Système */}
                <div className="space-y-3">
                  <h4 className="text-sm font-medium">
                    {t('notifications.preferences.types.system.title')}
                  </h4>
                  <div className="space-y-3">
                    <PreferenceRow
                      label={t('notifications.preferences.types.system.announcement')}
                      notifType="system.announcement"
                      channels={['in_app', 'email', 'push']}
                      isEnabled={isEnabled}
                      onToggle={togglePreference}
                      t={t}
                    />
                    <PreferenceRow
                      label={t('notifications.preferences.types.system.maintenance')}
                      notifType="system.maintenance"
                      channels={['in_app', 'email', 'push']}
                      isEnabled={isEnabled}
                      onToggle={togglePreference}
                      t={t}
                    />
                  </div>
                </div>

                <Separator />

                <Button onClick={savePreferences} disabled={saving} className="w-fit">
                  {saving ? 'Saving...' : t('notifications.preferences.save')}
                </Button>
              </div>
            )}
          </div>

          <Separator />

          {/* Communication */}
          <div className="space-y-4">
            <div>
              <h3 className="text-base font-medium">{t('account.preferences.communication')}</h3>
              <p className="text-muted-foreground mt-1 text-sm">
                {t('account.preferences.communication_description')}
              </p>
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="newsletter">{t('account.preferences.newsletter')}</Label>
                  <p className="text-muted-foreground text-xs">
                    {t('account.preferences.newsletter_description')}
                  </p>
                </div>
                <Switch
                  id="newsletter"
                  checked={commPreferences.newsletter_enabled}
                  onCheckedChange={(checked) =>
                    setCommPreferences({ ...commPreferences, newsletter_enabled: checked })
                  }
                />
              </div>

              <Separator />

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="tips">{t('account.preferences.tips_and_tricks')}</Label>
                  <p className="text-muted-foreground text-xs">
                    {t('account.preferences.tips_and_tricks_description')}
                  </p>
                </div>
                <Switch
                  id="tips"
                  checked={commPreferences.tips_enabled}
                  onCheckedChange={(checked) =>
                    setCommPreferences({ ...commPreferences, tips_enabled: checked })
                  }
                />
              </div>

              <Separator />

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="promo">{t('account.preferences.promotional_offers')}</Label>
                  <p className="text-muted-foreground text-xs">
                    {t('account.preferences.promotional_offers_description')}
                  </p>
                </div>
                <Switch
                  id="promo"
                  checked={commPreferences.promotional_offers_enabled}
                  onCheckedChange={(checked) =>
                    setCommPreferences({
                      ...commPreferences,
                      promotional_offers_enabled: checked,
                    })
                  }
                />
              </div>

              <Separator />

              <Button
                onClick={saveCommunicationPreferences}
                disabled={savingComm}
                className="w-fit"
              >
                {savingComm ? 'Saving...' : t('account.preferences.save')}
              </Button>
            </div>
          </div>

          <Separator />

          {/* Langue */}
          <div className="space-y-4">
            <div>
              <h3 className="text-base font-medium">{t('account.preferences.language_region')}</h3>
              <p className="text-muted-foreground mt-1 text-sm">
                {t('account.preferences.language_region_description')}
              </p>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="language">{t('account.preferences.language')}</Label>
              <select
                id="language"
                className="border-input bg-background ring-offset-background flex h-10 w-full rounded-md border px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              >
                <option value="fr">Français</option>
                <option value="en">English</option>
                <option value="es">Español</option>
                <option value="de">Deutsch</option>
              </select>
            </div>

            <Button className="w-fit">{t('account.preferences.save')}</Button>
          </div>
        </div>
      </AccountLayout>
    </>
  )
}
