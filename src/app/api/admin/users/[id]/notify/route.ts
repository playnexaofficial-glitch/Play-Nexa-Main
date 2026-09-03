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

    const { title, message, body } = await req.json().catch(() => ({}))
    const textContent = (message || body || '').trim()

    if (!title?.trim() || !textContent) {
      return NextResponse.json(
        { error: 'Title and message are required' },
        { status: 400 }
      )
    }

    const newNotification = {
      title: title.trim(),
      body: textContent,
      sent_to: id,
      sent_count: 1,
      sent_at: new Date().toISOString(),
    }

    const { error } = await supabaseAdmin
      .from('notifications_log')
      .insert([newNotification])

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      sent_to: id,
    })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
