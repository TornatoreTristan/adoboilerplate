import { Head, router } from '@inertiajs/react'
import AppLayout from '@/components/layouts/app-layout'
import { PageHeader } from '@/components/core/page-header'
import { Button } from '@/components/ui/button'
import { useI18n } from '@/hooks/use-i18n'

export default function Home() {
  const { t } = useI18n()

  const testNotification = () => {
    router.post(
      '/api/notifications/test',
      {},
      {
        preserveScroll: true,
        onError: (errors) => {
          console.error('Failed to send test notification:', errors)
        },
      }
    )
  }

  return (
    <>
      <Head title={t('common.home')} />
      <AppLayout>
        <div className="flex flex-col gap-6 p-6">
          <PageHeader title={t('common.welcome')} />

          <div className="grid gap-4">
            <Button onClick={testNotification}>{t('common.test_notification')}</Button>
          </div>
        </div>
      </AppLayout>
    </>
  )
}
