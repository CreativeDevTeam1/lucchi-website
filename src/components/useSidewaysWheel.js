import { useEffect } from 'react'

const wrap = (value, span) => ((value % span) + span) % span

/* Mouse wheel / trackpad scrolling for the gliding rows (Selected Pieces and Collections).
   A sideways swipe on a trackpad, Shift + mouse wheel, or a tilt wheel moves the row. A plain up/down wheel is left
   alone, so the page still scrolls when the pointer is over a row. Autoplay pauses while it is used and resumes after
   `resumeDelay` ms (same as after a drag). The listener is not passive, so the browser does not also treat a sideways
   swipe as "back".
   `state` holds the row's refs: offset, metrics ({ set }), tween, momentum, interactionUntil, restartLoop. */
export default function useSidewaysWheel(viewportRef, state, resumeDelay) {
  const { offset, metrics, tween, momentum, interactionUntil, restartLoop } = state
  useEffect(() => {
    const viewport = viewportRef.current
    if (!viewport) return undefined
    // The row's loop can be idle (e.g. while the pointer rests on it), and nothing wakes it when the quiet period ends:
    // so wake it once the wheel has been still for `resumeDelay`, and the glide comes back.
    let timer = 0
    const onWheel = (event) => {
      const sideways = event.shiftKey ? (event.deltaX || event.deltaY) : event.deltaX
      if (!event.shiftKey && Math.abs(event.deltaX) <= Math.abs(event.deltaY)) return
      if (!sideways) return
      event.preventDefault()
      const unit = event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? viewport.clientWidth : 1
      tween.current = null
      momentum.current = 0
      offset.current = wrap(offset.current + sideways * unit, metrics.current.set)
      interactionUntil.current = performance.now() + resumeDelay
      restartLoop.current()
      window.clearTimeout(timer)
      timer = window.setTimeout(() => restartLoop.current(), resumeDelay + 60)
    }
    viewport.addEventListener('wheel', onWheel, { passive: false })
    return () => {
      window.clearTimeout(timer)
      viewport.removeEventListener('wheel', onWheel)
    }
  }, [viewportRef, offset, metrics, tween, momentum, interactionUntil, restartLoop, resumeDelay])
}
