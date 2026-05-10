import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { useI18n } from '@/hooks/use-i18n'
import { RoleBadge } from './role-badge'
import { useFormatLongDate } from './use-format-long-date'
import type { Member } from './types'

interface Props {
  member: Member | null
  onClose: () => void
}

export function ViewMemberDialog({ member, onClose }: Props) {
  const { t } = useI18n()
  const formatLongDate = useFormatLongDate()

  return (
    <AlertDialog open={!!member} onOpenChange={onClose}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{t('organizations.users.view_dialog.title')}</AlertDialogTitle>
        </AlertDialogHeader>
        {member && (
          <div className="space-y-4">
            <div className="flex items-center gap-4">
              <Avatar className="h-16 w-16">
                <AvatarImage src={member.avatarUrl || ''} alt={member.fullName || ''} />
                <AvatarFallback className="text-xl">
                  {member.fullName?.charAt(0) || member.email.charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1">
                <h3 className="font-semibold text-lg">{member.fullName || member.email}</h3>
                <p className="text-sm text-muted-foreground">{member.email}</p>
              </div>
            </div>
            <div className="grid gap-3">
              <div className="flex justify-between py-2 border-b">
                <span className="text-sm font-medium">
                  {t('organizations.users.view_dialog.role_label')}
                </span>
                <RoleBadge role={member.role} />
              </div>
              <div className="flex justify-between py-2 border-b">
                <span className="text-sm font-medium">
                  {t('organizations.users.view_dialog.since_label')}
                </span>
                <span className="text-sm text-muted-foreground">
                  {formatLongDate(member.joinedAt)}
                </span>
              </div>
              <div className="flex justify-between py-2">
                <span className="text-sm font-medium">
                  {t('organizations.users.view_dialog.user_id_label')}
                </span>
                <span className="text-sm text-muted-foreground font-mono">{member.id}</span>
              </div>
            </div>
          </div>
        )}
        <AlertDialogFooter>
          <AlertDialogCancel>{t('organizations.users.view_dialog.close')}</AlertDialogCancel>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
