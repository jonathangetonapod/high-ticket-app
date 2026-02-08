// User management via Google Sheets
// Uses Google Apps Script web app for read/write operations

export interface User {
  id: string
  email: string
  name: string
  password?: string
  role: 'admin' | 'strategist'
  created_at?: string
}

const GOOGLE_SCRIPT_URL = process.env.GOOGLE_SCRIPT_URL || ''

async function callGoogleScript(action: string, params?: Record<string, string>) {
  if (!GOOGLE_SCRIPT_URL) {
    throw new Error('GOOGLE_SCRIPT_URL not configured')
  }

  const url = new URL(GOOGLE_SCRIPT_URL)
  url.searchParams.set('action', action)
  
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      url.searchParams.set(key, value)
    })
  }

  const response = await fetch(url.toString(), {
    method: 'GET',
    cache: 'no-store',
  })

  if (!response.ok) {
    throw new Error(`Google Script error: ${response.statusText}`)
  }

  return response.json()
}

async function postGoogleScript(data: Record<string, unknown>) {
  if (!GOOGLE_SCRIPT_URL) {
    throw new Error('GOOGLE_SCRIPT_URL not configured')
  }

  const response = await fetch(GOOGLE_SCRIPT_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
    cache: 'no-store',
  })

  if (!response.ok) {
    throw new Error(`Google Script error: ${response.statusText}`)
  }

  return response.json()
}

export async function getUsers(): Promise<User[]> {
  try {
    const result = await callGoogleScript('list')
    return result.users || []
  } catch (error) {
    console.error('Error fetching users:', error)
    return []
  }
}

export async function getUserById(id: string): Promise<User | null> {
  try {
    const result = await callGoogleScript('get', { id })
    return result.user || null
  } catch (error) {
    console.error('Error fetching user:', error)
    return null
  }
}

export async function validateLogin(email: string, password: string): Promise<User | null> {
  try {
    const result = await callGoogleScript('login', { email, password })
    return result.user || null
  } catch (error) {
    console.error('Error validating login:', error)
    return null
  }
}

export async function createUser(user: Omit<User, 'id' | 'created_at'>): Promise<User | null> {
  try {
    const result = await postGoogleScript({
      action: 'create',
      user: {
        email: user.email,
        name: user.name,
        password: user.password,
        role: user.role,
      }
    })
    return result.user || null
  } catch (error) {
    console.error('Error creating user:', error)
    return null
  }
}

export async function updateUser(id: string, updates: Partial<User>): Promise<boolean> {
  try {
    const result = await postGoogleScript({
      action: 'update',
      id,
      updates,
    })
    return result.success === true
  } catch (error) {
    console.error('Error updating user:', error)
    return false
  }
}

export async function deleteUser(id: string): Promise<boolean> {
  try {
    const result = await postGoogleScript({
      action: 'delete',
      id,
    })
    return result.success === true
  } catch (error) {
    console.error('Error deleting user:', error)
    return false
  }
}
