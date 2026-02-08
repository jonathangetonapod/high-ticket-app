import { NextResponse } from 'next/server'
import { getUsers, createUser } from '@/lib/users'
import { cookies } from 'next/headers'

// Generate a random password
function generatePassword(): string {
  const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
  let password = ''
  for (let i = 0; i < 12; i++) {
    password += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return password
}

// Check if user is admin
async function isAdmin(): Promise<boolean> {
  try {
    const cookieStore = await cookies()
    const session = cookieStore.get('session')
    if (!session?.value) return false
    
    const user = JSON.parse(Buffer.from(session.value, 'base64').toString())
    return user.role === 'admin'
  } catch {
    return false
  }
}

// GET - List all users (admin only)
export async function GET() {
  if (!await isAdmin()) {
    return NextResponse.json(
      { success: false, error: 'Unauthorized' },
      { status: 403 }
    )
  }

  const users = await getUsers()
  
  // Don't return passwords (already excluded by the API)
  const safeUsers = users.map(u => ({
    id: u.id,
    email: u.email,
    name: u.name,
    role: u.role,
    createdAt: u.created_at
  }))

  return NextResponse.json({
    success: true,
    users: safeUsers
  })
}

// POST - Create new user (admin only)
export async function POST(request: Request) {
  if (!await isAdmin()) {
    return NextResponse.json(
      { success: false, error: 'Unauthorized' },
      { status: 403 }
    )
  }

  try {
    const { email, name, role } = await request.json()

    if (!email || !name || !role) {
      return NextResponse.json(
        { success: false, error: 'Email, name, and role required' },
        { status: 400 }
      )
    }

    if (role !== 'admin' && role !== 'strategist') {
      return NextResponse.json(
        { success: false, error: 'Role must be admin or strategist' },
        { status: 400 }
      )
    }

    const password = generatePassword()
    const newUser = await createUser({ email, name, password, role })

    if (!newUser) {
      return NextResponse.json(
        { success: false, error: 'User with this email already exists or creation failed' },
        { status: 400 }
      )
    }

    return NextResponse.json({
      success: true,
      user: {
        id: newUser.id,
        email: newUser.email,
        name: newUser.name,
        role: newUser.role,
        createdAt: newUser.created_at
      },
      // Return password only on creation so admin can share it
      temporaryPassword: password
    })

  } catch (error) {
    console.error('Error creating user:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to create user' },
      { status: 500 }
    )
  }
}
