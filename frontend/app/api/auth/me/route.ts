import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'

export async function GET() {
  try {
    const cookieStore = await cookies()
    const session = cookieStore.get('session')

    if (!session?.value) {
      return NextResponse.json(
        { success: false, error: 'Not authenticated' },
        { status: 401 }
      )
    }

    const user = JSON.parse(Buffer.from(session.value, 'base64').toString())

    return NextResponse.json({
      success: true,
      user
    })

  } catch (error) {
    return NextResponse.json(
      { success: false, error: 'Invalid session' },
      { status: 401 }
    )
  }
}
