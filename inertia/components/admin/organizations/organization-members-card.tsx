import { Link } from '@adonisjs/inertia/react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Shield, UserCog, Users } from 'lucide-react'
import { StatusBadge, type StatusBadgeVariant } from '@/components/core/status-badge'
import { EmptyState } from '@/components/core/empty-state'
import { useI18n } from '@/hooks/use-i18n'
import { AddMemberDialog } from './add-member-dialog'
import type { Member } from './types'

interface Props {
  organizationId: string
  members: Member[]
}

export function OrganizationMembersCard({ organizationId, members }: Props) {
  const { t, locale } = useI18n()
  const dateLocale = locale === 'en' ? 'en-US' : 'fr-FR'
  const formatDateOnly = (iso: string) =>
    new Intl.DateTimeFormat(dateLocale, { dateStyle: 'medium' }).format(new Date(iso))

  const renderRoleBadge = (role: string) => {
    const variants: Record<string, StatusBadgeVariant> = {
      owner: 'default',
      admin: 'default',
      moderator: 'secondary',
      member: 'outline',
    }
    const variant = variants[role] ?? 'outline'
    const label = variants[role] ? t(`admin.organization_detail.role.${role}`) : role
    const Icon =
      role === 'admin' || role === 'owner'
        ? Shield
        : role === 'moderator'
          ? UserCog
          : Users
    return <StatusBadge label={label} variant={variant} icon={Icon} />
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>
          {t('admin.organization_detail.members_title', { count: members.length })}
        </CardTitle>
        <AddMemberDialog organizationId={organizationId} />
      </CardHeader>
      <CardContent>
        {members.length === 0 ? (
          <EmptyState message={t('admin.organization_detail.empty_members')} />
        ) : (
          <div className="space-y-4">
            {members.map((member) => (
              <Link
                key={member.id}
                href={`/admin/users/${member.id}`}
                className="flex items-start justify-between border border-border/80 rounded-md p-4 hover:bg-muted/50 transition-colors cursor-pointer"
              >
                <div className="flex gap-3">
                  <Avatar className="h-10 w-10">
                    <AvatarImage src={member.avatarUrl || ''} alt={member.fullName || ''} />
                    <AvatarFallback>
                      {member.fullName
                        ? member.fullName
                            .split(' ')
                            .map((n) => n[0])
                            .join('')
                            .toUpperCase()
                        : member.email[0].toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-sm">
                        {member.fullName || t('admin.organization_detail.member_no_name')}
                      </span>
                      {renderRoleBadge(member.role)}
                    </div>
                    <p className="text-xs text-muted-foreground">{member.email}</p>
                    <p className="text-xs text-muted-foreground">
                      {t('admin.organization_detail.member_since', {
                        date: formatDateOnly(member.joinedAt),
                      })}
                    </p>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
