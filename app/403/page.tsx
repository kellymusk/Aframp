import ErrorLayout from '@/components/error/ErrorLayout';

export default function Forbidden() {
  return (
    <ErrorLayout
      status={403}
      title="Access denied"
      message="You don’t have permission to view this page."
      actions={[{ label: 'Go Home', href: '/' }]}
    />
  );
}
