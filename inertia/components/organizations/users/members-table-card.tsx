import { router } from '@inertiajs/react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { useState } from 'react'
import { useI18n } from '@/hooks/use-i18n'
import { RoleBadge } from './role-badge'
import { MemberActionsMenu } from './member-actions-menu'
import { ViewMemberDialog } from './view-member-dialog'
import { DeleteMemberDialog } from './delete-member-dialog'
import { useFormatLongDate } from './use-format-long-date'
import { MANAGER_ROLES, type Member } from './types'

interface Props {
  members: Member[]
  userRole: string
  currentUserId: string | undefined
}

export function MembersTableCard({ members, userRole, currentUserId }: Props) {
  const { t } = useI18n()
  const formatLongDate = useFormatLongDate()
  const canManageMembers = MANAGER_ROLES.has(userRole)
  const isAdmin = MANAGER_ROLES.has(userRole)

  const [memberToView, setMemberToView] = useState<Member | null>(null)
  const [memberToDelete, setMemberToDelete] = useState<Member | null>(null)
  const [changingRoleFor, setChangingRoleFor] = useState<string | null>(null)

  const handleRoleChange = (userId: string, newRole: string) => {
    setChangingRoleFor(userId)
    router.put(
      `/organizations/settings/users/${userId}/role`,
      { userId, role: newRole },
      { onFinish: () => setChangingRoleFor(null) }
    )
  }

  const handleDelete = () => {
    if (!memberToDelete) return
    router.delete(`/organizations/settings/users/${memberToDelete.id}`, {
      data: { userId: memberToDelete.id },
      onFinish: () => setMemberToDelete(null),
    })
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>{t('organizations.users.members.card_title')}</CardTitle>
          <CardDescription>
            {t('organizations.users.members.card_description_count', {
              count: members.length,
            })}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t('organizations.users.members.col_user')}</TableHead>
                <TableHead>{t('organizations.users.members.col_role')}</TableHead>
                <TableHead>{t('organizations.users.members.col_joined_at')}</TableHead>
                {canManageMembers && (
                  <TableHead className="w-[70px]">
                    {t('organizations.users.members.col_actions')}
                  </TableHead>
                )}
              </TableRow>
            </TableHeader>
            <TableBody>
              {members.map((member) => {
                const isCurrentUser = member.id === currentUserId
                const isChangingRole = changingRoleFor === member.id

                return (
                  <TableRow key={member.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Avatar className="h-8 w-8">
                          <AvatarImage src={member.avatarUrl || ''} alt={member.fullName || ''} />
                          <AvatarFallback>
                            {member.fullName?.charAt(0) || member.email.charAt(0).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <div className="font-medium">
                            {member.fullName || member.email}
                            {isCurrentUser && (
                              <span className="ml-2 text-xs text-muted-foreground">
                                {t('organizations.users.members.you_label')}
                              </span>
                            )}
                          </div>
                          {member.fullName && (
                            <div className="text-sm text-muted-foreground">{member.email}</div>
                          )}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <RoleBadge role={member.role} />
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {formatLongDate(member.joinedAt)}
                    </TableCell>
                    {canManageMembers && (
                      <TableCell>
                        <MemberActionsMenu
                          member={member}
                          isCurrentUser={isCurrentUser}
                          isAdmin={isAdmin}
                          isChangingRole={isChangingRole}
                          onView={setMemberToView}
                          onDelete={setMemberToDelete}
                          onChangeRole={handleRoleChange}
                        />
                      </TableCell>
                    )}
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <ViewMemberDialog member={memberToView} onClose={() => setMemberToView(null)} />
      <DeleteMemberDialog
        member={memberToDelete}
        onClose={() => setMemberToDelete(null)}
        onConfirm={handleDelete}
      />
    </>
  )
}
