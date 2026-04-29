import { CategoryPageClient } from '@/components/bills/category-page-client'

export function generateStaticParams() {
  const categories = ['electricity', 'internet', 'mobile', 'water', 'education', 'insurance']
  return categories.map((cat) => ({
    category: cat,
  }))
}

export default function Page({ params }: { params: { category: string } }) {
  return <CategoryPageClient categorySlug={params.category} />
}
