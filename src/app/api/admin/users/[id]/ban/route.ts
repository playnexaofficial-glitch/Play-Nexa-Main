import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseAdmin'

export async function POST(
  req: NextRequest,
  props: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await props.params

    if (!id) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 })
    }

    const { banned, reason } = await req.json().catch(() => ({}))
    const isBanned = Boolean(banned)

    const updateData: Record<string, any> = {
      is_banned: isBanned,
      banned_at: isBanned ? new Date().toISOString() : null,
      ban_reason: isBanned ? (reason?.trim() || 'Suspended by administrator') : null,
    }

    const { data, error } = await supabaseAdmin
      .from('user_profiles')
      .update(updateData)
      .or(`id.eq.${id},auth_user_id.eq.${id}`)
      .select('id, is_banned, ban_reason')

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      banned: isBanned,
      user: data?.[0] || null,
    })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
