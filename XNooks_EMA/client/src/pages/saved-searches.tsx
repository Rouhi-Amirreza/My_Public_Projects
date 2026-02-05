import { useQuery, useMutation } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { SavedSearch } from "@shared/schema";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Plane, MapPin, Calendar, Users, Trash2, Play, ArrowLeft } from "lucide-react";
import { Link, useLocation } from "wouter";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";

export default function SavedSearchesPage() {
  const { toast } = useToast();
  const [, setLocation] = useLocation();

  const { data: searches, isLoading } = useQuery<SavedSearch[]>({
    queryKey: ["/api/saved-searches"],
    retry: false,
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("DELETE", `/api/saved-searches/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/saved-searches"] });
      toast({
        title: "Success",
        description: "Saved search deleted successfully",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: "Failed to delete saved search",
        variant: "destructive",
      });
    },
  });

  const handleRunSearch = (search: SavedSearch) => {
    const params: Record<string, string> = {
      type: search.type,
      departure_id: search.departureId || "",
      arrival_id: search.arrivalId || "",
      outbound_date: search.outboundDate || "",
      return_date: search.returnDate || "",
      travel_class: search.travelClass,
      adults: search.adults.toString(),
      children: search.children.toString(),
      infants_in_seat: search.infantsInSeat.toString(),
      infants_on_lap: search.infantsOnLap.toString(),
    };
    const searchUrl = new URLSearchParams(params);
    setLocation(`/?search=${searchUrl.toString()}`);
  };

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-5xl mx-auto space-y-6">
          <Skeleton className="h-12 w-64" />
          <div className="grid gap-4">
            <Skeleton className="h-48" />
            <Skeleton className="h-48" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-5xl mx-auto">
        <div className="mb-8">
          <Link href="/">
            <Button variant="ghost" size="sm" className="mb-4" data-testid="link-back-home">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Search
            </Button>
          </Link>
          <h1 className="text-3xl font-bold mb-2">Saved Searches</h1>
          <p className="text-muted-foreground">
            Quick access to your frequently used flight searches
          </p>
        </div>

        {!searches || searches.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <Plane className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">No saved searches yet</h3>
              <p className="text-muted-foreground mb-4">
                Save your flight searches for quick access later
              </p>
              <Button asChild>
                <a href="/">Search Flights</a>
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4">
            {searches.map((search) => (
              <Card key={search.id} data-testid={`saved-search-${search.id}`}>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <span>{search.name}</span>
                    <Badge variant="outline">
                      {search.type === "1" ? "Round Trip" : "One Way"}
                    </Badge>
                  </CardTitle>
                  <CardDescription className="flex items-center gap-2">
                    <MapPin className="h-4 w-4" />
                    {search.departureId} → {search.arrivalId}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                    {search.outboundDate && (
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4" />
                        {format(new Date(search.outboundDate), "MMM dd, yyyy")}
                        {search.returnDate && (
                          <>
                            {" → "}
                            {format(new Date(search.returnDate), "MMM dd, yyyy")}
                          </>
                        )}
                      </div>
                    )}
                    <div className="flex items-center gap-2">
                      <Users className="h-4 w-4" />
                      {search.adults + search.children + search.infantsInSeat + search.infantsOnLap} passenger
                      {search.adults + search.children + search.infantsInSeat + search.infantsOnLap > 1 ? "s" : ""}
                    </div>
                  </div>
                </CardContent>
                <CardFooter className="flex justify-between gap-2">
                  <Button
                    onClick={() => handleRunSearch(search)}
                    data-testid={`button-run-search-${search.id}`}
                  >
                    <Play className="h-4 w-4 mr-2" />
                    Run Search
                  </Button>
                  <Button
                    variant="ghost"
                    onClick={() => deleteMutation.mutate(search.id)}
                    disabled={deleteMutation.isPending}
                    data-testid={`button-delete-search-${search.id}`}
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Delete
                  </Button>
                </CardFooter>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
