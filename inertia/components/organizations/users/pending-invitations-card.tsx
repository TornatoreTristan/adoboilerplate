import { router } from '@inertiajs/react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Clock, X } from 'lucide-react'
import { useI18n } from '@/hooks/use-i18n'
import { RoleBadge } from './role-badge'
import { useFormatLongDate } from './use-format-long-date'
import type { Invitation } from './types'

interface Props {
  invitations: Invitation[]
}

export function PendingInvitationsCard({ invitations }: Props) {
  const { t } = useI18n()
  const formatLongDate = useFormatLongDate()

  const handleCancel = (invitation: Invitation) => {
    if (
      confirm(
        t('organizations.users.invitations.cancel_confirm', {
          email: invitation.email,
        })
      )
    ) {
      router.delete(`/organizations/settings/users/invitations/${invitation.id}`)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Clock className="h-5 w-5" />
          {t('organizations.users.invitations.card_title')}
        </CardTitle>
        <CardDescription>
          {t('organizations.users.invitations.card_description_count', {
            count: invitations.length,
          })}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t('organizations.users.invitations.col_email')}</TableHead>
              <TableHead>{t('organizations.users.invitations.col_role')}</TableHead>
              <TableHead>{t('organizations.users.invitations.col_expires')}</TableHead>
              <TableHead className="w-[70px]">
                {t('organizations.users.invitations.col_actions')}
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {invitations.map((invitation) => (
              <TableRow key={invitation.id}>
                <TableCell className="font-medium">{invitation.email}</TableCell>
                <TableCell>
                  <RoleBadge role={invitation.role} />
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">
                  {formatLongDate(invitation.expiresAt)}
                </TableCell>
                <TableCell>
                  <Button variant="ghost" size="icon" onClick={() => handleCancel(invitation)}>
                    <X className="h-4 w-4" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  )
}
