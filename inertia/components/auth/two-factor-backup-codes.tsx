import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Copy, Download, ShieldAlert, Check } from 'lucide-react'
import { useI18n } from '@/hooks/use-i18n'

interface Props {
  codes: string[]
  onDone: () => void
}

export default function TwoFactorBackupCodes({ codes, onDone }: Props) {
  const { t } = useI18n()
  const [copied, setCopied] = useState(false)

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(codes.join('\n'))
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      /* clipboard blocked — user can still download or transcribe */
    }
  }

  const handleDownload = () => {
    const blob = new Blob([codes.join('\n')], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = '2fa-backup-codes.txt'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('account.security.backup_codes_title')}</CardTitle>
        <CardDescription>{t('account.security.backup_codes_description')}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Alert>
          <ShieldAlert className="h-4 w-4" />
          <AlertDescription>{t('account.security.backup_codes_save_warning')}</AlertDescription>
        </Alert>

        <div className="grid grid-cols-2 gap-2 rounded-md border bg-muted/50 p-4 font-mono text-sm sm:grid-cols-4">
          {codes.map((code) => (
            <span key={code} className="text-center">
              {code}
            </span>
          ))}
        </div>

        <div className="flex flex-wrap gap-3">
          <Button variant="outline" onClick={handleCopy}>
            {copied ? (
              <>
                <Check className="mr-2 h-4 w-4" />
                {t('account.security.codes_copied')}
              </>
            ) : (
              <>
                <Copy className="mr-2 h-4 w-4" />
                {t('account.security.copy_codes')}
              </>
            )}
          </Button>
          <Button variant="outline" onClick={handleDownload}>
            <Download className="mr-2 h-4 w-4" />
            {t('account.security.download_codes')}
          </Button>
          <Button className="ml-auto" onClick={onDone}>
            {t('account.security.done')}
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
