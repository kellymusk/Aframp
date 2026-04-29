import ErrorLayout from '@/components/error/ErrorLayout'

export default function NotFound() {
  return (
    <ErrorLayout
      status={404}
      title="Page not found"
      message="The page you’re looking for doesn’t exist."
      actions={[{ label: 'Go Home', href: '/' }]}
    />
  )
}
