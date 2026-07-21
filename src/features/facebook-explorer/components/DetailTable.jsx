export default function DetailTable({ rows }) {
  return (
    <table className="w-full text-xs">
      <tbody className="divide-y divide-border-default">
        {rows.filter(r => r).map(([label, value], i) => (
          <tr key={i} className="hover:bg-gray-50/50">
            <td className="px-3 py-2 text-text-tertiary font-medium w-1/3">{label}</td>
            <td className="px-3 py-2 text-text-primary">{value ?? '—'}</td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}
