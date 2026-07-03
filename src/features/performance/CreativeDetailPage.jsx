import { useParams } from 'react-router-dom'
import Breadcrumb from '../../components/layout/Breadcrumb'
import PageHeader from '../../components/ui/PageHeader'

export default function CreativeDetailPage() {
  const { id } = useParams()
  return (
    <div className="space-y-6 p-4 sm:p-6">
      <Breadcrumb />
      <PageHeader
        title="Creative Detail"
        subtitle={`Creative ID: ${id}`}
      />
      <div className="rounded-card border border-border-default bg-white p-8 text-center text-text-secondary shadow-card">
        Creative Performance Detail — Screen 16 (coming soon)
      </div>
    </div>
  )
}
