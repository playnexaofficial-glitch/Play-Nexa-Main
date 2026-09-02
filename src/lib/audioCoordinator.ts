// Global audio coordinator
// Only ONE audio source plays at a time
// When any source starts, all others stop

type AudioSource = 'ytmusic' | 'device' | 'movie'

const STOP_EVENT = 'pn:audio:stop'

export function broadcastStop(
  except?: AudioSource
) {
  if (typeof window === 'undefined') return
  window.dispatchEvent(
    new CustomEvent(STOP_EVENT, {
      detail: { except }
    })
  )
}

export function onStopRequest(
  source: AudioSource,
  callback: () => void
): () => void {
  if (typeof window === 'undefined')
    return () => {}
  const handler = (e: Event) => {
    const ev = e as CustomEvent
    if (ev.detail?.except !== source) {
      callback()
    }
  }
  window.addEventListener(STOP_EVENT, handler)
  return () =>
    window.removeEventListener(STOP_EVENT, handler)
}
