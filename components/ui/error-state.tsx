import React from 'react'

interface ErrorStateProps {
  message?: string
  onRetry?: () => void
}

export function ErrorState({ message = 'Failed to load data.', onRetry }: ErrorStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-12">
      <div className="text-destructive text-2xl mb-2">⚠️</div>
      <div className="text-lg font-semibold mb-2">{message}</div>
      {onRetry && (
        <button
          onClick={onRetry}
          className="mt-2 px-4 py-2 bg-primary text-white rounded hover:bg-primary/80 transition"
        >
          Retry
        </button>
      )}
    </div>
  )
}
