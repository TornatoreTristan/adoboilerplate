import { Head, usePage, useForm, router } from '@inertiajs/react'
import AccountLayout from '@/components/layouts/account-layout'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Alert, AlertDescription } from '@/components/ui/alert'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { Info } from 'lucide-react'
import { useState } from 'react'
import { useI18n } from '@/hooks/use-i18n'

export default function Profile() {
  const { t } = useI18n()
  const { auth } = usePage<{
    auth: {
      user: {
        id: string
        fullName: string | null
        email: string
        avatarUrl: string | null
        googleId: string | null
        isEmailVerified: boolean
      } | null
    }
  }>().props

  const user = auth.user

  const { data, setData, put, processing, errors } = useForm({
    fullName: user?.fullName || '',
  })

  const [isDeleting, setIsDeleting] = useState(false)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    put('/account/profile')
  }

  const handleDeleteAccount = () => {
    setIsDeleting(true)
    router.delete('/account/delete', {
      onFinish: () => setIsDeleting(false),
    })
  }

  if (!user) return null

  return (
    <>
      <Head title={t('account.profile.title')} />
      <AccountLayout>
        <div className="max-w-2xl space-y-10">
          {/* Photo de profil */}
          <div className="space-y-4">
            <h3 className="text-base font-medium">{t('account.profile.profile_picture')}</h3>
            <div className="flex items-center gap-4">
              <Avatar className="h-20 w-20">
                <AvatarImage src={user.avatarUrl || ''} alt={user.fullName || 'Avatar'} />
                <AvatarFallback className="text-lg">
                  {user.fullName
                    ? user.fullName
                        .split(' ')
                        .map((n) => n[0])
                        .join('')
                        .toUpperCase()
                    : user.email[0].toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <Button variant="outline" size="sm">
                {t('account.profile.change')}
              </Button>
            </div>
          </div>

          <Separator />

          {/* Informations personnelles */}
          <div className="space-y-4">
            <h3 className="text-base font-medium">{t('account.profile.personal_info')}</h3>
            <form onSubmit={handleSubmit} className="grid gap-4">
              <div className="grid gap-2">
                <Label htmlFor="fullName">{t('account.profile.full_name')}</Label>
                <Input
                  id="fullName"
                  value={data.fullName}
                  onChange={(e) => setData('fullName', e.target.value)}
                  placeholder={t('account.profile.full_name_placeholder')}
                />
                {errors.fullName && <p className="text-destructive text-xs">{errors.fullName}</p>}
              </div>

              <div className="grid gap-2">
                <Label htmlFor="email">{t('account.profile.email')}</Label>
                <Input id="email" type="email" defaultValue={user.email} disabled />
                {!user.isEmailVerified && (
                  <p className="text-destructive text-xs">
                    {t('account.profile.email_not_verified')} -{' '}
                    <button className="underline">{t('account.profile.resend_email')}</button>
                  </p>
                )}
              </div>

              <Button type="submit" className="w-fit" disabled={processing}>
                {processing ? t('account.profile.saving') : t('account.profile.save')}
              </Button>
            </form>
          </div>

          <Separator />

          {/* Mot de passe */}
          <div className="space-y-4">
            <h3 className="text-base font-medium">{t('account.profile.password')}</h3>
            {user.googleId ? (
              <Alert>
                <Info className="h-4 w-4" />
                <AlertDescription>{t('account.profile.google_password_notice')}</AlertDescription>
              </Alert>
            ) : (
              <div className="grid gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="current-password">{t('account.profile.current_password')}</Label>
                  <Input id="current-password" type="password" />
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="new-password">{t('account.profile.new_password')}</Label>
                  <Input id="new-password" type="password" />
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="confirm-password">{t('account.profile.confirm_password')}</Label>
                  <Input id="confirm-password" type="password" />
                </div>

                <Button variant="outline" className="w-fit">
                  {t('account.profile.change_password')}
                </Button>
              </div>
            )}
          </div>

          <Separator />

          {/* Zone de danger */}
          <div className="space-y-4">
            <div>
              <h3 className="text-destructive text-base font-medium">
                {t('account.profile.danger_zone')}
              </h3>
              <p className="text-muted-foreground mt-1 text-sm">
                {t('account.profile.danger_zone_description')}
              </p>
            </div>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="destructive" size="sm">
                  {t('account.profile.delete_account')}
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>
                    {t('account.profile.delete_account_confirm_title')}
                  </AlertDialogTitle>
                  <AlertDialogDescription>
                    {t('account.profile.delete_account_confirm_description')}
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>{t('account.profile.cancel')}</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={handleDeleteAccount}
                    disabled={isDeleting}
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  >
                    {isDeleting
                      ? t('account.profile.deleting')
                      : t('account.profile.delete_account')}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </div>
      </AccountLayout>
    </>
  )
}
