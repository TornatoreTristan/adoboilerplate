import { Head } from '@inertiajs/react'
import AccountLayout from '@/components/layouts/account-layout'
import { Separator } from '@/components/ui/separator'
import { useI18n } from '@/hooks/use-i18n'
import { ThemeSection } from '@/components/account/preferences/theme-section'
import { NotificationPreferencesSection } from '@/components/account/preferences/notification-preferences-section'
import { CommunicationSection } from '@/components/account/preferences/communication-section'
import { LanguageSection } from '@/components/account/preferences/language-section'
import type { CommunicationPreferences } from '@/components/account/preferences/types'

interface Props {
  user: CommunicationPreferences
}

export default function Preferences({ user }: Props) {
  const { t } = useI18n()

  return (
    <>
      <Head title={t('account.preferences.title')} />
      <AccountLayout>
        <div className="max-w-2xl space-y-10">
          <ThemeSection />
          <Separator />
          <NotificationPreferencesSection />
          <Separator />
          <CommunicationSection initial={user} />
          <Separator />
          <LanguageSection />
        </div>
      </AccountLayout>
    </>
  )
}
