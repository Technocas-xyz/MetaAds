import { formatCount, formatCurrency } from './MetricCard'

export default function ActionMetricsTable({ actions, costPerAction, title, filterFn }) {
  if (!actions || actions.length === 0) return <p className="text-xs text-text-tertiary italic">No data</p>

  const filtered = filterFn ? actions.filter(filterFn) : actions
  if (filtered.length === 0) return <p className="text-xs text-text-tertiary italic">No matching actions</p>

  const costMap = {}
  if (costPerAction) {
    costPerAction.forEach((c) => { costMap[c.action_type] = c.value })
  }

  return (
    <div>
      {title && <p className="text-[10px] font-semibold text-text-secondary uppercase mb-2">{title}</p>}
      <table className="w-full text-xs">
        <thead>
          <tr className="border-b border-border-default bg-gray-50/50">
            <th className="px-3 py-2 text-left font-medium text-text-secondary">Action Type</th>
            <th className="px-3 py-2 text-right font-medium text-text-secondary">Count</th>
            <th className="px-3 py-2 text-right font-medium text-text-secondary">Cost/Action</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border-default">
          {filtered.map((a, i) => (
            <tr key={i} className="hover:bg-gray-50/50">
              <td className="px-3 py-2 text-text-primary font-mono text-[10px]">{a.action_type}</td>
              <td className="px-3 py-2 text-right">{formatCount(a.value)}</td>
              <td className="px-3 py-2 text-right">{costMap[a.action_type] ? formatCurrency(costMap[a.action_type]) : '—'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
