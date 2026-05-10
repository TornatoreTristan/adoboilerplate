import { StatusBadge, type StatusBadgeVariant } from '@/components/core/status-badge'
import { useI18n } from '@/hooks/use-i18n'

const VARIANTS: Record<string, StatusBadgeVariant> = {
  owner: 'default',
  admin: 'secondary',
}

export function RoleBadge({ role }: { role: string }) {
  const { t } = useI18n()
  const variant = VARIANTS[role] || 'outline'
  const label = ['owner', 'admin', 'moderator', 'member'].includes(role)
    ? t(`organizations.users.role.${role}`)
    : role

  return <StatusBadge label={label} variant={variant} />
}
