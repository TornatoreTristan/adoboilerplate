export interface Member {
  id: string
  fullName: string | null
  email: string
  avatarUrl: string | null
  role: string
  joinedAt: string
}

export interface Invitation {
  id: string
  email: string
  role: string
  expiresAt: string
  createdAt: string
}

export interface OrganizationLite {
  id: string
  name: string
}

/** Roles that can manage members. */
export const MANAGER_ROLES = new Set(['owner', 'admin'])
