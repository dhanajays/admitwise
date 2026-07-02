"use client"

import { useEffect, useRef, useState } from "react"

export function AnimatedCounter({
  value,
  duration = 1800,
  suffix = "",
  prefix = "",
}: {
  value: number
  duration?: number
  suffix?: string
  prefix?: string
}) {
  const ref = useRef<HTMLSpanElement>(null)
  const [display, setDisplay] = useState(0)
  const started = useRef(false)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting && !started.current) {
        started.current = true
        const start = performance.now()
        const tick = (now: number) => {
          const progress = Math.min((now - start) / duration, 1)
          const eased = 1 - Math.pow(1 - progress, 3)
          setDisplay(Math.round(eased * value))
          if (progress < 1) requestAnimationFrame(tick)
        }
        requestAnimationFrame(tick)
      }
    })
    observer.observe(el)
    return () => observer.disconnect()
  }, [value, duration])

  return (
    <span ref={ref}>
      {prefix}
      {display.toLocaleString("en-IN")}
      {suffix}
    </span>
  )
}
