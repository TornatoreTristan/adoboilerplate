import { router } from '@inertiajs/react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Button } from '@/components/ui/button'
import { useI18n } from '@/hooks/use-i18n'

export function LanguageSelector() {
  const { locale } = useI18n()

  const changeLanguage = (newLocale: 'fr' | 'en') => {
    router.post(
      '/locale',
      { locale: newLocale },
      {
        preserveState: false,
        preserveScroll: false,
      }
    )
  }

  const currentFlag = locale === 'fr' ? '🇫🇷' : '🇬🇧'

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon">
          <span className="text-xl">{currentFlag}</span>
          <span className="sr-only">Change language</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem
          onClick={() => changeLanguage('fr')}
          className={locale === 'fr' ? 'bg-accent' : ''}
        >
          🇫🇷 Français
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => changeLanguage('en')}
          className={locale === 'en' ? 'bg-accent' : ''}
        >
          🇬🇧 English
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
