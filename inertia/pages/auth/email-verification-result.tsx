import { Head } from '@inertiajs/react'
import { Button } from '@/components/ui/button'
import { CheckCircle2, XCircle } from 'lucide-react'
import { useI18n } from '@/hooks/use-i18n'

interface EmailVerificationResultProps {
  success: boolean
  error?: string
}

export default function EmailVerificationResult({
  success,
  error,
}: EmailVerificationResultProps) {
  const { t } = useI18n()
  return (
    <>
      <Head
        title={success ? t('auth.verification_result.head_success') : t('auth.verification_result.head_error')}
      />

      <div className="flex min-h-screen items-center justify-center bg-background px-4">
        <div className="w-full max-w-md space-y-8">
          <div className="flex flex-col items-center gap-4 text-center">
            {success ? (
              <>
                <div className="bg-green-500/10 flex size-16 items-center justify-center rounded-full">
                  <CheckCircle2 className="size-8 text-green-500" />
                </div>

                <div className="space-y-2">
                  <h1 className="text-3xl font-bold tracking-tight">
                    {t('auth.verification_result.success_title')}
                  </h1>
                  <p className="text-muted-foreground text-balance">
                    {t('auth.verification_result.success_line_1')}
                    <br />
                    {t('auth.verification_result.success_line_2')}
                  </p>
                </div>
              </>
            ) : (
              <>
                <div className="bg-destructive/10 flex size-16 items-center justify-center rounded-full">
                  <XCircle className="text-destructive size-8" />
                </div>

                <div className="space-y-2">
                  <h1 className="text-3xl font-bold tracking-tight">
                    {t('auth.verification_result.error_title')}
                  </h1>
                  <p className="text-muted-foreground text-balance">
                    {error || t('auth.verification_result.default_error')}
                  </p>
                </div>

                <div className="bg-muted w-full rounded-lg p-4">
                  <p className="text-sm">
                    <strong>{t('auth.verification_result.what_to_do')}</strong>
                    <br />
                    • {t('auth.verification_result.tip_expired')}
                    <br />
                    • {t('auth.verification_result.tip_used')}
                    <br />• {t('auth.verification_result.tip_request_new')}
                  </p>
                </div>

                <div className="flex w-full flex-col gap-2">
                  <Button asChild>
                    <a href="/login">{t('auth.verification_result.back_to_login')}</a>
                  </Button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </>
  )
}
