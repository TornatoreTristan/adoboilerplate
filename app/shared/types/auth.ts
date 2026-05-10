import type User from '#users/models/user'

export interface LoginData {
  email: string
  password: string
  remember: boolean
}

export interface LoginResult {
  success: boolean
  user: User | null
  error?: string
}

export interface RegisterData {
  email: string
  password: string
  confirmPassword: string
  fullName?: string
}

export interface RegisterResult {
  success: boolean
  user: User | null
  error?: string
}
