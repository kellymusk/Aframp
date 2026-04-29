import ErrorLayout from '@/components/error/ErrorLayout'

export default function Unauthorized() {
  return (
    <ErrorLayout
      status={401}
      title="Unauthorized"
      message="Please log in to continue."
      actions={[{ label: 'Login', href: '/login' }]}
    />
  )
}
