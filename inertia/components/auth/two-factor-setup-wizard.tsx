import { useEffect, useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Loader2, AlertCircle } from 'lucide-react'
import { useI18n } from '@/hooks/use-i18n'

interface SetupResponse {
  secret: string
  otpauthUrl: string
  qrCodeDataUrl: string
}

interface Props {
  onComplete: (backupCodes: string[]) => void
  onCancel: () => void
}

const csrfHeader = (): Record<string, string> => ({
  'X-XSRF-TOKEN': decodeURIComponent(
    document.cookie
      .split('; ')
      .find((c) => c.startsWith('XSRF-TOKEN='))
      ?.split('=')[1] ?? ''
  ),
  'Accept': 'application/json',
})

export default function TwoFactorSetupWizard({ onComplete, onCancel }: Props) {
  const { t } = useI18n()
  const [setup, setSetup] = useState<SetupResponse | null>(null)
  const [code, setCode] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [verifying, setVerifying] = useState(false)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const res = await fetch('/auth/2fa/setup', {
          method: 'POST',
          headers: csrfHeader(),
        })
        if (!res.ok) {
          throw new Error('setup failed')
        }
        const body = (await res.json()) as SetupResponse
        if (!cancelled) setSetup(body)
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : 'unknown')
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!setup) return
    setError(null)
    setVerifying(true)
    try {
      const res = await fetch('/auth/2fa/confirm', {
        method: 'POST',
        headers: { ...csrfHeader(), 'Content-Type': 'application/json' },
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
      const body = (await res.json()) as { backupCodes: string[] }
      onComplete(body.backupCodes)
    } finally {
      setVerifying(false)
    }
  }

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center p-12">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    )
  }

  if (!setup) {
    return (
      <Card>
        <CardContent className="p-6">
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error ?? 'Setup unavailable'}</AlertDescription>
          </Alert>
          <Button variant="outline" className="mt-4" onClick={onCancel}>
            {t('account.security.cancel_setup')}
          </Button>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('account.security.setup_step1_title')}</CardTitle>
        <CardDescription>{t('account.security.setup_step1_description')}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="flex flex-col items-center gap-4 sm:flex-row sm:items-start">
          <img
            src={setup.qrCodeDataUrl}
            alt="2FA QR code"
            className="h-48 w-48 rounded-md border bg-white p-2"
          />
          <div className="flex-1 space-y-2">
            <Label className="text-sm">{t('account.security.setup_manual_label')}</Label>
            <code className="block rounded-md bg-muted px-3 py-2 text-sm break-all">
              {setup.secret}
            </code>
          </div>
        </div>

        <div className="space-y-2 border-t pt-6">
          <h3 className="text-base font-medium">
            {t('account.security.setup_step2_title')}
          </h3>
          <p className="text-sm text-muted-foreground">
            {t('account.security.setup_step2_description')}
          </p>
        </div>

        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <form className="space-y-4" onSubmit={handleSubmit}>
          <div className="space-y-2">
            <Label htmlFor="totp-code">{t('account.security.field_code')}</Label>
            <Input
              id="totp-code"
              inputMode="numeric"
              autoComplete="one-time-code"
              maxLength={7}
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder={t('account.security.field_code_placeholder')}
              required
            />
          </div>
          <div className="flex gap-3 justify-end">
            <Button type="button" variant="outline" onClick={onCancel} disabled={verifying}>
              {t('account.security.cancel_setup')}
            </Button>
            <Button type="submit" disabled={verifying || code.length < 6}>
              {t('account.security.verify')}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}
