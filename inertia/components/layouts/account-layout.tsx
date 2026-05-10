import { ReactNode } from 'react'
import { Link } from '@adonisjs/inertia/react'
import { usePage } from '@inertiajs/react'
import AppLayout from '@/components/layouts/app-layout'
import { PageHeader } from '@/components/core/page-header'
import { User, Monitor, Settings, Shield } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useI18n } from '@/hooks/use-i18n'

interface AccountLayoutProps {
  children: ReactNode
}

export default function AccountLayout({ children }: AccountLayoutProps) {
  const { url } = usePage()
  const { t } = useI18n()
  const currentPath = url

  const menuItems = [
    {
      title: t('account.layout.profile'),
      href: '/account/profile',
      icon: User,
    },
    {
      title: t('account.layout.sessions'),
      href: '/account/sessions',
      icon: Monitor,
    },
    {
      title: t('account.layout.preferences'),
      href: '/account/preferences',
      icon: Settings,
    },
    {
      title: t('account.layout.data_privacy'),
      href: '/account/data-privacy',
      icon: Shield,
    },
  ]

  return (
    <AppLayout>
      <div className="flex flex-col gap-6 p-6">
        <PageHeader
          title={t('account.layout.title')}
          description={t('account.layout.description')}
        />

        <div className="flex gap-6">
          {/* Menu de navigation */}
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

          {/* Contenu */}
          <div className="flex-1">{children}</div>
        </div>
      </div>
    </AppLayout>
  )
}
