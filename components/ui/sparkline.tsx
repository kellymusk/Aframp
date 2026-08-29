'use client'

import { useMemo } from 'react'
import { cn } from '@/lib/utils'

interface SparklineProps {
  /** Array of rate values, oldest → newest */
  data: number[]
  width?: number
  height?: number
  className?: string
  /** Override line colour. Defaults to green when trend is up, red when down. */
  color?: string
}

/**
 * Lightweight SVG sparkline — no external chart library required.
 * Renders a polyline from an array of numeric values.
 */
export function Sparkline({ data, width = 80, height = 28, className, color }: SparklineProps) {
  const points = useMemo(() => {
    if (data.length < 2) return ''
    const min = Math.min(...data)
    const max = Math.max(...data)
    const range = max - min || 1
    const step = width / (data.length - 1)
    const pad = 2 // vertical padding in px

    return data
      .map((v, i) => {
        const x = i * step
        const y = height - pad - ((v - min) / range) * (height - pad * 2)
        return `${x.toFixed(1)},${y.toFixed(1)}`
      })
      .join(' ')
  }, [data, width, height])

  const trend = data.length >= 2 ? data[data.length - 1] - data[0] : 0
  const lineColor = color ?? (trend >= 0 ? '#10b981' : '#ef4444')

  if (data.length < 2) return null

  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      className={cn('overflow-visible', className)}
      aria-hidden="true"
    >
      <polyline
        points={points}
        fill="none"
        stroke={lineColor}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}
