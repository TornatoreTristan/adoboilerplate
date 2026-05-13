import { Head, router, usePage } from '@inertiajs/react'
import { useState } from 'react'
import AccountLayout from '@/components/layouts/account-layout'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Copy, Check, KeyRound, Plus } from 'lucide-react'
import { useI18n } from '@/hooks/use-i18n'
import { useFormatDate } from '@/hooks/use-format-date'

interface ApiTokenRow {
  id: string
  name: string
  prefix: string
  scopes: string[]
  expiresAt: string | null
  lastUsedAt: string | null
  revokedAt: string | null
  createdAt: string
}

interface CreatedToken {
  id: string
  name: string
  prefix: string
  scopes: string[]
  expiresAt: string | null
  createdAt: string
  plainToken: string
}

function getCsrfToken(): string {
  const meta = document.querySelector('meta[name="csrf-token"]')
  return meta?.getAttribute('content') ?? ''
}

export default function ApiTokensPage() {
  const { t } = useI18n()
  const formatDate = useFormatDate()
  const { tokens, availableScopes } = usePage<{
    tokens: ApiTokenRow[]
    availableScopes: string[]
  }>().props

  const [createOpen, setCreateOpen] = useState(false)
  const [name, setName] = useState('')
  const [selectedScopes, setSelectedScopes] = useState<string[]>([])
  const [expiresAt, setExpiresAt] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [createdToken, setCreatedToken] = useState<CreatedToken | null>(null)
  const [copied, setCopied] = useState(false)
  const [tokenToRevoke, setTokenToRevoke] = useState<ApiTokenRow | null>(null)
  const [revoking, setRevoking] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)

  const resetForm = () => {
    setName('')
    setSelectedScopes([])
    setExpiresAt('')
    setFormError(null)
  }

  const toggleScope = (scope: string) => {
    setSelectedScopes((prev) =>
      prev.includes(scope) ? prev.filter((s) => s !== scope) : [...prev, scope]
    )
  }

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    setFormError(null)

    try {
      const res = await fetch('/account/api-tokens', {
        method: 'POST',
        credentials: 'same-origin',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'X-CSRF-TOKEN': getCsrfToken(),
        },
        body: JSON.stringify({
          name,
          scopes: selectedScopes,
          expiresAt: expiresAt ? new Date(expiresAt).toISOString() : undefined,
        }),
      })

      if (!res.ok) {
        const body = (await res.json().catch(() => null)) as { message?: string } | null
        setFormError(body?.message ?? t('common.error'))
        return
      }

      const body = (await res.json()) as { token: CreatedToken }
      setCreatedToken(body.token)
      setCreateOpen(false)
      resetForm()
      router.reload({ only: ['tokens'] })
    } finally {
      setSubmitting(false)
    }
  }

  const handleCopy = async () => {
    if (!createdToken) return
    await navigator.clipboard.writeText(createdToken.plainToken)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleRevoke = async () => {
    if (!tokenToRevoke) return
    setRevoking(true)
    try {
      await fetch(`/account/api-tokens/${tokenToRevoke.id}`, {
        method: 'DELETE',
        credentials: 'same-origin',
        headers: {
          'Accept': 'application/json',
          'X-CSRF-TOKEN': getCsrfToken(),
        },
      })
      setTokenToRevoke(null)
      router.reload({ only: ['tokens'] })
    } finally {
      setRevoking(false)
    }
  }

  const tokenStatus = (token: ApiTokenRow): 'active' | 'revoked' | 'expired' => {
    if (token.revokedAt) return 'revoked'
    if (token.expiresAt && new Date(token.expiresAt).getTime() <= Date.now()) return 'expired'
    return 'active'
  }

  return (
    <>
      <Head title={t('account.api_tokens.title')} />
      <AccountLayout>
        <div className="max-w-4xl space-y-6">
          <div className="flex items-start justify-between gap-4">
            <div className="space-y-1">
              <h2 className="text-lg font-semibold">{t('account.api_tokens.title')}</h2>
              <p className="text-muted-foreground text-sm">
                {t('account.api_tokens.description')}
              </p>
            </div>
            <Dialog
              open={createOpen}
              onOpenChange={(open) => {
                setCreateOpen(open)
                if (!open) resetForm()
              }}
            >
              <DialogTrigger asChild>
                <Button>
                  <Plus className="mr-2 h-4 w-4" />
                  {t('account.api_tokens.create')}
                </Button>
              </DialogTrigger>
              <DialogContent>
                <form onSubmit={handleCreate}>
                  <DialogHeader>
                    <DialogTitle>{t('account.api_tokens.create_dialog_title')}</DialogTitle>
                    <DialogDescription>
                      {t('account.api_tokens.create_dialog_description')}
                    </DialogDescription>
                  </DialogHeader>

                  <div className="space-y-4 py-4">
                    <div className="space-y-2">
                      <Label htmlFor="token-name">{t('account.api_tokens.field_name')}</Label>
                      <Input
                        id="token-name"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder={t('account.api_tokens.field_name_placeholder')}
                        required
                        minLength={2}
                        maxLength={120}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label>{t('account.api_tokens.field_scopes')}</Label>
                      <div className="grid grid-cols-2 gap-2">
                        {availableScopes.map((scope) => (
                          <label
                            key={scope}
                            className="flex cursor-pointer items-center gap-2 rounded-md border p-2 text-sm"
                          >
                            <Checkbox
                              checked={selectedScopes.includes(scope)}
                              onCheckedChange={() => toggleScope(scope)}
                            />
                            <code className="text-xs">{scope}</code>
                          </label>
                        ))}
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="token-expires">
                        {t('account.api_tokens.field_expires_at')}
                      </Label>
                      <Input
                        id="token-expires"
                        type="date"
                        value={expiresAt}
                        onChange={(e) => setExpiresAt(e.target.value)}
                      />
                    </div>

                    {formError && <p className="text-destructive text-sm">{formError}</p>}
                  </div>

                  <DialogFooter>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setCreateOpen(false)}
                      disabled={submitting}
                    >
                      {t('common.cancel')}
                    </Button>
                    <Button
                      type="submit"
                      disabled={submitting || !name || selectedScopes.length === 0}
                    >
                      {submitting ? t('common.loading') : t('account.api_tokens.create')}
                    </Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>
          </div>

          {tokens.length === 0 ? (
            <div className="text-muted-foreground rounded-lg border border-dashed p-8 text-center text-sm">
              <KeyRound className="text-muted-foreground mx-auto mb-3 h-8 w-8" />
              {t('account.api_tokens.empty')}
            </div>
          ) : (
            <div className="rounded-lg border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t('account.api_tokens.table_name')}</TableHead>
                    <TableHead>{t('account.api_tokens.table_prefix')}</TableHead>
                    <TableHead>{t('account.api_tokens.table_scopes')}</TableHead>
                    <TableHead>{t('account.api_tokens.table_last_used')}</TableHead>
                    <TableHead>{t('account.api_tokens.table_expires_at')}</TableHead>
                    <TableHead>{t('account.api_tokens.table_status')}</TableHead>
                    <TableHead className="w-24"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {tokens.map((token) => {
                    const status = tokenStatus(token)
                    return (
                      <TableRow key={token.id}>
                        <TableCell className="font-medium">{token.name}</TableCell>
                        <TableCell>
                          <code className="text-xs">{token.prefix}...</code>
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-wrap gap-1">
                            {token.scopes.map((scope) => (
                              <Badge key={scope} variant="secondary" className="text-xs">
                                {scope}
                              </Badge>
                            ))}
                          </div>
                        </TableCell>
                        <TableCell className="text-muted-foreground text-xs">
                          {token.lastUsedAt
                            ? formatDate(token.lastUsedAt, 'datetime')
                            : t('account.api_tokens.never_used')}
                        </TableCell>
                        <TableCell className="text-muted-foreground text-xs">
                          {token.expiresAt
                            ? formatDate(token.expiresAt, 'date')
                            : t('account.api_tokens.no_expiry')}
                        </TableCell>
                        <TableCell>
                          {status === 'active' && (
                            <Badge variant="default">
                              {t('account.api_tokens.status_active')}
                            </Badge>
                          )}
                          {status === 'revoked' && (
                            <Badge variant="destructive">
                              {t('account.api_tokens.status_revoked')}
                            </Badge>
                          )}
                          {status === 'expired' && (
                            <Badge variant="outline">
                              {t('account.api_tokens.status_expired')}
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          {status === 'active' && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setTokenToRevoke(token)}
                            >
                              {t('account.api_tokens.revoke')}
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </div>
      </AccountLayout>

      {/* Modal d'affichage du token créé */}
      <Dialog open={createdToken !== null} onOpenChange={(open) => !open && setCreatedToken(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('account.api_tokens.created_title')}</DialogTitle>
            <DialogDescription>{t('account.api_tokens.created_description')}</DialogDescription>
          </DialogHeader>
          {createdToken && (
            <div className="space-y-2 py-4">
              <Label>{createdToken.name}</Label>
              <div className="flex items-center gap-2">
                <code className="bg-muted flex-1 break-all rounded px-3 py-2 text-xs">
                  {createdToken.plainToken}
                </code>
                <Button type="button" variant="outline" size="sm" onClick={handleCopy}>
                  {copied ? (
                    <>
                      <Check className="mr-1 h-3 w-3" />
                      {t('account.api_tokens.copied')}
                    </>
                  ) : (
                    <>
                      <Copy className="mr-1 h-3 w-3" />
                      {t('account.api_tokens.copy')}
                    </>
                  )}
                </Button>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button onClick={() => setCreatedToken(null)}>
              {t('account.api_tokens.done')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Confirmation de révocation */}
      <AlertDialog
        open={tokenToRevoke !== null}
        onOpenChange={(open) => !open && setTokenToRevoke(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('account.api_tokens.revoke_confirm_title')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('account.api_tokens.revoke_confirm_description')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={revoking}>{t('common.cancel')}</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleRevoke}
              disabled={revoking}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {revoking
                ? t('account.api_tokens.revoking')
                : t('account.api_tokens.revoke')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
