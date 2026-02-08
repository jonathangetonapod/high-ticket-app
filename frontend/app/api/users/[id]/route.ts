import { NextResponse } from 'next/server'
import { getUserById, updateUser, deleteUser } from '@/lib/users'
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

// DELETE - Remove user (admin only)
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!await isAdmin()) {
    return NextResponse.json(
      { success: false, error: 'Unauthorized' },
      { status: 403 }
    )
  }

  const { id } = await params
  const success = await deleteUser(id)

  if (!success) {
    return NextResponse.json(
      { success: false, error: 'User not found' },
      { status: 404 }
    )
  }

  return NextResponse.json({ success: true })
}

// POST - Reset password (admin only)
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!await isAdmin()) {
    return NextResponse.json(
      { success: false, error: 'Unauthorized' },
      { status: 403 }
    )
  }

  const { id } = await params
  const user = await getUserById(id)

  if (!user) {
    return NextResponse.json(
      { success: false, error: 'User not found' },
      { status: 404 }
    )
  }

  const newPassword = generatePassword()
  const success = await updateUser(id, { password: newPassword })

  if (!success) {
    return NextResponse.json(
      { success: false, error: 'Failed to reset password' },
      { status: 500 }
    )
  }

  return NextResponse.json({
    success: true,
    newPassword
  })
}
