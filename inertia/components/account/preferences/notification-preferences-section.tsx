import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import { Switch } from '@/components/ui/switch'
import { useEffect, useState } from 'react'
import { router } from '@inertiajs/react'
import { toast } from 'sonner'
import { useI18n } from '@/hooks/use-i18n'
import type { NotificationChannel, NotificationPreference, NotificationType } from './types'

const CHANNELS: NotificationChannel[] = ['in_app', 'email', 'push']

export function NotificationPreferencesSection() {
  const { t } = useI18n()
  const [preferences, setPreferences] = useState<NotificationPreference[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    void (async () => {
      try {
        const response = await fetch('/api/notifications/preferences')
        const data = (await response.json()) as { preferences?: NotificationPreference[] }
        setPreferences(data.preferences || [])
      } catch (error) {
         
        console.error('Failed to load preferences:', error)
      } finally {
        setLoading(false)
      }
    })()
  }, [])

  const isEnabled = (notifType: NotificationType, channel: NotificationChannel) => {
    const pref = preferences.find(
      (p) => p.notification_type === notifType && p.channel === channel
    )
    // Default to enabled — preferences are recorded only when the user has
    // explicitly opted out of a channel.
    return pref ? pref.enabled : true
  }

  const togglePreference = (notifType: NotificationType, channel: NotificationChannel) => {
    setPreferences((prev) => {
      const existing = prev.find(
        (p) => p.notification_type === notifType && p.channel === channel
      )
      if (existing) {
        return prev.map((p) =>
          p.notification_type === notifType && p.channel === channel
            ? { ...p, enabled: !p.enabled }
            : p
        )
      }
      return [
        ...prev,
        { id: crypto.randomUUID(), notification_type: notifType, channel, enabled: false },
      ]
    })
  }

  const save = async () => {
    setSaving(true)
    try {
      const response = await fetch('/api/notifications/preferences/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          preferences: preferences.map((p) => ({
            notification_type: p.notification_type,
            channel: p.channel,
            enabled: p.enabled,
          })),
        }),
      })
      if (!response.ok) throw new Error('Failed to save preferences')
      toast.success(t('notifications.preferences.save_success'))
      router.reload({ onFinish: () => setSaving(false) })
    } catch (error) {
       
      console.error('Failed to save preferences:', error)
      toast.error(t('notifications.preferences.save_error'))
      setSaving(false)
    }
  }

  return (
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
          <PreferenceGroup
            titleKey="notifications.preferences.types.user.title"
            rows={[{ notifType: 'user.mentioned', labelKey: 'notifications.preferences.types.user.mentioned' }]}
            isEnabled={isEnabled}
            onToggle={togglePreference}
          />

          <Separator />

          <PreferenceGroup
            titleKey="notifications.preferences.types.org.title"
            rows={[
              { notifType: 'org.invitation', labelKey: 'notifications.preferences.types.org.invitation' },
              { notifType: 'org.member_joined', labelKey: 'notifications.preferences.types.org.member_joined' },
              { notifType: 'org.member_left', labelKey: 'notifications.preferences.types.org.member_left' },
            ]}
            isEnabled={isEnabled}
            onToggle={togglePreference}
          />

          <Separator />

          <PreferenceGroup
            titleKey="notifications.preferences.types.system.title"
            rows={[
              { notifType: 'system.announcement', labelKey: 'notifications.preferences.types.system.announcement' },
              { notifType: 'system.maintenance', labelKey: 'notifications.preferences.types.system.maintenance' },
            ]}
            isEnabled={isEnabled}
            onToggle={togglePreference}
          />

          <Separator />

          <Button onClick={save} disabled={saving} className="w-fit">
            {saving ? 'Saving...' : t('notifications.preferences.save')}
          </Button>
        </div>
      )}
    </div>
  )
}

function PreferenceGroup({
  titleKey,
  rows,
  isEnabled,
  onToggle,
}: {
  titleKey: string
  rows: Array<{ notifType: NotificationType; labelKey: string }>
  isEnabled: (notifType: NotificationType, channel: NotificationChannel) => boolean
  onToggle: (notifType: NotificationType, channel: NotificationChannel) => void
}) {
  const { t } = useI18n()
  return (
    <div className="space-y-3">
      <h4 className="text-sm font-medium">{t(titleKey)}</h4>
      <div className="space-y-3">
        {rows.map((row) => (
          <PreferenceRow
            key={row.notifType}
            label={t(row.labelKey)}
            notifType={row.notifType}
            isEnabled={isEnabled}
            onToggle={onToggle}
          />
        ))}
      </div>
    </div>
  )
}

function PreferenceRow({
  label,
  notifType,
  isEnabled,
  onToggle,
}: {
  label: string
  notifType: NotificationType
  isEnabled: (notifType: NotificationType, channel: NotificationChannel) => boolean
  onToggle: (notifType: NotificationType, channel: NotificationChannel) => void
}) {
  const { t } = useI18n()
  return (
    <div className="space-y-2">
      <Label className="text-sm">{label}</Label>
      <div className="flex gap-6">
        {CHANNELS.map((channel) => (
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
