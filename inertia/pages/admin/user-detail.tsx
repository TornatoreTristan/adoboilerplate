import AdminLayout from '@/components/layouts/admin-layout'
import { PageHeader } from '@/components/core/page-header'
import { Link } from '@adonisjs/inertia/react'
import { Head, useForm } from '@inertiajs/react'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { ArrowLeft, Pencil, Save, X } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'
import { useI18n } from '@/hooks/use-i18n'
import { UserInfoCard } from '@/components/admin/user-detail/user-info-card'
import { UserStatsCard } from '@/components/admin/user-detail/user-stats-card'
import { UserSessionsCard } from '@/components/admin/user-detail/user-sessions-card'
import { UserAuditLogsCard } from '@/components/admin/user-detail/user-audit-logs-card'
import type { AuditLog, Session, User } from '@/components/admin/user-detail/types'

interface Props {
  user: User
  sessions: Session[]
  auditLogs: AuditLog[]
}

export default function UserDetailPage({ user, sessions, auditLogs }: Props) {
  const { t } = useI18n()
  const [isEditing, setIsEditing] = useState(false)
  const { data, setData, put, processing, errors } = useForm({
    fullName: user.fullName || '',
    email: user.email,
  })

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
                <Button
                  variant="outline"
                  onClick={() => setIsEditing(false)}
                  disabled={processing}
                >
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
            <UserInfoCard
              user={user}
              isEditing={isEditing}
              data={data}
              setData={setData}
              errors={errors}
            />
            <UserStatsCard sessions={sessions} />
          </div>

          <UserSessionsCard sessions={sessions} />
          <UserAuditLogsCard auditLogs={auditLogs} />
        </div>
      </AdminLayout>
    </>
  )
}
