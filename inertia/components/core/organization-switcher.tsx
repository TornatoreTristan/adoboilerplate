import { Building2, Check, ChevronsUpDown, Plus } from 'lucide-react'
import { router, usePage } from '@inertiajs/react'
import { useState } from 'react'
import axios from 'axios'

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from '@/components/ui/sidebar'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'

export interface Organization {
  id: string
  name: string
  slug: string
  role: string
  logoUrl?: string | null
}

export function OrganizationSwitcher({
  organizations,
  currentOrganization,
}: {
  organizations: Organization[]
  currentOrganization: Organization | null
}) {
  const { isMobile } = useSidebar()
  const [switching, setSwitching] = useState(false)

  const handleSwitch = async (organizationId: string) => {
    if (switching || organizationId === currentOrganization?.id) return

    setSwitching(true)
    try {
      await axios.post(`/api/organizations/${organizationId}/switch`)
      // Reload the page to update the context
      router.reload()
    } catch (error) {
      console.error('Failed to switch organization:', error)
      setSwitching(false)
    }
  }

  const handleCreateOrganization = () => {
    router.visit('/organizations/create')
  }

  if (!currentOrganization) {
    return null
  }

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <SidebarMenuButton
              size="lg"
              className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
            >
              <Avatar className="size-8 rounded-lg">
                <AvatarImage
                  src={currentOrganization.logoUrl || ''}
                  alt={currentOrganization.name}
                />
                <AvatarFallback className="rounded-lg">
                  <Building2 className="size-4" />
                </AvatarFallback>
              </Avatar>
              <div className="grid flex-1 text-left text-sm leading-tight">
                <span className="truncate font-semibold">{currentOrganization.name}</span>
                <span className="text-muted-foreground truncate text-xs capitalize">
                  {currentOrganization.role}
                </span>
              </div>
              <ChevronsUpDown className="ml-auto" />
            </SidebarMenuButton>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            className="w-(--radix-dropdown-menu-trigger-width) min-w-56 rounded-lg"
            align="start"
            side={isMobile ? 'bottom' : 'right'}
            sideOffset={4}
          >
            <DropdownMenuLabel className="text-muted-foreground text-xs">
              Organizations
            </DropdownMenuLabel>
            {organizations.map((org) => (
              <DropdownMenuItem
                key={org.id}
                onClick={() => handleSwitch(org.id)}
                className="gap-2 p-2"
                disabled={switching}
              >
                <Avatar className="size-6 rounded-sm">
                  <AvatarImage src={org.logoUrl || ''} alt={org.name} />
                  <AvatarFallback className="rounded-sm">
                    <Building2 className="size-4 shrink-0" />
                  </AvatarFallback>
                </Avatar>
                <div className="line-clamp-1 flex-1 font-medium">{org.name}</div>
                {org.id === currentOrganization.id && <Check className="size-4" />}
              </DropdownMenuItem>
            ))}
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleCreateOrganization} className="gap-2 p-2">
              <div className="bg-border flex size-6 items-center justify-center rounded-md border border-dashed">
                <Plus className="size-4" />
              </div>
              <div className="text-muted-foreground font-medium">Add organization</div>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  )
}
