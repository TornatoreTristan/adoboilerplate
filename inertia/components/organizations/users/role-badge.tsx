import { Badge } from '@/components/ui/badge'
import { useI18n } from '@/hooks/use-i18n'

interface Props {
  role: string
}

/**
 * Single source of truth for role-badge styling + label translation.
 * Used in members tables, the invitations table and the view dialog.
 */
export function RoleBadge({ role }: Props) {
  const { t } = useI18n()
  const variant: 'default' | 'secondary' | 'outline' =
    role === 'owner' ? 'default' : role === 'admin' ? 'secondary' : 'outline'

  const knownLabel = ['owner', 'admin', 'moderator', 'member'].includes(role)
    ? t(`organizations.users.role.${role}`)
    : role

  return <Badge variant={variant}>{knownLabel}</Badge>
}
