import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseAdmin'

// ── GET — Fetch AI Discovery Engine State, Logs, & Pending Count ──
export async function GET() {
  try {
    if (!supabaseAdmin) {
      return NextResponse.json(
        { error: 'Supabase admin client not initialized' },
        { status: 500 }
      )
    }

    // 1. Fetch discovery state (id = 1)
    let { data: state, error: stateErr } = await supabaseAdmin
      .from('ai_discovery_state')
      .select('*')
      .eq('id', 1)
      .maybeSingle()

    if (stateErr && stateErr.code !== 'PGRST116') {
      throw stateErr
    }

    // Default fallback state if row doesn't exist yet
    if (!state) {
      state = {
        id: 1,
        is_enabled: false,
        current_phase: 'discovery',
        daily_youtube_units_used: 0,
        daily_gemini_calls_used: 0,
        quota_reset_date: new Date().toISOString().split('T')[0],
        last_run_at: null,
        current_query_index: 0,
        channels_found_today: 0,
        videos_imported_today: 0,
      }
    }

    // 2. Fetch 10 most recent logs
    const { data: logs, error: logsErr } = await supabaseAdmin
      .from('ai_discovery_log')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(10)

    if (logsErr) {
      console.error('Failed to fetch ai_discovery_log:', logsErr)
    }

    // 3. Count pending_import channels in yt_channels
    const { count: pendingImportCount, error: countErr } = await supabaseAdmin
      .from('yt_channels')
      .select('*', { count: 'exact', head: true })
      .eq('import_phase_status', 'pending_import')

    if (countErr) {
      console.error('Failed to count pending_import channels:', countErr)
    }

    return NextResponse.json({
      state,
      logs: logs || [],
      pendingImportCount: pendingImportCount || 0,
    })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

// ── POST — Enable or Disable AI Discovery Engine ──
export async function POST(req: NextRequest) {
  try {
    if (!supabaseAdmin) {
      return NextResponse.json(
        { error: 'Supabase admin client not initialized' },
        { status: 500 }
      )
    }

    const { enabled } = await req.json()

    if (typeof enabled !== 'boolean') {
      return NextResponse.json(
        { error: 'Field "enabled" (boolean) is required' },
        { status: 400 }
      )
    }

    // Upsert state setting is_enabled
    const { data: updatedState, error: updateErr } = await supabaseAdmin
      .from('ai_discovery_state')
      .upsert(
        [
          {
            id: 1,
            is_enabled: enabled,
            updated_at: new Date().toISOString(),
          },
        ],
        { onConflict: 'id' }
      )
      .select()
      .single()

    if (updateErr) throw updateErr

    // Log the toggle event
    await supabaseAdmin.from('ai_discovery_log').insert([
      {
        event_type: 'engine_toggle',
        message: enabled
          ? 'AI Discovery Engine enabled by admin'
          : 'AI Discovery Engine disabled by admin',
      },
    ])

    return NextResponse.json({
      success: true,
      is_enabled: updatedState?.is_enabled ?? enabled,
      state: updatedState,
    })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
