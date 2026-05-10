import { Head, router } from '@inertiajs/react'
import { useState, type FormEvent } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Field,
  FieldGroup,
  FieldLabel,
  FieldDescription,
} from '@/components/ui/field'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { GalleryVerticalEnd, AlertCircle, ShieldCheck } from 'lucide-react'
import { useI18n } from '@/hooks/use-i18n'

const csrfHeader = (): Record<string, string> => ({
  'X-XSRF-TOKEN': decodeURIComponent(
    document.cookie
      .split('; ')
      .find((c) => c.startsWith('XSRF-TOKEN='))
      ?.split('=')[1] ?? ''
  ),
  'Content-Type': 'application/json',
  'Accept': 'application/json',
})

export default function TwoFactorChallenge() {
  const { t } = useI18n()
  const [code, setCode] = useState('')
  const [useBackup, setUseBackup] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError(null)
    setSubmitting(true)
    try {
      const res = await fetch('/auth/2fa/challenge', {
        method: 'POST',
        headers: csrfHeader(),
        body: JSON.stringify({ code: code.replace(/\s+/g, '') }),
      })
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        const message: string =
          body?.error?.details?.fields?.code?.[0] ??
          body?.error?.message ??
          t('auth.two_factor.error_invalid_code')
        setError(message)
        return
      }
      // Server cleared pending_2fa_user_id and set user_id; reload to land
      // on whatever post-login destination Inertia decides.
      router.visit('/')
    } finally {
      setSubmitting(false)
    }
  }

  const fieldLabel = useBackup
    ? t('auth.two_factor.field_backup_code')
    : t('auth.two_factor.field_code')
  const fieldPlaceholder = useBackup
    ? t('auth.two_factor.field_backup_code_placeholder')
    : t('auth.two_factor.field_code_placeholder')

  return (
    <>
      <Head title={t('auth.two_factor.challenge_title')} />

      <div className="grid min-h-svh lg:grid-cols-2">
        <div className="flex flex-col gap-4 p-6 md:p-10">
          <div className="flex justify-center gap-2 md:justify-start">
            <a href="#" className="flex items-center gap-2 font-medium">
              <div className="bg-primary text-primary-foreground flex size-6 items-center justify-center rounded-md">
                <GalleryVerticalEnd className="size-4" />
              </div>
              Acme Inc.
            </a>
          </div>

          <div className="flex flex-1 items-center justify-center">
            <div className="w-full max-w-xs">
              <form className="flex flex-col gap-6" onSubmit={handleSubmit}>
                <FieldGroup>
                  <div className="flex flex-col items-center gap-1 text-center">
                    <ShieldCheck className="mb-2 size-8 text-primary" />
                    <h1 className="text-2xl font-bold">
                      {t('auth.two_factor.challenge_title')}
                    </h1>
                    <p className="text-muted-foreground text-sm text-balance">
                      {t('auth.two_factor.challenge_subtitle')}
                    </p>
                  </div>

                  {error && (
                    <Alert variant="destructive">
                      <AlertCircle className="size-4" />
                      <AlertTitle>{t('auth.two_factor.error_title')}</AlertTitle>
                      <AlertDescription>{error}</AlertDescription>
                    </Alert>
                  )}

                  <Field>
                    <FieldLabel htmlFor="code">{fieldLabel}</FieldLabel>
                    <Input
                      id="code"
                      inputMode={useBackup ? 'text' : 'numeric'}
                      autoComplete="one-time-code"
                      autoFocus
                      maxLength={useBackup ? 20 : 7}
                      value={code}
                      onChange={(e) => setCode(e.target.value)}
                      placeholder={fieldPlaceholder}
                      required
                    />
                    <FieldDescription>
                      <button
                        type="button"
                        className="text-xs underline-offset-4 hover:underline"
                        onClick={() => {
                          setUseBackup((v) => !v)
                          setCode('')
                          setError(null)
                        }}
                      >
                        {useBackup
                          ? t('auth.two_factor.use_authenticator')
                          : t('auth.two_factor.use_backup_code')}
                      </button>
                    </FieldDescription>
                  </Field>

                  <Field>
                    <Button type="submit" disabled={submitting || code.length === 0}>
                      {submitting
                        ? t('auth.two_factor.submitting')
                        : t('auth.two_factor.submit')}
                    </Button>
                  </Field>
                </FieldGroup>
              </form>
            </div>
          </div>
        </div>
        <div className="bg-muted relative hidden lg:block"></div>
      </div>
    </>
  )
}
