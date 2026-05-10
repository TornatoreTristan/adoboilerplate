import { Head } from '@inertiajs/react'
import { Button } from '@/components/ui/button'
import { Mail } from 'lucide-react'
import { router } from '@inertiajs/react'
import { useI18n } from '@/hooks/use-i18n'

export default function VerifyEmailNotice() {
  const { t } = useI18n()

  const handleResendEmail = () => {
    router.post('/auth/email/resend')
  }

  return (
    <>
      <Head title={t('auth.verify_email.title')} />

      <div className="flex min-h-screen items-center justify-center bg-background px-4">
        <div className="w-full max-w-md space-y-8">
          <div className="flex flex-col items-center gap-4 text-center">
            <div className="bg-primary/10 flex size-16 items-center justify-center rounded-full">
              <Mail className="text-primary size-8" />
            </div>

            <div className="space-y-2">
              <h1 className="text-3xl font-bold tracking-tight">{t('auth.verify_email.title')}</h1>
              <p className="text-muted-foreground text-balance">
                {t('auth.verify_email.description_line_1')}
                <br />
                {t('auth.verify_email.description_line_2')}
              </p>
            </div>
          </div>

          <div className="space-y-4">
            <div className="bg-muted rounded-lg p-4">
              <p className="text-sm">
                <strong>{t('auth.verify_email.no_email_title')}</strong>
                <br />
                {t('auth.verify_email.no_email_text')}
              </p>
            </div>

            <div className="flex flex-col gap-2">
              <Button variant="outline" onClick={handleResendEmail}>
                {t('auth.verify_email.resend')}
              </Button>

              <Button variant="ghost" asChild>
                <a href="/">{t('auth.verify_email.go_home')}</a>
              </Button>
            </div>
          </div>

          <div className="text-muted-foreground text-center text-sm">
            <p>
              {t('auth.verify_email.expires_in_label')}{' '}
              <strong>{t('auth.verify_email.expires_value')}</strong>
            </p>
          </div>
        </div>
      </div>
    </>
  )
}
