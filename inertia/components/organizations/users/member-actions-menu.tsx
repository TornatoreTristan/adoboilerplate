import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Eye, MoreHorizontal, Shield, Trash2 } from 'lucide-react'
import { useI18n } from '@/hooks/use-i18n'
import type { Member } from './types'

interface Props {
  member: Member
  isCurrentUser: boolean
  isAdmin: boolean
  isChangingRole: boolean
  onView: (m: Member) => void
  onDelete: (m: Member) => void
  onChangeRole: (memberId: string, newRole: string) => void
}

/**
 * Per-row dropdown extracted from the members table so the table file
 * stays readable. Role change buttons are disabled when the target
 * already has that role.
 */
export function MemberActionsMenu({
  member,
  isCurrentUser,
  isAdmin,
  isChangingRole,
  onView,
  onDelete,
  onChangeRole,
}: Props) {
  const { t } = useI18n()

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" disabled={isChangingRole}>
          <MoreHorizontal className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuLabel>{t('common.actions')}</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => onView(member)}>
          <Eye className="mr-2 h-4 w-4" />
          {t('organizations.users.members.view')}
        </DropdownMenuItem>

        {isAdmin && !isCurrentUser && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={() => onDelete(member)}
              className="text-destructive focus:text-destructive"
            >
              <Trash2 className="mr-2 h-4 w-4" />
              {t('organizations.users.members.delete')}
            </DropdownMenuItem>
          </>
        )}

        {!isCurrentUser && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuLabel className="text-xs text-muted-foreground font-normal">
              {t('organizations.users.members.change_role_label')}
            </DropdownMenuLabel>
            <DropdownMenuItem
              onClick={() => onChangeRole(member.id, 'member')}
              disabled={member.role === 'member'}
            >
              <Shield className="mr-2 h-4 w-4" />
              {t('organizations.users.members.set_as_member')}
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => onChangeRole(member.id, 'admin')}
              disabled={member.role === 'admin'}
            >
              <Shield className="mr-2 h-4 w-4" />
              {t('organizations.users.members.set_as_admin')}
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => onChangeRole(member.id, 'owner')}
              disabled={member.role === 'owner'}
            >
              <Shield className="mr-2 h-4 w-4" />
              {t('organizations.users.members.set_as_owner')}
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
