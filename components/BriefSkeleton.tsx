import { Skeleton } from "@/components/ui/skeleton"

export function BriefSkeleton() {
  return (
    <div className="mb-3 rounded-lg border border-gray-100 border-l-4 border-l-blue-500 p-4">
      <div className="mb-4 flex items-center justify-between">
        <Skeleton className="h-5 w-40" />
        <Skeleton className="h-4 w-16" />
      </div>
      <Skeleton className="mb-4 h-16 w-full" />
      <Skeleton className="mb-1 h-4 w-full" />
      <Skeleton className="mb-1 h-4 w-full" />
      <Skeleton className="h-4 w-3/4" />
    </div>
  )
}
