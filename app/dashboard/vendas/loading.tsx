import { Skeleton } from "@/components/ui/skeleton"

export default function Loading() {
  return (
    <div className="flex flex-col h-[calc(100vh-80px)] md:h-[calc(100vh-64px)]">
      {/* Header Skeleton */}
      <div className="flex items-center justify-between p-4 border-b">
        <Skeleton className="h-8 w-40" />
        <Skeleton className="h-10 w-10 rounded-md" />
      </div>

      {/* Search and Filter Skeleton */}
      <div className="p-4 space-y-4">
        <Skeleton className="h-10 w-full" />
        <div className="flex space-x-2 overflow-x-auto pb-1">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <Skeleton key={i} className="h-9 w-24 rounded-md flex-shrink-0" />
          ))}
        </div>
      </div>

      {/* Dish List Skeleton */}
      <div className="flex-1 overflow-auto p-4">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="rounded-lg border overflow-hidden flex flex-col">
              <Skeleton className="h-40 w-full" />
              <div className="p-4 space-y-2">
                <div className="flex justify-between">
                  <Skeleton className="h-6 w-32" />
                  <Skeleton className="h-6 w-16" />
                </div>
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-10 w-full mt-2" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
