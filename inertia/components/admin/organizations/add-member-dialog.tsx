import { Link } from '@adonisjs/inertia/react'
import { useForm, usePage } from '@inertiajs/react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Plus } from 'lucide-react'
import { toast } from 'sonner'
import { useState } from 'react'
import { useI18n } from '@/hooks/use-i18n'

interface Props {
  organizationId: string
}

export function AddMemberDialog({ organizationId }: Props) {
  const { t } = useI18n()
  const [open, setOpen] = useState(false)
  const { flash } = usePage<{ flash: { success?: string } }>().props
  const { data, setData, post, processing, errors, reset } = useForm({
    email: '',
    role: 'member',
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    post(`/admin/organizations/${organizationId}/members`, {
      onSuccess: () => {
        setOpen(false)
        reset()
        if (flash?.success) {
          toast.success(flash.success)
        }
      },
      onError: () => {
        if (errors.email) {
          toast.error(errors.email)
        }
      },
    })
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          {t('admin.organization_detail.add_member_button')}
        </Button>
      </DialogTrigger>
      <DialogContent>
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>{t('admin.organization_detail.add_member_dialog_title')}</DialogTitle>
            <DialogDescription>
              {t('admin.organization_detail.add_member_dialog_description')}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="email">{t('admin.organization_detail.email_label')}</Label>
              <Input
                id="email"
                type="email"
                placeholder={t('admin.organization_detail.email_placeholder')}
                value={data.email}
                onChange={(e) => setData('email', e.target.value)}
                required
              />
              {errors.email && <p className="text-sm text-destructive">{errors.email}</p>}
            </div>
            <div className="grid gap-2">
              <Label htmlFor="role">{t('admin.organization_detail.role_label')}</Label>
              <Select value={data.role} onValueChange={(value) => setData('role', value)}>
                <SelectTrigger>
                  <SelectValue placeholder={t('admin.organization_detail.role_placeholder')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="owner">
                    {t('admin.organization_detail.role.owner')}
                  </SelectItem>
                  <SelectItem value="admin">
                    {t('admin.organization_detail.role.admin')}
                  </SelectItem>
                  <SelectItem value="moderator">
                    {t('admin.organization_detail.role.moderator')}
                  </SelectItem>
                  <SelectItem value="member">
                    {t('admin.organization_detail.role.member')}
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              {t('common.cancel')}
            </Button>
            <Button type="submit" disabled={processing}>
              {t('admin.organization_detail.submit_add_member')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

/* Re-export Link so consumers don't need a second import line. */
export { Link }
