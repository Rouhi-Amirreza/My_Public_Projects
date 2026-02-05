import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { FlightOption } from "@shared/schema";
import { Clock, Leaf, Plane, ArrowRight, ChevronDown, ChevronUp, Bell } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";

interface FlightCardProps {
  flight: FlightOption;
  isBestDeal?: boolean;
  onSelect?: (flight: FlightOption) => void;
  onAddToComparison?: (flight: FlightOption) => void;
  onSetAlert?: (flight: FlightOption) => void;
}

export function FlightCard({ flight, isBestDeal, onSelect, onAddToComparison, onSetAlert }: FlightCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  const formatDuration = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours}h ${mins}m`;
  };

  const formatTime = (dateTime: string) => {
    const date = new Date(dateTime);
    return date.toLocaleTimeString('en-US', { 
      hour: '2-digit', 
      minute: '2-digit',
      hour12: true 
    });
  };

  const getEmissionsBadgeColor = () => {
    if (!flight.carbon_emissions) return "";
    const diff = flight.carbon_emissions.difference_percent;
    if (diff < -10) return "bg-success text-success-foreground";
    if (diff > 10) return "bg-warning text-warning-foreground";
    return "bg-muted text-muted-foreground";
  };

  return (
    <Card className="hover-elevate transition-all" data-testid={`card-flight-${flight.booking_token?.slice(0, 8)}`}>
      <CardHeader className="pb-4">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <img 
              src={flight.airline_logo} 
              alt="Airline logo" 
              className="h-12 w-12 object-contain"
            />
            <div>
              <p className="font-semibold text-base">{flight.flights[0]?.airline}</p>
              <p className="text-sm text-muted-foreground">
                {flight.flights.map(f => f.flight_number).join(', ')}
              </p>
            </div>
          </div>
          
          {isBestDeal && (
            <Badge className="bg-success text-success-foreground" data-testid="badge-best-deal">
              Best Value
            </Badge>
          )}
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-4">
          <div>
            <p className="text-2xl font-bold">{formatTime(flight.flights[0].departure_airport.time)}</p>
            <p className="text-sm text-muted-foreground">{flight.flights[0].departure_airport.id}</p>
            <p className="text-xs text-muted-foreground line-clamp-1">{flight.flights[0].departure_airport.name}</p>
          </div>

          <div className="flex flex-col items-center min-w-[120px]">
            <p className="text-sm text-muted-foreground mb-1">{formatDuration(flight.total_duration)}</p>
            <div className="relative w-full">
              <Separator className="w-full" />
              <div className="absolute inset-0 flex items-center justify-center">
                {flight.layovers && flight.layovers.length > 0 ? (
                  <div className="flex gap-1">
                    {flight.layovers.map((layover, idx) => (
                      <div key={idx} className="h-2 w-2 rounded-full bg-primary" />
                    ))}
                  </div>
                ) : (
                  <ArrowRight className="h-4 w-4 bg-background text-muted-foreground" />
                )}
              </div>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {flight.layovers && flight.layovers.length > 0 
                ? `${flight.layovers.length} stop${flight.layovers.length > 1 ? 's' : ''}`
                : 'Nonstop'}
            </p>
          </div>

          <div className="text-right">
            <p className="text-2xl font-bold">{formatTime(flight.flights[flight.flights.length - 1].arrival_airport.time)}</p>
            <p className="text-sm text-muted-foreground">{flight.flights[flight.flights.length - 1].arrival_airport.id}</p>
            <p className="text-xs text-muted-foreground line-clamp-1">{flight.flights[flight.flights.length - 1].arrival_airport.name}</p>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          {flight.carbon_emissions && (
            <Badge variant="outline" className={cn("gap-1", getEmissionsBadgeColor())} data-testid="badge-emissions">
              <Leaf className="h-3 w-3" />
              {flight.carbon_emissions.difference_percent > 0 ? '+' : ''}{flight.carbon_emissions.difference_percent}% emissions
            </Badge>
          )}
          {flight.extensions?.slice(0, 2).map((ext, idx) => (
            <Badge key={idx} variant="outline" className="text-xs">
              {ext}
            </Badge>
          ))}
        </div>

        {isExpanded && (
          <div className="space-y-3 pt-4 border-t">
            <p className="font-semibold text-sm">Flight Details</p>
            {flight.flights.map((f, idx) => (
              <div key={idx} className="space-y-2">
                <div className="flex items-start gap-3 text-sm">
                  <Plane className="h-4 w-4 text-muted-foreground mt-0.5" />
                  <div className="flex-1 space-y-1">
                    <div className="flex items-center justify-between">
                      <p className="font-medium">{f.airline} {f.flight_number}</p>
                      <p className="text-muted-foreground">{f.airplane}</p>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-muted-foreground">
                      <p>{f.departure_airport.id} → {f.arrival_airport.id}</p>
                      <p className="text-right">{formatDuration(f.duration)}</p>
                    </div>
                    {f.legroom && <p className="text-xs text-muted-foreground">Legroom: {f.legroom}</p>}
                    {f.extensions && f.extensions.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-2">
                        {f.extensions.map((ext, extIdx) => (
                          <Badge key={extIdx} variant="secondary" className="text-xs">
                            {ext}
                          </Badge>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
                {idx < flight.flights.length - 1 && flight.layovers && flight.layovers[idx] && (
                  <div className="ml-7 p-2 bg-muted/50 rounded text-sm">
                    <p className="text-muted-foreground">
                      <Clock className="h-3 w-3 inline mr-1" />
                      {formatDuration(flight.layovers[idx].duration)} layover in {flight.layovers[idx].name} ({flight.layovers[idx].id})
                      {flight.layovers[idx].overnight && <Badge variant="outline" className="ml-2 text-xs">Overnight</Badge>}
                    </p>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </CardContent>

      <CardFooter className="flex items-center justify-between gap-4 pt-4">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setIsExpanded(!isExpanded)}
          data-testid="button-toggle-details"
        >
          {isExpanded ? (
            <>
              <ChevronUp className="h-4 w-4 mr-1" />
              Hide details
            </>
          ) : (
            <>
              <ChevronDown className="h-4 w-4 mr-1" />
              Flight details
            </>
          )}
        </Button>

        <div className="flex items-center gap-4">
          <div className="text-right">
            <p className="text-3xl font-bold" data-testid="text-price">${flight.price}</p>
            <p className="text-xs text-muted-foreground">per person</p>
          </div>
          <div className="flex gap-2">
            {onSetAlert && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => onSetAlert(flight)}
                data-testid="button-set-alert"
              >
                <Bell className="h-4 w-4 mr-1" />
                Alert
              </Button>
            )}
            {onAddToComparison && (
              <Button
                variant="outline"
                onClick={() => onAddToComparison(flight)}
                data-testid="button-add-to-comparison"
              >
                Compare
              </Button>
            )}
            <Button 
              onClick={() => onSelect?.(flight)}
              data-testid="button-select-flight"
            >
              Select
            </Button>
          </div>
        </div>
      </CardFooter>
    </Card>
  );
}
