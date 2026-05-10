import { Label } from '@/components/ui/label'
import { Moon, Sun, Monitor } from 'lucide-react'
import { useTheme } from '@/components/theme-provider'
import { cn } from '@/lib/utils'
import { useI18n } from '@/hooks/use-i18n'

export function ThemeSection() {
  const { t } = useI18n()
  const { theme, setTheme } = useTheme()

  const options: Array<{ value: 'light' | 'dark' | 'system'; icon: React.ReactNode; label: string }> = [
    { value: 'light', icon: <Sun className="h-5 w-5" />, label: t('account.preferences.light') },
    { value: 'dark', icon: <Moon className="h-5 w-5" />, label: t('account.preferences.dark') },
    {
      value: 'system',
      icon: <Monitor className="h-5 w-5" />,
      label: t('account.preferences.system'),
    },
  ]

  return (
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
          {options.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => setTheme(option.value)}
              className={cn(
                'flex flex-col items-center gap-2 rounded-lg border-2 p-4 transition-colors',
                theme === option.value
                  ? 'border-primary bg-secondary'
                  : 'border-transparent hover:bg-secondary/50'
              )}
            >
              {option.icon}
              <span className="text-sm font-medium">{option.label}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
