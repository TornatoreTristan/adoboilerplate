import { ReactNode } from 'react'
import { Link, usePage } from '@inertiajs/react'
import AppLayout from '@/components/layouts/app-layout'
import { PageHeader } from '@/components/core/page-header'
import { Info, Plug, Users, CreditCard } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useI18n } from '@/hooks/use-i18n'

interface OrganizationSettingsLayoutProps {
  children: ReactNode
}

export default function OrganizationSettingsLayout({ children }: OrganizationSettingsLayoutProps) {
  const { url } = usePage()
  const { t } = useI18n()
  const currentPath = url

  const menuItems = [
    {
      title: t('common.informations'),
      href: '/organizations/settings',
      icon: Info,
    },
    {
      title: t('common.integrations'),
      href: '/organizations/settings/integrations',
      icon: Plug,
    },
    {
      title: t('common.users'),
      href: '/organizations/settings/users',
      icon: Users,
    },
    {
      title: t('common.subscriptions'),
      href: '/organizations/settings/subscriptions',
      icon: CreditCard,
    },
  ]

  return (
    <AppLayout>
      <div className="flex flex-col gap-6 p-6">
        <PageHeader
          title={t('common.organization_settings')}
          description={t('common.manage_organization_settings')}
        />

        <div className="flex gap-6">
          <nav className="w-48 shrink-0">
            <ul className="space-y-1">
              {menuItems.map((item) => {
                const isActive = currentPath === item.href
                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      className={cn(
                        'flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors',
                        isActive
                          ? 'bg-secondary text-secondary-foreground font-medium'
                          : 'text-muted-foreground hover:bg-secondary/50 hover:text-foreground'
                      )}
                    >
                      <item.icon className="h-4 w-4" />
                      {item.title}
                    </Link>
                  </li>
                )
              })}
            </ul>
          </nav>

          <div className="flex-1">{children}</div>
        </div>
      </div>
    </AppLayout>
  )
}
