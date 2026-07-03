function Shimmer({ className }) {
  return (
    <div className={`animate-pulse rounded-lg bg-gray-200 ${className}`} />
  )
}

export default function PageSkeleton() {
  return (
    <div className="space-y-6">
      {/* Breadcrumb placeholder */}
      <Shimmer className="h-4 w-48" />

      {/* Page title placeholder */}
      <Shimmer className="h-8 w-64" />

      {/* KPI cards row */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="rounded-xl border border-gray-100 bg-white p-5 shadow-sm">
            <Shimmer className="mb-3 h-3 w-24" />
            <Shimmer className="h-7 w-20" />
            <Shimmer className="mt-2 h-3 w-16" />
          </div>
        ))}
      </div>

      {/* Chart placeholders */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div className="rounded-xl border border-gray-100 bg-white p-5 shadow-sm">
          <Shimmer className="mb-4 h-4 w-32" />
          <Shimmer className="h-48 w-full" />
        </div>
        <div className="rounded-xl border border-gray-100 bg-white p-5 shadow-sm">
          <Shimmer className="mb-4 h-4 w-32" />
          <Shimmer className="h-48 w-full" />
        </div>
      </div>

      {/* Table/list placeholder */}
      <div className="rounded-xl border border-gray-100 bg-white shadow-sm">
        <div className="border-b border-gray-100 p-5">
          <Shimmer className="h-4 w-28" />
        </div>
        <div className="divide-y divide-gray-50">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex items-center gap-4 px-5 py-4">
              <Shimmer className="h-8 w-8 rounded-full" />
              <div className="flex-1 space-y-2">
                <Shimmer className="h-3 w-48" />
                <Shimmer className="h-3 w-32" />
              </div>
              <Shimmer className="h-6 w-16 rounded-full" />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
