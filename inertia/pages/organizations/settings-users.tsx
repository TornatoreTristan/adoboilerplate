import { Head, useForm, router } from '@inertiajs/react'
import OrganizationSettingsLayout from '@/components/layouts/organization-settings-layout'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { MoreHorizontal, UserPlus, Trash2, Shield, Clock, X, Eye } from 'lucide-react'
import { useState } from 'react'
import { usePage } from '@inertiajs/react'
import { useI18n } from '@/hooks/use-i18n'

interface Member {
  id: string
  fullName: string | null
  email: string
  avatarUrl: string | null
  role: string
  joinedAt: string
}

interface Invitation {
  id: string
  email: string
  role: string
  expiresAt: string
  createdAt: string
}

interface Organization {
  id: string
  name: string
}

interface OrganizationSettingsUsersPageProps {
  organization: Organization
  userRole: string
  members: Member[]
  invitations: Invitation[]
}

const OrganizationSettingsUsersPage = ({
  userRole,
  members,
  invitations,
}: OrganizationSettingsUsersPageProps) => {
  const { t, locale } = useI18n()
  const { auth } = usePage().props as any
  const currentUserId = auth?.user?.id

  const { data, setData, post, processing, errors, reset } = useForm({
    email: '',
    role: 'member',
  })

  const [memberToDelete, setMemberToDelete] = useState<Member | null>(null)
  const [memberToView, setMemberToView] = useState<Member | null>(null)
  const [changingRoleFor, setChangingRoleFor] = useState<string | null>(null)

  const canManageMembers = ['owner', 'admin'].includes(userRole)
  const isAdmin = ['owner', 'admin'].includes(userRole)

  const handleInviteSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    post('/organizations/settings/users/invite', {
      onSuccess: () => reset(),
    })
  }

  const handleRoleChange = (userId: string, newRole: string) => {
    setChangingRoleFor(userId)
    router.put(
      `/organizations/settings/users/${userId}/role`,
      { userId, role: newRole },
      {
        onFinish: () => setChangingRoleFor(null),
      }
    )
  }

  const handleDeleteMember = () => {
    if (!memberToDelete) return

    router.delete(`/organizations/settings/users/${memberToDelete.id}`, {
      data: { userId: memberToDelete.id },
      onFinish: () => setMemberToDelete(null),
    })
  }

  const getRoleBadgeVariant = (role: string) => {
    switch (role) {
      case 'owner':
        return 'default'
      case 'admin':
        return 'secondary'
      default:
        return 'outline'
    }
  }

  const getRoleLabel = (role: string) => {
    if (role === 'owner') return t('organizations.users.role.owner')
    if (role === 'admin') return t('organizations.users.role.admin')
    if (role === 'moderator') return t('organizations.users.role.moderator')
    if (role === 'member') return t('organizations.users.role.member')
    return role
  }

  const dateLocale = locale === 'en' ? 'en-US' : 'fr-FR'
  const formatLongDate = (iso: string) =>
    new Date(iso).toLocaleDateString(dateLocale, {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    })

  const deleteName = memberToDelete?.fullName || memberToDelete?.email || ''

  return (
    <>
      <Head title={t('organizations.users.head_title')} />
      <OrganizationSettingsLayout>
        <div className="max-w-4xl space-y-8">
          <div>
            <h2 className="text-lg font-semibold">{t('organizations.users.section_title')}</h2>
            <p className="text-sm text-muted-foreground mt-1">
              {t('organizations.users.section_description')}
            </p>
          </div>

          {canManageMembers && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <UserPlus className="h-5 w-5" />
                  {t('organizations.users.invite.card_title')}
                </CardTitle>
                <CardDescription>
                  {t('organizations.users.invite.card_description')}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleInviteSubmit} className="flex gap-4">
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
                        <SelectItem value="member">
                          {t('organizations.users.role.member')}
                        </SelectItem>
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
          )}

          {canManageMembers && invitations.length > 0 && (
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
                          <Badge variant={getRoleBadgeVariant(invitation.role)}>
                            {getRoleLabel(invitation.role)}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {formatLongDate(invitation.expiresAt)}
                        </TableCell>
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => {
                              if (
                                confirm(
                                  t('organizations.users.invitations.cancel_confirm', {
                                    email: invitation.email,
                                  })
                                )
                              ) {
                                router.delete(
                                  `/organizations/settings/users/invitations/${invitation.id}`
                                )
                              }
                            }}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader>
              <CardTitle>{t('organizations.users.members.card_title')}</CardTitle>
              <CardDescription>
                {t('organizations.users.members.card_description_count', { count: members.length })}
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
                              <AvatarImage
                                src={member.avatarUrl || ''}
                                alt={member.fullName || ''}
                              />
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
                          <Badge variant={getRoleBadgeVariant(member.role)}>
                            {getRoleLabel(member.role)}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {formatLongDate(member.joinedAt)}
                        </TableCell>
                        {canManageMembers && (
                          <TableCell>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon" disabled={isChangingRole}>
                                  <MoreHorizontal className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuLabel>{t('common.actions')}</DropdownMenuLabel>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem onClick={() => setMemberToView(member)}>
                                  <Eye className="mr-2 h-4 w-4" />
                                  {t('organizations.users.members.view')}
                                </DropdownMenuItem>
                                {isAdmin && !isCurrentUser && (
                                  <>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem
                                      onClick={() => setMemberToDelete(member)}
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
                                      onClick={() => handleRoleChange(member.id, 'member')}
                                      disabled={member.role === 'member'}
                                    >
                                      <Shield className="mr-2 h-4 w-4" />
                                      {t('organizations.users.members.set_as_member')}
                                    </DropdownMenuItem>
                                    <DropdownMenuItem
                                      onClick={() => handleRoleChange(member.id, 'admin')}
                                      disabled={member.role === 'admin'}
                                    >
                                      <Shield className="mr-2 h-4 w-4" />
                                      {t('organizations.users.members.set_as_admin')}
                                    </DropdownMenuItem>
                                    <DropdownMenuItem
                                      onClick={() => handleRoleChange(member.id, 'owner')}
                                      disabled={member.role === 'owner'}
                                    >
                                      <Shield className="mr-2 h-4 w-4" />
                                      {t('organizations.users.members.set_as_owner')}
                                    </DropdownMenuItem>
                                  </>
                                )}
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </TableCell>
                        )}
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>

        <AlertDialog open={!!memberToView} onOpenChange={() => setMemberToView(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>{t('organizations.users.view_dialog.title')}</AlertDialogTitle>
            </AlertDialogHeader>
            {memberToView && (
              <div className="space-y-4">
                <div className="flex items-center gap-4">
                  <Avatar className="h-16 w-16">
                    <AvatarImage
                      src={memberToView.avatarUrl || ''}
                      alt={memberToView.fullName || ''}
                    />
                    <AvatarFallback className="text-xl">
                      {memberToView.fullName?.charAt(0) ||
                        memberToView.email.charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <h3 className="font-semibold text-lg">
                      {memberToView.fullName || memberToView.email}
                    </h3>
                    <p className="text-sm text-muted-foreground">{memberToView.email}</p>
                  </div>
                </div>
                <div className="grid gap-3">
                  <div className="flex justify-between py-2 border-b">
                    <span className="text-sm font-medium">
                      {t('organizations.users.view_dialog.role_label')}
                    </span>
                    <Badge variant={getRoleBadgeVariant(memberToView.role)}>
                      {getRoleLabel(memberToView.role)}
                    </Badge>
                  </div>
                  <div className="flex justify-between py-2 border-b">
                    <span className="text-sm font-medium">
                      {t('organizations.users.view_dialog.since_label')}
                    </span>
                    <span className="text-sm text-muted-foreground">
                      {formatLongDate(memberToView.joinedAt)}
                    </span>
                  </div>
                  <div className="flex justify-between py-2">
                    <span className="text-sm font-medium">
                      {t('organizations.users.view_dialog.user_id_label')}
                    </span>
                    <span className="text-sm text-muted-foreground font-mono">
                      {memberToView.id}
                    </span>
                  </div>
                </div>
              </div>
            )}
            <AlertDialogFooter>
              <AlertDialogCancel>{t('organizations.users.view_dialog.close')}</AlertDialogCancel>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        <AlertDialog open={!!memberToDelete} onOpenChange={() => setMemberToDelete(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>{t('organizations.users.delete_dialog.title')}</AlertDialogTitle>
              <AlertDialogDescription>
                <span
                  dangerouslySetInnerHTML={{
                    __html: t('organizations.users.delete_dialog.description_with_name', {
                      name: deleteName,
                    }),
                  }}
                />
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>{t('organizations.users.delete_dialog.cancel')}</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleDeleteMember}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                {t('organizations.users.delete_dialog.confirm')}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </OrganizationSettingsLayout>
    </>
  )
}

export default OrganizationSettingsUsersPage
