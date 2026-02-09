import { cn } from "@/lib/utils"

interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {}

function Skeleton({ className, ...props }: SkeletonProps) {
  return (
    <div
      className={cn("animate-pulse rounded-md bg-gray-200", className)}
      {...props}
    />
  )
}

// Pre-built skeleton patterns for common use cases
function SkeletonCard({ className }: { className?: string }) {
  return (
    <div className={cn("rounded-lg border bg-white p-4 shadow-sm", className)}>
      <div className="flex items-center gap-4">
        <Skeleton className="h-10 w-10 rounded-lg" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-4 w-1/3" />
          <Skeleton className="h-3 w-1/2" />
        </div>
      </div>
    </div>
  )
}

function SkeletonStatsCard({ className }: { className?: string }) {
  return (
    <div className={cn("rounded-lg border bg-white p-4", className)}>
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <Skeleton className="h-3 w-16" />
          <Skeleton className="h-8 w-12" />
        </div>
        <Skeleton className="h-6 w-6 rounded" />
      </div>
    </div>
  )
}

function SkeletonTableRow({ columns = 5 }: { columns?: number }) {
  return (
    <tr className="border-b">
      {Array.from({ length: columns }).map((_, i) => (
        <td key={i} className="p-3">
          <Skeleton className="h-4 w-full" />
        </td>
      ))}
    </tr>
  )
}

function SkeletonTable({ rows = 5, columns = 5 }: { rows?: number; columns?: number }) {
  return (
    <div className="rounded-lg border bg-white overflow-hidden">
      {/* Header */}
      <div className="border-b bg-gray-50 p-3">
        <div className="flex gap-4">
          {Array.from({ length: columns }).map((_, i) => (
            <Skeleton key={i} className="h-4 flex-1" />
          ))}
        </div>
      </div>
      {/* Body */}
      <div className="divide-y">
        {Array.from({ length: rows }).map((_, i) => (
          <div key={i} className="p-3">
            <div className="flex gap-4">
              {Array.from({ length: columns }).map((_, j) => (
                <Skeleton key={j} className="h-4 flex-1" />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

function SkeletonMailboxList({ count = 3 }: { count?: number }) {
  return (
    <div className="space-y-4">
      {/* Ready banner skeleton */}
      <div className="rounded-lg border-2 bg-gray-50 p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Skeleton className="h-8 w-8 rounded-full" />
            <div className="space-y-2">
              <Skeleton className="h-5 w-40" />
              <Skeleton className="h-3 w-56" />
            </div>
          </div>
          <div className="text-right space-y-1">
            <Skeleton className="h-8 w-16 ml-auto" />
            <Skeleton className="h-3 w-12 ml-auto" />
          </div>
        </div>
        <Skeleton className="h-2 w-full mt-3 rounded-full" />
      </div>

      {/* Stats grid skeleton */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <SkeletonStatsCard key={i} />
        ))}
      </div>

      {/* Filter tabs skeleton */}
      <Skeleton className="h-10 w-full rounded-md" />

      {/* Mailbox cards skeleton */}
      <div className="space-y-2">
        {Array.from({ length: count }).map((_, i) => (
          <div key={i} className="rounded-lg border bg-gray-50 p-4">
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1 space-y-3">
                <div className="flex items-center gap-2">
                  <Skeleton className="h-5 w-20 rounded-full" />
                  <Skeleton className="h-5 w-16 rounded-full" />
                </div>
                <Skeleton className="h-4 w-64" />
                <Skeleton className="h-3 w-48" />
              </div>
              <Skeleton className="h-16 w-16 rounded-lg" />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

function SkeletonDashboardCards() {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
      {Array.from({ length: 5 }).map((_, i) => (
        <SkeletonStatsCard key={i} />
      ))}
    </div>
  )
}

export {
  Skeleton,
  SkeletonCard,
  SkeletonStatsCard,
  SkeletonTableRow,
  SkeletonTable,
  SkeletonMailboxList,
  SkeletonDashboardCards
}
