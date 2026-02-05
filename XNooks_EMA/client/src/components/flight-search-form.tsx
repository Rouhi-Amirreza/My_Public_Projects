import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { format } from "date-fns";
import { Calendar as CalendarIcon, MapPin, Users, Plane } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";

const multiCitySegmentSchema = z.object({
  departure_id: z.string().min(3, "Airport code required"),
  arrival_id: z.string().min(3, "Airport code required"),
  date: z.date({ required_error: "Select date" }),
});

type MultiCitySegmentState = {
  departure_id: string;
  arrival_id: string;
  date: Date;
};

const searchFormSchema = z.object({
  type: z.enum(["1", "2", "3"]),
  departure_id: z.string().optional(),
  arrival_id: z.string().optional(),
  outbound_date: z.date().optional(),
  return_date: z.date().optional(),
  multi_city_segments: z.array(multiCitySegmentSchema).optional(),
  travel_class: z.enum(["1", "2", "3", "4"]),
  adults: z.number().min(1).max(9),
  children: z.number().min(0).max(9),
  infants_in_seat: z.number().min(0).max(9),
  infants_on_lap: z.number().min(0).max(9),
  show_hidden: z.boolean().optional(),
  deep_search: z.boolean().optional(),
}).refine((data) => {
  if (data.type === "1" && !data.return_date) {
    return false;
  }
  if (data.type !== "3" && (!data.departure_id || !data.arrival_id || !data.outbound_date)) {
    return false;
  }
  if (data.type === "3" && (!data.multi_city_segments || data.multi_city_segments.length < 2)) {
    return false;
  }
  return true;
}, {
  message: "Please fill in all required fields",
  path: ["type"],
});

type SearchFormValues = z.infer<typeof searchFormSchema>;

interface FlightSearchFormProps {
  onSearch: (values: SearchFormValues) => void;
  isLoading?: boolean;
  initialValues?: Partial<SearchFormValues> | null;
}

export function FlightSearchForm({ onSearch, isLoading, initialValues }: FlightSearchFormProps) {
  const [tripType, setTripType] = useState<"1" | "2" | "3">(initialValues?.type || "1");
  const [showPassengerDropdown, setShowPassengerDropdown] = useState(false);
  const [multiCitySegments, setMultiCitySegments] = useState<MultiCitySegmentState[]>(
    initialValues?.multi_city_segments || [
      { departure_id: "", arrival_id: "", date: new Date() },
      { departure_id: "", arrival_id: "", date: new Date() },
    ]
  );

  const form = useForm<SearchFormValues>({
    resolver: zodResolver(searchFormSchema),
    defaultValues: initialValues ? {
      type: initialValues.type || "1",
      departure_id: initialValues.departure_id || "",
      arrival_id: initialValues.arrival_id || "",
      outbound_date: initialValues.outbound_date,
      return_date: initialValues.return_date,
      multi_city_segments: initialValues.multi_city_segments,
      travel_class: initialValues.travel_class || "1",
      adults: initialValues.adults || 1,
      children: initialValues.children || 0,
      infants_in_seat: initialValues.infants_in_seat || 0,
      infants_on_lap: initialValues.infants_on_lap || 0,
      show_hidden: initialValues.show_hidden || false,
      deep_search: initialValues.deep_search || false,
    } : {
      type: "1",
      departure_id: "",
      arrival_id: "",
      travel_class: "1",
      adults: 1,
      children: 0,
      infants_in_seat: 0,
      infants_on_lap: 0,
      show_hidden: false,
      deep_search: false,
    },
  });

  const handleSubmit = (values: SearchFormValues) => {
    onSearch(values);
  };

  // Auto-submit when initial values are provided
  useEffect(() => {
    if (initialValues && initialValues.departure_id && initialValues.arrival_id && initialValues.outbound_date) {
      form.handleSubmit(handleSubmit)();
    }
  }, []);

  const adults = form.watch("adults");
  const children = form.watch("children");
  const infants_in_seat = form.watch("infants_in_seat");
  const infants_on_lap = form.watch("infants_on_lap");
  const totalPassengers = adults + children + infants_in_seat + infants_on_lap;

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
        <Tabs
          value={tripType}
          onValueChange={(value) => {
            setTripType(value as "1" | "2" | "3");
            form.setValue("type", value as "1" | "2" | "3");
            if (value === "3") {
              form.setValue("multi_city_segments", multiCitySegments as any);
            }
          }}
          className="w-full"
        >
          <TabsList className="grid w-full max-w-md grid-cols-3">
            <TabsTrigger value="1" data-testid="tab-round-trip">Round Trip</TabsTrigger>
            <TabsTrigger value="2" data-testid="tab-one-way">One Way</TabsTrigger>
            <TabsTrigger value="3" data-testid="tab-multi-city">Multi-City</TabsTrigger>
          </TabsList>
        </Tabs>

        {tripType !== "3" && (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            <FormField
            control={form.control}
            name="departure_id"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-muted-foreground" />
                  From
                </FormLabel>
                <FormControl>
                  <Input
                    placeholder="Airport code (e.g., LAX)"
                    {...field}
                    data-testid="input-departure"
                    className="uppercase"
                    onChange={(e) => field.onChange(e.target.value.toUpperCase())}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="arrival_id"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-muted-foreground" />
                  To
                </FormLabel>
                <FormControl>
                  <Input
                    placeholder="Airport code (e.g., JFK)"
                    {...field}
                    data-testid="input-arrival"
                    className="uppercase"
                    onChange={(e) => field.onChange(e.target.value.toUpperCase())}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="outbound_date"
            render={({ field }) => (
              <FormItem className="flex flex-col">
                <FormLabel className="flex items-center gap-2 mb-2">
                  <CalendarIcon className="h-4 w-4 text-muted-foreground" />
                  Departure
                </FormLabel>
                <Popover>
                  <PopoverTrigger asChild>
                    <FormControl>
                      <Button
                        variant="outline"
                        className={cn(
                          "justify-start text-left font-normal",
                          !field.value && "text-muted-foreground"
                        )}
                        data-testid="button-departure-date"
                      >
                        {field.value ? (
                          format(field.value, "MMM dd, yyyy")
                        ) : (
                          <span>Pick a date</span>
                        )}
                      </Button>
                    </FormControl>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={field.value}
                      onSelect={field.onChange}
                      disabled={(date) => date < new Date(new Date().setHours(0, 0, 0, 0))}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
                <FormMessage />
              </FormItem>
            )}
          />

          {tripType === "1" && (
            <FormField
              control={form.control}
              name="return_date"
              render={({ field }) => (
                <FormItem className="flex flex-col">
                  <FormLabel className="flex items-center gap-2 mb-2">
                    <CalendarIcon className="h-4 w-4 text-muted-foreground" />
                    Return
                  </FormLabel>
                  <Popover>
                    <PopoverTrigger asChild>
                      <FormControl>
                        <Button
                          variant="outline"
                          className={cn(
                            "justify-start text-left font-normal",
                            !field.value && "text-muted-foreground"
                          )}
                          data-testid="button-return-date"
                        >
                          {field.value ? (
                            format(field.value, "MMM dd, yyyy")
                          ) : (
                            <span>Pick a date</span>
                          )}
                        </Button>
                      </FormControl>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={field.value}
                        onSelect={field.onChange}
                        disabled={(date) => {
                          const outboundDate = form.getValues("outbound_date");
                          return date < new Date(new Date().setHours(0, 0, 0, 0)) ||
                            !!(outboundDate && date < outboundDate);
                        }}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                  <FormMessage />
                </FormItem>
              )}
            />
          )}
        </div>
        )}

        {tripType === "3" && (
          <div className="space-y-4" data-testid="multi-city-form">
            {multiCitySegments.map((segment, index) => (
              <div key={index} className="grid gap-4 md:grid-cols-3 p-4 border rounded-lg">
                <div>
                  <Label>From</Label>
                  <Input
                    placeholder="Airport code"
                    value={segment.departure_id}
                    onChange={(e) => {
                      const newSegments = [...multiCitySegments];
                      newSegments[index].departure_id = e.target.value.toUpperCase();
                      setMultiCitySegments(newSegments);
                      form.setValue("multi_city_segments", newSegments);
                    }}
                    className="uppercase"
                    data-testid={`input-segment-${index}-departure`}
                  />
                </div>
                <div>
                  <Label>To</Label>
                  <Input
                    placeholder="Airport code"
                    value={segment.arrival_id}
                    onChange={(e) => {
                      const newSegments = [...multiCitySegments];
                      newSegments[index].arrival_id = e.target.value.toUpperCase();
                      setMultiCitySegments(newSegments);
                      form.setValue("multi_city_segments", newSegments);
                    }}
                    className="uppercase"
                    data-testid={`input-segment-${index}-arrival`}
                  />
                </div>
                <div>
                  <Label>Date</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          "justify-start text-left font-normal w-full"
                        )}
                        data-testid={`button-segment-${index}-date`}
                      >
                        {format(segment.date, "MMM dd, yyyy")}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                      <Calendar
                        mode="single"
                        selected={segment.date}
                        onSelect={(date) => {
                          if (date) {
                            const newSegments = [...multiCitySegments];
                            newSegments[index].date = date;
                            setMultiCitySegments(newSegments);
                            form.setValue("multi_city_segments", newSegments);
                          }
                        }}
                        disabled={(date) => date < new Date(new Date().setHours(0, 0, 0, 0))}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                </div>
                {index > 0 && (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      const newSegments = multiCitySegments.filter((_, i) => i !== index);
                      setMultiCitySegments(newSegments);
                      form.setValue("multi_city_segments", newSegments);
                    }}
                    data-testid={`button-remove-segment-${index}`}
                  >
                    Remove
                  </Button>
                )}
              </div>
            ))}
            {multiCitySegments.length < 5 && (
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  const newSegments: MultiCitySegmentState[] = [...multiCitySegments, { departure_id: "", arrival_id: "", date: new Date() }];
                  setMultiCitySegments(newSegments);
                  form.setValue("multi_city_segments", newSegments);
                }}
                data-testid="button-add-segment"
              >
                + Add Flight
              </Button>
            )}
          </div>
        )}

        <div className="grid gap-6 md:grid-cols-3">
          <Popover open={showPassengerDropdown} onOpenChange={setShowPassengerDropdown}>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className="justify-start text-left font-normal"
                data-testid="button-passengers"
              >
                <Users className="h-4 w-4 mr-2 text-muted-foreground" />
                {totalPassengers} {totalPassengers === 1 ? 'Passenger' : 'Passengers'}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-80" align="start">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">Adults</p>
                    <p className="text-sm text-muted-foreground">12+ years</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      onClick={() => form.setValue("adults", Math.max(1, adults - 1))}
                      disabled={adults <= 1}
                      data-testid="button-adults-decrease"
                    >
                      -
                    </Button>
                    <span className="w-8 text-center" data-testid="text-adults-count">{adults}</span>
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      onClick={() => form.setValue("adults", Math.min(9, adults + 1))}
                      disabled={adults >= 9}
                      data-testid="button-adults-increase"
                    >
                      +
                    </Button>
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">Children</p>
                    <p className="text-sm text-muted-foreground">2-11 years</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      onClick={() => form.setValue("children", Math.max(0, children - 1))}
                      disabled={children <= 0}
                      data-testid="button-children-decrease"
                    >
                      -
                    </Button>
                    <span className="w-8 text-center" data-testid="text-children-count">{children}</span>
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      onClick={() => form.setValue("children", Math.min(9, children + 1))}
                      disabled={children >= 9}
                      data-testid="button-children-increase"
                    >
                      +
                    </Button>
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">Infants in seat</p>
                    <p className="text-sm text-muted-foreground">Under 2</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      onClick={() => form.setValue("infants_in_seat", Math.max(0, infants_in_seat - 1))}
                      disabled={infants_in_seat <= 0}
                      data-testid="button-infants-seat-decrease"
                    >
                      -
                    </Button>
                    <span className="w-8 text-center" data-testid="text-infants-seat-count">{infants_in_seat}</span>
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      onClick={() => form.setValue("infants_in_seat", Math.min(9, infants_in_seat + 1))}
                      disabled={infants_in_seat >= 9}
                      data-testid="button-infants-seat-increase"
                    >
                      +
                    </Button>
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">Infants on lap</p>
                    <p className="text-sm text-muted-foreground">Under 2</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      onClick={() => form.setValue("infants_on_lap", Math.max(0, infants_on_lap - 1))}
                      disabled={infants_on_lap <= 0}
                      data-testid="button-infants-lap-decrease"
                    >
                      -
                    </Button>
                    <span className="w-8 text-center" data-testid="text-infants-lap-count">{infants_on_lap}</span>
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      onClick={() => form.setValue("infants_on_lap", Math.min(9, infants_on_lap + 1))}
                      disabled={infants_on_lap >= 9}
                      data-testid="button-infants-lap-increase"
                    >
                      +
                    </Button>
                  </div>
                </div>

                <Button
                  type="button"
                  className="w-full"
                  onClick={() => setShowPassengerDropdown(false)}
                  data-testid="button-passengers-done"
                >
                  Done
                </Button>
              </div>
            </PopoverContent>
          </Popover>

          <FormField
            control={form.control}
            name="travel_class"
            render={({ field }) => (
              <FormItem>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger data-testid="select-travel-class">
                      <SelectValue placeholder="Select class" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="1">Economy</SelectItem>
                    <SelectItem value="2">Premium Economy</SelectItem>
                    <SelectItem value="3">Business</SelectItem>
                    <SelectItem value="4">First Class</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="show_hidden"
            render={({ field }) => (
              <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                <FormControl>
                  <Checkbox
                    checked={field.value}
                    onCheckedChange={field.onChange}
                    data-testid="checkbox-show-hidden-flights"
                  />
                </FormControl>
                <div className="space-y-1 leading-none">
                  <FormLabel className="font-normal cursor-pointer">
                    Show hidden flights (may show more results)
                  </FormLabel>
                </div>
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="deep_search"
            render={({ field }) => (
              <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                <FormControl>
                  <Checkbox
                    checked={field.value}
                    onCheckedChange={field.onChange}
                    data-testid="checkbox-deep-search"
                  />
                </FormControl>
                <div className="space-y-1 leading-none">
                  <FormLabel className="font-normal cursor-pointer">
                    Deep search (more comprehensive results, may take longer)
                  </FormLabel>
                </div>
              </FormItem>
            )}
          />

          <Button
            type="submit"
            size="lg"
            className="w-full"
            disabled={isLoading}
            data-testid="button-search-flights"
          >
            <Plane className="h-4 w-4 mr-2" />
            {isLoading ? "Searching..." : "Search Flights"}
          </Button>
        </div>
      </form>
    </Form>
  );
}
