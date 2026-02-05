import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export function FlightSkeleton() {
  return (
    <Card data-testid="skeleton-flight-card">
      <CardHeader className="pb-4">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <Skeleton className="h-12 w-12 rounded" />
            <div className="space-y-2">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-3 w-24" />
            </div>
          </div>
          <Skeleton className="h-6 w-20" />
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-4">
          <div className="space-y-2">
            <Skeleton className="h-8 w-20" />
            <Skeleton className="h-4 w-16" />
            <Skeleton className="h-3 w-32" />
          </div>

          <div className="flex flex-col items-center min-w-[120px] space-y-2">
            <Skeleton className="h-4 w-16" />
            <Skeleton className="h-0.5 w-full" />
            <Skeleton className="h-3 w-20" />
          </div>

          <div className="space-y-2 text-right flex flex-col items-end">
            <Skeleton className="h-8 w-20" />
            <Skeleton className="h-4 w-16" />
            <Skeleton className="h-3 w-32" />
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <Skeleton className="h-6 w-32" />
          <Skeleton className="h-6 w-24" />
        </div>
      </CardContent>

      <CardFooter className="flex items-center justify-between gap-4 pt-4">
        <Skeleton className="h-9 w-32" />
        <div className="flex items-center gap-4">
          <div className="space-y-1 text-right">
            <Skeleton className="h-9 w-24" />
            <Skeleton className="h-3 w-16" />
          </div>
          <Skeleton className="h-10 w-20" />
        </div>
      </CardFooter>
    </Card>
  );
}
