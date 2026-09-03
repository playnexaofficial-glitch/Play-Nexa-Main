import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseAdmin'

export async function POST(req: NextRequest) {
  try {
    const { userId, email } = await req.json().catch(() => ({}))

    if (!userId && !email) {
      return NextResponse.json({ error: 'userId or email is required' }, { status: 400 })
    }

    // Read IP address from x-forwarded-for or x-real-ip
    const forwarded = req.headers.get('x-forwarded-for') || ''
    const ip = forwarded.split(',')[0].trim() || req.headers.get('x-real-ip') || ''

    let approx_country: string | null = null
    let approx_city: string | null = null

    // Perform free IP geolocation if ip is valid and not localhost
    if (ip && ip !== '127.0.0.1' && ip !== '::1' && !ip.startsWith('192.168.') && !ip.startsWith('10.')) {
      try {
        const geoRes = await fetch(`http://ip-api.com/json/${ip}?fields=country,city,status`, {
          signal: AbortSignal.timeout(3500),
        })
        if (geoRes.ok) {
          const geoData = await geoRes.json()
          if (geoData.status === 'success' || geoData.country || geoData.city) {
            approx_country = geoData.country || null
            approx_city = geoData.city || null
          }
        }
      } catch {
        // Geolocation lookup failed — proceed without location data
      }
    }

    const updatePayload: Record<string, any> = {
      last_seen_at: new Date().toISOString(),
    }

    if (approx_country) updatePayload.approx_country = approx_country
    if (approx_city) updatePayload.approx_city = approx_city

    // Update user_profiles row
    if (userId) {
      const { error } = await supabaseAdmin
        .from('user_profiles')
        .update(updatePayload)
        .or(`id.eq.${userId},auth_user_id.eq.${userId}`)

      if (error && email) {
        await supabaseAdmin
          .from('user_profiles')
          .update(updatePayload)
          .eq('email', email)
      }
    } else if (email) {
      await supabaseAdmin
        .from('user_profiles')
        .update(updatePayload)
        .eq('email', email)
    }

    return NextResponse.json({ success: true })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
