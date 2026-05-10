import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { CheckCircle2, XCircle } from 'lucide-react'
import { KeyValueRow } from '@/components/core/key-value-row'
import { useI18n } from '@/hooks/use-i18n'
import type { User } from './types'

interface FormData {
  fullName: string
  email: string
}

interface Props {
  user: User
  isEditing: boolean
  data: FormData
  setData: <K extends keyof FormData>(field: K, value: FormData[K]) => void
  errors: Partial<Record<keyof FormData, string>>
}

export function UserInfoCard({ user, isEditing, data, setData, errors }: Props) {
  const { t, locale } = useI18n()
  const dateLocale = locale === 'en' ? 'en-US' : 'fr-FR'
  const formatDateTime = (iso: string) =>
    new Intl.DateTimeFormat(dateLocale, { dateStyle: 'medium', timeStyle: 'short' }).format(
      new Date(iso)
    )

  const initials = user.fullName
    ? user.fullName
        .split(' ')
        .map((n) => n[0])
        .join('')
        .toUpperCase()
    : user.email[0].toUpperCase()

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('admin.user_detail.general_info_title')}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center gap-4">
          <Avatar className="h-16 w-16">
            <AvatarImage src={user.avatarUrl || ''} alt={user.fullName || ''} />
            <AvatarFallback>{initials}</AvatarFallback>
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
          <KeyValueRow
            label={t('admin.user_detail.field_id')}
            value={user.id}
            valueClassName="font-mono"
          />
          <KeyValueRow
            label={t('admin.user_detail.field_account_type')}
            value={
              user.googleId ? (
                <Badge variant="secondary">Google</Badge>
              ) : (
                <Badge variant="outline">Email</Badge>
              )
            }
          />
          <KeyValueRow
            label={t('admin.user_detail.field_email_verified')}
            value={
              user.isEmailVerified ? (
                <div className="flex items-center gap-1 text-green-600">
                  <CheckCircle2 className="h-4 w-4" />
                  <span>{t('admin.user_detail.field_email_verified_yes')}</span>
                </div>
              ) : (
                <div className="flex items-center gap-1 text-orange-600">
                  <XCircle className="h-4 w-4" />
                  <span>{t('admin.user_detail.field_email_verified_no')}</span>
                </div>
              )
            }
          />
          <KeyValueRow
            label={t('admin.user_detail.field_signup')}
            value={formatDateTime(user.createdAt)}
          />
          <KeyValueRow
            label={t('admin.user_detail.field_updated_at')}
            value={formatDateTime(user.updatedAt)}
          />
        </div>
      </CardContent>
    </Card>
  )
}
