import AdminLayout from '@/components/layouts/admin-layout'
import { PageHeader } from '@/components/core/page-header'
import { Head, Link, useForm } from '@inertiajs/react'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  ArrowLeft,
  CheckCircle2,
  XCircle,
  Monitor,
  Smartphone,
  Tablet,
  Pencil,
  Save,
  X,
  ScrollText,
} from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { fr } from 'date-fns/locale'
import { useState } from 'react'
import { toast } from 'sonner'
import { Separator } from '#inertia/components/ui/separator'
import { useI18n } from '@/hooks/use-i18n'

interface User {
  id: string
  fullName: string | null
  email: string
  avatarUrl: string | null
  googleId: string | null
  isEmailVerified: boolean
  createdAt: string
  updatedAt: string
}

interface Session {
  id: string
  ipAddress: string
  userAgent: string
  startedAt: string
  lastActivity: string
  endedAt: string | null
  isActive: boolean
  country: string | null
  city: string | null
  deviceType: string | null
  os: string | null
  browser: string | null
}

interface AuditLog {
  id: string
  action: string
  resourceType: string | null
  resourceId: string | null
  ipAddress: string | null
  metadata: Record<string, any> | null
  createdAt: string
}

interface UserDetailPageProps {
  user: User
  sessions: Session[]
  auditLogs: AuditLog[]
}

const getDeviceIcon = (deviceType: string | null) => {
  if (!deviceType) return <Monitor className="h-4 w-4" />
  if (deviceType.toLowerCase().includes('mobile')) return <Smartphone className="h-4 w-4" />
  if (deviceType.toLowerCase().includes('tablet')) return <Tablet className="h-4 w-4" />
  return <Monitor className="h-4 w-4" />
}

const formatAction = (action: string): string => {
  const parts = action.split('.')
  return parts.map((part) => part.charAt(0).toUpperCase() + part.slice(1)).join(' ')
}

const getActionBadgeVariant = (action: string): 'default' | 'secondary' | 'destructive' => {
  if (action.includes('deleted') || action.includes('failed')) return 'destructive'
  if (action.includes('created') || action.includes('success')) return 'default'
  return 'secondary'
}

const UserDetailPage = ({ user, sessions, auditLogs }: UserDetailPageProps) => {
  const { t, locale } = useI18n()
  const [isEditing, setIsEditing] = useState(false)
  const { data, setData, put, processing, errors } = useForm({
    fullName: user.fullName || '',
    email: user.email,
  })

  const dateLocale = locale === 'en' ? 'en-US' : 'fr-FR'
  const distanceLocale = locale === 'en' ? undefined : fr
  const formatDateTime = (iso: string) =>
    new Intl.DateTimeFormat(dateLocale, { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(iso))

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    put(`/admin/users/${user.id}`, {
      onSuccess: () => {
        setIsEditing(false)
        toast.success(t('admin.user_detail.update_success'))
      },
      onError: () => {
        toast.error(t('admin.user_detail.update_error'))
      },
    })
  }

  return (
    <>
      <Head title={t('admin.user_detail.head_title', { name: user.fullName || user.email })} />
      <AdminLayout
        breadcrumbs={[
          { label: t('admin.user_detail.breadcrumb_users'), href: '/admin/users' },
          { label: user.fullName || user.email },
        ]}
      >
        <div className="flex flex-col gap-6 p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link href="/admin/users">
                <Button variant="ghost" size="icon">
                  <ArrowLeft className="h-4 w-4" />
                </Button>
              </Link>
              <PageHeader
                title={user.fullName || t('admin.user_detail.no_name')}
                description={user.email}
                separator={false}
              />
            </div>
            {!isEditing ? (
              <Button onClick={() => setIsEditing(true)}>
                <Pencil className="mr-2 h-4 w-4" />
                {t('admin.user_detail.edit')}
              </Button>
            ) : (
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setIsEditing(false)} disabled={processing}>
                  <X className="mr-2 h-4 w-4" />
                  {t('admin.user_detail.cancel')}
                </Button>
                <Button onClick={handleSubmit} disabled={processing}>
                  <Save className="mr-2 h-4 w-4" />
                  {t('admin.user_detail.save')}
                </Button>
              </div>
            )}
          </div>
          <Separator />

          <div className="grid gap-6 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>{t('admin.user_detail.general_info_title')}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center gap-4">
                  <Avatar className="h-16 w-16">
                    <AvatarImage src={user.avatarUrl || ''} alt={user.fullName || ''} />
                    <AvatarFallback>
                      {user.fullName
                        ? user.fullName.split(' ').map((n) => n[0]).join('').toUpperCase()
                        : user.email[0].toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    {isEditing ? (
                      <div className="space-y-2">
                        <Input
                          value={data.fullName}
                          onChange={(e) => setData('fullName', e.target.value)}
                          placeholder={t('admin.user_detail.name_placeholder')}
                        />
                        {errors.fullName && (
                          <p className="text-sm text-destructive">{errors.fullName}</p>
                        )}
                      </div>
                    ) : (
                      <p className="font-medium">{user.fullName || t('admin.user_detail.no_name')}</p>
                    )}
                    {isEditing ? (
                      <div className="space-y-2 mt-2">
                        <Input
                          value={data.email}
                          onChange={(e) => setData('email', e.target.value)}
                          placeholder={t('admin.user_detail.email_placeholder')}
                          type="email"
                        />
                        {errors.email && <p className="text-sm text-destructive">{errors.email}</p>}
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground">{user.email}</p>
                    )}
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">{t('admin.user_detail.field_id')}</span>
                    <span className="font-mono">{user.id}</span>
                  </div>

                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">{t('admin.user_detail.field_account_type')}</span>
                    {user.googleId ? (
                      <Badge variant="secondary">Google</Badge>
                    ) : (
                      <Badge variant="outline">Email</Badge>
                    )}
                  </div>

                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">{t('admin.user_detail.field_email_verified')}</span>
                    {user.isEmailVerified ? (
                      <div className="flex items-center gap-1 text-green-600">
                        <CheckCircle2 className="h-4 w-4" />
                        <span>{t('admin.user_detail.field_email_verified_yes')}</span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-1 text-orange-600">
                        <XCircle className="h-4 w-4" />
                        <span>{t('admin.user_detail.field_email_verified_no')}</span>
                      </div>
                    )}
                  </div>

                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">{t('admin.user_detail.field_signup')}</span>
                    <span>{formatDateTime(user.createdAt)}</span>
                  </div>

                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">{t('admin.user_detail.field_updated_at')}</span>
                    <span>{formatDateTime(user.updatedAt)}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>{t('admin.user_detail.statistics_title')}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">
                    {t('admin.user_detail.stats_total_sessions')}
                  </span>
                  <span className="font-semibold">{sessions.length}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">
                    {t('admin.user_detail.stats_active_sessions')}
                  </span>
                  <span className="font-semibold">{sessions.filter((s) => s.isActive).length}</span>
                </div>
                {sessions.length > 0 && (
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">
                      {t('admin.user_detail.stats_last_activity')}
                    </span>
                    <span className="text-sm">
                      {t('admin.user_detail.stats_time_ago', {
                        time: formatDistanceToNow(new Date(sessions[0].lastActivity), { locale: distanceLocale }),
                      })}
                    </span>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>{t('admin.user_detail.sessions_title', { count: sessions.length })}</CardTitle>
            </CardHeader>
            <CardContent>
              {sessions.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">
                  {t('admin.user_detail.empty_sessions')}
                </p>
              ) : (
                <div className="space-y-4">
                  {sessions.map((session) => (
                    <div
                      key={session.id}
                      className="flex items-start justify-between border border-border/80 rounded-md p-4"
                    >
                      <div className="flex gap-3">
                        <div className="text-muted-foreground mt-1">
                          {getDeviceIcon(session.deviceType)}
                        </div>
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-sm">
                              {t('admin.user_detail.session_browser_label', {
                                browser: session.browser || t('admin.user_detail.session_browser_unknown'),
                                os: session.os || t('admin.user_detail.session_os_unknown'),
                              })}
                            </span>
                            {session.isActive && (
                              <Badge variant="secondary" className="text-xs">
                                {t('admin.user_detail.session_active_badge')}
                              </Badge>
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground">
                            {session.ipAddress}
                            {session.city && session.country && (
                              <>
                                {' '}
                                · {session.city}, {session.country}
                              </>
                            )}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {t('admin.user_detail.session_last_activity', {
                              time: formatDistanceToNow(new Date(session.lastActivity), { locale: distanceLocale }),
                            })}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <ScrollText className="h-5 w-5" />
                  {t('admin.user_detail.audit_logs_title', { count: auditLogs.length })}
                </CardTitle>
                {auditLogs.length > 0 && (
                  <Link href="/admin/audit-logs">
                    <Button variant="outline" size="sm">
                      {t('admin.user_detail.audit_logs_view_all')}
                    </Button>
                  </Link>
                )}
              </div>
            </CardHeader>
            <CardContent>
              {auditLogs.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">
                  {t('admin.user_detail.empty_audit_logs')}
                </p>
              ) : (
                <div className="space-y-3">
                  {auditLogs.map((log) => (
                    <div
                      key={log.id}
                      className="flex items-start justify-between border border-border/80 rounded-md p-4"
                    >
                      <div className="flex-1 space-y-1">
                        <div className="flex items-center gap-2">
                          <Badge variant={getActionBadgeVariant(log.action)} className="text-xs">
                            {formatAction(log.action)}
                          </Badge>
                          {log.resourceType && (
                            <span className="text-xs text-muted-foreground">{log.resourceType}</span>
                          )}
                        </div>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          {log.ipAddress && <span className="font-mono">{log.ipAddress}</span>}
                          <span>·</span>
                          <span>
                            {t('admin.user_detail.audit_log_time_ago', {
                              time: formatDistanceToNow(new Date(log.createdAt), { locale: distanceLocale }),
                            })}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </AdminLayout>
    </>
  )
}

export default UserDetailPage
