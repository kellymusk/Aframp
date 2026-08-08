import React from 'react'

interface LoadingSpinnerProps {
  className?: string
}

export function LoadingSpinner({ className = '' }: LoadingSpinnerProps) {
  return (
    <div
      className={`h-10 w-10 animate-spin rounded-full border-2 border-primary/25 border-t-primary ${className}`}
    />
  )
}
