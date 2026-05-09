import { DateTime } from 'luxon'

export interface CreateUserData {
  email: string
  password: string
  fullName?: string
}

export interface User {
  id: string
  email: string
  password: string
  createdAt?: DateTime
  updatedAt?: DateTime
}
