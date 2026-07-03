import { useParams } from 'react-router-dom'

export default function CampaignDetail() {
  const { id } = useParams()
  return (
    <div className="p-6">
      <h1 className="text-2xl font-semibold text-[#0F172A]">Campaign Detail — {id}</h1>
    </div>
  )
}
