import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { useI18n } from '@/hooks/use-i18n'

/**
 * Language selector. The Save button is currently a no-op stub —
 * locale switching is handled by the global locale switcher elsewhere
 * in the layout. We keep this section so the visual layout is in
 * place for future per-account locale persistence.
 */
export function LanguageSection() {
  const { t } = useI18n()

  return (
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
  )
}
