import { Plane } from "lucide-react";
import { Button } from "@/components/ui/button";

interface EmptyStateProps {
  title?: string;
  description?: string;
  onReset?: () => void;
}

export function EmptyState({ 
  title = "No flights found", 
  description = "Try adjusting your search criteria or filters to find available flights.",
  onReset 
}: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-4 text-center" data-testid="empty-state">
      <div className="relative mb-6">
        <div className="absolute inset-0 bg-primary/10 rounded-full blur-2xl" />
        <div className="relative bg-primary/5 p-6 rounded-full">
          <Plane className="h-16 w-16 text-primary" />
        </div>
      </div>
      <h3 className="text-2xl font-semibold mb-2">{title}</h3>
      <p className="text-muted-foreground max-w-md mb-6">{description}</p>
      {onReset && (
        <Button onClick={onReset} variant="outline" data-testid="button-reset-search">
          Clear filters and try again
        </Button>
      )}
    </div>
  );
}
