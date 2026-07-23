import { useState } from 'react'
import { Copy, Search } from 'lucide-react'
import toast from 'react-hot-toast'

export default function JsonViewer({ data }) {
  const [search, setSearch] = useState('')
  const jsonStr = JSON.stringify(data, null, 2)

  const handleCopy = () => {
    navigator.clipboard.writeText(jsonStr)
    toast.success('JSON copied')
  }

  const highlighted = search
    ? jsonStr.replace(new RegExp(`(${search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi'), '<<<HIGHLIGHT>>>$1<<<END>>>')
    : jsonStr

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Search size={12} className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search JSON..."
            className="w-full rounded border border-border-default bg-white py-1.5 pl-7 pr-3 text-[10px] focus:outline-none focus:ring-1 focus:ring-primary-500"
          />
        </div>
        <button onClick={handleCopy} className="rounded border border-border-default px-2 py-1.5 text-[10px] hover:bg-gray-50 flex items-center gap-1">
          <Copy size={10} /> Copy
        </button>
      </div>
      <pre className="max-h-[500px] overflow-auto rounded-lg bg-gray-900 p-4 text-[10px] text-green-300 font-mono whitespace-pre-wrap">
        {search
          ? highlighted.split('<<<HIGHLIGHT>>>').map((part, i) => {
              if (i === 0) return part
              const [match, ...rest] = part.split('<<<END>>>')
              return <span key={i}><mark className="bg-yellow-400 text-black">{match}</mark>{rest.join('<<<END>>>')}</span>
            })
          : jsonStr
        }
      </pre>
    </div>
  )
}
