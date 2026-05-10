import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import { Switch } from '@/components/ui/switch'
import { useState } from 'react'
import { router } from '@inertiajs/react'
import { toast } from 'sonner'
import { useI18n } from '@/hooks/use-i18n'
import type { CommunicationPreferences } from './types'

interface Props {
  initial: CommunicationPreferences
}

export function CommunicationSection({ initial }: Props) {
  const { t } = useI18n()
  const [preferences, setPreferences] = useState<CommunicationPreferences>(initial)
  const [saving, setSaving] = useState(false)

  const save = async () => {
    setSaving(true)
    try {
      const response = await fetch('/account/communication-preferences', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(preferences),
      })
      if (!response.ok) throw new Error('Failed to save communication preferences')
      toast.success(t('account.preferences.communication_save_success'))
      router.reload({ onFinish: () => setSaving(false) })
    } catch (error) {
       
      console.error('Failed to save communication preferences:', error)
      toast.error(t('account.preferences.communication_save_error'))
      setSaving(false)
    }
  }

  const rows: Array<{
    id: keyof CommunicationPreferences
    labelKey: string
    descriptionKey: string
  }> = [
    {
      id: 'newsletter_enabled',
      labelKey: 'account.preferences.newsletter',
      descriptionKey: 'account.preferences.newsletter_description',
    },
    {
      id: 'tips_enabled',
      labelKey: 'account.preferences.tips_and_tricks',
      descriptionKey: 'account.preferences.tips_and_tricks_description',
    },
    {
      id: 'promotional_offers_enabled',
      labelKey: 'account.preferences.promotional_offers',
      descriptionKey: 'account.preferences.promotional_offers_description',
    },
  ]

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-base font-medium">{t('account.preferences.communication')}</h3>
        <p className="text-muted-foreground mt-1 text-sm">
          {t('account.preferences.communication_description')}
        </p>
      </div>

      <div className="space-y-4">
        {rows.map((row, idx) => (
          <div key={row.id}>
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor={row.id}>{t(row.labelKey)}</Label>
                <p className="text-muted-foreground text-xs">{t(row.descriptionKey)}</p>
              </div>
              <Switch
                id={row.id}
                checked={preferences[row.id]}
                onCheckedChange={(checked) =>
                  setPreferences({ ...preferences, [row.id]: checked })
                }
              />
            </div>
            {idx < rows.length - 1 && <Separator className="mt-4" />}
          </div>
        ))}

        <Separator />

        <Button onClick={save} disabled={saving} className="w-fit">
          {saving ? 'Saving...' : t('account.preferences.save')}
        </Button>
      </div>
    </div>
  )
}
