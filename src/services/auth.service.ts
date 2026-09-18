import { MOCK_ADMIN_EMAIL, MOCK_ADMIN_PASSWORD } from '@/lib/constants'
import { db, persistDatabase } from '@/mock/db'
import { sleep } from '@/lib/utils'
import type { Profile } from '@/types'

export interface MockAdminUser {
  id: string
  name: string
  email: string
}

export interface UpdateAdminAccountInput {
  currentPassword?: string
  email?: string
  password?: string
}

const ADMIN_ID = 'admin-1'

function buildProfile(user: MockAdminUser): Profile {
  const now = new Date().toISOString()
  return {
    id: user.id,
    email: user.email,
    full_name: user.name,
    phone: '',
    address: '',
    avatar_url: null,
    role: 'admin',
    is_active: true,
    created_at: now,
    updated_at: now,
  }
}

export function buildAdminProfile(user: MockAdminUser): Profile {
  return buildProfile(user)
}

/**
 * Mock credential check. Default credentials are kept in code; the stored
 * account lives in the mock database so changes to the email/password survive
 * reloads (and are restored by "Reset demo data").
 */
export async function signInAdmin(email: string, password: string): Promise<MockAdminUser> {
  await sleep(450)
  const account = db.adminAccount
  const accountEmail = account?.email ?? MOCK_ADMIN_EMAIL
  const accountPassword = account?.password ?? MOCK_ADMIN_PASSWORD
  const normalized = email.trim().toLowerCase()
  const emailMatches = normalized === accountEmail.toLowerCase() || normalized === 'admin'
  if (!emailMatches || password !== accountPassword) {
    throw new Error('Invalid email or password.')
  }
  return { id: ADMIN_ID, name: account?.name ?? 'Resort Admin', email: accountEmail }
}

export async function getAdminAccount(): Promise<{ email: string; passwordMatchesDefault: boolean }> {
  await sleep(120)
  const account = db.adminAccount
  return {
    email: account?.email ?? MOCK_ADMIN_EMAIL,
    passwordMatchesDefault: (account?.password ?? MOCK_ADMIN_PASSWORD) === MOCK_ADMIN_PASSWORD,
  }
}

export async function updateAdminAccount(input: UpdateAdminAccountInput): Promise<MockAdminUser> {
  await sleep(350)
  const account = db.adminAccount
  const currentPassword = account?.password ?? MOCK_ADMIN_PASSWORD
  if (!input.currentPassword || input.currentPassword !== currentPassword) {
    throw new Error('Current password is incorrect.')
  }
  const email = (input.email ?? account?.email ?? MOCK_ADMIN_EMAIL).trim().toLowerCase()
  const password = input.password ?? currentPassword
  db.adminAccount = { email, password, name: account?.name ?? 'Resort Admin' }
  persistDatabase()
  return { id: ADMIN_ID, name: account?.name ?? 'Resort Admin', email }
}