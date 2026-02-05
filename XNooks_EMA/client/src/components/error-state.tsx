import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

interface ErrorStateProps {
  title?: string;
  message?: string;
  onRetry?: () => void;
}

export function ErrorState({ 
  title = "Something went wrong", 
  message = "We couldn't load the flights. Please try again.",
  onRetry 
}: ErrorStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-4" data-testid="error-state">
      <Alert variant="destructive" className="max-w-2xl">
        <AlertTriangle className="h-5 w-5" />
        <AlertTitle className="text-lg font-semibold">{title}</AlertTitle>
        <AlertDescription className="mt-2">
          {message}
        </AlertDescription>
        {onRetry && (
          <Button 
            onClick={onRetry} 
            variant="outline" 
            className="mt-4"
            data-testid="button-retry"
          >
            Try again
          </Button>
        )}
      </Alert>
    </div>
  );
}
