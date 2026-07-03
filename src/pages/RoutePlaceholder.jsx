import { useParams } from 'react-router-dom'

export function DetailPlaceholder({ title, descriptor = 'detail' }) {
  const { id } = useParams()

  return (
    <div className="p-6">
      <h1 className="text-2xl font-semibold text-[#0F172A]">
        {title} {descriptor} - {id}
      </h1>
    </div>
  )
}

export function FormPlaceholder({ title }) {
  return (
    <div className="p-6">
      <h1 className="text-2xl font-semibold text-[#0F172A]">{title}</h1>
    </div>
  )
}
