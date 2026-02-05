import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Checkbox } from "@/components/ui/checkbox";
import { Slider } from "@/components/ui/slider";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { useToast } from "@/hooks/use-toast";
import { CalendarIcon, ChevronLeft, ChevronRight, Plus, Trash2, Plane, Hotel, MapPin, Clock, DollarSign, Check, Loader2, ArrowRight, Star, FileText, Phone, Navigation, Ban, Leaf, Target, TrendingDown, Sparkles } from "lucide-react";
import tripPlannerImage from '@assets/stock_images/business_professiona_84a92345.jpg';
import { Link } from "wouter";
import { ThemeToggle } from "@/components/theme-toggle";
import { format, parseISO, addDays, differenceInMinutes } from "date-fns";
import type { FlightOption, Flight as FlightType, Layover } from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";
import { CityAutocomplete, AddressAutocomplete, AirportSelection, calculateDistance, DistanceResult } from "@/components/google-places-autocomplete";
import { SHOW_MONEY_SAVING_TIPS } from "@/config/featureFlags";

// Google Maps API Key from environment
const GOOGLE_MAPS_API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;

// Property types
const PROPERTY_TYPES = [
  { id: "12", name: "Beach hotels" },
  { id: "13", name: "Boutique hotels" },
  { id: "14", name: "Hostels" },
  { id: "15", name: "Inns" },
  { id: "16", name: "Motels" },
  { id: "17", name: "Resorts" },
  { id: "18", name: "Spa hotels" },
  { id: "19", name: "Bed and breakfasts" },
  { id: "20", name: "Other" },
  { id: "21", name: "Apartment hotels" },
];

// Amenities
const AMENITIES = [
  { id: "1", name: "Free parking" },
  { id: "3", name: "Parking" },
  { id: "4", name: "Indoor pool" },
  { id: "5", name: "Outdoor pool" },
  { id: "6", name: "Pool" },
  { id: "7", name: "Fitness center" },
  { id: "8", name: "Restaurant" },
  { id: "9", name: "Free breakfast" },
  { id: "10", name: "Spa" },
  { id: "11", name: "Beach access" },
  { id: "12", name: "Child-friendly" },
  { id: "15", name: "Bar" },
  { id: "19", name: "Pet-friendly" },
  { id: "22", name: "Room service" },
  { id: "35", name: "Free Wi-Fi" },
  { id: "40", name: "Air-conditioned" },
  { id: "53", name: "Wheelchair accessible" },
  { id: "61", name: "EV charger" },
];

// Hotel brands hierarchy (same as hotels page)
const HOTEL_BRANDS = [
  {
    id: "33",
    name: "Accor Live Limitless",
    children: [
      { id: "15", name: "Adagio" },
      { id: "8", name: "Fairmont Hotels and Resorts" },
      { id: "451", name: "Hyde" },
      { id: "21", name: "Ibis" },
      { id: "13", name: "Ibis Budget" },
      { id: "103", name: "Ibis Styles" },
      { id: "94", name: "Mama Shelter" },
      { id: "91", name: "Mercure" },
      { id: "47", name: "Novotel" },
      { id: "90", name: "Pullman Hotels and Resorts" },
      { id: "268", name: "Raffles" },
      { id: "84", name: "Sofitel" },
      { id: "374", name: "Tribe" },
    ],
  },
  {
    id: "18",
    name: "Best Western International",
    children: [
      { id: "155", name: "Best Western" },
      { id: "104", name: "Best Western Plus" },
      { id: "255", name: "Best Western Signature Collection" },
      { id: "109", name: "SureStay Collection" },
    ],
  },
  { id: "258", name: "Bvlgari", children: [] },
  {
    id: "20",
    name: "Choice Hotels",
    children: [
      { id: "27", name: "Comfort" },
      { id: "82", name: "Quality Inn" },
    ],
  },
  {
    id: "466",
    name: "Fattal Hotel Group",
    children: [
      { id: "354", name: "Leonardo Hotels" },
      { id: "467", name: "NYX hotels" },
    ],
  },
  { id: "289", name: "Four Seasons", children: [] },
  {
    id: "313",
    name: "H10 Hotels Group",
    children: [{ id: "336", name: "H10 Hotels" }],
  },
  {
    id: "28",
    name: "Hilton Honors",
    children: [
      { id: "114", name: "Canopy" },
      { id: "7", name: "Conrad" },
      { id: "151", name: "Curio Collection" },
      { id: "81", name: "DoubleTree by Hilton" },
      { id: "115", name: "Hampton by Hilton" },
      { id: "71", name: "Hilton Garden Inn" },
      { id: "54", name: "Hilton Hotels & Resorts" },
      { id: "406", name: "Spark" },
      { id: "285", name: "Tapestry Collection" },
      { id: "41", name: "Waldorf Astoria" },
    ],
  },
  {
    id: "37",
    name: "Hyatt",
    children: [
      { id: "116", name: "Andaz" },
      { id: "120", name: "Hyatt House" },
      { id: "121", name: "Hyatt Place" },
      { id: "122", name: "Hyatt Regency" },
      { id: "118", name: "Park Hyatt" },
      { id: "262", name: "Unbound Collection" },
    ],
  },
  {
    id: "202",
    name: "IHCL",
    children: [{ id: "203", name: "Taj Hotels" }],
  },
  {
    id: "17",
    name: "IHG Hotels & Resorts",
    children: [
      { id: "42", name: "Crowne Plaza" },
      { id: "64", name: "Holiday Inn" },
      { id: "56", name: "Holiday Inn Express" },
      { id: "87", name: "Hotel Indigo" },
      { id: "2", name: "InterContinental Hotels & Resorts" },
      { id: "127", name: "Kimpton Hotels & Restaurants" },
      { id: "297", name: "Regent" },
      { id: "389", name: "Six Senses" },
      { id: "43", name: "Staybridge Suites" },
      { id: "298", name: "Voco" },
    ],
  },
  { id: "332", name: "Jumeirah Hotels and Resorts", children: [] },
  {
    id: "46",
    name: "Marriott Bonvoy",
    children: [
      { id: "60", name: "Aloft Hotels" },
      { id: "59", name: "Autograph Collection" },
      { id: "86", name: "Courtyard by Marriott" },
      { id: "153", name: "Delta" },
      { id: "287", name: "Design Hotels" },
      { id: "256", name: "Edition" },
      { id: "415", name: "Four Points Flex by Sheraton" },
      { id: "26", name: "JW Marriott Hotels" },
      { id: "257", name: "Marriott Executive Apartments" },
      { id: "61", name: "Marriott Hotels & Resorts" },
      { id: "129", name: "Moxy" },
      { id: "131", name: "Renaissance Hotels" },
      { id: "75", name: "Residence Inn by Marriott" },
      { id: "12", name: "Sheraton Hotels and Resorts" },
      { id: "143", name: "The Luxury Collection" },
      { id: "137", name: "W Hotels" },
      { id: "39", name: "Westin Hotels & Resorts" },
    ],
  },
  {
    id: "174",
    name: "Melia Hotels International",
    children: [
      { id: "176", name: "ME by Melia" },
      { id: "178", name: "Melia Hotels & Resorts" },
    ],
  },
  { id: "167", name: "Motel One", children: [] },
  {
    id: "169",
    name: "NH Hotel Group",
    children: [{ id: "172", name: "NHow Hotels" }],
  },
  {
    id: "353",
    name: "OYO",
    children: [
      { id: "99", name: "OYO Rooms" },
      { id: "350", name: "OYO Townhouse" },
    ],
  },
  {
    id: "445",
    name: "Premier Inn Hotels",
    children: [
      { id: "266", name: "Hub by Premier Inn" },
      { id: "70", name: "Premier Inn" },
    ],
  },
  {
    id: "80",
    name: "Radisson Hotel Group",
    children: [
      { id: "45", name: "Park Plaza" },
      { id: "76", name: "Radisson" },
      { id: "79", name: "Radisson Blu" },
      { id: "264", name: "Radisson Collection" },
      { id: "133", name: "Radisson Red" },
    ],
  },
  {
    id: "163",
    name: "RIU Hotels & Resorts",
    children: [{ id: "164", name: "Plaza by RIU" }],
  },
  { id: "57", name: "Travelodge UK", children: [] },
  {
    id: "53",
    name: "Wyndham Hotels & Resorts",
    children: [
      { id: "19", name: "Days Inn" },
      { id: "50", name: "Ramada" },
      { id: "150", name: "Wyndham" },
    ],
  },
];

// Step 1: Meeting Information Schema
const meetingInfoSchema = z.object({
  meetings: z.array(z.object({
    city: z.string().min(1, "Meeting city is required"),
    address: z.string().min(1, "Meeting address is required"),
    airports: z.array(z.string()).min(1, "At least one airport must be selected"),
    cityData: z.any().optional(), // Enhanced place data with KG MID
    date: z.string().min(1, "Meeting date is required"),
    time: z.string().min(1, "Meeting time is required"),
    earlyArrivalDays: z.number().min(0).max(7).default(1),
  })).min(1, "At least one meeting is required"),
  returnDate: z.string().min(1, "Return date is required"),
});

// Step 2: Flight Preferences Schema
const flightPreferencesSchema = z.object({
  travelClass: z.enum(["1", "2", "3", "4"]),
  adults: z.number().min(1).max(9),
  children: z.number().min(0).max(8),
  infantsInSeat: z.number().min(0).max(8),
  infantsOnLap: z.number().min(0).max(8),
  stops: z.enum(["any", "1", "2", "3"]).optional(), // any, 1: Nonstop, 2: 1 stop, 3: 2 stops
  maxPrice: z.union([z.number().positive(), z.undefined()]).optional(),
  sortBy: z.enum(["0", "2", "3", "4", "5", "6"]).optional(), // 0: default (not sent), 2: Price, 3: Departure, etc.
  excludeAirlines: z.string().optional(),
  includeAirlines: z.string().optional(),
  bags: z.string().optional(),
  emissions: z.string().optional(),
  excludeConns: z.string().optional(),
  excludeBasic: z.boolean().optional(),
  showHidden: z.boolean().optional(),
  deepSearch: z.boolean().optional(),
  minHoursBeforeMeeting: z.number().optional(),
});

// Step 3: Hotel Preferences Schema
const hotelPreferencesSchema = z.object({
  propertyTypes: z.array(z.string()).optional(),
  amenities: z.array(z.string()).optional(),
  brands: z.array(z.string()).optional(),
  hotelClass: z.array(z.string()).optional(),
  minPrice: z.number().optional(),
  maxPrice: z.number().optional(),
  freeCancellation: z.boolean().optional(),
  ecoCertified: z.boolean().optional(),
  rating: z.number().optional(),
  bedrooms: z.number().optional(),
  bathrooms: z.number().optional(),
  specialOffers: z.boolean().optional(),
  sortBy: z.string().optional(),
});

type MeetingInfo = z.infer<typeof meetingInfoSchema>;
type FlightPreferences = z.infer<typeof flightPreferencesSchema>;
type HotelPreferences = z.infer<typeof hotelPreferencesSchema>;

interface FlightSegment {
  flight: FlightOption;
  from: string;
  to: string;
  date: string;
  fromName: string;
  toName: string;
}

interface FlightBundle {
  segments: FlightSegment[];
  totalPrice: number;
}

interface HotelSearchResult {
  properties: any[];
  search_metadata: any;
  serpapi_pagination?: {
    next_page_token?: string;
  };
}

export default function TripPlanner() {
  const [location, setLocation] = useLocation();
  const [employeeName, setEmployeeName] = useState("John Doe");
  const [companyName, setCompanyName] = useState("XNooks LLC");
  const [officeLocation, setOfficeLocation] = useState("350 S Grand Ave, Los Angeles, CA 90071");
  const [homeAirport, setHomeAirport] = useState("LAX");
  const [isSavingTrip, setIsSavingTrip] = useState(false);
  const [tripSaved, setTripSaved] = useState(false);
  const [currentStep, setCurrentStep] = useState(1);
  const [meetingInfo, setMeetingInfo] = useState<MeetingInfo | null>(null);
  const [flightPreferences, setFlightPreferences] = useState<FlightPreferences | null>(null);
  const [hotelPreferences, setHotelPreferences] = useState<HotelPreferences | null>(null);
  const [flightBundles, setFlightBundles] = useState<FlightBundle[]>([]);
  const [selectedBundle, setSelectedBundle] = useState<FlightBundle | null>(null);
  const [hotelResults, setHotelResults] = useState<{ [city: string]: HotelSearchResult }>({});
  const [selectedHotels, setSelectedHotels] = useState<{ [city: string]: any }>({});
  const [currentHotelCity, setCurrentHotelCity] = useState<string>("");
  const [isSearchingFlights, setIsSearchingFlights] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [showComprehensiveModal, setShowComprehensiveModal] = useState(false);
  const [selectedHotelForDetails, setSelectedHotelForDetails] = useState<any>(null);
  const [imageErrors, setImageErrors] = useState<Set<number>>(new Set());
  const [hotelDistances, setHotelDistances] = useState<{ [hotelKey: string]: { driving: DistanceResult | null, walking: DistanceResult | null } }>({});
  const [sortWeight, setSortWeight] = useState(50); // 0 = price only, 100 = distance only, 50 = balanced

  // Helper function to handle image errors
  const handleImageError = (imageIndex: number) => {
    setImageErrors(prev => new Set(prev).add(imageIndex));
  };

  // Helper function to reset image errors when modal opens
  const resetImageErrors = () => {
    setImageErrors(new Set());
  };
  const [expenseBreakdown, setExpenseBreakdown] = useState<any>(null);
  const [isCalculatingExpenses, setIsCalculatingExpenses] = useState(false);
  const [searchingStatus, setSearchingStatus] = useState<string>("Searching...");
  const [airlineIndex, setAirlineIndex] = useState<number>(0);
  const { toast } = useToast();

  // List of major airlines to cycle through
  const airlines = [
    "American Airlines",
    "Delta Air Lines", 
    "United Airlines",
    "Southwest Airlines",
    "JetBlue Airways",
    "Alaska Airlines",
    "Spirit Airlines",
    "Frontier Airlines",
    "Hawaiian Airlines",
    "Virgin America"
  ];

  // Cycle through airline names while searching
  useEffect(() => {
    let interval: NodeJS.Timeout;
    
    if (isSearchingFlights) {
      interval = setInterval(() => {
        setAirlineIndex((prevIndex) => {
          const nextIndex = (prevIndex + 1) % airlines.length;
          setSearchingStatus(`Searching in ${airlines[nextIndex]}...`);
          return nextIndex;
        });
      }, 1500); // Change every 1.5 seconds
    }

    return () => {
      if (interval) {
        clearInterval(interval);
      }
    };
  }, [isSearchingFlights, airlines]);

  const travelClassMap: { [key: string]: string } = {
    "1": "Economy",
    "2": "Premium Economy",
    "3": "Business",
    "4": "First Class",
  };

  // Hotel details mutation
  const hotelDetailsMutation = useMutation({
    mutationFn: async ({ propertyToken, city, checkIn, checkOut }: { propertyToken: string; city: string; checkIn: string; checkOut: string }) => {
      const response = await apiRequest("POST", "/api/hotels/details", {
        property_token: propertyToken,
        q: city,
        check_in_date: checkIn,
        check_out_date: checkOut,
        adults: 1,
        children: undefined,
      });
      return response.json();
    },
    onSuccess: (data) => {
      setSelectedHotelForDetails(data);
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: "Failed to load hotel details",
        variant: "destructive",
      });
    },
  });

  const handleViewDetails = (propertyToken: string, city: string, checkIn: string, checkOut: string) => {
    resetImageErrors(); // Reset image errors when opening modal
    hotelDetailsMutation.mutate({ propertyToken, city, checkIn, checkOut }, {
      onSuccess: () => setShowDetailsModal(true)
    });
  };

  const handleViewComprehensiveDetails = (propertyToken: string, city: string, checkIn: string, checkOut: string) => {
    resetImageErrors(); // Reset image errors when opening modal
    hotelDetailsMutation.mutate({ propertyToken, city, checkIn, checkOut }, {
      onSuccess: () => setShowComprehensiveModal(true)
    });
  };

  // Helper function to calculate hotel check-in/check-out dates
  const calculateHotelDates = (arrivalDateTime: string, departureDateTime: string, earlyArrivalDays: number = 0) => {
    const arrival = parseISO(arrivalDateTime);
    const departure = parseISO(departureDateTime);

    console.log('calculateHotelDates called with:', {
      arrivalDateTime,
      departureDateTime,
      arrivalDate: format(arrival, 'yyyy-MM-dd'),
      arrivalHour: arrival.getHours()
    });

    // Check-in date is simply the flight arrival date
    let checkInDate = arrival;
    
    // Only adjust for early morning arrivals (12 AM - 6 AM) - check-in should be previous day
    const arrivalHour = arrival.getHours();
    if (arrivalHour >= 0 && arrivalHour < 6) {
      checkInDate = addDays(arrival, -1);
      console.log('Adjusted check-in to previous day due to early morning arrival:', {
        arrivalHour,
        arrivalDate: format(arrival, 'yyyy-MM-dd'),
        checkInDate: format(checkInDate, 'yyyy-MM-dd')
      });
    }

    // Check-out is on departure date
    const checkOutDate = departure;

    const result = {
      checkIn: format(checkInDate, "yyyy-MM-dd"),
      checkOut: format(checkOutDate, "yyyy-MM-dd"),
    };

    console.log('calculateHotelDates result:', result);
    return result;
  };

  // Extract cities from selected bundle
  const getCitiesFromBundle = (bundle: FlightBundle): { city: string; arrivalDateTime: string; departureDateTime: string; meetingIndex: number }[] => {
    if (!bundle || !bundle.segments || bundle.segments.length === 0) return [];

    const cities: { city: string; arrivalDateTime: string; departureDateTime: string; meetingIndex: number }[] = [];

    // Process each segment to extract city information
    bundle.segments.forEach((segment, idx) => {
      // Get the last flight of this segment (arrival time at destination city)
      const lastFlight = segment.flight.flights[segment.flight.flights.length - 1];
      const cityName = segment.toName || segment.to;

      // Skip the final return home segment
      if (idx < bundle.segments.length - 1) {
        // Find the next segment's first flight (departure time from this city)
        const nextSegment = bundle.segments[idx + 1];
        const nextFirstFlight = nextSegment.flight.flights[0];

        cities.push({
          city: cityName,
          arrivalDateTime: lastFlight.arrival_airport.time,
          departureDateTime: nextFirstFlight.departure_airport.time,
          meetingIndex: idx, // Index corresponds to meeting index
        });
      }
    });

    return cities;
  };

  // Step 1: Meeting Information Form
  const MeetingInfoForm = () => {
    const {
      register,
      handleSubmit,
      formState: { errors },
      watch,
      setValue,
    } = useForm<MeetingInfo>({
      resolver: zodResolver(meetingInfoSchema),
      defaultValues: meetingInfo || {
        meetings: [{ city: "", address: "", airports: [], cityData: null, date: "", time: "", earlyArrivalDays: 1 }],
        returnDate: "",
      },
    });

    const meetings = watch("meetings");

    const addMeeting = () => {
      setValue("meetings", [...meetings, { city: "", address: "", airports: [], cityData: null, date: "", time: "", earlyArrivalDays: 1 }]);
    };

    const removeMeeting = (index: number) => {
      if (meetings.length > 1) {
        setValue("meetings", meetings.filter((_, i) => i !== index));
      }
    };

    const onSubmit = (data: MeetingInfo) => {
      // Validate home airport from state
      if (!homeAirport || homeAirport.trim().length === 0) {
        toast({
          title: "Home Airport Required",
          description: "Please enter your home airport in the employee info section above.",
          variant: "destructive",
        });
        return;
      }
      setMeetingInfo(data);
      setCurrentStep(2);
    };

    return (
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
        {/* Step Introduction */}
        <div className="bg-gradient-to-r from-violet-50 to-indigo-50 dark:from-violet-950/20 dark:to-indigo-950/20 rounded-xl p-6 border border-violet-200 dark:border-violet-800">
          <div className="flex items-start gap-4">
            <div className="p-3 bg-gradient-to-br from-violet-600 to-indigo-600 rounded-lg shrink-0">
              <MapPin className="h-6 w-6 text-white" />
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-semibold mb-2">Meeting Details</h3>
              <p className="text-sm text-muted-foreground">
                Add your meeting locations, dates, and times. We'll optimize flight routes and hotel stays around your schedule to minimize costs and travel time.
              </p>
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-xl font-bold flex items-center gap-2">
                <span>Your Meetings</span>
                <Badge variant="outline" className="bg-violet-50 dark:bg-violet-950/20 text-violet-700 dark:text-violet-300 border-violet-200 dark:border-violet-800">
                  {meetings.length} {meetings.length === 1 ? 'Meeting' : 'Meetings'}
                </Badge>
              </h3>
              <p className="text-sm text-muted-foreground mt-1">Build your multi-city itinerary</p>
            </div>
            <Button 
              type="button" 
              onClick={addMeeting} 
              className="bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700"
              data-testid="button-add-meeting"
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Meeting
            </Button>
          </div>

          {meetings.map((meeting, index) => (
            <Card key={index} className="border-2 border-violet-100 dark:border-violet-900/30 shadow-lg hover-elevate transition-all">
              <CardHeader className="bg-gradient-to-r from-violet-50/50 to-indigo-50/50 dark:from-violet-950/10 dark:to-indigo-950/10 border-b">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-gradient-to-br from-violet-600 to-indigo-600 rounded-lg">
                      <MapPin className="h-5 w-5 text-white" />
                    </div>
                    <div>
                      <h4 className="text-lg font-bold">Meeting {index + 1}</h4>
                      {meetings[index].city && (
                        <p className="text-sm text-muted-foreground">{meetings[index].city}</p>
                      )}
                    </div>
                  </div>
                  {meetings.length > 1 && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => removeMeeting(index)}
                      className="text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/20"
                      data-testid={`button-remove-meeting-${index}`}
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      Remove
                    </Button>
                  )}
                </div>
              </CardHeader>
              <CardContent className="pt-6 space-y-6">
                {/* Location Section */}
                <div className="space-y-4">
                  <div className="flex items-center gap-2 mb-3">
                    <div className="h-px flex-1 bg-gradient-to-r from-violet-200 to-transparent dark:from-violet-800" />
                    <span className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Location</span>
                    <div className="h-px flex-1 bg-gradient-to-l from-violet-200 to-transparent dark:from-violet-800" />
                  </div>
                  
                  <div className="grid md:grid-cols-2 gap-4">
                    <div>
                      <CityAutocomplete
                        value={meetings[index].city}
                        onChange={(city, cityData) => {
                          setValue(`meetings.${index}.city` as const, city, { shouldValidate: true, shouldDirty: true });
                          if (cityData) {
                            setValue(`meetings.${index}.cityData` as const, cityData);
                          }
                          setValue(`meetings.${index}.address` as const, "");
                          setValue(`meetings.${index}.airports` as const, []);
                        }}
                        label="Meeting City"
                        placeholder="e.g., San Francisco, CA"
                        error={errors.meetings?.[index]?.city?.message}
                        apiKey={GOOGLE_MAPS_API_KEY}
                      />
                      <p className="text-xs text-muted-foreground mt-1.5 ml-1">📍 Start typing to search cities worldwide</p>
                    </div>

                    <div>
                      <AddressAutocomplete
                        value={meetings[index].address}
                        onChange={(address, addressData) => {
                          setValue(`meetings.${index}.address` as const, address);
                        }}
                        city={meetings[index].city}
                        label="Meeting Address"
                        placeholder="e.g., 123 Business St"
                        error={errors.meetings?.[index]?.address?.message}
                        apiKey={GOOGLE_MAPS_API_KEY}
                      />
                      <p className="text-xs text-muted-foreground mt-1.5 ml-1">🏢 Exact location for hotel optimization</p>
                    </div>
                  </div>

                  <div>
                    <AirportSelection
                      selectedAirports={meetings[index].airports}
                      onChange={(airports) => {
                        setValue(`meetings.${index}.airports` as const, airports);
                      }}
                      city={meetings[index].city}
                      label="Nearby Airports"
                      error={errors.meetings?.[index]?.airports?.message}
                      apiKey={GOOGLE_MAPS_API_KEY}
                    />
                    <p className="text-xs text-muted-foreground mt-1.5 ml-1">✈️ Select all airports for best flight options</p>
                  </div>
                </div>

                {/* Schedule Section */}
                <div className="space-y-4">
                  <div className="flex items-center gap-2 mb-3">
                    <div className="h-px flex-1 bg-gradient-to-r from-indigo-200 to-transparent dark:from-indigo-800" />
                    <span className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Schedule</span>
                    <div className="h-px flex-1 bg-gradient-to-l from-indigo-200 to-transparent dark:from-indigo-800" />
                  </div>

                  <div className="grid md:grid-cols-3 gap-4">
                    <div>
                      <div className="flex items-center gap-2 mb-2">
                        <CalendarIcon className="h-4 w-4 text-violet-600" />
                        <Label htmlFor={`meetings.${index}.date`} className="font-semibold">Meeting Date</Label>
                      </div>
                      <Input
                        id={`meetings.${index}.date`}
                        type="date"
                        {...register(`meetings.${index}.date` as const)}
                        className="h-11"
                        data-testid={`input-meeting-date-${index}`}
                      />
                      {errors.meetings?.[index]?.date && (
                        <p className="text-sm text-red-500 mt-1.5">
                          {errors.meetings[index]?.date?.message}
                        </p>
                      )}
                    </div>

                    <div>
                      <div className="flex items-center gap-2 mb-2">
                        <Clock className="h-4 w-4 text-violet-600" />
                        <Label htmlFor={`meetings.${index}.time`} className="font-semibold">Meeting Time</Label>
                      </div>
                      <Input
                        id={`meetings.${index}.time`}
                        type="time"
                        {...register(`meetings.${index}.time` as const)}
                        className="h-11"
                        data-testid={`input-meeting-time-${index}`}
                      />
                      {errors.meetings?.[index]?.time && (
                        <p className="text-sm text-red-500 mt-1.5">
                          {errors.meetings[index]?.time?.message}
                        </p>
                      )}
                    </div>

                    <div>
                      <div className="flex items-center gap-2 mb-2">
                        <ArrowRight className="h-4 w-4 text-violet-600" />
                        <Label htmlFor={`meetings.${index}.earlyArrivalDays`} className="font-semibold">Buffer Days</Label>
                      </div>
                      <Input
                        id={`meetings.${index}.earlyArrivalDays`}
                        type="number"
                        min="0"
                        max="7"
                        {...register(`meetings.${index}.earlyArrivalDays` as const, { valueAsNumber: true })}
                        className="h-11"
                        placeholder="1"
                        data-testid={`input-early-arrival-${index}`}
                      />
                      <p className="text-xs text-muted-foreground mt-1.5">Days before meeting</p>
                      {errors.meetings?.[index]?.earlyArrivalDays && (
                        <p className="text-sm text-red-500 mt-1.5">
                          {errors.meetings[index]?.earlyArrivalDays?.message}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Return Date */}
        <Card className="border-2 border-indigo-100 dark:border-indigo-900/30">
          <CardHeader className="bg-gradient-to-r from-indigo-50/50 to-violet-50/50 dark:from-indigo-950/10 dark:to-violet-950/10">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-gradient-to-br from-indigo-600 to-violet-600 rounded-lg">
                <CalendarIcon className="h-5 w-5 text-white" />
              </div>
              <div>
                <CardTitle className="text-lg">Return to Home</CardTitle>
                <CardDescription>When do you want to return to your home airport?</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="max-w-md">
              <Label htmlFor="returnDate" className="font-semibold text-base mb-3 block">Return Date</Label>
              <Input
                id="returnDate"
                type="date"
                {...register("returnDate")}
                className="h-11 text-base"
                data-testid="input-return-date"
              />
              {errors.returnDate && (
                <p className="text-sm text-red-500 mt-2">{errors.returnDate.message}</p>
              )}
              <p className="text-sm text-muted-foreground mt-2">💡 Consider adding buffer time for jetlag and recovery</p>
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-end pt-4">
          <Button type="submit" size="lg" className="bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 px-8" data-testid="button-next-flight-preferences">
            Continue to Flight Preferences
            <ChevronRight className="ml-2 h-5 w-5" />
          </Button>
        </div>
      </form>
    );
  };

  // Step 2: Flight Preferences Form
  const FlightPreferencesForm = () => {
    const {
      register,
      handleSubmit,
      formState: { errors },
      watch,
      setValue,
    } = useForm<FlightPreferences>({
      resolver: zodResolver(flightPreferencesSchema),
      defaultValues: flightPreferences || {
        travelClass: "1",
        adults: 1,
        children: 0,
        infantsInSeat: 0,
        infantsOnLap: 0,
        stops: "any",
        sortBy: "0",
        excludeAirlines: "",
        includeAirlines: "",
        bags: "0",
        emissions: "",
        excludeConns: "",
        excludeBasic: false,
        showHidden: false,
        deepSearch: false,
        minHoursBeforeMeeting: 5,
      },
    });

    const onSubmit = (data: FlightPreferences) => {
      setFlightPreferences(data);
      setCurrentStep(3);
    };

    return (
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
        {/* Step Introduction */}
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/20 dark:to-indigo-950/20 rounded-xl p-6 border border-blue-200 dark:border-blue-800">
          <div className="flex items-start gap-4">
            <div className="p-3 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-lg shrink-0">
              <Plane className="h-6 w-6 text-white" />
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-semibold mb-2">Flight Preferences</h3>
              <p className="text-sm text-muted-foreground">
                Customize your flight search with travel class, passenger details, and advanced filters to find the perfect balance between cost and comfort.
              </p>
            </div>
          </div>
        </div>

        {/* Travel Class & Passengers */}
        <Card className="border-2 border-blue-100 dark:border-blue-900/30 shadow-lg">
          <CardHeader className="bg-gradient-to-r from-blue-50/50 to-indigo-50/50 dark:from-blue-950/10 dark:to-indigo-950/10">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-lg">
                <Plane className="h-5 w-5 text-white" />
              </div>
              <div>
                <CardTitle>Cabin & Passengers</CardTitle>
                <CardDescription>Select your travel class and number of travelers</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
              <div className="sm:col-span-2 lg:col-span-1">
                <Label htmlFor="travelClass" className="font-semibold text-base mb-3 block">Travel Class</Label>
                <Select
                  defaultValue={watch("travelClass")}
                  onValueChange={(value) => setValue("travelClass", value as any)}
                >
                  <SelectTrigger className="h-11" data-testid="select-travel-class">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">💺 Economy</SelectItem>
                    <SelectItem value="2">🎯 Premium Economy</SelectItem>
                    <SelectItem value="3">💼 Business Class</SelectItem>
                    <SelectItem value="4">👑 First Class</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground mt-2">Higher classes = more comfort & cost</p>
              </div>

              <div>
                <Label htmlFor="adults" className="font-semibold text-base mb-3 block">Adults</Label>
                <Input
                  id="adults"
                  type="number"
                  {...register("adults", { valueAsNumber: true })}
                  min={1}
                  max={9}
                  className="h-11"
                  data-testid="input-adults"
                />
                <p className="text-xs text-muted-foreground mt-2">Age 12+</p>
              </div>

              <div>
                <Label htmlFor="children" className="font-semibold text-base mb-3 block">Children</Label>
                <Input
                  id="children"
                  type="number"
                  {...register("children", { valueAsNumber: true })}
                  min={0}
                  max={8}
                  className="h-11"
                  data-testid="input-children"
                />
                <p className="text-xs text-muted-foreground mt-2">Age 2-11</p>
              </div>

              <div>
                <Label htmlFor="infantsInSeat" className="font-semibold text-base mb-3 block">Infants (Seat)</Label>
                <Input
                  id="infantsInSeat"
                  type="number"
                  {...register("infantsInSeat", { valueAsNumber: true })}
                  min={0}
                  max={8}
                  className="h-11"
                  data-testid="input-infants-seat"
                />
                <p className="text-xs text-muted-foreground mt-2">Under 2, own seat</p>
              </div>

              <div>
                <Label htmlFor="infantsOnLap" className="font-semibold text-base mb-3 block">Infants (Lap)</Label>
                <Input
                  id="infantsOnLap"
                  type="number"
                  {...register("infantsOnLap", { valueAsNumber: true })}
                  min={0}
                  max={8}
                  className="h-11"
                  data-testid="input-infants-lap"
                />
                <p className="text-xs text-muted-foreground mt-2">Under 2, on lap</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Search Options */}
        <Card className="border-2 border-indigo-100 dark:border-indigo-900/30 shadow-lg">
          <CardHeader className="bg-gradient-to-r from-indigo-50/50 to-violet-50/50 dark:from-indigo-950/10 dark:to-violet-950/10">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-gradient-to-br from-indigo-600 to-violet-600 rounded-lg">
                <Sparkles className="h-5 w-5 text-white" />
              </div>
              <div>
                <CardTitle>Search Enhancements</CardTitle>
                <CardDescription>Get more comprehensive results with these options</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="grid sm:grid-cols-2 gap-6">
              <div className="flex items-start space-x-3 p-4 rounded-lg border-2 border-indigo-100 dark:border-indigo-900/30 hover-elevate transition-all cursor-pointer" onClick={() => setValue("showHidden", !watch("showHidden"))}>
                <Checkbox
                  id="showHidden"
                  checked={watch("showHidden")}
                  onCheckedChange={(checked) => setValue("showHidden", !!checked)}
                  data-testid="checkbox-show-hidden"
                />
                <div className="flex-1">
                  <Label htmlFor="showHidden" className="font-semibold cursor-pointer block mb-1">
                    Show Hidden Flights
                  </Label>
                  <p className="text-sm text-muted-foreground">Include flights not shown by default for more options</p>
                </div>
              </div>
              
              <div className="flex items-start space-x-3 p-4 rounded-lg border-2 border-indigo-100 dark:border-indigo-900/30 hover-elevate transition-all cursor-pointer" onClick={() => setValue("deepSearch", !watch("deepSearch"))}>
                <Checkbox
                  id="deepSearch"
                  checked={watch("deepSearch")}
                  onCheckedChange={(checked) => setValue("deepSearch", !!checked)}
                  data-testid="checkbox-deep-search"
                />
                <div className="flex-1">
                  <Label htmlFor="deepSearch" className="font-semibold cursor-pointer block mb-1">
                    Deep Search
                  </Label>
                  <p className="text-sm text-muted-foreground">Extended search for maximum options (takes longer)</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Advanced Filters */}
        <Card className="border-2 border-violet-100 dark:border-violet-900/30 shadow-lg">
          <CardHeader className="bg-gradient-to-r from-violet-50/50 to-indigo-50/50 dark:from-violet-950/10 dark:to-indigo-950/10">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-gradient-to-br from-violet-600 to-indigo-600 rounded-lg">
                <TrendingDown className="h-5 w-5 text-white" />
              </div>
              <div>
                <CardTitle>Advanced Filters</CardTitle>
                <CardDescription>Fine-tune your search for optimal results</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="pt-6 space-y-6">
            {/* Primary Filters */}
            <div>
              <h4 className="font-semibold mb-4 flex items-center gap-2">
                <span className="h-1 w-1 rounded-full bg-violet-600" />
                Primary Filters
              </h4>
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <div>
              <Label htmlFor="sortBy">Sort By</Label>
              <Select
                defaultValue={watch("sortBy")}
                onValueChange={(value) => setValue("sortBy", value as any)}
              >
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="0">Best (Default)</SelectItem>
                  <SelectItem value="2">Price (Low to High)</SelectItem>
                  <SelectItem value="3">Departure Time</SelectItem>
                  <SelectItem value="4">Arrival Time</SelectItem>
                  <SelectItem value="5">Duration</SelectItem>
                  <SelectItem value="6">Emissions</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="stops">Stops</Label>
              <Select
                defaultValue={watch("stops")}
                onValueChange={(value) => setValue("stops", value as any)}
              >
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="any">Any number of stops</SelectItem>
                  <SelectItem value="1">Nonstop only</SelectItem>
                  <SelectItem value="2">1 stop or fewer</SelectItem>
                  <SelectItem value="3">2 stops or fewer</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="bags">Carry-on Bags</Label>
              <Select
                value={watch("bags")}
                onValueChange={(value) => setValue("bags", value)}
              >
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="0">0 Bags</SelectItem>
                  <SelectItem value="1">1 Bag</SelectItem>
                  <SelectItem value="2">2 Bags</SelectItem>
                  <SelectItem value="3">3 Bags</SelectItem>
                  <SelectItem value="4">4 Bags</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="maxPrice">
                Max Price (USD) <span className="text-muted-foreground font-normal text-xs">(Optional)</span>
              </Label>
              <Input
                id="maxPrice"
                type="number"
                {...register("maxPrice", { 
                  setValueAs: (v) => {
                    if (v === "" || v === null || v === undefined) return undefined;
                    const num = Number(v);
                    return isNaN(num) ? undefined : num;
                  }
                })}
                placeholder="Leave empty for no limit"
                className="mt-1"
              />
            </div>

            <div>
              <Label htmlFor="excludeAirlines">Exclude Airlines</Label>
              <Input
                id="excludeAirlines"
                {...register("excludeAirlines")}
                placeholder="e.g., UA,AA"
                className="mt-1"
                disabled={!!watch("includeAirlines")}
              />
            </div>

            <div>
              <Label htmlFor="includeAirlines">Include Airlines</Label>
              <Input
                id="includeAirlines"
                {...register("includeAirlines")}
                placeholder="e.g., UA,DL"
                className="mt-1"
                disabled={!!watch("excludeAirlines")}
              />
            </div>

            <div>
              <Label htmlFor="excludeConns">Exclude Connections</Label>
              <Input
                id="excludeConns"
                {...register("excludeConns")}
                placeholder="e.g., ORD,DFW"
                className="mt-1"
              />
            </div>

            <div>
              <Label htmlFor="minHoursBeforeMeeting">Min Hours Before Meeting</Label>
              <Input
                id="minHoursBeforeMeeting"
                type="number"
                step="0.5"
                min="0"
                {...register("minHoursBeforeMeeting", { valueAsNumber: true })}
                placeholder="e.g., 5"
                className="mt-1"
              />
            </div>
          </div>

          <div className="flex flex-wrap gap-4 pt-2">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="excludeBasic"
                checked={watch("excludeBasic")}
                onCheckedChange={(checked) => setValue("excludeBasic", !!checked)}
              />
              <Label htmlFor="excludeBasic" className="text-sm font-normal cursor-pointer">
                Exclude Basic Economy
              </Label>
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="emissions"
                checked={watch("emissions") === "1"}
                onCheckedChange={(checked) => setValue("emissions", checked ? "1" : "")}
              />
              <Label htmlFor="emissions" className="text-sm font-normal cursor-pointer">
                Less Emissions Only
              </Label>
            </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-between pt-4">
          <Button type="button" variant="outline" onClick={() => setCurrentStep(1)}>
            <ChevronLeft className="mr-2 h-4 w-4" />
            Back
          </Button>
          <Button type="submit">
            Next: Hotel Preferences
            <ChevronRight className="ml-2 h-4 w-4" />
          </Button>
        </div>
      </form>
    );
  };

  // Step 3: Hotel Preferences Form
  const HotelPreferencesForm = () => {
    const {
      handleSubmit,
      watch,
      setValue,
      register,
    } = useForm<HotelPreferences>({
      resolver: zodResolver(hotelPreferencesSchema),
      defaultValues: hotelPreferences || {
        propertyTypes: [],
        amenities: [],
        brands: [],
        hotelClass: [],
        freeCancellation: false,
        ecoCertified: false,
        specialOffers: false,
        sortBy: "13",
      },
    });

    const onSubmit = (data: HotelPreferences) => {
      setHotelPreferences(data);
      searchFlights();
    };

    return (
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        <ScrollArea className="h-[600px] pr-4">
          <div className="space-y-4">
            <div>
              <Label>Property Types</Label>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2 mt-2">
                {PROPERTY_TYPES.map((type) => (
                  <div key={type.id} className="flex items-center space-x-2">
                    <Checkbox
                      id={`property-${type.id}`}
                      checked={watch("propertyTypes")?.includes(type.id)}
                      onCheckedChange={(checked) => {
                        const current = watch("propertyTypes") || [];
                        if (checked) {
                          setValue("propertyTypes", [...current, type.id]);
                        } else {
                          setValue("propertyTypes", current.filter((t) => t !== type.id));
                        }
                      }}
                    />
                    <Label htmlFor={`property-${type.id}`} className="text-sm font-normal cursor-pointer">
                      {type.name}
                    </Label>
                  </div>
                ))}
              </div>
            </div>

            <Separator />

            <div>
              <Label>Amenities</Label>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2 mt-2">
                {AMENITIES.map((amenity) => (
                  <div key={amenity.id} className="flex items-center space-x-2">
                    <Checkbox
                      id={`amenity-${amenity.id}`}
                      checked={watch("amenities")?.includes(amenity.id)}
                      onCheckedChange={(checked) => {
                        const current = watch("amenities") || [];
                        if (checked) {
                          setValue("amenities", [...current, amenity.id]);
                        } else {
                          setValue("amenities", current.filter((a) => a !== amenity.id));
                        }
                      }}
                    />
                    <Label htmlFor={`amenity-${amenity.id}`} className="text-sm font-normal cursor-pointer">
                      {amenity.name}
                    </Label>
                  </div>
                ))}
              </div>
            </div>

            <Separator />

            <div>
              <Label>Hotel Brands</Label>
              <ScrollArea className="h-60 border rounded-md p-4 mt-2">
                <div className="space-y-3">
                  {HOTEL_BRANDS.map((brand) => (
                    <div key={brand.id} className="space-y-2">
                      <div className="flex items-center space-x-2">
                        <Checkbox
                          id={`brand-${brand.id}`}
                          checked={watch("brands")?.includes(brand.id)}
                          onCheckedChange={(checked) => {
                            const current = watch("brands") || [];
                            if (checked) {
                              setValue("brands", [...current, brand.id]);
                            } else {
                              setValue("brands", current.filter((b) => b !== brand.id));
                            }
                          }}
                        />
                        <Label htmlFor={`brand-${brand.id}`} className="text-sm font-medium cursor-pointer">
                          {brand.name}
                        </Label>
                      </div>

                      {brand.children && brand.children.length > 0 && (
                        <div className="ml-6 space-y-2">
                          {brand.children.map((child) => (
                            <div key={child.id} className="flex items-center space-x-2">
                              <Checkbox
                                id={`brand-${child.id}`}
                                checked={watch("brands")?.includes(child.id)}
                                onCheckedChange={(checked) => {
                                  const current = watch("brands") || [];
                                  if (checked) {
                                    setValue("brands", [...current, child.id]);
                                  } else {
                                    setValue("brands", current.filter((b) => b !== child.id));
                                  }
                                }}
                              />
                              <Label htmlFor={`brand-${child.id}`} className="text-sm font-normal cursor-pointer">
                                {child.name}
                              </Label>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </div>

            <Separator />

            <div>
              <Label>Hotel Class (Star Rating)</Label>
              <div className="flex gap-4 mt-2">
                {["2", "3", "4", "5"].map((stars) => (
                  <div key={stars} className="flex items-center space-x-2">
                    <Checkbox
                      id={`stars-${stars}`}
                      checked={watch("hotelClass")?.includes(stars)}
                      onCheckedChange={(checked) => {
                        const current = watch("hotelClass") || [];
                        if (checked) {
                          setValue("hotelClass", [...current, stars]);
                        } else {
                          setValue("hotelClass", current.filter((s) => s !== stars));
                        }
                      }}
                    />
                    <Label htmlFor={`stars-${stars}`} className="text-sm font-normal cursor-pointer">
                      {stars} Star{stars !== "1" ? "s" : ""}
                    </Label>
                  </div>
                ))}
              </div>
            </div>

            <Separator />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="minPrice">Minimum Price (per night)</Label>
                <Input
                  id="minPrice"
                  type="number"
                  value={watch("minPrice") || ""}
                  onChange={(e) => setValue("minPrice", e.target.value ? Number(e.target.value) : undefined)}
                  placeholder="e.g., 50"
                  className="mt-1"
                />
              </div>

              <div>
                <Label htmlFor="maxPrice">Maximum Price (per night)</Label>
                <Input
                  id="maxPrice"
                  type="number"
                  value={watch("maxPrice") || ""}
                  onChange={(e) => setValue("maxPrice", e.target.value ? Number(e.target.value) : undefined)}
                  placeholder="e.g., 500"
                  className="mt-1"
                />
              </div>

              <div>
                <Label htmlFor="rating">Minimum Rating</Label>
                <Input
                  id="rating"
                  type="number"
                  step="0.1"
                  min="0"
                  max="5"
                  value={watch("rating") || ""}
                  onChange={(e) => setValue("rating", e.target.value ? Number(e.target.value) : undefined)}
                  placeholder="e.g., 4.0"
                  className="mt-1"
                />
              </div>

              <div>
                <Label htmlFor="sortBy">Sort By</Label>
                <Select
                  value={watch("sortBy")}
                  onValueChange={(value) => setValue("sortBy", value)}
                >
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="13">Highest Rating</SelectItem>
                    <SelectItem value="3">Lowest Price</SelectItem>
                    <SelectItem value="17">Highest Price</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="bedrooms">Bedrooms</Label>
                <Input
                  id="bedrooms"
                  type="number"
                  min="0"
                  value={watch("bedrooms") || ""}
                  onChange={(e) => setValue("bedrooms", e.target.value ? Number(e.target.value) : undefined)}
                  placeholder="e.g., 2"
                  className="mt-1"
                />
              </div>

              <div>
                <Label htmlFor="bathrooms">Bathrooms</Label>
                <Input
                  id="bathrooms"
                  type="number"
                  min="0"
                  value={watch("bathrooms") || ""}
                  onChange={(e) => setValue("bathrooms", e.target.value ? Number(e.target.value) : undefined)}
                  placeholder="e.g., 2"
                  className="mt-1"
                />
              </div>
            </div>

            <Separator />

            <div className="space-y-2">
              <Label className="text-sm font-medium">Additional Filters</Label>
              <div className="flex flex-wrap gap-4">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="freeCancellation"
                    checked={watch("freeCancellation")}
                    onCheckedChange={(checked) => setValue("freeCancellation", !!checked)}
                  />
                  <Label htmlFor="freeCancellation" className="text-sm font-normal cursor-pointer">
                    Free Cancellation
                  </Label>
                </div>

                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="ecoCertified"
                    checked={watch("ecoCertified")}
                    onCheckedChange={(checked) => setValue("ecoCertified", !!checked)}
                  />
                  <Label htmlFor="ecoCertified" className="text-sm font-normal cursor-pointer">
                    Eco-Certified
                  </Label>
                </div>

                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="specialOffers"
                    checked={watch("specialOffers")}
                    onCheckedChange={(checked) => setValue("specialOffers", !!checked)}
                  />
                  <Label htmlFor="specialOffers" className="text-sm font-normal cursor-pointer">
                    Special Offers
                  </Label>
                </div>
              </div>
            </div>
          </div>
        </ScrollArea>

        <div className="flex justify-between pt-4">
          <Button type="button" variant="outline" onClick={() => setCurrentStep(2)}>
            <ChevronLeft className="mr-2 h-4 w-4" />
            Back
          </Button>
          <Button type="submit">
            Search Flights
            <Plane className="ml-2 h-4 w-4" />
          </Button>
        </div>
      </form>
    );
  };

  // Helper: Segment info type
  type SegmentInfo = {
    departure_id: string;
    arrival_id: string;
    date: string;
    fromName: string;
    toName: string;
  };

  // Helper: Build segment information from meeting data
  const buildSegmentInfo = (): SegmentInfo[] => {
    if (!meetingInfo) return [];

    const segments: SegmentInfo[] = [];

    // Helper function to ensure future dates while respecting meeting constraints
    const ensureFutureDate = (dateString: string, meetingDate?: string) => {
      const date = parseISO(dateString);
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      console.log('ensureFutureDate called with:', {
        dateString,
        meetingDate,
        date: format(date, 'yyyy-MM-dd'),
        today: format(today, 'yyyy-MM-dd'),
        isPast: date < today
      });

      if (date < today) {
        // If we have a meeting date, ensure the flight date is before the meeting
        if (meetingDate) {
          const meetingDateObj = parseISO(meetingDate);
          const minFlightDate = addDays(today, 1); // At least 1 day from today
          
          // If meeting is too soon (less than 1 day from today), we need to adjust
          if (meetingDateObj <= today) {
            // Meeting is in the past or today - this is invalid
            throw new Error(`Meeting date ${meetingDate} is in the past. Please select a future meeting date.`);
          }
          
          // Use the minimum of (today + 1 day) or (meeting date - 1 day)
          const maxFlightDate = addDays(meetingDateObj, -1);
          const finalFlightDate = minFlightDate < maxFlightDate ? minFlightDate : maxFlightDate;
          
          console.log('Adjusted flight date:', {
            original: dateString,
            adjusted: format(finalFlightDate, 'yyyy-MM-dd'),
            minFlightDate: format(minFlightDate, 'yyyy-MM-dd'),
            maxFlightDate: format(maxFlightDate, 'yyyy-MM-dd')
          });
          
          return format(finalFlightDate, 'yyyy-MM-dd');
        } else {
          // For return flights, just ensure it's in the future
          const futureDate = addDays(today, 1);
          console.log('Adjusted return flight date:', {
            original: dateString,
            adjusted: format(futureDate, 'yyyy-MM-dd')
          });
          return format(futureDate, 'yyyy-MM-dd');
        }
      }
      return dateString;
    };

    // First segment: Home → First Meeting (subtract meeting's early arrival days)
    const firstMeeting = meetingInfo.meetings[0];
    const firstEarlyArrivalDays = firstMeeting.earlyArrivalDays || 0;
    const firstMeetingDate = parseISO(firstMeeting.date);
    const firstFlightDate = addDays(firstMeetingDate, -firstEarlyArrivalDays);

    // Use selected airport codes for arrival
    // If multiple airports are selected, join them with commas for SerpApi
    const arrivalAirports = firstMeeting.airports && firstMeeting.airports.length > 0
      ? firstMeeting.airports.join(',')
      : (firstMeeting.cityData?.identifiers?.kgMid || firstMeeting.city);

    segments.push({
      departure_id: homeAirport,
      arrival_id: arrivalAirports,
      date: ensureFutureDate(format(firstFlightDate, 'yyyy-MM-dd'), firstMeeting.date),
      fromName: homeAirport,
      toName: firstMeeting.city,
    });

    // Middle segments: Between meetings (subtract each meeting's early arrival days)
    for (let i = 0; i < meetingInfo.meetings.length - 1; i++) {
      const currentMeeting = meetingInfo.meetings[i];
      const nextMeeting = meetingInfo.meetings[i + 1];
      const nextEarlyArrivalDays = nextMeeting.earlyArrivalDays || 0;
      const nextMeetingDate = parseISO(nextMeeting.date);
      const nextFlightDate = addDays(nextMeetingDate, -nextEarlyArrivalDays);

      // Use selected airport codes for departure and arrival
      const departureAirports = currentMeeting.airports && currentMeeting.airports.length > 0
        ? currentMeeting.airports.join(',')
        : (currentMeeting.cityData?.identifiers?.kgMid || currentMeeting.city);
      
      const arrivalAirports = nextMeeting.airports && nextMeeting.airports.length > 0
        ? nextMeeting.airports.join(',')
        : (nextMeeting.cityData?.identifiers?.kgMid || nextMeeting.city);

      segments.push({
        departure_id: departureAirports,
        arrival_id: arrivalAirports,
        date: ensureFutureDate(format(nextFlightDate, 'yyyy-MM-dd'), nextMeeting.date),
        fromName: currentMeeting.city,
        toName: nextMeeting.city,
      });
    }

    // Last segment: Last Meeting → Home
    const lastMeeting = meetingInfo.meetings[meetingInfo.meetings.length - 1];
    
    // Use selected airport codes for departure
    const departureAirports = lastMeeting.airports && lastMeeting.airports.length > 0
      ? lastMeeting.airports.join(',')
      : (lastMeeting.cityData?.identifiers?.kgMid || lastMeeting.city);

    segments.push({
      departure_id: departureAirports,
      arrival_id: homeAirport,
      date: ensureFutureDate(meetingInfo.returnDate),
      fromName: lastMeeting.city,
      toName: homeAirport,
    });

    return segments;
  };

  // Recursive function to chain through segments using departure_token
  const fetchSegmentChain = async (
    departureToken: string,
    segmentIndex: number,
    allSegmentInfo: SegmentInfo[],
    previousFlights: FlightOption[],
    baseParams: any
  ): Promise<FlightOption[][]> => {
    if (segmentIndex >= allSegmentInfo.length) {
      // Base case: all segments fetched
      return [previousFlights];
    }

    try {
      const response = await apiRequest('POST', '/api/flights/next-segment', {
        departure_token: departureToken,
        multi_city_json: JSON.stringify(allSegmentInfo.map(seg => ({
          departure_id: seg.departure_id,
          arrival_id: seg.arrival_id,
          date: seg.date
        }))),
        ...baseParams
      });

      const data = await response.json();
      const flights = [...(data.best_flights || []), ...(data.other_flights || [])];

      if (flights.length === 0) {
        return [];
      }

      // Recursively chain through next segments (limit to avoid explosion)
      const maxFlightsPerSegment = 3; // Limit branching
      const limitedFlights = flights.slice(0, maxFlightsPerSegment);
      const allChains: FlightOption[][] = [];

      for (const flight of limitedFlights) {
        const newFlightChain = [...previousFlights, flight];

        if (flight.departure_token && segmentIndex + 1 < allSegmentInfo.length) {
          // Recursively fetch next segment
          const chains = await fetchSegmentChain(
            flight.departure_token,
            segmentIndex + 1,
            allSegmentInfo,
            newFlightChain,
            baseParams
          );
          allChains.push(...chains);
        } else if (segmentIndex === allSegmentInfo.length - 1) {
          // Only add if we're at the final segment - complete chain
          allChains.push(newFlightChain);
        }
      }

      return allChains;
    } catch (error) {
      console.error(`Error fetching segment ${segmentIndex}:`, error);
      return [];
    }
  };

  // Search Flights (using token-based chaining like Meeting Flights)
  const searchFlights = async () => {
    if (!meetingInfo || !flightPreferences) return;

    setIsSearchingFlights(true);
    setCurrentStep(4);

    try {
      const allSegmentInfo = buildSegmentInfo();

      // Base parameters for all API calls
      const baseParams = {
        type: "3",
        adults: flightPreferences.adults,
        children: flightPreferences.children,
        infants_in_seat: flightPreferences.infantsInSeat,
        infants_on_lap: flightPreferences.infantsOnLap,
        travel_class: flightPreferences.travelClass,
        currency: "USD",
        hl: "en",
        stops: flightPreferences.stops === "any" ? undefined : flightPreferences.stops,
        max_price: flightPreferences.maxPrice,
        sort_by: flightPreferences.sortBy === "0" ? undefined : flightPreferences.sortBy,
        show_hidden: flightPreferences.showHidden || false,
        deep_search: flightPreferences.deepSearch || false,
        exclude_basic: flightPreferences.excludeBasic || false,
        bags: flightPreferences.bags && flightPreferences.bags !== "0" ? flightPreferences.bags : undefined,
        emissions: flightPreferences.emissions || undefined,
        exclude_airlines: flightPreferences.excludeAirlines || undefined,
        include_airlines: flightPreferences.includeAirlines || undefined,
        outbound_times: flightPreferences.excludeConns || undefined,
      };

      // Initial search for first segment
      const response = await apiRequest("POST", "/api/flights/search", {
        ...baseParams,
        multi_city_json: allSegmentInfo.map(seg => ({
          departure_id: seg.departure_id,
          arrival_id: seg.arrival_id,
          date: seg.date
        })),
      });

      const data = await response.json();
      const firstSegmentFlights = [...(data.best_flights || []), ...(data.other_flights || [])];

      if (firstSegmentFlights.length === 0) {
        toast({
          title: "No Flights Found",
          description: "No flights available for the first leg. Try adjusting your search criteria.",
          variant: "destructive",
        });
        setIsSearchingFlights(false);
        return;
      }

      // Chain through remaining segments
      const maxInitialFlights = 5; // Limit initial flights to avoid too many API calls
      const limitedFirstFlights = firstSegmentFlights.slice(0, maxInitialFlights);
      const allCompleteBundles: FlightOption[][] = [];

      for (const firstFlight of limitedFirstFlights) {
        if (allSegmentInfo.length === 1) {
          // Single segment trip (shouldn't happen for multi-city but handle it)
          allCompleteBundles.push([firstFlight]);
        } else if (firstFlight.departure_token) {
          // Multi-segment trip - chain through remaining segments
          const chains = await fetchSegmentChain(
            firstFlight.departure_token,
            1, // Start from second segment
            allSegmentInfo,
            [firstFlight],
            baseParams
          );
          allCompleteBundles.push(...chains);
        }
      }

      // Convert flight chains into bundles with segments structure
      interface FlightSegment {
        flight: FlightOption;
        from: string;
        to: string;
        date: string;
        fromName: string;
        toName: string;
      }

      interface FlightBundle {
        segments: FlightSegment[];
        totalPrice: number;
      }

      const bundles: FlightBundle[] = allCompleteBundles.map(chain => {
        const segments: FlightSegment[] = chain.map((flight, idx) => ({
          flight: flight,
          from: allSegmentInfo[idx].departure_id,
          to: allSegmentInfo[idx].arrival_id,
          date: allSegmentInfo[idx].date,
          fromName: allSegmentInfo[idx].fromName,
          toName: allSegmentInfo[idx].toName,
        }));

        // Total price is in the final segment (it includes all legs)
        const finalFlight = chain[chain.length - 1];
        const totalPrice = finalFlight?.price || 0;

        return { segments, totalPrice };
      });

      console.log("Complete flight bundles:", bundles.length);
      if (bundles.length > 0) {
        console.log("First bundle:", {
          segments: bundles[0].segments.length,
          legs: bundles[0].segments.map(s => `${s.from} -> ${s.to}`),
          totalPrice: bundles[0].totalPrice
        });
      }

      setFlightBundles(bundles as any); // Store as bundles with segments

      toast({
        title: "Flights Found!",
        description: `Found ${bundles.length} complete flight bundles for your trip`,
      });
    } catch (error) {
      console.error("Flight search error:", error);
      toast({
        title: "Search Error",
        description: "Failed to search for flights. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSearchingFlights(false);
    }
  };

  // Function to automatically search hotels for all cities in a bundle
  const searchHotelsForAllCities = async (bundle: FlightBundle) => {
    if (!hotelPreferences || !meetingInfo) return;

    const cities = getCitiesFromBundle(bundle);
    
    // Search hotels for each city in parallel
    const hotelSearchPromises = cities.map(async (city) => {
      const earlyArrivalDays = meetingInfo.meetings[city.meetingIndex]?.earlyArrivalDays || 0;
      const { checkIn, checkOut } = calculateHotelDates(
        city.arrivalDateTime,
        city.departureDateTime,
        earlyArrivalDays
      );

      try {
        const response = await fetch("/api/hotels/search", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({
            q: city.city,
            check_in_date: checkIn,
            check_out_date: checkOut,
            adults: flightPreferences?.adults || 1,
            children: flightPreferences?.children || 0,
            currency: "USD",
            // All hotel filters
            property_types: hotelPreferences.propertyTypes?.length ? hotelPreferences.propertyTypes : undefined,
            amenities: hotelPreferences.amenities?.length ? hotelPreferences.amenities : undefined,
            brands: hotelPreferences.brands?.length ? hotelPreferences.brands : undefined,
            hotel_class: hotelPreferences.hotelClass?.length ? hotelPreferences.hotelClass : undefined,
            min_price: hotelPreferences.minPrice || undefined,
            max_price: hotelPreferences.maxPrice || undefined,
            rating: hotelPreferences.rating || undefined,
            bedrooms: hotelPreferences.bedrooms || undefined,
            bathrooms: hotelPreferences.bathrooms || undefined,
            free_cancellation: hotelPreferences.freeCancellation || undefined,
            eco_certified: hotelPreferences.ecoCertified || undefined,
            special_offers: hotelPreferences.specialOffers || undefined,
            sort_by: hotelPreferences.sortBy || undefined,
          }),
        });

        const data = await response.json();
        
        // Calculate distances for each hotel to the meeting location
        if (data.properties && meetingInfo) {
          const meeting = meetingInfo.meetings.find(m => m.city === city.city);
          if (meeting?.address) {
            // Calculate distances in parallel for all hotels
            const distancePromises = data.properties.map(async (hotel: any, index: number) => {
              const hotelKey = `${city.city}-${index}`;
              const hotelLocation = hotel.gps_coordinates 
                ? `${hotel.gps_coordinates.latitude},${hotel.gps_coordinates.longitude}`
                : hotel.address || hotel.name;
              
              // Skip distance calculation if we don't have a valid location
              if (!hotelLocation || hotelLocation === hotel.name) {
                return { hotelKey, driving: null, walking: null };
              }
              
              const [driving, walking] = await Promise.all([
                calculateDistance(hotelLocation, meeting.address, GOOGLE_MAPS_API_KEY, 'DRIVING'),
                calculateDistance(hotelLocation, meeting.address, GOOGLE_MAPS_API_KEY, 'WALKING')
              ]);

              return { hotelKey, driving, walking };
            });

            const distanceResults = await Promise.all(distancePromises);
            const newDistances = { ...hotelDistances };
            distanceResults.forEach(result => {
              newDistances[result.hotelKey] = {
                driving: result.driving,
                walking: result.walking
              };
            });
            setHotelDistances(newDistances);
          }
        }

        return { city: city.city, data };
      } catch (error) {
        console.error(`Hotel search error for ${city.city}:`, error);
        return { city: city.city, data: null };
      }
    });

    // Wait for all hotel searches to complete
    const results = await Promise.all(hotelSearchPromises);
    
    // Update hotel results for all cities
    const newHotelResults = { ...hotelResults };
    results.forEach(result => {
      if (result.data) {
        newHotelResults[result.city] = result.data;
      }
    });
    setHotelResults(newHotelResults);

    // Show success toast
    const successfulSearches = results.filter(r => r.data).length;
    toast({
      title: "Hotels Found!",
      description: `Found hotels in ${successfulSearches} of ${cities.length} cities`,
    });
  };

  // Step 4: Flight Selection
  const FlightSelection = () => {
    const checkFlightSuitability = (segmentIdx: number, arrivalTimeStr: string): { isSuitable: boolean; hoursBeforeMeeting: number | null } => {
      if (!meetingInfo || !flightPreferences) return { isSuitable: true, hoursBeforeMeeting: null };

      const minHours = flightPreferences.minHoursBeforeMeeting || 0;

      // Last segment is returning home, no meeting to check
      if (segmentIdx >= meetingInfo.meetings.length) {
        return { isSuitable: true, hoursBeforeMeeting: null };
      }

      const meetingIndex = segmentIdx;
      const meeting = meetingInfo.meetings[meetingIndex];

      if (!meeting || !meeting.date || !meeting.time || !arrivalTimeStr) {
        return { isSuitable: true, hoursBeforeMeeting: null };
      }

      try {
        // Parse arrival time
        const arrivalDate = parseISO(arrivalTimeStr);

        // Parse meeting time (format: "HH:mm" in 24-hour format)
        const meetingTimeParts = meeting.time.split(':');
        if (meetingTimeParts.length !== 2) return { isSuitable: true, hoursBeforeMeeting: null };

        const meetingHour = parseInt(meetingTimeParts[0]);
        const meetingMinute = parseInt(meetingTimeParts[1]);

        // Create meeting datetime
        const meetingDate = parseISO(meeting.date);
        meetingDate.setHours(meetingHour, meetingMinute, 0, 0);

        // Calculate hours before meeting
        const hoursBeforeMeeting = differenceInMinutes(meetingDate, arrivalDate) / 60;

        // Check if arrival is before meeting and has enough buffer time
        return {
          isSuitable: hoursBeforeMeeting >= minHours,
          hoursBeforeMeeting
        };
      } catch (error) {
        console.error('Error checking flight suitability:', error);
        return { isSuitable: false, hoursBeforeMeeting: null };
      }
    };

    const checkIfFitFlight = (bundle: FlightBundle): boolean => {
      if (!meetingInfo || !flightPreferences) return true;

      // Check each segment (except the last one which is returning home)
      for (let segmentIdx = 0; segmentIdx < bundle.segments.length - 1; segmentIdx++) {
        const segment = bundle.segments[segmentIdx];
        const lastFlight = segment.flight.flights[segment.flight.flights.length - 1];
        const arrivalTimeStr = lastFlight.arrival_airport.time;

        const timeCheck = checkFlightSuitability(segmentIdx, arrivalTimeStr);
        if (!timeCheck.isSuitable) {
          return false;
        }
      }

      return true;
    };

    const formatFlightTime = (isoString: string) => {
      const date = parseISO(isoString);
      return format(date, "h:mm a");
    };

    const formatFlightDate = (isoString: string) => {
      const date = parseISO(isoString);
      return format(date, "MMM dd, yyyy");
    };

    const formatDuration = (minutes: number) => {
      const hours = Math.floor(minutes / 60);
      const mins = minutes % 60;
      return `${hours}h ${mins}m`;
    };

    return (
      <div className="space-y-6">
        {/* Results Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b">
          <div>
            <h2 className="text-3xl font-bold">Available Flight Bundles</h2>
            <p className="text-muted-foreground mt-1">
              Found {flightBundles.length} complete {flightBundles.length === 1 ? 'itinerary' : 'itineraries'} for your trip
            </p>
            {flightBundles.filter(checkIfFitFlight).length > 0 && (
              <div className="mt-2 flex items-center gap-2">
                <Check className="h-4 w-4 text-green-600" />
                <span className="text-green-600 font-medium">
                  {flightBundles.filter(checkIfFitFlight).length} {flightBundles.filter(checkIfFitFlight).length === 1 ? 'bundle fits' : 'bundles fit'} your schedule
                </span>
              </div>
            )}
          </div>
          <Button onClick={() => setCurrentStep(3)} variant="outline" size="lg">
            <ChevronLeft className="mr-2 h-4 w-4" />
            Back to Filters
          </Button>
        </div>

        {isSearchingFlights ? (
          <div className="flex flex-col items-center justify-center py-12 space-y-4">
            <div className="flex items-center">
            <Loader2 className="h-8 w-8 animate-spin" />
              <span className="ml-2 text-lg font-semibold">{searchingStatus}</span>
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            {flightBundles.map((bundle, bundleIndex) => {
              const isFit = checkIfFitFlight(bundle);
              return (
                <Card
                  key={bundleIndex}
                  className={`overflow-hidden ${isFit ? 'border-green-600 border-2' : ''} ${selectedBundle === bundle ? 'ring-2 ring-blue-500' : ''}`}
                >
                  <CardHeader className={isFit ? 'bg-green-50 dark:bg-green-950/20' : 'bg-muted/30'}>
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <div className={`flex h-10 w-10 items-center justify-center rounded-md ${isFit ? 'bg-green-600' : 'bg-primary'}`}>
                          <span className="text-lg font-bold text-white">{bundleIndex + 1}</span>
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <CardTitle className="text-xl">Flight Bundle {bundleIndex + 1}</CardTitle>
                            {isFit && (
                              <Badge className="bg-green-600 text-white hover:bg-green-700">
                                <Check className="h-3 w-3 mr-1" />
                                Fits Schedule
                              </Badge>
                            )}
                          </div>
                          <CardDescription>Complete trip itinerary</CardDescription>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-sm text-muted-foreground">Total Price</div>
                        <div className="text-2xl font-bold text-primary">
                          ${bundle.totalPrice}
                        </div>
                      </div>
                    </div>
                  </CardHeader>

                  <CardContent className="space-y-6 pt-6">
                    {/* Bundle Summary */}
                    {(() => {
                      const totalDuration = bundle.segments.reduce((sum, seg) => sum + seg.flight.total_duration, 0);
                      const totalLayoverTime = bundle.segments.reduce((sum, seg) => {
                        if (seg.flight.layovers) {
                          return sum + seg.flight.layovers.reduce((layoverSum, layover) => layoverSum + layover.duration, 0);
                        }
                        return sum;
                      }, 0);
                      const totalStops = bundle.segments.reduce((sum, seg) => {
                        return sum + (seg.flight.layovers ? seg.flight.layovers.length : 0);
                      }, 0);

                      return (
                        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/20 dark:to-indigo-950/20 rounded-lg p-4 border-2 border-blue-200 dark:border-blue-800">
                          <div className="flex items-center gap-2 mb-3">
                            <Clock className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                            <span className="text-sm font-bold text-blue-900 dark:text-blue-100">Bundle Overview</span>
                          </div>
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            <div className="bg-white dark:bg-gray-900 rounded-md p-3 border border-blue-100 dark:border-blue-800">
                              <div className="text-xs text-muted-foreground mb-1">Total Travel Time</div>
                              <div className="text-lg font-bold text-blue-600 dark:text-blue-400">{formatDuration(totalDuration)}</div>
                            </div>
                            <div className="bg-white dark:bg-gray-900 rounded-md p-3 border border-blue-100 dark:border-blue-800">
                              <div className="text-xs text-muted-foreground mb-1">Layover Time</div>
                              <div className="text-lg font-bold text-orange-600 dark:text-orange-400">{formatDuration(totalLayoverTime)}</div>
                            </div>
                            <div className="bg-white dark:bg-gray-900 rounded-md p-3 border border-blue-100 dark:border-blue-800">
                              <div className="text-xs text-muted-foreground mb-1">Total Stops</div>
                              <div className="text-lg font-bold text-purple-600 dark:text-purple-400">{totalStops}</div>
                            </div>
                            <div className="bg-white dark:bg-gray-900 rounded-md p-3 border border-blue-100 dark:border-blue-800">
                              <div className="text-xs text-muted-foreground mb-1">Flight Time</div>
                              <div className="text-lg font-bold text-green-600 dark:text-green-400">{formatDuration(totalDuration - totalLayoverTime)}</div>
                            </div>
                          </div>
                        </div>
                      );
                    })()}

                    {/* Journey Route */}
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <MapPin className="h-4 w-4 text-primary" />
                        <span className="text-sm font-semibold">Journey Route</span>
                      </div>
                      <div className="flex items-center gap-2 flex-wrap">
                        {bundle.segments.map((segment, idx) => (
                          <div key={idx} className="flex items-center gap-2">
                            {idx === 0 && (
                              <>
                                <div className="px-3 py-1 bg-primary/10 text-primary font-medium rounded-md text-sm">
                                  {segment.fromName || segment.from}
                                </div>
                                <ArrowRight className="h-4 w-4 text-primary/60" />
                              </>
                            )}
                            {idx > 0 && <ArrowRight className="h-4 w-4 text-primary/60" />}
                            <div className="px-3 py-1 bg-primary/10 text-primary font-medium rounded-md text-sm">
                              {segment.toName || segment.to}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Flight Segments */}
                    <div className="space-y-6">
                      {bundle.segments.map((segment, segmentIdx) => (
                        <div key={segmentIdx} className="space-y-3">
                          <div className="flex items-center gap-3 pb-2 border-b">
                            <div className="flex h-7 w-7 items-center justify-center rounded-md bg-primary/10">
                              <span className="text-sm font-bold text-primary">{segmentIdx + 1}</span>
                            </div>
                            <div>
                              <div className="font-semibold">Leg {segmentIdx + 1}</div>
                              <div className="text-sm text-muted-foreground">
                                {segment.fromName || segment.from} → {segment.toName || segment.to}
                              </div>
                            </div>
                          </div>

                          {/* Carbon Emissions for this Segment */}
                          {segment.flight.carbon_emissions && (
                            <div className={`rounded-lg p-3 border-2 ${
                              segment.flight.carbon_emissions.difference_percent < -10
                                ? 'bg-green-50 dark:bg-green-950/20 border-green-400 dark:border-green-700'
                                : segment.flight.carbon_emissions.difference_percent > 10
                                ? 'bg-red-50 dark:bg-red-950/20 border-red-400 dark:border-red-700'
                                : 'bg-yellow-50 dark:bg-yellow-950/20 border-yellow-400 dark:border-yellow-700'
                            }`}>
                              <div className="flex items-center justify-between flex-wrap gap-3">
                                <div className="flex items-center gap-2">
                                  <Leaf className={`h-5 w-5 ${
                                    segment.flight.carbon_emissions.difference_percent < -10
                                      ? 'text-green-600 dark:text-green-400'
                                      : segment.flight.carbon_emissions.difference_percent > 10
                                      ? 'text-red-600 dark:text-red-400'
                                      : 'text-yellow-600 dark:text-yellow-400'
                                  }`} />
                                  <div>
                                    <div className="text-sm font-bold">Carbon Emissions</div>
                                    <div className="text-xs text-muted-foreground">
                                      {segment.flight.carbon_emissions.this_flight} kg CO₂
                                    </div>
                                  </div>
                                </div>
                                <div className="flex items-center gap-3">
                                  <div className="text-center">
                                    <div className="text-xs text-muted-foreground">vs. Typical</div>
                                    <div className="text-xs font-medium">
                                      {segment.flight.carbon_emissions.typical_for_this_route} kg
                                    </div>
                                  </div>
                                  <Badge
                                    className={`text-sm font-bold px-3 py-1 ${
                                      segment.flight.carbon_emissions.difference_percent < -10
                                        ? 'bg-green-600 text-white hover:bg-green-700'
                                        : segment.flight.carbon_emissions.difference_percent > 10
                                        ? 'bg-red-600 text-white hover:bg-red-700'
                                        : 'bg-yellow-600 text-white hover:bg-yellow-700'
                                    }`}
                                  >
                                    {segment.flight.carbon_emissions.difference_percent > 0 ? '+' : ''}
                                    {segment.flight.carbon_emissions.difference_percent}%
                                  </Badge>
                                </div>
                              </div>
                            </div>
                          )}

                          {/* Segment-level Extensions */}
                          {segment.flight.extensions && segment.flight.extensions.length > 0 && (
                            <div className="bg-blue-50 dark:bg-blue-950/20 rounded-lg p-3 border border-blue-200 dark:border-blue-800">
                              <div className="text-sm font-semibold mb-2 text-blue-900 dark:text-blue-100">
                                Flight Features
                              </div>
                              <div className="flex flex-wrap gap-2">
                                {segment.flight.extensions.map((ext: string, extIdx: number) => (
                                  <Badge key={extIdx} variant="outline" className="bg-white dark:bg-gray-900 border-blue-300 dark:border-blue-700">
                                    {ext}
                                  </Badge>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Layover Information */}
                          {segment.flight.layovers && segment.flight.layovers.length > 0 && (
                            <div className="bg-orange-50 dark:bg-orange-950/20 rounded-lg p-3 border border-orange-200 dark:border-orange-800">
                              <div className="text-sm font-semibold mb-2 text-orange-900 dark:text-orange-100">
                                Layover Details ({segment.flight.layovers.length} {segment.flight.layovers.length === 1 ? 'stop' : 'stops'})
                              </div>
                              <div className="space-y-2">
                                {segment.flight.layovers.map((layover: Layover, layoverIdx: number) => (
                                  <div key={layoverIdx} className="flex items-center justify-between bg-white dark:bg-gray-900 rounded p-2 border border-orange-100 dark:border-orange-800">
                                    <div className="flex items-center gap-2">
                                      <Clock className="h-4 w-4 text-orange-600 dark:text-orange-400" />
                                      <span className="text-sm font-medium">{layover.name} ({layover.id})</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                      <span className="text-sm font-bold text-orange-600 dark:text-orange-400">
                                        {formatDuration(layover.duration)}
                                      </span>
                                      {layover.overnight && (
                                        <Badge variant="outline" className="text-xs border-orange-400 dark:border-orange-600">
                                          Overnight
                                        </Badge>
                                      )}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* All Individual Flights in this Segment */}
                          <div className="space-y-4">
                            {segment.flight.flights.map((flight: FlightType, flightIndex: number) => (
                              <div key={flightIndex} className="p-4 border rounded-lg bg-card">
                                <div className="space-y-4">
                                  {/* Flight Header with Airline Info */}
                                  <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                      {segment.flight.flights.length > 1 && (
                                        <Badge variant="outline" className="text-xs">
                                          Flight {flightIndex + 1}/{segment.flight.flights.length}
                                        </Badge>
                                      )}
                                      {flight.airline_logo && (
                                        <img
                                          src={flight.airline_logo}
                                          alt={flight.airline}
                                          className="h-8 w-8 object-contain"
                                        />
                                      )}
                                      <div>
                                        <div className="font-semibold">{flight.airline}</div>
                                        <div className="text-xs text-muted-foreground">
                                          {flight.flight_number}
                                        </div>
                                      </div>
                                    </div>
                                    <div className="flex items-center gap-2 flex-wrap">
                                      {flight.overnight && (
                                        <Badge variant="outline" className="gap-1 border-purple-400 dark:border-purple-600 text-purple-700 dark:text-purple-300">
                                          Overnight
                                        </Badge>
                                      )}
                                      {flight.often_delayed_by_over_30_min && (
                                        <Badge variant="outline" className="gap-1 border-yellow-500 dark:border-yellow-600 text-yellow-700 dark:text-yellow-300">
                                          Often Delayed
                                        </Badge>
                                      )}
                                      {(() => {
                                        const isLastFlight = flightIndex === segment.flight.flights.length - 1;
                                        const timeCheck = checkFlightSuitability(segmentIdx, flight.arrival_airport.time);
                                        return !timeCheck.isSuitable && isLastFlight && (
                                          <Badge variant="destructive" className="gap-1">
                                            <Ban className="h-3 w-3" />
                                            Not Fit
                                          </Badge>
                                        );
                                      })()}
                                    </div>
                                  </div>

                                  {/* Departure and Arrival Times */}
                                  <div className="flex items-center gap-6">
                                    <div className="flex-1">
                                      <div className="text-2xl font-bold">{flight.departure_airport.id}</div>
                                      <div className="text-lg text-muted-foreground">
                                        {formatFlightTime(flight.departure_airport.time)}
                                      </div>
                                      <div className="text-sm text-muted-foreground">
                                        {formatFlightDate(flight.departure_airport.time)}
                                      </div>
                                    </div>
                                    <div className="flex flex-col items-center gap-1">
                                      <Plane className="h-5 w-5 text-primary rotate-90" />
                                      <div className="text-xs text-muted-foreground whitespace-nowrap">
                                        {formatDuration(flight.duration)}
                                      </div>
                                    </div>
                                    <div className="flex-1 text-right">
                                      <div className="text-2xl font-bold">{flight.arrival_airport.id}</div>
                                      <div className="text-lg text-muted-foreground">
                                        {formatFlightTime(flight.arrival_airport.time)}
                                      </div>
                                      <div className="text-sm text-muted-foreground">
                                        {formatFlightDate(flight.arrival_airport.time)}
                                      </div>
                                    </div>
                                  </div>

                                  {/* Flight Details */}
                                  {(flight.airplane || flight.travel_class || flight.legroom) && (
                                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4 pt-3 border-t">
                                      {flight.airplane && (
                                        <div className="flex items-start gap-2">
                                          <div className="text-muted-foreground text-sm">Aircraft:</div>
                                          <div className="font-medium text-sm">{flight.airplane}</div>
                                        </div>
                                      )}
                                      {flight.travel_class && (
                                        <div className="flex items-start gap-2">
                                          <div className="text-muted-foreground text-sm">Class:</div>
                                          <div className="font-medium text-sm">{flight.travel_class}</div>
                                        </div>
                                      )}
                                      {flight.legroom && (
                                        <div className="flex items-start gap-2">
                                          <div className="text-muted-foreground text-sm">Legroom:</div>
                                          <div className="font-medium text-sm">{flight.legroom}</div>
                                        </div>
                                      )}
                                    </div>
                                  )}

                                  {/* Extensions (amenities, features) */}
                                  {flight.extensions && flight.extensions.length > 0 && (
                                    <div className="pt-3 border-t">
                                      <div className="text-sm font-medium mb-2">Amenities & Features</div>
                                      <div className="flex flex-wrap gap-2">
                                        {flight.extensions.map((ext: string, extIdx: number) => (
                                          <Badge key={extIdx} variant="secondary">
                                            {ext}
                                          </Badge>
                                        ))}
                                      </div>
                                    </div>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Select Bundle Button */}
                    <Button
                      onClick={async () => {
                        setSelectedBundle(bundle);
                        const cities = getCitiesFromBundle(bundle);
                        if (cities.length > 0) {
                          setCurrentHotelCity(cities[0].city);
                          setCurrentStep(5);
                          
                          // Automatically search hotels for all cities
                          await searchHotelsForAllCities(bundle);
                        }
                      }}
                      className="w-full"
                      size="lg"
                    >
                      {selectedBundle === bundle ? 'Selected - ' : ''}Select This Bundle & Continue to Hotels
                      <ChevronRight className="ml-2 h-4 w-4" />
                    </Button>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    );
  };

  // Step 5: Hotel Selection by City
  const HotelSelection = () => {
    if (!selectedBundle) return null;

    const cities = getCitiesFromBundle(selectedBundle);
    const cityIndex = cities.findIndex((c) => c.city === currentHotelCity);
    const safeCityIndex = cityIndex >= 0 ? cityIndex : 0;
    const activeHotelTab = cityIndex >= 0 ? cityIndex.toString() : "0";
    const selectedCityIndices = cities
      .map((city, idx) => (selectedHotels[city.city] ? idx : -1))
      .filter((idx) => idx >= 0);
    const maxSelectedIndex =
      selectedCityIndices.length > 0
        ? Math.max(...selectedCityIndices)
        : -1;
    const unlockedIndex = Math.min(
      cities.length - 1,
      Math.max(safeCityIndex, maxSelectedIndex + 1)
    );
    const currentCity = cities[cityIndex];
    const currentEarlyArrivalDays = currentCity && meetingInfo ? (meetingInfo.meetings[currentCity.meetingIndex]?.earlyArrivalDays || 0) : 0;

    const searchHotelsForCity = async () => {
      if (!currentCity || !hotelPreferences || !meetingInfo) return;

      const { checkIn, checkOut } = calculateHotelDates(
        currentCity.arrivalDateTime,
        currentCity.departureDateTime,
        currentEarlyArrivalDays
      );

      try {
        const response = await fetch("/api/hotels/search", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({
            q: currentCity.city,
            check_in_date: checkIn,
            check_out_date: checkOut,
            adults: flightPreferences?.adults || 1,
            children: flightPreferences?.children || 0,
            currency: "USD",
            // All hotel filters
            property_types: hotelPreferences.propertyTypes?.length ? hotelPreferences.propertyTypes : undefined,
            amenities: hotelPreferences.amenities?.length ? hotelPreferences.amenities : undefined,
            brands: hotelPreferences.brands?.length ? hotelPreferences.brands : undefined,
            hotel_class: hotelPreferences.hotelClass?.length ? hotelPreferences.hotelClass : undefined,
            min_price: hotelPreferences.minPrice || undefined,
            max_price: hotelPreferences.maxPrice || undefined,
            rating: hotelPreferences.rating || undefined,
            bedrooms: hotelPreferences.bedrooms || undefined,
            bathrooms: hotelPreferences.bathrooms || undefined,
            free_cancellation: hotelPreferences.freeCancellation || undefined,
            eco_certified: hotelPreferences.ecoCertified || undefined,
            special_offers: hotelPreferences.specialOffers || undefined,
            sort_by: hotelPreferences.sortBy || undefined,
          }),
        });

        const data = await response.json();
        setHotelResults({ ...hotelResults, [currentCity.city]: data });

        // Calculate distances for each hotel to the meeting location
        if (data.properties && meetingInfo) {
          const meeting = meetingInfo.meetings.find(m => m.city === currentCity.city);
          if (meeting?.address) {
            // Calculate distances in parallel for all hotels
            const distancePromises = data.properties.map(async (hotel: any, index: number) => {
              const hotelKey = `${currentCity.city}-${index}`;
              const hotelLocation = hotel.gps_coordinates 
                ? `${hotel.gps_coordinates.latitude},${hotel.gps_coordinates.longitude}`
                : hotel.address || hotel.name;
              
              // Skip distance calculation if we don't have a valid location
              if (!hotelLocation || hotelLocation === hotel.name) {
                return { hotelKey, driving: null, walking: null };
              }
              
              const [driving, walking] = await Promise.all([
                calculateDistance(hotelLocation, meeting.address, GOOGLE_MAPS_API_KEY, 'DRIVING'),
                calculateDistance(hotelLocation, meeting.address, GOOGLE_MAPS_API_KEY, 'WALKING')
              ]);

              return { hotelKey, driving, walking };
            });

            Promise.all(distancePromises).then(results => {
              const newDistances = { ...hotelDistances };
              results.forEach(result => {
                newDistances[result.hotelKey] = {
                  driving: result.driving,
                  walking: result.walking
                };
              });
              setHotelDistances(newDistances);
            });
          }
        }

        toast({
          title: "Hotels Found!",
          description: `Found ${data.properties?.length || 0} hotels in ${currentCity.city}`,
        });
      } catch (error) {
        console.error("Hotel search error:", error);
        toast({
          title: "Search Error",
          description: "Failed to search for hotels. Please try again.",
          variant: "destructive",
        });
      }
    };

    const handleSelectHotel = (hotel: any, cityName?: string) => {
      const targetCity = cityName || currentCity?.city;
      if (!targetCity) return;
      
      setSelectedHotels({ ...selectedHotels, [targetCity]: hotel });

      // Move to next city or final summary
      if (cityIndex < cities.length - 1) {
        setCurrentHotelCity(cities[cityIndex + 1].city);
      } else {
        setCurrentStep(6);
      }
    };

    // Smart sorting function based on price and distance
    const sortHotelsByPreference = (hotels: any[], cityName: string) => {
      if (!hotels) return [];

      return hotels.map((hotel, index) => ({ hotel, index })).sort((a, b) => {
        const aKey = `${cityName}-${a.index}`;
        const bKey = `${cityName}-${b.index}`;
        const aDistance = hotelDistances[aKey];
        const bDistance = hotelDistances[bKey];

        // Extract prices (handle string format like "$150")
        const aPriceString = a.hotel?.rate_per_night?.lowest || a.hotel?.total_rate?.lowest || "999999";
        const bPriceString = b.hotel?.rate_per_night?.lowest || b.hotel?.total_rate?.lowest || "999999";
        const aPrice = parseFloat(String(aPriceString).replace(/[^0-9.]/g, '')) || 999999;
        const bPrice = parseFloat(String(bPriceString).replace(/[^0-9.]/g, '')) || 999999;

        // Extract distances (use driving distance, fallback to walking)
        const aDistanceValue = aDistance?.driving?.distanceValue || aDistance?.walking?.distanceValue || 999999;
        const bDistanceValue = bDistance?.driving?.distanceValue || bDistance?.walking?.distanceValue || 999999;

        // Normalize values to 0-1 scale
        const maxPrice = Math.max(...hotels.map((h, i) => {
          const priceStr = h?.rate_per_night?.lowest || h?.total_rate?.lowest || "0";
          return parseFloat(String(priceStr).replace(/[^0-9.]/g, '')) || 0;
        }));
        const maxDistance = Math.max(...hotels.map((_, i) => {
          const key = `${cityName}-${i}`;
          const dist = hotelDistances[key];
          return dist?.driving?.distanceValue || dist?.walking?.distanceValue || 0;
        }));

        const aNormalizedPrice = maxPrice > 0 ? aPrice / maxPrice : 0;
        const bNormalizedPrice = maxPrice > 0 ? bPrice / maxPrice : 0;
        const aNormalizedDistance = maxDistance > 0 ? aDistanceValue / maxDistance : 0;
        const bNormalizedDistance = maxDistance > 0 ? bDistanceValue / maxDistance : 0;

        // Calculate weighted score (lower is better)
        // sortWeight: 0 = price only, 100 = distance only
        const priceWeight = (100 - sortWeight) / 100;
        const distanceWeight = sortWeight / 100;

        const aScore = (aNormalizedPrice * priceWeight) + (aNormalizedDistance * distanceWeight);
        const bScore = (bNormalizedPrice * priceWeight) + (bNormalizedDistance * distanceWeight);

        return aScore - bScore;
      }).map(item => item.hotel);
    };

    // Check if any city has hotel results
    const hasAnyHotelResults = cities.some(city => hotelResults[city.city]?.properties?.length > 0);

    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold">Select Hotels</h2>
          <Button variant="outline" onClick={() => setCurrentStep(4)}>
            <ChevronLeft className="mr-2 h-4 w-4" />
            Back to Flights
          </Button>
        </div>

        {hasAnyHotelResults ? (
          <Tabs
            value={activeHotelTab}
            onValueChange={(value) => {
              const targetIndex = Number.parseInt(value, 10);
              if (!Number.isNaN(targetIndex) && cities[targetIndex]) {
                setCurrentHotelCity(cities[targetIndex].city);
              }
            }}
            className="w-full"
          >
            <TabsList className="w-full">
              {cities.map((city, idx) => (
                <TabsTrigger
                  key={city.city}
                  value={idx.toString()}
                  disabled={idx > unlockedIndex}
                  className="flex-1"
                >
                  {city.city}
                  {selectedHotels[city.city] && <Check className="ml-2 h-4 w-4" />}
                </TabsTrigger>
              ))}
            </TabsList>

            {cities.map((city, tabIdx) => {
              const cityHotelResults = hotelResults[city.city];
              const citySortedHotels = cityHotelResults?.properties ? sortHotelsByPreference(cityHotelResults.properties, city.city) : [];
              const cityEarlyArrivalDays = meetingInfo?.meetings.find(m => m.city === city.city)?.earlyArrivalDays || 0;
              const cityHotelDates = calculateHotelDates(city.arrivalDateTime, city.departureDateTime, cityEarlyArrivalDays);
              
              return (
              <TabsContent key={city.city} value={tabIdx.toString()}>
              {/* Hotel Dates Card */}
              <Card className="mb-4">
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Check-in</p>
                      <p className="font-semibold">
                        {format(parseISO(cityHotelDates.checkIn), "MMM dd, yyyy")}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Check-out</p>
                      <p className="font-semibold">
                        {format(parseISO(cityHotelDates.checkOut), "MMM dd, yyyy")}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Hotel className="h-4 w-4" />
                      <span>Hotels for {city.city}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Smart Sorting Slider */}
              <Card className="mb-4 bg-gradient-to-r from-blue-50 to-green-50 dark:from-blue-950/30 dark:to-green-950/30">
                <CardContent className="pt-6">
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <DollarSign className="h-5 w-5 text-blue-600" />
                        <span className="text-sm font-bold">Sort Hotels:</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Navigation className="h-5 w-5 text-green-600" />
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                      <Slider
                        value={[sortWeight]}
                        onValueChange={(value) => setSortWeight(value[0])}
                        min={0}
                        max={100}
                        step={1}
                        className="w-full"
                      />
                      <div className="flex justify-between text-xs">
                        <span className={`font-semibold ${sortWeight < 30 ? 'text-blue-600 text-sm' : 'text-muted-foreground'}`}>
                          💰 Lowest Price
                        </span>
                        <span className={`font-semibold ${sortWeight >= 30 && sortWeight <= 70 ? 'text-primary text-sm' : 'text-muted-foreground'}`}>
                          ⚖️ Balanced
                        </span>
                        <span className={`font-semibold ${sortWeight > 70 ? 'text-green-600 text-sm' : 'text-muted-foreground'}`}>
                          📍 Closest
                        </span>
                      </div>
                    </div>

                    <div className="text-center">
                      <div className="inline-flex items-center gap-2 bg-white dark:bg-gray-900 px-4 py-2 rounded-full shadow-sm">
                        <span className="text-xs text-muted-foreground">Current Priority:</span>
                        <span className="font-bold text-sm">
                          {sortWeight === 0 && "💰 Cheapest Hotels"}
                          {sortWeight > 0 && sortWeight < 25 && "💰 Price Focused"}
                          {sortWeight >= 25 && sortWeight < 40 && "⚖️ Slight Price Preference"}
                          {sortWeight >= 40 && sortWeight <= 60 && "⚖️ Balanced Trade-off"}
                          {sortWeight > 60 && sortWeight <= 75 && "⚖️ Slight Distance Preference"}
                          {sortWeight > 75 && sortWeight < 100 && "📍 Distance Focused"}
                          {sortWeight === 100 && "📍 Closest Hotels"}
                        </span>
                      </div>
                    </div>

                    <div className="text-xs text-center text-muted-foreground">
                      Hotels are sorted to optimize your preference between price and proximity to meeting
                    </div>
                  </div>
                </CardContent>
              </Card>

              <ScrollArea className="h-[500px]">
                {citySortedHotels.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {citySortedHotels.map((hotel: any, displayIndex: number) => {
                    // Find original index for distance key
                    const originalIndex = cityHotelResults?.properties?.findIndex((h: any) => h.name === hotel.name) || -1;
                    return (
                    <Card
                        key={displayIndex}
                      className={`cursor-pointer transition-all hover:shadow-lg ${
                        selectedHotels[city.city]?.name === hotel.name
                          ? "ring-2 ring-primary"
                          : ""
                      }`}
                      onClick={() => handleSelectHotel(hotel, city.city)}
                    >
                      <CardContent className="p-0">
                          {/* Best Match Badge */}
                          {displayIndex === 0 && (
                            <div className="bg-gradient-to-r from-yellow-400 to-orange-400 text-white px-3 py-1 text-xs font-bold flex items-center gap-1">
                              <Star className="h-3 w-3 fill-white" />
                              BEST MATCH FOR YOUR PREFERENCES
                            </div>
                          )}
                          {displayIndex === 1 && (
                            <div className="bg-gradient-to-r from-gray-300 to-gray-400 text-white px-3 py-1 text-xs font-bold flex items-center gap-1">
                              2nd Best Match
                            </div>
                          )}
                          {displayIndex === 2 && (
                            <div className="bg-gradient-to-r from-orange-300 to-orange-400 text-white px-3 py-1 text-xs font-bold flex items-center gap-1">
                              3rd Best Match
                            </div>
                          )}
                        <div className="flex gap-4 p-6">
                            {/* Rest of hotel card - use originalIndex for distance lookup */}
                          {hotel.images && hotel.images.length > 0 && (
                            <div className="w-32 h-32 flex-shrink-0">
                              <img
                                src={hotel.images[0].thumbnail}
                                alt={hotel.name}
                                className="w-full h-full object-cover rounded-md"
                              />
                            </div>
                          )}

                          <div className="flex-1 space-y-2">
                            <div className="flex items-start justify-between gap-4">
                              <div>
                                <h3 className="text-xl font-bold">{hotel.name}</h3>
                                <div className="flex flex-wrap items-center gap-2 mt-1">
                                  {hotel.hotel_class && (
                                    <div className="flex items-center gap-1">
                                      {[...Array(5)].map((_, i) => (
                                        <Star
                                          key={i}
                                          className={`h-3.5 w-3.5 ${
                                            i < (hotel.extracted_hotel_class || 0)
                                              ? "fill-yellow-400 text-yellow-400"
                                              : "text-gray-300"
                                          }`}
                                        />
                                      ))}
                                      <span className="text-xs text-muted-foreground ml-1">{hotel.hotel_class}</span>
                                    </div>
                                  )}
                                  {hotel.type && (
                                    <Badge variant="secondary" className="text-xs">
                                      {hotel.type}
                                    </Badge>
                                  )}
                                </div>
                              </div>

                              <div className="text-right">
                                {hotel.rate_per_night && (
                                  <div className="mb-1">
                                    <div className="text-lg font-bold text-primary">
                                      {hotel.rate_per_night.lowest}
                                    </div>
                                    <div className="text-xs text-muted-foreground">per night</div>
                                  </div>
                                )}
                                {hotel.total_rate && (
                                  <div>
                                    <div className="text-sm font-medium">
                                      {hotel.total_rate.lowest}
                                    </div>
                                    <div className="text-xs text-muted-foreground">total</div>
                                  </div>
                                )}
                              </div>
                            </div>

                            {hotel.overall_rating && (
                              <div className="flex items-center gap-2">
                                <div className="flex items-center">
                                  {[...Array(5)].map((_, i) => (
                                    <Star
                                      key={i}
                                      className={`h-4 w-4 ${
                                        i < Math.floor(hotel.overall_rating)
                                          ? "fill-yellow-400 text-yellow-400"
                                          : "text-gray-300"
                                      }`}
                                    />
                                  ))}
                                </div>
                                <span className="text-sm font-medium">
                                  {hotel.overall_rating}
                                </span>
                                {hotel.reviews && (
                                  <span className="text-sm text-muted-foreground">
                                    ({hotel.reviews.toLocaleString()} reviews)
                                  </span>
                                )}
                              </div>
                            )}

                            {hotel.description && (
                              <p className="text-sm text-muted-foreground line-clamp-2">
                                {hotel.description}
                              </p>
                            )}

                            {hotel.amenities && hotel.amenities.length > 0 && (
                              <div className="flex flex-wrap gap-1">
                                {hotel.amenities.slice(0, 5).map((amenity: string, idx: number) => (
                                  <Badge key={idx} variant="outline" className="text-xs">
                                    {amenity}
                                  </Badge>
                                ))}
                                {hotel.amenities.length > 5 && (
                                  <Badge variant="outline" className="text-xs">
                                    +{hotel.amenities.length - 5} more
                                  </Badge>
                                )}
                              </div>
                            )}

                              {/* Distance to Meeting Location - Use originalIndex */}
                              {(() => {
                                const hotelKey = `${city.city}-${originalIndex}`;
                                const distance = hotelDistances[hotelKey];
                                
                                if (distance && (distance.driving || distance.walking)) {
                                return (
                                  <div className="flex flex-col gap-2 pt-2 border-t bg-gradient-to-r from-blue-50/50 to-green-50/50 dark:from-blue-950/30 dark:to-green-950/30 p-3 rounded-lg">
                                    <div className="text-sm font-bold text-foreground mb-1">
                                      📍 Distance to Meeting
                                    </div>
                                    <div className="grid grid-cols-2 gap-3">
                                      {distance.driving && (
                                        <div className="flex items-center gap-2 bg-white dark:bg-gray-900 p-2 rounded-md shadow-sm">
                                          <svg className="h-5 w-5 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                                            <path d="M8 16.5a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0zM15 16.5a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0z"/>
                                            <path d="M3 4a1 1 0 00-1 1v10a1 1 0 001 1h1.05a2.5 2.5 0 014.9 0H10a1 1 0 001-1V5a1 1 0 00-1-1H3zM14 7a1 1 0 00-1 1v6.05A2.5 2.5 0 0115.95 16H17a1 1 0 001-1v-5a1 1 0 00-.293-.707l-2-2A1 1 0 0015 7h-1z"/>
                                          </svg>
                                          <div>
                                            <div className="font-bold text-lg text-blue-600">{distance.driving.distance}</div>
                                            <div className="text-xs font-semibold text-muted-foreground">{distance.driving.duration} drive</div>
                                          </div>
                                        </div>
                                      )}
                                      {distance.walking && (
                                        <div className="flex items-center gap-2 bg-white dark:bg-gray-900 p-2 rounded-md shadow-sm">
                                          <svg className="h-5 w-5 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                                            <path d="M10.293 5.293a1 1 0 011.414 0l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414-1.414L12.586 11H5a1 1 0 110-2h7.586l-2.293-2.293a1 1 0 010-1.414z"/>
                                          </svg>
                                          <div>
                                            <div className="font-bold text-lg text-green-600">{distance.walking.distance}</div>
                                            <div className="text-xs font-semibold text-muted-foreground">{distance.walking.duration} walk</div>
                                          </div>
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                );
                              }
                              return null;
                            })()}

                            {hotel.nearby_places && hotel.nearby_places.length > 0 && (
                              <div className="flex items-center gap-1 text-sm text-muted-foreground">
                                <MapPin className="h-3 w-3" />
                                <span>{hotel.nearby_places[0].name}</span>
                              </div>
                            )}
                          </div>
                        </div>
                      </CardContent>
                      <CardFooter className="flex justify-between gap-2 pt-0 px-6 pb-6">
                        <Button
                          variant="outline"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleViewDetails(hotel.property_token, city.city, cityHotelDates.checkIn, cityHotelDates.checkOut);
                          }}
                          disabled={hotelDetailsMutation.isPending}
                        >
                          View Details & Book
                        </Button>
                        <Button
                          variant="default"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleViewComprehensiveDetails(hotel.property_token, city.city, cityHotelDates.checkIn, cityHotelDates.checkOut);
                          }}
                          disabled={hotelDetailsMutation.isPending}
                        >
                          <FileText className="h-4 w-4 mr-2" />
                          Hotel Details
                        </Button>
                      </CardFooter>
                    </Card>
                    );
                  })}
                </div>
                ) : (
                  <div className="flex flex-col items-center justify-center py-12 space-y-4">
                    <div className="flex items-center">
                      <Loader2 className="h-8 w-8 animate-spin" />
                      <span className="ml-2 text-lg font-semibold">Loading hotels for {city.city}...</span>
                    </div>
                    <p className="text-sm text-muted-foreground">Searching for the best hotels in this city</p>
                  </div>
                )}
              </ScrollArea>
            </TabsContent>
              );
            })}
          </Tabs>
        ) : (
          <div className="flex flex-col items-center justify-center py-12 space-y-4">
            <div className="flex items-center">
              <Loader2 className="h-8 w-8 animate-spin" />
              <span className="ml-2 text-lg font-semibold">Searching hotels...</span>
            </div>
            <p className="text-sm text-muted-foreground">Finding the best hotels for your trip</p>
          </div>
        )}
      </div>
    );
  };

  // Function to calculate expenses using LLM
  const calculateExpenses = async () => {
    if (!selectedBundle || !meetingInfo) return;

    setIsCalculatingExpenses(true);

    try {
      // Calculate trip duration
      const firstMeeting = meetingInfo.meetings[0];
      const startDate = parseISO(firstMeeting.date);
      const endDate = parseISO(meetingInfo.returnDate);
      const tripDuration = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));

      const cities = getCitiesFromBundle(selectedBundle);

      // Prepare flight data
      const flightData = {
        totalCost: parseFloat(String(selectedBundle.totalPrice)),
        segments: selectedBundle.segments.map(seg => ({
          from: seg.fromName || seg.from,
          to: seg.toName || seg.to,
          price: seg.flight.price,
          date: seg.date,
          airline: seg.flight.flights[0].airline
        }))
      };

      // Prepare hotel data
      const hotelData = cities.map(city => {
        const hotel = selectedHotels[city.city];
        const earlyArrivalDays = meetingInfo.meetings[city.meetingIndex]?.earlyArrivalDays || 0;
        const { checkIn, checkOut } = calculateHotelDates(
          city.arrivalDateTime,
          city.departureDateTime,
          earlyArrivalDays
        );
        const nights = Math.max(1, Math.ceil((parseISO(checkOut).getTime() - parseISO(checkIn).getTime()) / (1000 * 60 * 60 * 24)));
        const priceString = hotel?.rate_per_night?.lowest || hotel?.total_rate?.lowest || "0";
        const pricePerNight = parseFloat(String(priceString).replace(/[^0-9.]/g, '')) || 0;
        return {
          city: city.city,
          name: hotel?.name,
          nights: nights,
          pricePerNight: pricePerNight,
          totalCost: pricePerNight * nights,
          checkIn,
          checkOut
        };
      });

      // Prepare meeting data
      const meetingData = meetingInfo.meetings.map(meeting => ({
        city: meeting.city,
        date: meeting.date,
        address: meeting.address
      }));

      // Make request to expense analysis endpoint
      const response = await fetch('/api/expense-analysis', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          flights: flightData,
          hotels: hotelData,
          meetings: meetingData,
          tripDuration,
          numberOfCities: cities.length,
          travelDates: `${format(startDate, 'MMM dd, yyyy')} - ${format(endDate, 'MMM dd, yyyy')}`
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Expense API error:', response.status, errorText);
        throw new Error(`Failed to calculate expenses: ${response.status}`);
      }

      // Get response text first for debugging
      const responseText = await response.text();
      console.log('Expense API response:', responseText.substring(0, 200));
      
      // Parse JSON
      let data;
      try {
        data = JSON.parse(responseText);
      } catch (parseError) {
        console.error('JSON parse error:', parseError);
        console.error('Response text:', responseText);
        throw new Error('Invalid response format from server');
      }
      
      setExpenseBreakdown(data);
      setIsCalculatingExpenses(false);
      
      toast({
        title: "Expenses Recalculated!",
        description: "Fresh analysis completed with updated costs",
      });
    } catch (error) {
      console.error('Expense calculation error:', error);
      setIsCalculatingExpenses(false);
      toast({
        title: "Calculation Failed",
        description: error instanceof Error ? error.message : "Unknown error occurred",
        variant: "destructive",
      });
    }
  };

  // Step 6: Final Itinerary Summary
  const ItinerarySummary = () => {
    if (!selectedBundle || !meetingInfo) return null;

    const cities = getCitiesFromBundle(selectedBundle);

    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold">Your Complete Trip Itinerary</h2>
          <Button variant="outline" onClick={() => setCurrentStep(5)}>
            <ChevronLeft className="mr-2 h-4 w-4" />
            Back to Hotels
          </Button>
        </div>

        {/* Flight Summary - Detailed */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Plane className="h-5 w-5" />
              Flight Details
            </CardTitle>
            <CardDescription>
              Complete flight itinerary for your trip
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-center justify-between p-4 bg-primary/10 rounded-lg">
              <span className="font-semibold text-lg">Total Flight Cost:</span>
              <span className="text-3xl font-bold text-primary">${selectedBundle.totalPrice}</span>
            </div>
            
            {selectedBundle.segments.map((segment, segmentIdx) => (
              <div key={segmentIdx} className="space-y-4">
                <div className="flex items-center gap-2">
                  <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary text-primary-foreground font-bold">
                    {segmentIdx + 1}
                  </div>
                  <div>
                    <p className="font-bold text-lg">
                      {segment.fromName || segment.from} → {segment.toName || segment.to}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {segment.flight.flights.length === 1 ? 'Direct Flight' : `${segment.flight.flights.length} Flights with ${segment.flight.flights.length - 1} Stop${segment.flight.flights.length > 2 ? 's' : ''}`}
                    </p>
                  </div>
                  <div className="ml-auto text-right">
                    <p className="font-bold text-lg">${segment.flight.price}</p>
                    <p className="text-sm text-muted-foreground">
                      {segment.flight.total_duration && `${Math.floor(segment.flight.total_duration / 60)}h ${segment.flight.total_duration % 60}m`}
                    </p>
                  </div>
                </div>

                {/* Individual Flights in Segment */}
                <div className="ml-10 space-y-4">
                  {segment.flight.flights.map((flight: FlightType, flightIdx: number) => (
                    <div key={flightIdx}>
                      <Card className="border-l-4 border-l-primary">
                        <CardContent className="pt-4">
                          <div className="space-y-3">
                            {/* Flight Header */}
                <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <img 
                                  src={flight.airline_logo} 
                                  alt={flight.airline} 
                                  className="w-8 h-8 object-contain"
                                />
                  <div>
                                  <p className="font-semibold">{flight.airline}</p>
                                  <p className="text-sm text-muted-foreground">
                                    Flight {flight.flight_number} • {flight.airplane || 'Aircraft'}
                                  </p>
                                </div>
                              </div>
                              <Badge variant="secondary">
                                {flightPreferences && travelClassMap[flightPreferences.travelClass]}
                              </Badge>
                            </div>

                            {/* Departure & Arrival */}
                            <div className="grid grid-cols-[1fr,auto,1fr] gap-4 items-center">
                              {/* Departure */}
                              <div>
                                <p className="text-2xl font-bold">{flight.departure_airport.time}</p>
                                <p className="font-semibold">{flight.departure_airport.name}</p>
                    <p className="text-sm text-muted-foreground">
                                  {flight.departure_airport.id}
                    </p>
                                {(flight.departure_airport as any).terminal && (
                                  <p className="text-sm text-muted-foreground">
                                    Terminal {(flight.departure_airport as any).terminal}
                                  </p>
                                )}
                  </div>

                              {/* Duration */}
                              <div className="flex flex-col items-center px-4">
                                <ArrowRight className="h-5 w-5 text-muted-foreground" />
                                <p className="text-sm text-muted-foreground mt-1">
                                  {Math.floor(flight.duration / 60)}h {flight.duration % 60}m
                                </p>
                              </div>

                              {/* Arrival */}
                  <div className="text-right">
                                <p className="text-2xl font-bold">{flight.arrival_airport.time}</p>
                                <p className="font-semibold">{flight.arrival_airport.name}</p>
                                <p className="text-sm text-muted-foreground">
                                  {flight.arrival_airport.id}
                                </p>
                                {(flight.arrival_airport as any).terminal && (
                                  <p className="text-sm text-muted-foreground">
                                    Terminal {(flight.arrival_airport as any).terminal}
                                  </p>
                                )}
                  </div>
                </div>

                            {/* Additional Info */}
                            {flight.travel_class && (
                              <div className="flex items-center gap-4 text-sm text-muted-foreground pt-2 border-t">
                                <span>Travel Class: {flight.travel_class}</span>
                                {flight.legroom && <span>• Legroom: {flight.legroom}</span>}
                                {flight.extensions && flight.extensions.length > 0 && (
                                  <span>• {flight.extensions.join(', ')}</span>
                                )}
                              </div>
                            )}

                            {/* Carbon Emissions */}
                            {(flight as any).carbon_emissions && (
                              <div className="flex items-center gap-2 text-sm">
                                <Leaf className="h-4 w-4 text-green-600" />
                                <span className="text-muted-foreground">
                                  CO₂: {(flight as any).carbon_emissions.this_flight / 1000}kg
                                  {(flight as any).carbon_emissions.typical_for_this_route && 
                                    ` (${Math.round(((flight as any).carbon_emissions.this_flight / (flight as any).carbon_emissions.typical_for_this_route) * 100)}% of typical)`
                                  }
                                </span>
                              </div>
                            )}
                          </div>
                        </CardContent>
                      </Card>

                      {/* Layover Information */}
                      {flightIdx < segment.flight.flights.length - 1 && segment.flight.layovers && segment.flight.layovers[flightIdx] && (
                        <div className="flex items-center gap-2 my-2 ml-4">
                          <Clock className="h-4 w-4 text-muted-foreground" />
                          <span className="text-sm text-muted-foreground">
                            Layover: {Math.floor((segment.flight.layovers[flightIdx] as Layover).duration / 60)}h {(segment.flight.layovers[flightIdx] as Layover).duration % 60}m at {(segment.flight.layovers[flightIdx] as Layover).name}
                            {(segment.flight.layovers[flightIdx] as Layover).overnight && ' (Overnight)'}
                          </span>
                        </div>
                      )}
                    </div>
                  ))}
                </div>

                {segmentIdx < selectedBundle.segments.length - 1 && <Separator className="my-6" />}
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Hotel Summary - Detailed */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Hotel className="h-5 w-5" />
              Hotel Reservations
            </CardTitle>
            <CardDescription>
              Your accommodations for each city
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {cities.map((city, index) => {
              const hotel = selectedHotels[city.city];
              const earlyArrivalDays = meetingInfo?.meetings[city.meetingIndex]?.earlyArrivalDays || 0;
              const { checkIn, checkOut } = calculateHotelDates(
                city.arrivalDateTime,
                city.departureDateTime,
                earlyArrivalDays
              );
              
              const nights = Math.max(1, Math.ceil((parseISO(checkOut).getTime() - parseISO(checkIn).getTime()) / (1000 * 60 * 60 * 24)));
              // Extract numeric value from price string (e.g., "$150" -> 150)
              const priceString = hotel?.rate_per_night?.lowest || hotel?.total_rate?.lowest || "0";
              const pricePerNight = parseFloat(String(priceString).replace(/[^0-9.]/g, '')) || 0;
              const totalHotelCost = pricePerNight * nights;

              return (
                <div key={index}>
                  {hotel ? (
                    <Card className="border-l-4 border-l-blue-500">
                      <CardContent className="pt-6">
                        <div className="space-y-4">
                          {/* Hotel Header */}
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-2">
                                <div className="flex items-center justify-center w-6 h-6 rounded-full bg-blue-500 text-white text-sm font-bold">
                                  {index + 1}
                                </div>
                                <h3 className="font-bold text-lg">{city.city}</h3>
                              </div>
                              <p className="text-xl font-semibold">{hotel.name}</p>
                              {hotel.images && hotel.images.length > 0 && (
                                <img 
                                  src={hotel.images[0]} 
                                  alt={hotel.name}
                                  className="w-full h-48 object-cover rounded-lg my-3"
                                />
                              )}
                            </div>
                          </div>

                          {/* Rating */}
                          {hotel.overall_rating && (
                            <div className="flex items-center gap-2">
                              <div className="flex items-center">
                                {[...Array(5)].map((_, i) => (
                                  <Star
                                    key={i}
                                    className={`h-4 w-4 ${
                                      i < Math.floor(hotel.overall_rating || 0)
                                        ? 'fill-yellow-400 text-yellow-400'
                                        : 'text-gray-300'
                                    }`}
                                  />
                                ))}
                              </div>
                              <span className="font-semibold">{hotel.overall_rating}</span>
                              {hotel.reviews && (
                                <span className="text-sm text-muted-foreground">
                                  ({hotel.reviews.toLocaleString()} reviews)
                                </span>
                              )}
                            </div>
                          )}

                          {/* Hotel Type and Amenities */}
                          {hotel.type && (
                            <div className="flex items-center gap-2">
                              <Badge variant="outline">{hotel.type}</Badge>
                              {hotel.hotel_class && (
                                <Badge variant="outline">{hotel.hotel_class}-star hotel</Badge>
                              )}
                            </div>
                          )}

                          {/* Amenities */}
                          {hotel.amenities && hotel.amenities.length > 0 && (
                  <div className="space-y-2">
                              <p className="text-sm font-semibold">Amenities:</p>
                              <div className="flex flex-wrap gap-2">
                                {hotel.amenities.slice(0, 6).map((amenity: string, idx: number) => (
                                  <Badge key={idx} variant="secondary" className="text-xs">
                                    {amenity}
                                  </Badge>
                                ))}
                                {hotel.amenities.length > 6 && (
                                  <Badge variant="secondary" className="text-xs">
                                    +{hotel.amenities.length - 6} more
                                  </Badge>
                                )}
                              </div>
                            </div>
                          )}

                          {/* Check-in/out and Pricing */}
                          <Separator />
                          <div className="grid grid-cols-2 gap-4">
                      <div>
                              <p className="text-sm text-muted-foreground">Check-in</p>
                              <p className="font-semibold">{format(parseISO(checkIn), "MMM dd, yyyy")}</p>
                      </div>
                            <div>
                              <p className="text-sm text-muted-foreground">Check-out</p>
                              <p className="font-semibold">{format(parseISO(checkOut), "MMM dd, yyyy")}</p>
                            </div>
                          </div>

                          <div className="flex items-center justify-between p-3 bg-blue-50 dark:bg-blue-950 rounded-lg">
                            <div>
                              <p className="text-sm text-muted-foreground">{nights} night{nights !== 1 ? 's' : ''}</p>
                              <p className="text-lg font-bold">${pricePerNight.toFixed(2)}/night</p>
                            </div>
                            <div className="text-right">
                              <p className="text-sm text-muted-foreground">Total</p>
                              <p className="text-2xl font-bold text-blue-600">${totalHotelCost.toFixed(2)}</p>
                            </div>
                          </div>

                          {/* Location */}
                          {hotel.gps_coordinates && (
                            <div className="flex items-start gap-2 text-sm">
                              <Navigation className="h-4 w-4 text-muted-foreground mt-0.5" />
                              <div>
                                <p className="font-semibold">Location</p>
                                {hotel.neighborhood && (
                                  <p className="text-muted-foreground">{hotel.neighborhood}</p>
                                )}
                                {hotel.link && (
                                  <a 
                                    href={hotel.link} 
                                    target="_blank" 
                                    rel="noopener noreferrer"
                                    className="text-primary hover:underline"
                                  >
                                    View on map →
                                  </a>
                      )}
                    </div>
                            </div>
                          )}

                          {/* Description */}
                          {hotel.description && (
                            <div className="text-sm text-muted-foreground">
                              <p className="font-semibold text-foreground mb-1">About</p>
                              <p className="line-clamp-3">{hotel.description}</p>
                            </div>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  ) : (
                    <Card className="border-l-4 border-l-gray-300">
                      <CardContent className="pt-6">
                        <div className="flex items-center gap-2 mb-2">
                          <div className="flex items-center justify-center w-6 h-6 rounded-full bg-gray-300 text-white text-sm font-bold">
                            {index + 1}
                          </div>
                          <h3 className="font-bold text-lg">{city.city}</h3>
                        </div>
                        <p className="text-muted-foreground">No hotel selected</p>
                        <div className="flex items-center gap-4 text-sm text-muted-foreground mt-2">
                      <span>Check-in: {format(parseISO(checkIn), "MMM dd, yyyy")}</span>
                      <span>Check-out: {format(parseISO(checkOut), "MMM dd, yyyy")}</span>
                    </div>
                      </CardContent>
                    </Card>
                  )}
                  {index < cities.length - 1 && <Separator className="my-6" />}
                </div>
              );
            })}

            {/* Total Hotel Cost */}
            <div className="flex items-center justify-between p-4 bg-blue-50 dark:bg-blue-950 rounded-lg mt-6">
              <span className="font-semibold text-lg">Total Hotel Cost:</span>
              <span className="text-3xl font-bold text-blue-600">
                ${cities.reduce((total, city) => {
                  const hotel = selectedHotels[city.city];
                  const earlyArrivalDays = meetingInfo?.meetings[city.meetingIndex]?.earlyArrivalDays || 0;
                  const { checkIn, checkOut } = calculateHotelDates(
                    city.arrivalDateTime,
                    city.departureDateTime,
                    earlyArrivalDays
                  );
                  const nights = Math.max(1, Math.ceil((parseISO(checkOut).getTime() - parseISO(checkIn).getTime()) / (1000 * 60 * 60 * 24)));
                  const priceString = hotel?.rate_per_night?.lowest || hotel?.total_rate?.lowest || "0";
                  const pricePerNight = parseFloat(String(priceString).replace(/[^0-9.]/g, '')) || 0;
                  return total + (pricePerNight * nights);
                }, 0).toFixed(2)}
              </span>
            </div>
          </CardContent>
        </Card>

        {/* Meeting Schedule - Detailed */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MapPin className="h-5 w-5" />
              Meeting Schedule
            </CardTitle>
            <CardDescription>
              Your complete meeting itinerary
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {meetingInfo.meetings.map((meeting, index) => (
              <div key={index}>
                <Card className="border-l-4 border-l-green-500">
                  <CardContent className="pt-4">
                    <div className="space-y-3">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <div className="flex items-center justify-center w-6 h-6 rounded-full bg-green-500 text-white text-sm font-bold">
                              {index + 1}
                            </div>
                            <h3 className="font-bold text-lg">Meeting {index + 1}</h3>
                          </div>
                          <p className="text-xl font-semibold">{meeting.city}</p>
                  </div>
                  <div className="text-right">
                          <p className="font-bold text-lg">
                      {format(parseISO(meeting.date), "MMM dd, yyyy")}
                    </p>
                          <p className="text-muted-foreground">{meeting.time}</p>
                  </div>
                </div>

                      <Separator />

                      {/* Meeting Address */}
                      <div className="flex items-start gap-2">
                        <Navigation className="h-4 w-4 text-muted-foreground mt-1" />
                        <div>
                          <p className="text-sm font-semibold">Address</p>
                          <p className="text-sm text-muted-foreground">{meeting.address}</p>
              </div>
                      </div>

                      {/* Nearby Airports */}
                      {meeting.airports && meeting.airports.length > 0 && (
                        <div className="flex items-start gap-2">
                          <Plane className="h-4 w-4 text-muted-foreground mt-1" />
                          <div>
                            <p className="text-sm font-semibold">Nearby Airports</p>
                            <div className="flex flex-wrap gap-1 mt-1">
                              {meeting.airports.map((airport: string, idx: number) => (
                                <Badge key={idx} variant="outline" className="text-xs">
                                  {airport}
                                </Badge>
                              ))}
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Early Arrival */}
                      {meeting.earlyArrivalDays > 0 && (
                        <div className="flex items-center gap-2 text-sm">
                          <Clock className="h-4 w-4 text-blue-600" />
                          <span className="text-blue-600 font-medium">
                            Arriving {meeting.earlyArrivalDays} day{meeting.earlyArrivalDays !== 1 ? 's' : ''} early
                          </span>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
                {index < meetingInfo.meetings.length - 1 && <div className="h-4" />}
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Trip Summary - Grand Total */}
        <Card className="border-2 border-primary">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <DollarSign className="h-5 w-5" />
              Trip Summary
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3">
              <div className="flex items-center justify-between text-lg">
                <span className="flex items-center gap-2">
                  <Plane className="h-5 w-5 text-muted-foreground" />
                  <span>Total Flights</span>
                </span>
                <span className="font-semibold">${selectedBundle.totalPrice}</span>
              </div>
              <div className="flex items-center justify-between text-lg">
                <span className="flex items-center gap-2">
                  <Hotel className="h-5 w-5 text-muted-foreground" />
                  <span>Total Hotels</span>
                </span>
                <span className="font-semibold">
                  ${cities.reduce((total, city) => {
                    const hotel = selectedHotels[city.city];
                    const earlyArrivalDays = meetingInfo?.meetings[city.meetingIndex]?.earlyArrivalDays || 0;
                    const { checkIn, checkOut } = calculateHotelDates(
                      city.arrivalDateTime,
                      city.departureDateTime,
                      earlyArrivalDays
                    );
                    const nights = Math.max(1, Math.ceil((parseISO(checkOut).getTime() - parseISO(checkIn).getTime()) / (1000 * 60 * 60 * 24)));
                    const priceString = hotel?.rate_per_night?.lowest || hotel?.total_rate?.lowest || "0";
                    const pricePerNight = parseFloat(String(priceString).replace(/[^0-9.]/g, '')) || 0;
                    return total + (pricePerNight * nights);
                  }, 0).toFixed(2)}
                </span>
              </div>
              <Separator />
              <div className="flex items-center justify-between p-4 bg-primary/10 rounded-lg">
                <span className="text-xl font-bold">Grand Total</span>
                <span className="text-3xl font-bold text-primary">
                  ${(parseFloat(String(selectedBundle.totalPrice)) + cities.reduce((total, city) => {
                    const hotel = selectedHotels[city.city];
                    const earlyArrivalDays = meetingInfo?.meetings[city.meetingIndex]?.earlyArrivalDays || 0;
                    const { checkIn, checkOut } = calculateHotelDates(
                      city.arrivalDateTime,
                      city.departureDateTime,
                      earlyArrivalDays
                    );
                    const nights = Math.max(1, Math.ceil((parseISO(checkOut).getTime() - parseISO(checkIn).getTime()) / (1000 * 60 * 60 * 24)));
                    const priceString = hotel?.rate_per_night?.lowest || hotel?.total_rate?.lowest || "0";
                    const pricePerNight = parseFloat(String(priceString).replace(/[^0-9.]/g, '')) || 0;
                    return total + (pricePerNight * nights);
                  }, 0)).toFixed(2)}
                </span>
              </div>
            </div>

            {/* Trip Stats */}
            <div className="grid grid-cols-3 gap-4 pt-4 border-t">
              <div className="text-center">
                <p className="text-2xl font-bold text-primary">{meetingInfo.meetings.length}</p>
                <p className="text-sm text-muted-foreground">Meeting{meetingInfo.meetings.length !== 1 ? 's' : ''}</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-primary">{selectedBundle.segments.length}</p>
                <p className="text-sm text-muted-foreground">Flight Leg{selectedBundle.segments.length !== 1 ? 's' : ''}</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-primary">{cities.length}</p>
                <p className="text-sm text-muted-foreground">Cit{cities.length !== 1 ? 'ies' : 'y'}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Professional Expense Breakdown */}
        <Card className="border-2 border-primary/20">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <DollarSign className="h-6 w-6 text-primary" />
              <span>Complete Expense Breakdown</span>
            </CardTitle>
            <CardDescription>
              Comprehensive budget estimate for your business trip
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {!expenseBreakdown ? (
              <div className="text-center py-8">
                <Button 
                  size="lg"
                  onClick={calculateExpenses}
                  disabled={isCalculatingExpenses}
                  className="px-8"
                >
                  {isCalculatingExpenses ? (
                    <>
                      <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                      Calculating...
                    </>
                  ) : (
                    <>
                      <DollarSign className="mr-2 h-5 w-5" />
                      Calculate Full Expense Budget
                    </>
                  )}
                </Button>
                <p className="text-sm text-muted-foreground mt-4">
                  Get a detailed breakdown including meals, transportation, and all travel expenses
                </p>
              </div>
            ) : (
              <div className="space-y-6">
                {/* Expense Categories */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Flights */}
                  <Card className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-950/50 dark:to-blue-900/50 border-blue-200 dark:border-blue-800">
                    <CardContent className="pt-6">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <Plane className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                          <span className="font-semibold">Flights</span>
                        </div>
                        <span className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                          ${expenseBreakdown.breakdown.flights.toFixed(2)}
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground">All flight segments included</p>
                    </CardContent>
                  </Card>

                  {/* Hotels */}
                  <Card className="bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-950/50 dark:to-purple-900/50 border-purple-200 dark:border-purple-800">
                    <CardContent className="pt-6">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <Hotel className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                          <span className="font-semibold">Hotels</span>
                        </div>
                        <span className="text-2xl font-bold text-purple-600 dark:text-purple-400">
                          ${expenseBreakdown.breakdown.hotels.toFixed(2)}
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {expenseBreakdown.tripInfo.duration} nights total
                      </p>
                    </CardContent>
                  </Card>

                  {/* Meals */}
                  <Card className="bg-gradient-to-br from-green-50 to-green-100 dark:from-green-950/50 dark:to-green-900/50 border-green-200 dark:border-green-800">
                    <CardContent className="pt-6">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <svg className="h-5 w-5 text-green-600 dark:text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                          </svg>
                          <span className="font-semibold">Meals</span>
                        </div>
                        <span className="text-2xl font-bold text-green-600 dark:text-green-400">
                          ${expenseBreakdown.breakdown.meals.total.toFixed(2)}
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        ${expenseBreakdown.breakdown.meals.perDay}/day • Breakfast, Lunch, Dinner
                        {expenseBreakdown.mealCosts?.currency && ` • ${expenseBreakdown.mealCosts.currency}`}
                      </p>
                    </CardContent>
                  </Card>

                  {/* Transportation */}
                  <Card className="bg-gradient-to-br from-orange-50 to-orange-100 dark:from-orange-950/50 dark:to-orange-900/50 border-orange-200 dark:border-orange-800">
                    <CardContent className="pt-6">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <svg className="h-5 w-5 text-orange-600 dark:text-orange-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                          </svg>
                          <span className="font-semibold">Transportation</span>
                        </div>
                        <span className="text-2xl font-bold text-orange-600 dark:text-orange-400">
                          ${expenseBreakdown.breakdown.transportation.total.toFixed(2)}
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Airport transfers & local transport
                        {expenseBreakdown.transportationCosts?.currency && ` • ${expenseBreakdown.transportationCosts.currency}`}
                      </p>
                    </CardContent>
                  </Card>
                </div>

                {/* Additional Expenses */}
                <Card>
                  <CardContent className="pt-6">
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">Miscellaneous (Tips, WiFi, etc.)</span>
                        <span className="font-semibold">${expenseBreakdown.breakdown.miscellaneous.total.toFixed(2)}</span>
                      </div>
                      <Separator />
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">Contingency ({expenseBreakdown.breakdown.contingency.percentage}%)</span>
                        <span className="font-semibold">${expenseBreakdown.breakdown.contingency.amount.toFixed(2)}</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Grand Total */}
                <Card className="bg-gradient-to-r from-primary/10 to-primary/5 border-primary/20">
                  <CardContent className="pt-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-muted-foreground mb-1">Total Estimated Budget</p>
                        <p className="text-xs text-muted-foreground">
                          {expenseBreakdown.tripInfo.dates}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-4xl font-bold text-primary">
                          ${expenseBreakdown.totals.grandTotal.toFixed(2)}
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">
                          ${expenseBreakdown.perDiem.total}/day per diem
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Public Transportation Information */}
                {expenseBreakdown.publicTransportation && Object.keys(expenseBreakdown.publicTransportation.perCity || {}).length > 0 && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Navigation className="h-5 w-5" />
                        Public Transportation Guide
                      </CardTitle>
                      <CardDescription>
                        How to get from airport to hotel using public transit
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {Object.entries(expenseBreakdown.publicTransportation.perCity).map(([city, transport]: [string, any]) => (
                        <div key={city} className="border rounded-lg p-4">
                          <h4 className="font-semibold text-lg mb-3 flex items-center gap-2">
                            <MapPin className="h-4 w-4" />
                            {city}
                          </h4>
                          {transport.airportToHotel && (
                            <div className="space-y-3">
                              <div className="flex items-center gap-2">
                                <span className="font-medium">Method:</span>
                                <Badge variant="outline">{transport.airportToHotel.method}</Badge>
                              </div>
                              <div className="grid grid-cols-2 gap-4 text-sm">
                                <div>
                                  <span className="font-medium">Duration:</span> {transport.airportToHotel.duration}
                                </div>
                                <div>
                                  <span className="font-medium">Cost:</span> {transport.airportToHotel.cost} {transport.airportToHotel.currency || 'USD'}
                                </div>
                                <div>
                                  <span className="font-medium">Frequency:</span> {transport.airportToHotel.frequency}
                                </div>
                                <div>
                                  <span className="font-medium">Hours:</span> {transport.airportToHotel.operatingHours}
                                </div>
                              </div>
                              <div className="mt-3 p-3 bg-muted rounded-lg">
                                <span className="font-medium">Instructions:</span>
                                <p className="text-sm mt-1">{transport.airportToHotel.instructions}</p>
                              </div>
                            </div>
                          )}
                        </div>
                      ))}
                    </CardContent>
                  </Card>
                )}

                {/* Exchange Rate Impact */}
                {expenseBreakdown.exchangeRateImpact && expenseBreakdown.exchangeRateImpact.isInternational && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <DollarSign className="h-5 w-5" />
                        Exchange Rate Impact
                      </CardTitle>
                      <CardDescription>
                        Currency considerations for international travel
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">Currencies:</span>
                        <div className="flex gap-2">
                          {expenseBreakdown.exchangeRateImpact.currencies.map((currency: string) => (
                            <Badge key={currency} variant="secondary">{currency}</Badge>
                          ))}
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        {Object.entries(expenseBreakdown.exchangeRateImpact.currentRates || {}).map(([pair, rate]: [string, any]) => (
                          <div key={pair} className="text-sm">
                            <span className="font-medium">{pair}:</span> {rate}
                          </div>
                        ))}
                      </div>
                      <div className="p-3 bg-blue-50 dark:bg-blue-950/30 rounded-lg">
                        <span className="font-medium">Impact:</span>
                        <p className="text-sm mt-1">{expenseBreakdown.exchangeRateImpact.impact}</p>
                      </div>
                      <div className="p-3 bg-green-50 dark:bg-green-950/30 rounded-lg">
                        <span className="font-medium">Recommendation:</span>
                        <p className="text-sm mt-1">{expenseBreakdown.exchangeRateImpact.recommendation}</p>
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Flight Risk Assessment */}
                {expenseBreakdown.flightRiskAssessment && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Target className="h-5 w-5" />
                        Professional Flight Risk Assessment
                      </CardTitle>
                      <CardDescription>
                        Comprehensive risk analysis for reaching your meetings on time
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                      {/* Overall Meeting Risk */}
                      <div className="p-4 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/30 dark:to-indigo-950/30 rounded-lg border">
                        <div className="flex items-center justify-between mb-2">
                          <span className="font-semibold text-lg">Overall Meeting Risk</span>
                          <div className="flex items-center gap-2">
                            <span className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                              {expenseBreakdown.flightRiskAssessment.overallMeetingRisk || 0}%
                            </span>
                            <Badge 
                              variant={expenseBreakdown.flightRiskAssessment.overallRiskLevel === 'Low' ? 'default' : 
                                     expenseBreakdown.flightRiskAssessment.overallRiskLevel === 'Medium' ? 'secondary' : 'destructive'}
                            >
                              {expenseBreakdown.flightRiskAssessment.overallRiskLevel}
                            </Badge>
                          </div>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          Probability of not reaching your meeting on time
                        </p>
                      </div>

                      {/* Cancellation Risk */}
                      {expenseBreakdown.flightRiskAssessment.cancellationRisk && (
                        <div className="p-4 bg-red-50 dark:bg-red-950/20 rounded-lg border border-red-200 dark:border-red-800">
                          <div className="flex items-center justify-between mb-2">
                            <span className="font-semibold">Flight Cancellation Risk</span>
                            <div className="flex items-center gap-2">
                              <span className="text-xl font-bold text-red-600 dark:text-red-400">
                                {expenseBreakdown.flightRiskAssessment.cancellationRisk.percentage}%
                              </span>
                              <Badge 
                                variant={expenseBreakdown.flightRiskAssessment.cancellationRisk.level === 'Low' ? 'default' : 
                                       expenseBreakdown.flightRiskAssessment.cancellationRisk.level === 'Medium' ? 'secondary' : 'destructive'}
                              >
                                {expenseBreakdown.flightRiskAssessment.cancellationRisk.level}
                              </Badge>
                            </div>
                          </div>
                          <p className="text-sm text-muted-foreground mb-2">
                            {expenseBreakdown.flightRiskAssessment.cancellationRisk.description}
                          </p>
                          <div className="flex flex-wrap gap-1">
                            {expenseBreakdown.flightRiskAssessment.cancellationRisk.factors.map((factor: string, index: number) => (
                              <Badge key={index} variant="outline" className="text-xs">
                                {factor}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Individual Risk Factors */}
                      <div className="space-y-3">
                        <h4 className="font-semibold">Risk Factor Breakdown</h4>
                        {expenseBreakdown.flightRiskAssessment.riskFactors.map((factor: any, index: number) => (
                          <div key={index} className="flex items-start gap-3 p-3 border rounded-lg">
                            <div className="flex flex-col items-center gap-1">
                              <span className="text-lg font-bold text-gray-700 dark:text-gray-300">
                                {factor.percentage}%
                              </span>
                              <Badge 
                                variant={factor.level === 'Low' ? 'default' : 
                                       factor.level === 'Medium' ? 'secondary' : 'destructive'}
                                className="text-xs"
                              >
                                {factor.level}
                              </Badge>
                            </div>
                            <div className="flex-1">
                              <span className="font-medium">{factor.factor}</span>
                              <p className="text-sm text-muted-foreground mt-1">{factor.description}</p>
                            </div>
                          </div>
                        ))}
                      </div>

                      {/* Recommendations */}
                      <div className="p-3 bg-amber-50 dark:bg-amber-950/30 rounded-lg">
                        <span className="font-medium">Recommendation:</span>
                        <p className="text-sm mt-1">{expenseBreakdown.flightRiskAssessment.recommendation}</p>
                      </div>

                      {/* Mitigation Strategies */}
                      {expenseBreakdown.flightRiskAssessment.mitigationStrategies && (
                        <div className="p-3 bg-green-50 dark:bg-green-950/30 rounded-lg">
                          <span className="font-medium">Mitigation Strategies:</span>
                          <ul className="text-sm mt-2 space-y-1">
                            {expenseBreakdown.flightRiskAssessment.mitigationStrategies.map((strategy: string, index: number) => (
                              <li key={index} className="flex items-start gap-2">
                                <span className="text-green-600 dark:text-green-400 mt-1">•</span>
                                <span>{strategy}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                )}

                {/* AI Tips & Recommendations */}
                {SHOW_MONEY_SAVING_TIPS && expenseBreakdown.aiTips && (
                  <Card className="border-amber-200 dark:border-amber-800 bg-gradient-to-br from-amber-50/50 to-yellow-50/50 dark:from-amber-950/20 dark:to-yellow-950/20">
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <CardTitle className="flex items-center gap-2 text-lg">
                          <svg className="h-5 w-5 text-amber-600 dark:text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                          </svg>
                          <span>Money-Saving Tips & Reminders</span>
                        </CardTitle>
                        <Badge variant="outline" className="bg-white dark:bg-gray-900 border-amber-300 dark:border-amber-700 text-amber-700 dark:text-amber-400">
                          <svg className="h-3 w-3 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
                          </svg>
                          Live Web Research
                        </Badge>
                      </div>
                      <CardDescription className="text-xs text-amber-700 dark:text-amber-500/80 mt-2">
                        Based on current prices, deals, and conditions in your destination cities
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="prose prose-sm max-w-none dark:prose-invert">
                        <div className="text-sm whitespace-pre-line text-muted-foreground leading-relaxed">
                          {expenseBreakdown.aiTips}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Action Buttons */}
                <div className="flex gap-2">
                  {SHOW_MONEY_SAVING_TIPS && (
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={calculateExpenses}
                      disabled={isCalculatingExpenses}
                    >
                      {isCalculatingExpenses ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Recalculating...
                        </>
                      ) : (
                        <>
                          <Sparkles className="mr-2 h-4 w-4" />
                          Recalculate
                        </>
                      )}
                    </Button>
                  )}
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => {
                      const text = `EXPENSE BREAKDOWN\n\nFlights: $${expenseBreakdown.breakdown.flights.toFixed(2)}\nHotels: $${expenseBreakdown.breakdown.hotels.toFixed(2)}\nMeals: $${expenseBreakdown.breakdown.meals.total.toFixed(2)}\nTransportation: $${expenseBreakdown.breakdown.transportation.total.toFixed(2)}\nMiscellaneous: $${expenseBreakdown.breakdown.miscellaneous.total.toFixed(2)}\nContingency: $${expenseBreakdown.breakdown.contingency.amount.toFixed(2)}\n\nTOTAL: $${expenseBreakdown.totals.grandTotal.toFixed(2)}`;
                      navigator.clipboard.writeText(text);
                      toast({
                        title: "Copied!",
                        description: "Expense breakdown copied to clipboard",
                      });
                    }}
                  >
                    <svg className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                    </svg>
                    Copy Summary
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Save Trip to Employee Profile */}
        {!tripSaved ? (
          <Card className="border-2 border-primary bg-gradient-to-r from-primary/10 to-primary/5">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-primary to-primary/70 flex items-center justify-center text-white text-lg font-bold shadow-lg">
                    {employeeName.split(' ').map(n => n[0]).join('').toUpperCase()}
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Save this trip to</p>
                    <p className="text-lg font-bold">{employeeName}'s Profile</p>
                  </div>
                </div>
                <Button
                  size="lg"
                  onClick={async () => {
                    setIsSavingTrip(true);
                    
                    // Simulate API call to save trip
                    await new Promise(resolve => setTimeout(resolve, 1500));
                    
                    setTripSaved(true);
                    setIsSavingTrip(false);
                    
                    toast({
                      title: "Trip Saved Successfully! 🎉",
                      description: `This trip has been added to ${employeeName}'s profile and is ready for approval.`,
                    });

                    // Redirect to home page after a short delay
                    setTimeout(() => {
                      setLocation("/");
                    }, 1500);
                  }}
                  disabled={isSavingTrip}
                  className="px-8 h-12 text-base"
                >
                  {isSavingTrip ? (
                    <>
                      <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                      Saving Trip...
                    </>
                  ) : (
                    <>
                      <svg className="mr-2 h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
                      </svg>
                      Save Trip to {employeeName}'s Profile
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : (
          <Card className="border-2 border-green-500 bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-950/30 dark:to-emerald-950/30">
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-green-500 flex items-center justify-center text-white shadow-lg">
                  <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <div className="flex-1">
                  <p className="text-lg font-bold text-green-700 dark:text-green-400">Trip Successfully Saved!</p>
                  <p className="text-sm text-green-600 dark:text-green-500">
                    This trip has been added to <span className="font-semibold">{employeeName}'s profile</span> and is ready for review and approval.
                  </p>
                </div>
                <Badge className="bg-green-500 text-white px-4 py-2">
                  <svg className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  Saved
                </Badge>
              </div>
            </CardContent>
          </Card>
        )}

        <div className="flex justify-end gap-4 mt-6">
          <Button variant="outline" onClick={() => {
            setCurrentStep(1);
            setSelectedBundle(null);
            setSelectedHotels({});
            setFlightBundles([]);
            setHotelResults({});
            setExpenseBreakdown(null);
            setTripSaved(false);
          }}>
            Plan Another Trip
          </Button>
          <Button>
            Export Itinerary
          </Button>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-violet-50/30 dark:from-gray-950 dark:via-gray-900 dark:to-violet-950/20">
      {/* Premium Navigation */}
      <header className="border-b border-border/50 bg-white/90 dark:bg-gray-950/90 backdrop-blur-xl sticky top-0 z-50 shadow-sm">
        <div className="container mx-auto px-4 lg:px-8">
          <div className="flex items-center justify-between h-20">
            <Link href="/" className="flex items-center gap-3 group cursor-pointer">
              <div className="relative">
                <div className="absolute inset-0 bg-gradient-to-br from-violet-600 via-indigo-600 to-blue-600 rounded-xl blur opacity-75 group-hover:opacity-100 transition-opacity" />
                <div className="relative bg-gradient-to-br from-violet-600 via-indigo-600 to-blue-600 p-3 rounded-xl shadow-lg">
                  <DollarSign className="h-6 w-6 text-white" />
                </div>
              </div>
              <div>
                <h1 className="text-2xl font-bold bg-gradient-to-r from-violet-600 via-indigo-600 to-blue-600 bg-clip-text text-transparent">
                  XNooks
                </h1>
                <p className="text-xs text-muted-foreground font-medium">Travel Expense Optimizer</p>
              </div>
            </Link>
            <div className="flex items-center gap-2">
              <Link href="/">
                <Button variant="ghost" size="sm">Home</Button>
              </Link>
              <ThemeToggle />
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative overflow-hidden bg-gradient-to-br from-violet-600 via-indigo-600 to-blue-600 text-white">
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGRlZnM+PHBhdHRlcm4gaWQ9ImdyaWQiIHdpZHRoPSI2MCIgaGVpZ2h0PSI2MCIgcGF0dGVyblVuaXRzPSJ1c2VyU3BhY2VPblVzZSI+PHBhdGggZD0iTSAxMCAwIEwgMCAwIDAgMTAiIGZpbGw9Im5vbmUiIHN0cm9rZT0id2hpdGUiIHN0cm9rZS1vcGFjaXR5PSIwLjA1IiBzdHJva2Utd2lkdGg9IjEiLz48L3BhdHRlcm4+PC9kZWZzPjxyZWN0IHdpZHRoPSIxMDAlIiBoZWlnaHQ9IjEwMCUiIGZpbGw9InVybCgjZ3JpZCkiLz48L3N2Zz4=')] opacity-10" />
        <div className="container mx-auto px-4 lg:px-8 py-16 relative">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div className="space-y-6">
              <Badge className="bg-white/20 text-white border-white/30 backdrop-blur-sm">
                <Target className="h-3 w-3 mr-1" />
                Comprehensive Trip Planning
              </Badge>
              <h1 className="text-4xl lg:text-5xl font-bold leading-tight">
                Plan Business Trips with
                <span className="block text-white/90">Maximum Savings</span>
              </h1>
              <p className="text-lg text-white/80 max-w-lg">
                Organize meetings, book optimized flights and hotels, and track every expense—all in one powerful trip planner designed for corporate travel managers.
              </p>
              <div className="flex flex-wrap gap-6 pt-4">
                <div className="flex items-center gap-2">
                  <Check className="h-5 w-5 text-green-300" />
                  <span className="text-sm">Multi-City Planning</span>
                </div>
                <div className="flex items-center gap-2">
                  <Check className="h-5 w-5 text-green-300" />
                  <span className="text-sm">Automated Expense Tracking</span>
                </div>
                <div className="flex items-center gap-2">
                  <Check className="h-5 w-5 text-green-300" />
                  <span className="text-sm">Policy Compliance</span>
                </div>
              </div>
            </div>
            <div className="relative hidden lg:block">
              <div className="absolute -inset-4 bg-white/20 rounded-2xl blur-2xl" />
              <img src={tripPlannerImage} alt="Trip Planning" className="relative rounded-2xl shadow-2xl" />
            </div>
          </div>
        </div>
      </section>

      <div className="container mx-auto py-8 px-4 max-w-6xl">
      {/* Employee Info Header */}
      <Card className="mb-8 border-2 border-violet-200 dark:border-violet-800 bg-gradient-to-r from-violet-50/50 to-indigo-50/50 dark:from-violet-950/20 dark:to-indigo-950/20">
        <CardContent className="pt-6">
          <div className="flex items-start gap-6">
            {/* Employee Avatar */}
            <div className="flex-shrink-0">
              <div className="w-20 h-20 rounded-full bg-gradient-to-br from-primary to-primary/70 flex items-center justify-center text-white text-2xl font-bold shadow-lg">
                {employeeName.split(' ').map(n => n[0]).join('').toUpperCase()}
              </div>
            </div>
            
            {/* Employee Info Grid */}
            <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Employee Name */}
              <div>
                <label className="text-xs font-semibold text-muted-foreground mb-1.5 block flex items-center gap-1">
                  <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                  Employee Name
                </label>
                <Input
                  value={employeeName}
                  onChange={(e) => setEmployeeName(e.target.value)}
                  placeholder="Enter employee name"
                  className="text-base font-semibold h-10 bg-white dark:bg-gray-900"
                />
              </div>

              {/* Company Name */}
              <div>
                <label className="text-xs font-semibold text-muted-foreground mb-1.5 block flex items-center gap-1">
                  <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                  </svg>
                  Company
                </label>
                <Input
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  placeholder="Enter company name"
                  className="text-base font-semibold h-10 bg-white dark:bg-gray-900"
                />
              </div>

              {/* Office Location */}
              <div>
                <label className="text-xs font-semibold text-muted-foreground mb-1.5 block flex items-center gap-1">
                  <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  Office Location
                </label>
                <Input
                  value={officeLocation}
                  onChange={(e) => setOfficeLocation(e.target.value)}
                  placeholder="Enter office address"
                  className="text-base h-10 bg-white dark:bg-gray-900"
                />
              </div>

              {/* Home Airport - Required */}
              <div>
                <label className="text-xs font-semibold text-muted-foreground mb-1.5 block flex items-center gap-1">
                  <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
                  </svg>
                  Home Airport
                  <span className="text-red-500 ml-0.5">*</span>
                </label>
                <Input
                  value={homeAirport}
                  onChange={(e) => setHomeAirport(e.target.value.toUpperCase())}
                  placeholder="e.g., LAX"
                  className="text-base font-bold h-10 bg-white dark:bg-gray-900 uppercase"
                  maxLength={3}
                  required
                />
              </div>
            </div>

            {/* Trip Status Badge */}
            {tripSaved && (
              <div className="flex-shrink-0 mt-2">
                <Badge className="bg-green-500 text-white px-4 py-2 text-sm">
                  <svg className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  Trip Saved
                </Badge>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <div className="mb-8">
        <div className="flex items-center gap-3 mb-3">
          <div className="p-2 bg-gradient-to-br from-violet-600 to-indigo-600 rounded-lg">
            <Target className="h-6 w-6 text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-bold">Smart Trip Builder</h1>
            <p className="text-sm text-muted-foreground">Optimize every aspect of your business travel</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Badge variant="outline" className="bg-violet-50 dark:bg-violet-950/20 text-violet-700 dark:text-violet-300 border-violet-200 dark:border-violet-800">
            <TrendingDown className="h-3 w-3 mr-1" />
            Cost Optimization
          </Badge>
          <Badge variant="outline" className="bg-indigo-50 dark:bg-indigo-950/20 text-indigo-700 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800">
            <Sparkles className="h-3 w-3 mr-1" />
            Automated Planning
          </Badge>
        </div>
      </div>

      {/* Progress Indicator */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-2">
          {[
            { step: 1, label: "Meetings" },
            { step: 2, label: "Flights" },
            { step: 3, label: "Hotels" },
            { step: 4, label: "Select Flights" },
            { step: 5, label: "Select Hotels" },
            { step: 6, label: "Summary" },
          ].map((item, index) => (
            <div key={item.step} className="flex items-center">
              <div
                className={`flex items-center justify-center w-8 h-8 rounded-full ${
                  currentStep >= item.step
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground"
                }`}
              >
                {currentStep > item.step ? <Check className="h-4 w-4" /> : item.step}
              </div>
              <span className="ml-2 text-sm font-medium">{item.label}</span>
              {index < 5 && (
                <div
                  className={`h-1 w-12 mx-2 ${
                    currentStep > item.step ? "bg-primary" : "bg-muted"
                  }`}
                />
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Step Content */}
      <Card>
        <CardContent className="pt-6">
          {currentStep === 1 && <MeetingInfoForm />}
          {currentStep === 2 && <FlightPreferencesForm />}
          {currentStep === 3 && <HotelPreferencesForm />}
          {currentStep === 4 && <FlightSelection />}
          {currentStep === 5 && <HotelSelection />}
          {currentStep === 6 && <ItinerarySummary />}
        </CardContent>
      </Card>

      {/* Hotel Details Modal */}
      <Dialog open={showDetailsModal} onOpenChange={setShowDetailsModal}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {selectedHotelForDetails?.property?.name || "Hotel Details"}
            </DialogTitle>
            <DialogDescription>
              View detailed information and booking options
            </DialogDescription>
          </DialogHeader>

          {hotelDetailsMutation.isPending && (
            <div className="py-8 text-center text-muted-foreground">Loading details...</div>
          )}

          {selectedHotelForDetails && (
            <div className="space-y-6">
              {selectedHotelForDetails.images && selectedHotelForDetails.images.length > 0 && (
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                  {selectedHotelForDetails.images.slice(0, 6).map((image: any, idx: number) => (
                    <div key={idx} className="relative overflow-hidden rounded-md bg-gray-100 dark:bg-gray-800">
                      {imageErrors.has(idx) ? (
                        <div className="w-full h-32 flex items-center justify-center bg-gray-100 dark:bg-gray-800 rounded-md">
                          <div className="text-center text-gray-500 dark:text-gray-400">
                            <svg className="w-8 h-8 mx-auto mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"></path>
                            </svg>
                            <p className="text-xs">Image unavailable</p>
                          </div>
                        </div>
                      ) : (
                        <img
                      src={image.thumbnail || image.original_image}
                      alt={`Hotel image ${idx + 1}`}
                      className="w-full h-32 object-cover rounded-md"
                          onError={() => handleImageError(idx)}
                          onLoad={() => {
                            // Remove from errors if it loads successfully
                            if (imageErrors.has(idx)) {
                              setImageErrors(prev => {
                                const newSet = new Set(prev);
                                newSet.delete(idx);
                                return newSet;
                              });
                            }
                          }}
                        />
                      )}
                    </div>
                  ))}
                </div>
              )}

              {selectedHotelForDetails.description && (
                <div>
                  <h3 className="font-semibold mb-2">About</h3>
                  <p className="text-sm text-muted-foreground">{selectedHotelForDetails.description}</p>
                </div>
              )}

              {selectedHotelForDetails.amenities && selectedHotelForDetails.amenities.length > 0 && (
                <div>
                  <h3 className="font-semibold mb-2">Amenities</h3>
                  <div className="flex flex-wrap gap-2">
                    {selectedHotelForDetails.amenities.map((amenity: string, idx: number) => (
                      <Badge key={idx} variant="secondary">
                        {amenity}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {selectedHotelForDetails.prices && selectedHotelForDetails.prices.length > 0 && (
                <div>
                  <h3 className="font-semibold mb-3">Booking Options</h3>
                  <div className="space-y-2">
                    {selectedHotelForDetails.prices.map((price: any, idx: number) => (
                      <Card key={idx}>
                        <CardContent className="p-4">
                          <div className="flex items-start justify-between gap-4">
                            <div className="flex-1 space-y-2">
                              <div className="flex items-center gap-2">
                                {price.logo && (
                                  <img src={price.logo} alt={price.source} className="h-4 w-auto" />
                                )}
                                <span className="font-medium">{price.source}</span>
                              </div>
                              {price.rate_per_night && (
                                <div className="text-sm text-muted-foreground">
                                  {price.rate_per_night.extracted_lowest}/night
                                </div>
                              )}
                            </div>
                            <div className="text-right">
                              <div className="text-lg font-bold text-primary">
                                {price.total_rate?.extracted_lowest || price.rate_per_night?.extracted_lowest}
                              </div>
                              <Button
                                size="sm"
                                className="mt-2"
                                onClick={() => window.open(price.link, '_blank')}
                              >
                                Book Now
                              </Button>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Comprehensive Hotel Details Modal */}
      <Dialog open={showComprehensiveModal} onOpenChange={setShowComprehensiveModal}>
        <DialogContent className="max-w-6xl max-h-[90vh] overflow-hidden p-0">
          <div className="sticky top-0 z-10 bg-background border-b px-6 py-4">
            <DialogHeader>
              <DialogTitle className="text-2xl font-bold">
                   {selectedHotelForDetails?.name || "Hotel Details"}
              </DialogTitle>
              <DialogDescription>
                Comprehensive hotel information, amenities, and booking details
              </DialogDescription>
              {selectedHotelForDetails?.hotel_class && (
                <div className="flex items-center gap-2 mt-2">
                  <div className="flex items-center">
                    {[...Array(5)].map((_, i) => (
                      <Star
                        key={i}
                        className={`h-4 w-4 ${
                          i < selectedHotelForDetails.extracted_hotel_class
                            ? "fill-yellow-400 text-yellow-400"
                            : "text-gray-300"
                        }`}
                      />
                    ))}
                  </div>
                  <span className="text-sm text-muted-foreground">{selectedHotelForDetails.hotel_class}</span>
                  {selectedHotelForDetails.overall_rating && (
                    <>
                      <span className="text-muted-foreground mx-2">•</span>
                      <div className="flex items-center gap-1">
                        <span className="text-sm font-semibold">{selectedHotelForDetails.overall_rating}</span>
                        <span className="text-sm text-muted-foreground">
                          ({selectedHotelForDetails.reviews?.toLocaleString()} reviews)
                        </span>
                      </div>
                    </>
                  )}
                </div>
              )}
            </DialogHeader>
          </div>

          <div className="overflow-y-auto max-h-[calc(90vh-120px)] px-6 pb-6">
            {hotelDetailsMutation.isPending ? (
              <div className="py-12 text-center">
                <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-primary border-r-transparent mb-4"></div>
                <p className="text-muted-foreground">Loading hotel details...</p>
              </div>
            ) : selectedHotelForDetails && (
              <Tabs defaultValue="overview" className="w-full">
                <TabsList className="grid w-full grid-cols-4 mb-6">
                  <TabsTrigger value="overview">Overview</TabsTrigger>
                  <TabsTrigger value="amenities">Amenities</TabsTrigger>
                  <TabsTrigger value="reviews">Reviews</TabsTrigger>
                  <TabsTrigger value="location">Location</TabsTrigger>
                </TabsList>

                <TabsContent value="overview" className="space-y-6">
                  {selectedHotelForDetails.images && selectedHotelForDetails.images.length > 0 && (
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                      {selectedHotelForDetails.images.slice(0, 8).map((image: any, idx: number) => (
                        <div key={idx} className="relative overflow-hidden rounded-lg shadow-sm hover:shadow-md transition-shadow bg-gray-100 dark:bg-gray-800">
                          {imageErrors.has(idx) ? (
                            <div className="w-full h-40 flex items-center justify-center bg-gray-100 dark:bg-gray-800 rounded-lg">
                              <div className="text-center text-gray-500 dark:text-gray-400">
                                <svg className="w-10 h-10 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"></path>
                                </svg>
                                <p className="text-sm">Image unavailable</p>
                              </div>
                            </div>
                          ) : (
                          <img
                            src={image.thumbnail || image.original_image}
                            alt={`Hotel image ${idx + 1}`}
                            className="w-full h-40 object-cover"
                              onError={() => handleImageError(idx)}
                              onLoad={() => {
                                // Remove from errors if it loads successfully
                                if (imageErrors.has(idx)) {
                                  setImageErrors(prev => {
                                    const newSet = new Set(prev);
                                    newSet.delete(idx);
                                    return newSet;
                                  });
                                }
                              }}
                            />
                          )}
                        </div>
                      ))}
                    </div>
                  )}

                  <div className="space-y-6">
                    {selectedHotelForDetails.description && (
                      <Card className="border-0 shadow-sm">
                        <CardHeader>
                          <CardTitle className="text-lg font-semibold">About This Property</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <p className="text-sm text-muted-foreground leading-relaxed">
                            {selectedHotelForDetails.description}
                          </p>
                        </CardContent>
                      </Card>
                    )}

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {selectedHotelForDetails.type && (
                        <Card className="border-0 shadow-sm">
                          <CardHeader>
                            <CardTitle className="text-base font-semibold">Property Type</CardTitle>
                          </CardHeader>
                          <CardContent>
                            <p className="text-sm capitalize">{selectedHotelForDetails.type}</p>
                          </CardContent>
                        </Card>
                      )}

                      {(selectedHotelForDetails.check_in_time || selectedHotelForDetails.check_out_time) && (
                        <Card className="border-0 shadow-sm">
                          <CardHeader>
                            <CardTitle className="text-base font-semibold">Check-in & Check-out</CardTitle>
                          </CardHeader>
                          <CardContent className="space-y-2">
                            {selectedHotelForDetails.check_in_time && (
                              <div className="flex justify-between items-center">
                                <span className="text-sm text-muted-foreground">Check-in:</span>
                                <span className="text-sm font-medium">{selectedHotelForDetails.check_in_time}</span>
                              </div>
                            )}
                            {selectedHotelForDetails.check_out_time && (
                              <div className="flex justify-between items-center">
                                <span className="text-sm text-muted-foreground">Check-out:</span>
                                <span className="text-sm font-medium">{selectedHotelForDetails.check_out_time}</span>
                              </div>
                            )}
                          </CardContent>
                        </Card>
                      )}
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="amenities" className="space-y-4">
                  {selectedHotelForDetails.amenities && selectedHotelForDetails.amenities.length > 0 && (
                    <Card className="border-0 shadow-sm">
                      <CardHeader>
                        <CardTitle className="text-lg font-semibold">Available Amenities</CardTitle>
                        <p className="text-sm text-muted-foreground mt-1">{selectedHotelForDetails.amenities.length} amenities available</p>
                      </CardHeader>
                      <CardContent>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                          {selectedHotelForDetails.amenities.map((amenity: string, idx: number) => (
                            <div key={idx} className="flex items-center gap-2 p-2 rounded-md hover:bg-accent/50 transition-colors">
                              <div className="w-1.5 h-1.5 bg-primary rounded-full flex-shrink-0" />
                              <span className="text-sm">{amenity}</span>
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  )}

                  {selectedHotelForDetails.excluded_amenities && selectedHotelForDetails.excluded_amenities.length > 0 && (
                    <Card className="border-0 shadow-sm">
                      <CardHeader>
                        <CardTitle className="text-lg font-semibold">Not Available</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                          {selectedHotelForDetails.excluded_amenities.map((amenity: string, idx: number) => (
                            <div key={idx} className="flex items-center gap-2 p-2 rounded-md text-muted-foreground">
                              <div className="w-1.5 h-1.5 bg-gray-400 rounded-full flex-shrink-0" />
                              <span className="text-sm">{amenity}</span>
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  )}
                </TabsContent>

                <TabsContent value="reviews" className="space-y-4">
                  {selectedHotelForDetails.overall_rating && (
                    <Card className="border-0 shadow-sm">
                      <CardHeader>
                        <CardTitle className="text-lg font-semibold">Overall Rating</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="flex items-center gap-6">
                          <div className="text-6xl font-bold text-primary">
                            {selectedHotelForDetails.overall_rating}
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center gap-1 mb-2">
                              {[...Array(5)].map((_, i) => (
                                <Star
                                  key={i}
                                  className={`h-6 w-6 ${
                                    i < Math.floor(selectedHotelForDetails.overall_rating)
                                      ? "fill-yellow-400 text-yellow-400"
                                      : "text-gray-300"
                                  }`}
                                />
                              ))}
                            </div>
                            {selectedHotelForDetails.reviews && (
                              <p className="text-sm text-muted-foreground">
                                Based on {selectedHotelForDetails.reviews.toLocaleString()} guest reviews
                              </p>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  )}

                  {selectedHotelForDetails.ratings && selectedHotelForDetails.ratings.length > 0 && (
                    <Card className="border-0 shadow-sm">
                      <CardHeader>
                        <CardTitle className="text-lg font-semibold">Rating Distribution</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-4">
                          {selectedHotelForDetails.ratings.map((rating: any, idx: number) => (
                            <div key={idx} className="flex items-center gap-4">
                              <div className="flex items-center gap-1 w-16">
                                <span className="font-medium text-sm">{rating.stars}</span>
                                <Star className="h-3.5 w-3.5 fill-yellow-400 text-yellow-400" />
                              </div>
                              <div className="flex-1 bg-gray-200 dark:bg-gray-700 rounded-full h-2.5">
                                <div
                                  className="bg-primary h-2.5 rounded-full transition-all"
                                  style={{
                                    width: `${(rating.count / (selectedHotelForDetails.reviews || 1)) * 100}%`
                                  }}
                                />
                              </div>
                              <div className="text-sm text-muted-foreground w-20 text-right font-medium">
                                {rating.count.toLocaleString()}
                              </div>
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  )}

                  {selectedHotelForDetails.property?.reviews_breakdown && selectedHotelForDetails.property.reviews_breakdown.length > 0 && (
                    <Card className="border-0 shadow-sm">
                      <CardHeader>
                        <CardTitle className="text-lg font-semibold">Review Highlights</CardTitle>
                        <p className="text-sm text-muted-foreground mt-1">What guests are saying</p>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-5">
                          {selectedHotelForDetails.property.reviews_breakdown.map((review: any, idx: number) => (
                            <div key={idx} className="pb-5 border-b last:border-0 last:pb-0">
                              <div className="font-semibold text-base mb-2">{review.name}</div>
                              {review.description && (
                                <p className="text-sm text-muted-foreground mb-3 leading-relaxed">{review.description}</p>
                              )}
                              {review.total_mentioned > 0 && (
                                <p className="text-xs text-muted-foreground mb-3">
                                  Mentioned {review.total_mentioned} {review.total_mentioned === 1 ? 'time' : 'times'} in reviews
                                </p>
                              )}
                              {(review.positive > 0 || review.negative > 0 || review.neutral > 0) && (
                                <div className="flex flex-wrap gap-2">
                                  {review.positive > 0 && (
                                    <Badge variant="outline" className="bg-green-50 dark:bg-green-950 text-green-700 dark:text-green-300 border-green-200 dark:border-green-800">
                                      👍 {review.positive} Positive
                                    </Badge>
                                  )}
                                  {review.negative > 0 && (
                                    <Badge variant="outline" className="bg-red-50 dark:bg-red-950 text-red-700 dark:text-red-300 border-red-200 dark:border-red-800">
                                      👎 {review.negative} Negative
                                    </Badge>
                                  )}
                                  {review.neutral > 0 && (
                                    <Badge variant="outline" className="bg-gray-50 dark:bg-gray-900">
                                      ➖ {review.neutral} Neutral
                                    </Badge>
                                  )}
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  )}
                </TabsContent>

                <TabsContent value="location" className="space-y-4">
                  {selectedHotelForDetails.address && (
                    <Card className="border-0 shadow-sm">
                      <CardHeader>
                        <CardTitle className="text-lg font-semibold">Address & Contact</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div className="flex items-start gap-3">
                          <MapPin className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                          <div className="flex-1">
                            <p className="text-sm leading-relaxed">{selectedHotelForDetails.address}</p>
                            {selectedHotelForDetails.directions && (
                              <a
                                href={selectedHotelForDetails.directions}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center text-sm text-primary hover:underline mt-3 font-medium"
                              >
                                <Navigation className="h-4 w-4 mr-1.5" />
                                Get Directions
                              </a>
                            )}
                          </div>
                        </div>
                        {selectedHotelForDetails.phone && (
                          <div className="flex items-center gap-3 pt-4 border-t">
                            <Phone className="h-5 w-5 text-primary flex-shrink-0" />
                            <a
                              href={selectedHotelForDetails.phone_link || `tel:${selectedHotelForDetails.phone}`}
                              className="text-sm hover:underline font-medium"
                            >
                              {selectedHotelForDetails.phone}
                            </a>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  )}

                  {selectedHotelForDetails.nearby_places && selectedHotelForDetails.nearby_places.length > 0 && (
                    <Card className="border-0 shadow-sm">
                      <CardHeader>
                        <CardTitle className="text-lg font-semibold">Nearby Places</CardTitle>
                        <p className="text-sm text-muted-foreground mt-1">Points of interest near this property</p>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-4">
                          {selectedHotelForDetails.nearby_places.map((place: any, idx: number) => (
                            <div key={idx} className="pb-4 border-b last:border-0 last:pb-0">
                              <div className="font-medium text-sm mb-2">{place.name}</div>
                              {place.transportations && place.transportations.length > 0 && (
                                <div className="flex flex-wrap gap-2">
                                  {place.transportations.map((transport: any, tIdx: number) => (
                                    <Badge key={tIdx} variant="outline" className="text-xs font-normal">
                                      <span className="capitalize">{transport.type}</span>: {transport.duration}
                                    </Badge>
                                  ))}
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  )}

                  {selectedHotelForDetails.property?.gps_coordinates && (
                    <Card className="border-0 shadow-sm">
                      <CardHeader>
                        <CardTitle className="text-lg font-semibold">GPS Coordinates</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-2 text-sm">
                          <div className="flex items-center justify-between">
                            <span className="text-muted-foreground">Latitude:</span>
                            <span className="font-mono font-medium">{selectedHotelForDetails.property.gps_coordinates.latitude}</span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-muted-foreground">Longitude:</span>
                            <span className="font-mono font-medium">{selectedHotelForDetails.property.gps_coordinates.longitude}</span>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  )}
                </TabsContent>
              </Tabs>
            )}
          </div>
        </DialogContent>
      </Dialog>
      </div>
    </div>
  );
}
