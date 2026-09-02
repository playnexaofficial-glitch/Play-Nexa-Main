import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}))
    const phone = typeof body.phone === 'string' ? body.phone.trim() : ''
    const passphrase = typeof body.passphrase === 'string' ? body.passphrase.trim() : ''

    const expectedPhone = process.env.ADMIN_2FA_PHONE?.trim()
    const expectedPassphrase = process.env.ADMIN_2FA_PASSPHRASE?.trim()

    // If environment variables are not configured or values do not match
    if (
      !expectedPhone ||
      !expectedPassphrase ||
      phone !== expectedPhone ||
      passphrase !== expectedPassphrase
    ) {
      return NextResponse.json(
        { success: false, error: 'Invalid verification details' },
        { status: 401 }
      )
    }

    const response = NextResponse.json({ success: true })

    // Set 4-hour 2FA verification session cookie
    response.cookies.set('pn_admin_2fa_verified', 'true', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 4 * 60 * 60, // 4 hours
    })

    return response
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function GET(req: NextRequest) {
  try {
    const verified = req.cookies.get('pn_admin_2fa_verified')?.value === 'true'
    return NextResponse.json({ verified })
  } catch {
    return NextResponse.json({ verified: false })
  }
}
