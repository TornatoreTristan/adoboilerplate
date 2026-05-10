import { useForm } from '@inertiajs/react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { UserPlus } from 'lucide-react'
import { useI18n } from '@/hooks/use-i18n'

/**
 * Inline invite-member form. Owns its own useForm state so the parent
 * page never has to thread through email/role props.
 */
export function InviteMemberForm() {
  const { t } = useI18n()
  const { data, setData, post, processing, errors, reset } = useForm({
    email: '',
    role: 'member',
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    post('/organizations/settings/users/invite', {
      onSuccess: () => reset(),
    })
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <UserPlus className="h-5 w-5" />
          {t('organizations.users.invite.card_title')}
        </CardTitle>
        <CardDescription>{t('organizations.users.invite.card_description')}</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="flex gap-4">
          <div className="flex-1 grid gap-2">
            <Label htmlFor="email">{t('organizations.users.invite.email_label')}</Label>
            <Input
              id="email"
              type="email"
              value={data.email}
              onChange={(e) => setData('email', e.target.value)}
              placeholder={t('organizations.users.invite.email_placeholder')}
              required
            />
            {errors.email && <p className="text-xs text-destructive">{errors.email}</p>}
          </div>

          <div className="w-48 grid gap-2">
            <Label htmlFor="role">{t('organizations.users.invite.role_label')}</Label>
            <Select value={data.role} onValueChange={(value) => setData('role', value)}>
              <SelectTrigger id="role">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="member">{t('organizations.users.role.member')}</SelectItem>
                <SelectItem value="admin">{t('organizations.users.role.admin')}</SelectItem>
                <SelectItem value="owner">{t('organizations.users.role.owner')}</SelectItem>
              </SelectContent>
            </Select>
            {errors.role && <p className="text-xs text-destructive">{errors.role}</p>}
          </div>

          <div className="grid gap-2">
            <Label className="invisible">.</Label>
            <Button type="submit" disabled={processing}>
              {processing
                ? t('organizations.users.invite.submitting')
                : t('organizations.users.invite.submit')}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}
