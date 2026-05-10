import { Head, usePage } from '@inertiajs/react'
import OrganizationSettingsLayout from '@/components/layouts/organization-settings-layout'
import { useI18n } from '@/hooks/use-i18n'
import { InviteMemberForm } from '@/components/organizations/users/invite-member-form'
import { PendingInvitationsCard } from '@/components/organizations/users/pending-invitations-card'
import { MembersTableCard } from '@/components/organizations/users/members-table-card'
import {
  MANAGER_ROLES,
  type Invitation,
  type Member,
  type OrganizationLite,
} from '@/components/organizations/users/types'

interface Props {
  organization: OrganizationLite
  userRole: string
  members: Member[]
  invitations: Invitation[]
}

export default function OrganizationSettingsUsersPage({
  userRole,
  members,
  invitations,
}: Props) {
  const { t } = useI18n()
  const { auth } = usePage<{ auth: { user: { id: string } | null } }>().props
  const currentUserId = auth?.user?.id
  const canManageMembers = MANAGER_ROLES.has(userRole)

  return (
    <>
      <Head title={t('organizations.users.head_title')} />
      <OrganizationSettingsLayout>
        <div className="max-w-4xl space-y-8">
          <div>
            <h2 className="text-lg font-semibold">{t('organizations.users.section_title')}</h2>
            <p className="text-sm text-muted-foreground mt-1">
              {t('organizations.users.section_description')}
            </p>
          </div>

          {canManageMembers && <InviteMemberForm />}
          {canManageMembers && invitations.length > 0 && (
            <PendingInvitationsCard invitations={invitations} />
          )}
          <MembersTableCard
            members={members}
            userRole={userRole}
            currentUserId={currentUserId}
          />
        </div>
      </OrganizationSettingsLayout>
    </>
  )
}
