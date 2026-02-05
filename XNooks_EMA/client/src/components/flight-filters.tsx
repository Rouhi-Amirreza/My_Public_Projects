import { useState } from "react";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Filter, X } from "lucide-react";

export interface FilterState {
  stops: string;
  maxPrice: number;
  sortBy: string;
  airlines?: string[];
}

interface FlightFiltersProps {
  filters: FilterState;
  onFiltersChange: (filters: FilterState) => void;
  maxPriceLimit?: number;
  availableAirlines?: string[];
}

export function FlightFilters({ filters, onFiltersChange, maxPriceLimit = 5000, availableAirlines = [] }: FlightFiltersProps) {
  const [localFilters, setLocalFilters] = useState(filters);

  const handleApply = () => {
    onFiltersChange(localFilters);
  };

  const handleReset = () => {
    const resetFilters = {
      stops: "0",
      maxPrice: maxPriceLimit,
      sortBy: "1",
      airlines: [],
    };
    setLocalFilters(resetFilters);
    onFiltersChange(resetFilters);
  };

  const handleAirlineToggle = (airline: string) => {
    const currentAirlines = localFilters.airlines || [];
    const newAirlines = currentAirlines.includes(airline)
      ? currentAirlines.filter(a => a !== airline)
      : [...currentAirlines, airline];
    setLocalFilters({ ...localFilters, airlines: newAirlines });
  };

  return (
    <Card className="sticky top-6">
      <CardHeader className="pb-4">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Filter className="h-5 w-5" />
          Filters
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-3">
          <Label className="text-base font-semibold">Sort by</Label>
          <RadioGroup
            value={localFilters.sortBy}
            onValueChange={(value) => setLocalFilters({ ...localFilters, sortBy: value })}
          >
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="1" id="sort-top" data-testid="radio-sort-top" />
              <Label htmlFor="sort-top" className="font-normal cursor-pointer">Top flights</Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="2" id="sort-price" data-testid="radio-sort-price" />
              <Label htmlFor="sort-price" className="font-normal cursor-pointer">Price (low to high)</Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="5" id="sort-duration" data-testid="radio-sort-duration" />
              <Label htmlFor="sort-duration" className="font-normal cursor-pointer">Duration (shortest)</Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="6" id="sort-emissions" data-testid="radio-sort-emissions" />
              <Label htmlFor="sort-emissions" className="font-normal cursor-pointer">Emissions (lowest)</Label>
            </div>
          </RadioGroup>
        </div>

        <div className="space-y-3">
          <Label className="text-base font-semibold">Number of stops</Label>
          <RadioGroup
            value={localFilters.stops}
            onValueChange={(value) => setLocalFilters({ ...localFilters, stops: value })}
          >
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="0" id="stops-any" data-testid="radio-stops-any" />
              <Label htmlFor="stops-any" className="font-normal cursor-pointer">Any number of stops</Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="1" id="stops-nonstop" data-testid="radio-stops-nonstop" />
              <Label htmlFor="stops-nonstop" className="font-normal cursor-pointer">Nonstop only</Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="2" id="stops-one" data-testid="radio-stops-one" />
              <Label htmlFor="stops-one" className="font-normal cursor-pointer">1 stop or fewer</Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="3" id="stops-two" data-testid="radio-stops-two" />
              <Label htmlFor="stops-two" className="font-normal cursor-pointer">2 stops or fewer</Label>
            </div>
          </RadioGroup>
        </div>

        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <Label className="text-base font-semibold">Max price</Label>
            <span className="text-sm font-semibold text-primary" data-testid="text-max-price">
              ${localFilters.maxPrice}
            </span>
          </div>
          <Slider
            value={[localFilters.maxPrice]}
            onValueChange={([value]) => setLocalFilters({ ...localFilters, maxPrice: value })}
            max={maxPriceLimit}
            min={0}
            step={50}
            className="py-4"
            data-testid="slider-max-price"
          />
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>$0</span>
            <span>${maxPriceLimit}</span>
          </div>
        </div>

        {/* Airlines Filter */}
        {availableAirlines.length > 0 && (
          <div className="space-y-3">
            <Label className="text-base font-semibold">Airlines</Label>
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {availableAirlines.map((airline) => (
                <div key={airline} className="flex items-center space-x-2">
                  <Checkbox
                    id={`airline-${airline}`}
                    checked={(localFilters.airlines || []).includes(airline)}
                    onCheckedChange={() => handleAirlineToggle(airline)}
                    data-testid={`checkbox-airline-${airline}`}
                  />
                  <Label
                    htmlFor={`airline-${airline}`}
                    className="text-sm font-normal cursor-pointer flex-1"
                  >
                    {airline}
                  </Label>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="flex gap-2 pt-4">
          <Button
            onClick={handleApply}
            className="flex-1"
            data-testid="button-apply-filters"
          >
            Apply
          </Button>
          <Button
            onClick={handleReset}
            variant="outline"
            className="flex-1"
            data-testid="button-reset-filters"
          >
            <X className="h-4 w-4 mr-1" />
            Reset
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
