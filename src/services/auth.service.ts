import { MOCK_ADMIN_EMAIL, MOCK_ADMIN_NAME, MOCK_ADMIN_PASSWORD } from '@/lib/constants'
import { sleep } from '@/lib/utils'
import type { Profile } from '@/types'

export interface MockAdminUser {
  id: string
  name: string
  email: string
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
 * Mock credential check. The password is intentionally kept in code (not in
 * localStorage/session) so no plain-text password is ever persisted.
 */
export async function signInAdmin(email: string, password: string): Promise<MockAdminUser> {
  await sleep(450)
  const normalized = email.trim().toLowerCase()
  const emailMatches = normalized === MOCK_ADMIN_EMAIL || normalized === 'admin'
  if (!emailMatches || password !== MOCK_ADMIN_PASSWORD) {
    throw new Error('Invalid email or password.')
  }
  return { id: ADMIN_ID, name: MOCK_ADMIN_NAME, email: MOCK_ADMIN_EMAIL }
}
