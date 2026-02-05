import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plane, Plus, X, Calendar, MapPin, Clock, ArrowRight, Loader2, ArrowLeft, Home, CalendarDays, Settings, HelpCircle, Filter, DollarSign, Leaf, Ban, Check, Shuffle, ChevronDown, ChevronUp } from "lucide-react";
import { Link } from "wouter";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { ThemeToggle } from "@/components/theme-toggle";
import type { FlightOption, Flight as FlightType, Layover } from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";
import { format } from "date-fns";

interface Meeting {
  id: string;
  location: string;
  airportId: string;
  date: string;
  time: string;
  earlyDaysNum: number;
}

interface FlightSegment {
  flight: FlightOption;
  from: string;
  to: string;
  date: string;
  fromName?: string;
  toName?: string;
}

interface FlightBundle {
  segments: FlightSegment[];
  totalPrice: number;
}

export default function MeetingFlightsPage() {
  const { toast } = useToast();
  
  const [homeCity, setHomeCity] = useState('');
  const [homeAirportId, setHomeAirportId] = useState('');
  const [returnDate, setReturnDate] = useState('');
  const [meetings, setMeetings] = useState<Meeting[]>([{
    id: '1',
    location: '',
    airportId: '',
    date: '',
    time: '',
    earlyDaysNum: 0
  }]);

  const [travelClass, setTravelClass] = useState('1');
  const [adults, setAdults] = useState(1);
  const [showHidden, setShowHidden] = useState(false);
  const [deepSearch, setDeepSearch] = useState(false);
  const [searching, setSearching] = useState(false);
  const [bundles, setBundles] = useState<FlightBundle[]>([]);
  const [showResults, setShowResults] = useState(false);
  const [debugInfo, setDebugInfo] = useState<{request: any, response: any} | null>(null);

  // Advanced Filter States
  const [excludeBasic, setExcludeBasic] = useState(false);
  const [sortBy, setSortBy] = useState('1');
  const [stops, setStops] = useState('0');
  const [excludeAirlines, setExcludeAirlines] = useState('');
  const [includeAirlines, setIncludeAirlines] = useState('');
  const [bags, setBags] = useState('0');
  const [maxPrice, setMaxPrice] = useState('');
  const [emissions, setEmissions] = useState('');
  const [excludeConns, setExcludeConns] = useState('');
  const [minHoursBeforeMeeting, setMinHoursBeforeMeeting] = useState('5');
  
  // Collapsible filters state
  const [filtersExpanded, setFiltersExpanded] = useState(false);

  const addMeeting = () => {
    setMeetings([...meetings, {
      id: Date.now().toString(),
      location: '',
      airportId: '',
      date: '',
      time: '',
      earlyDaysNum: 0
    }]);
  };

  const removeMeeting = (id: string) => {
    if (meetings.length > 1) {
      setMeetings(meetings.filter(m => m.id !== id));
    }
  };

  const updateMeeting = (id: string, field: keyof Meeting, value: string | number) => {
    setMeetings(meetings.map(m => 
      m.id === id ? { ...m, [field]: value } : m
    ));
  };

  // Calculate flight date based on meeting date and early days
  const calculateFlightDate = (meetingDate: string, earlyDaysNum: number): string => {
    if (earlyDaysNum === 0) return meetingDate;
    const date = new Date(meetingDate);
    date.setDate(date.getDate() - earlyDaysNum);
    return date.toISOString().split('T')[0];
  };

  type SegmentInfo = { from: string; to: string; date: string; fromName: string; toName: string };

  const buildSegmentInfo = (): SegmentInfo[] => {
    const segments: SegmentInfo[] = [];
    
    // First segment: Home → First Meeting (adjust for early days)
    segments.push({
      from: homeAirportId,
      to: meetings[0].airportId,
      date: calculateFlightDate(meetings[0].date, meetings[0].earlyDaysNum),
      fromName: homeCity || homeAirportId,
      toName: meetings[0].location || meetings[0].airportId
    });
    
    // Middle segments: Between meetings (adjust for early days of destination meeting)
    for (let i = 0; i < meetings.length - 1; i++) {
      segments.push({
        from: meetings[i].airportId,
        to: meetings[i + 1].airportId,
        date: calculateFlightDate(meetings[i + 1].date, meetings[i + 1].earlyDaysNum),
        fromName: meetings[i].location || meetings[i].airportId,
        toName: meetings[i + 1].location || meetings[i + 1].airportId
      });
    }
    
    // Last segment: Last Meeting → Home (use return date as is)
    segments.push({
      from: meetings[meetings.length - 1].airportId,
      to: homeAirportId,
      date: returnDate,
      fromName: meetings[meetings.length - 1].location || meetings[meetings.length - 1].airportId,
      toName: homeCity || homeAirportId
    });

    return segments;
  };

  // Check if entire bundle meets meeting time requirements
  const checkBundleSuitability = (bundle: FlightBundle): boolean => {
    // Check each segment (except the last one which is returning home)
    for (let segmentIdx = 0; segmentIdx < bundle.segments.length - 1; segmentIdx++) {
      const segment = bundle.segments[segmentIdx];
      const lastFlight = segment.flight.flights[segment.flight.flights.length - 1];
      const arrivalTime = formatTime(lastFlight.arrival_airport.time);
      const arrivalDateString = lastFlight.arrival_airport.time;
      const timeCheck = checkFlightArrivalTime(segmentIdx, arrivalTime, arrivalDateString);
      
      if (!timeCheck.isSuitable) {
        return false;
      }
    }
    return true;
  };

  // Check if flight arrival time meets minimum hours before meeting requirement
  const checkFlightArrivalTime = (segmentIndex: number, arrivalTime: string, arrivalDate: string): { isSuitable: boolean; hoursBeforeMeeting: number | null } => {
    const minHours = parseFloat(minHoursBeforeMeeting) || 0;
    
    // Determine which meeting this flight is going to
    let meetingIndex: number;
    if (segmentIndex === 0) {
      // First segment: going to first meeting
      meetingIndex = 0;
    } else if (segmentIndex === meetings.length) {
      // Last segment: returning home, no meeting to check
      return { isSuitable: true, hoursBeforeMeeting: null };
    } else {
      // Middle segments: going to meeting at segmentIndex
      meetingIndex = segmentIndex;
    }

    const meeting = meetings[meetingIndex];
    if (!meeting || !meeting.date || !meeting.time || !arrivalTime || !arrivalDate) {
      return { isSuitable: true, hoursBeforeMeeting: null };
    }

    try {
      // Parse arrival time (format: "3:15 PM") and combine with date
      const arrivalParts = arrivalTime.match(/(\d+):(\d+)\s*(AM|PM)/i);
      if (!arrivalParts) return { isSuitable: true, hoursBeforeMeeting: null };

      let arrivalHour = parseInt(arrivalParts[1]);
      const arrivalMinute = parseInt(arrivalParts[2]);
      const arrivalPeriod = arrivalParts[3].toUpperCase();

      if (arrivalPeriod === 'PM' && arrivalHour !== 12) arrivalHour += 12;
      if (arrivalPeriod === 'AM' && arrivalHour === 12) arrivalHour = 0;

      // Create full arrival datetime
      const arrivalDateTime = new Date(arrivalDate);
      arrivalDateTime.setHours(arrivalHour, arrivalMinute, 0, 0);

      // Parse meeting time and create full meeting datetime
      const meetingParts = meeting.time.match(/(\d+):(\d+)/);
      if (!meetingParts) return { isSuitable: true, hoursBeforeMeeting: null };

      const meetingHour = parseInt(meetingParts[1]);
      const meetingMinute = parseInt(meetingParts[2]);
      
      // Create meeting datetime in local timezone to avoid UTC conversion issues
      const meetingDateTime = new Date(`${meeting.date}T${meeting.time}:00`);

      // Calculate hours difference using actual date/time
      const differenceInMillis = meetingDateTime.getTime() - arrivalDateTime.getTime();
      const hoursBeforeMeeting = differenceInMillis / (1000 * 60 * 60);

      return {
        isSuitable: hoursBeforeMeeting >= minHours,
        hoursBeforeMeeting: Math.round(hoursBeforeMeeting * 10) / 10
      };
    } catch (error) {
      console.error('Error checking flight arrival time:', error);
      return { isSuitable: true, hoursBeforeMeeting: null };
    }
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

    const currentSegment = allSegmentInfo[segmentIndex];
    
    try {
      const response = await apiRequest('POST', '/api/flights/next-segment', {
        departure_token: departureToken,
        multi_city_json: JSON.stringify(allSegmentInfo.map(seg => ({
          departure_id: seg.from,
          arrival_id: seg.to,
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
        // Otherwise, skip this branch - incomplete chain (missing departure_token for next segment)
      }

      return allChains;
    } catch (error) {
      console.error(`Error fetching segment ${segmentIndex}:`, error);
      return [];
    }
  };

  const searchFlights = async () => {
    if (!homeAirportId || !returnDate) {
      toast({
        title: "Error",
        description: "Please fill in home airport and return date",
        variant: "destructive"
      });
      return;
    }

    if (meetings.length < 1) {
      toast({
        title: "Error",
        description: "Please add at least 1 meeting to search for flights",
        variant: "destructive"
      });
      return;
    }

    const invalidMeeting = meetings.find(m => !m.airportId || !m.date);
    if (invalidMeeting) {
      toast({
        title: "Error",
        description: "Please fill in all meeting locations and dates",
        variant: "destructive"
      });
      return;
    }

    // Validate chronological order of meeting dates
    for (let i = 1; i < meetings.length; i++) {
      if (new Date(meetings[i].date) < new Date(meetings[i - 1].date)) {
        toast({
          title: "Error",
          description: `Meeting ${i + 1} date must be on or after Meeting ${i} date`,
          variant: "destructive"
        });
        return;
      }
    }

    // Validate return date is after last meeting date
    const lastMeetingDate = new Date(meetings[meetings.length - 1].date);
    const returnDateObj = new Date(returnDate);
    if (returnDateObj < lastMeetingDate) {
      toast({
        title: "Error",
        description: "Return date must be on or after the last meeting date",
        variant: "destructive"
      });
      return;
    }

    setSearching(true);
    setBundles([]);
    setShowResults(false);

    try {
      const allSegmentInfo = buildSegmentInfo();
      
      // Build multi-city JSON for SerpAPI
      const multiCityJson = allSegmentInfo.map(seg => ({
        departure_id: seg.from,
        arrival_id: seg.to,
        date: seg.date
      }));

      const baseParams = {
        travel_class: travelClass,
        adults: adults,
        currency: "USD",
        ...(showHidden && { show_hidden: true }),
        ...(deepSearch && { deep_search: true }),
        ...(excludeBasic && { exclude_basic: true }),
        ...(sortBy !== '1' && { sort_by: sortBy }),
        ...(stops !== '0' && { stops }),
        ...(excludeAirlines && { exclude_airlines: excludeAirlines }),
        ...(includeAirlines && { include_airlines: includeAirlines }),
        ...(bags !== '0' && { bags }),
        ...(maxPrice && { max_price: maxPrice }),
        ...(emissions && { emissions }),
        ...(excludeConns && { exclude_conns: excludeConns })
      };
      
      // Step 1: Search ONLY the first segment
      const firstSegmentParams = {
        type: "3", // Multi-city search
        multi_city_json: multiCityJson,
        ...baseParams
      };

      setDebugInfo({ request: firstSegmentParams, response: null });

      const response = await apiRequest('POST', '/api/flights/search', firstSegmentParams);
      const data = await response.json();
      
      setDebugInfo({ request: firstSegmentParams, response: data });
      
      const firstSegmentFlights = [...(data.best_flights || []), ...(data.other_flights || [])];
      
      console.log('First segment flights found:', firstSegmentFlights.length);
      
      if (firstSegmentFlights.length === 0) {
        toast({
          title: "No flights found",
          description: "No flights available for the first segment of your journey",
          variant: "destructive"
        });
        setSearching(false);
        return;
      }

      // Step 2: Chain through segments using departure_token
      const maxInitialFlights = 5; // Limit to prevent too many API calls
      const limitedFlights = firstSegmentFlights.slice(0, maxInitialFlights);
      const allChainedFlights: FlightOption[][] = [];

      for (const flight of limitedFlights) {
        if (allSegmentInfo.length === 1) {
          // Only one segment, no chaining needed
          allChainedFlights.push([flight]);
        } else if (flight.departure_token) {
          // Chain through remaining segments
          const chains = await fetchSegmentChain(
            flight.departure_token,
            1, // Start from second segment
            allSegmentInfo,
            [flight], // Start with this first flight
            baseParams
          );
          allChainedFlights.push(...chains);
        }
      }

      console.log('Complete flight chains:', allChainedFlights.length);

      if (allChainedFlights.length === 0) {
        toast({
          title: "No complete routes found",
          description: "Could not find flights for all segments of your journey",
          variant: "destructive"
        });
        setSearching(false);
        return;
      }

      // Step 3: Build bundles from chained flights
      // Filter to ensure only complete chains (with all segments)
      const completeChains = allChainedFlights.filter(
        flightChain => flightChain.length === allSegmentInfo.length
      );

      if (completeChains.length === 0) {
        toast({
          title: "No complete routes found",
          description: "Could not find complete flight connections for all segments",
          variant: "destructive"
        });
        setSearching(false);
        return;
      }

      const allBundles: FlightBundle[] = completeChains.map(flightChain => {
        // The final flight in the chain has the total price
        const finalFlight = flightChain[flightChain.length - 1];
        
        return {
          segments: flightChain.map((flight, idx) => ({
            flight: flight,
            from: allSegmentInfo[idx].from,
            to: allSegmentInfo[idx].to,
            date: allSegmentInfo[idx].date,
            fromName: allSegmentInfo[idx].fromName,
            toName: allSegmentInfo[idx].toName
          })),
          totalPrice: finalFlight.price // Total price is in the final segment
        };
      });
      
      console.log('Bundles created:', allBundles.length);
      setBundles(allBundles);
      setShowResults(true);
    } catch (error) {
      console.error('Flight search error:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to search for flights",
        variant: "destructive"
      });
    } finally {
      setSearching(false);
    }
  };

  const resetSearch = () => {
    setBundles([]);
    setShowResults(false);
  };

  const formatTime = (timeString: string) => {
    try {
      const date = new Date(timeString);
      return format(date, 'h:mm a');
    } catch {
      return timeString;
    }
  };

  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      return format(date, 'MMM d');
    } catch {
      return dateString;
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-16 items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/" data-testid="link-home">
              <Button variant="ghost" size="icon">
                <ArrowLeft className="h-5 w-5" />
              </Button>
            </Link>
            <div className="flex items-center gap-2">
              <div className="flex h-9 w-9 items-center justify-center rounded-md bg-primary/10">
                <Plane className="h-5 w-5 text-primary" />
              </div>
              <div>
                <div className="font-semibold text-base">Meeting Flights</div>
                <div className="text-xs text-muted-foreground">Business Travel Tool</div>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <ThemeToggle />
          </div>
        </div>
      </header>

      {/* Hero Section */}
      {!showResults && (
        <div className="border-b bg-muted/30">
          <div className="container py-12">
            <div className="max-w-3xl">
              <h1 className="text-4xl font-bold tracking-tight mb-3">
                Multi-City Business Travel
              </h1>
              <p className="text-lg text-muted-foreground">
                Find complete bundled flight itineraries for your business meetings. 
                We'll search for the best connections from your home airport through all your meetings and back.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Main Content */}
      <main className="container py-8 space-y-8">

        {!showResults ? (
          <div className="grid gap-6 lg:grid-cols-2">
            {/* Home Location */}
            <Card className="lg:col-span-2">
              <CardHeader>
                <div className="flex items-center gap-2">
                  <div className="flex h-8 w-8 items-center justify-center rounded-md bg-primary/10">
                    <Home className="h-4 w-4 text-primary" />
                  </div>
                  <div>
                    <CardTitle>Home Location</CardTitle>
                    <CardDescription>Where you'll depart from and return to</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 md:grid-cols-3">
                  <div className="space-y-2">
                    <Label htmlFor="home-city">City (optional)</Label>
                    <Input
                      id="home-city"
                      data-testid="input-home-city"
                      placeholder="Los Angeles"
                      value={homeCity}
                      onChange={(e) => setHomeCity(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="home-airport">Airport Code *</Label>
                    <Input
                      id="home-airport"
                      data-testid="input-home-airport"
                      placeholder="LAX"
                      value={homeAirportId}
                      onChange={(e) => setHomeAirportId(e.target.value.toUpperCase())}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="return-date">Return Date *</Label>
                    <Input
                      id="return-date"
                      data-testid="input-return-date"
                      type="date"
                      value={returnDate}
                      onChange={(e) => setReturnDate(e.target.value)}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Meetings */}
            <Card className="lg:col-span-2">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="flex h-8 w-8 items-center justify-center rounded-md bg-primary/10">
                      <CalendarDays className="h-4 w-4 text-primary" />
                    </div>
                    <div>
                      <CardTitle>Meeting Schedule</CardTitle>
                      <CardDescription>Add all meeting locations in chronological order</CardDescription>
                    </div>
                  </div>
                  <Button onClick={addMeeting} size="sm" data-testid="button-add-meeting">
                    <Plus className="h-4 w-4 mr-1" />
                    Add Meeting
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {meetings.map((meeting, index) => (
                  <div key={meeting.id} className="relative p-4 border rounded-md bg-muted/30">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <Badge variant="secondary" className="font-semibold">
                          {index + 1}
                        </Badge>
                        <span className="font-medium">Meeting {index + 1}</span>
                      </div>
                      {meetings.length > 1 && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7"
                          onClick={() => removeMeeting(meeting.id)}
                          data-testid={`button-remove-meeting-${index}`}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                    <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
                        <div className="space-y-2">
                          <Label htmlFor={`location-${index}`}>Location</Label>
                          <Input
                            id={`location-${index}`}
                            data-testid={`input-location-${index}`}
                            placeholder="Philadelphia"
                            value={meeting.location}
                            onChange={(e) => updateMeeting(meeting.id, 'location', e.target.value)}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor={`airport-${index}`}>Airport</Label>
                          <Input
                            id={`airport-${index}`}
                            data-testid={`input-airport-${index}`}
                            placeholder="PHL"
                            value={meeting.airportId}
                            onChange={(e) => updateMeeting(meeting.id, 'airportId', e.target.value.toUpperCase())}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor={`date-${index}`}>Date *</Label>
                          <Input
                            id={`date-${index}`}
                            data-testid={`input-date-${index}`}
                            type="date"
                            value={meeting.date}
                            onChange={(e) => updateMeeting(meeting.id, 'date', e.target.value)}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor={`time-${index}`}>Time *</Label>
                          <Input
                            id={`time-${index}`}
                            data-testid={`input-time-${index}`}
                            type="time"
                            value={meeting.time}
                            onChange={(e) => updateMeeting(meeting.id, 'time', e.target.value)}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor={`early-days-${index}`}>Arrive Early (Days)</Label>
                          <Input
                            id={`early-days-${index}`}
                            data-testid={`input-early-days-${index}`}
                            type="number"
                            min="0"
                            placeholder="0"
                            value={meeting.earlyDaysNum}
                            onChange={(e) => updateMeeting(meeting.id, 'earlyDaysNum', parseInt(e.target.value) || 0)}
                          />
                        </div>
                      </div>
                    </div>
                ))}
              </CardContent>
            </Card>

            {/* Search Options */}
            <Card className="lg:col-span-2">
              <CardHeader>
                <div className="flex items-center gap-2">
                  <div className="flex h-8 w-8 items-center justify-center rounded-md bg-primary/10">
                    <Settings className="h-4 w-4 text-primary" />
                  </div>
                  <div>
                    <CardTitle>Flight Preferences</CardTitle>
                    <CardDescription>Customize your search options</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="travel-class">Travel Class</Label>
                    <Select value={travelClass} onValueChange={setTravelClass}>
                      <SelectTrigger id="travel-class" data-testid="select-travel-class">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="1">Economy</SelectItem>
                        <SelectItem value="2">Premium Economy</SelectItem>
                        <SelectItem value="3">Business</SelectItem>
                        <SelectItem value="4">First Class</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="adults">Number of Adults</Label>
                    <Select value={adults.toString()} onValueChange={(v) => setAdults(parseInt(v))}>
                      <SelectTrigger id="adults" data-testid="select-adults">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {[1, 2, 3, 4, 5, 6].map(num => (
                          <SelectItem key={num} value={num.toString()}>{num} {num === 1 ? 'Adult' : 'Adults'}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                
                <div className="space-y-3">
                  <Label className="text-sm font-medium">Search Options</Label>
                  <div className="flex flex-wrap gap-4">
                    <div className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        id="show-hidden"
                        checked={showHidden}
                        onChange={(e) => setShowHidden(e.target.checked)}
                        className="h-4 w-4 rounded border-gray-300"
                        data-testid="checkbox-show-hidden"
                      />
                      <Label htmlFor="show-hidden" className="text-sm font-normal cursor-pointer">
                        Show hidden flights
                      </Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        id="deep-search"
                        checked={deepSearch}
                        onChange={(e) => setDeepSearch(e.target.checked)}
                        className="h-4 w-4 rounded border-gray-300"
                        data-testid="checkbox-deep-search"
                      />
                      <Label htmlFor="deep-search" className="text-sm font-normal cursor-pointer">
                        Deep search (more results, slower)
                      </Label>
                    </div>
                  </div>
                </div>

                {/* Advanced Filters Section - Collapsible */}
                <TooltipProvider>
                  <div className="space-y-3">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setFiltersExpanded(!filtersExpanded)}
                      className="w-full justify-between"
                      data-testid="button-toggle-filters"
                    >
                      <div className="flex items-center gap-2">
                        <Filter className="h-4 w-4 text-primary" />
                        <span className="text-sm font-medium">Advanced Filters</span>
                      </div>
                      {filtersExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                    </Button>
                    
                    {filtersExpanded && (
                      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                        {/* Sort By */}
                        <div className="space-y-2">
                          <div className="flex items-center gap-2">
                            <Label htmlFor="sort-by" className="text-sm">Sort By</Label>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <HelpCircle className="h-3.5 w-3.5 text-muted-foreground cursor-help" />
                              </TooltipTrigger>
                              <TooltipContent className="max-w-xs">
                                <p>Choose how to sort flight results: Top flights (recommended), Price, Departure/Arrival time, Duration, or Emissions</p>
                              </TooltipContent>
                            </Tooltip>
                          </div>
                          <Select value={sortBy} onValueChange={setSortBy}>
                            <SelectTrigger id="sort-by" data-testid="select-sort-by">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="1">Top Flights</SelectItem>
                              <SelectItem value="2">Price</SelectItem>
                              <SelectItem value="3">Departure Time</SelectItem>
                              <SelectItem value="4">Arrival Time</SelectItem>
                              <SelectItem value="5">Duration</SelectItem>
                              <SelectItem value="6">Emissions</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        {/* Stops */}
                        <div className="space-y-2">
                          <div className="flex items-center gap-2">
                            <Label htmlFor="stops" className="text-sm">Stops</Label>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <HelpCircle className="h-3.5 w-3.5 text-muted-foreground cursor-help" />
                              </TooltipTrigger>
                              <TooltipContent className="max-w-xs">
                                <p>Filter flights by number of stops: Any, Nonstop only, 1 stop or fewer, or 2 stops or fewer</p>
                              </TooltipContent>
                            </Tooltip>
                          </div>
                          <Select value={stops} onValueChange={setStops}>
                            <SelectTrigger id="stops" data-testid="select-stops">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="0">Any Stops</SelectItem>
                              <SelectItem value="1">Nonstop Only</SelectItem>
                              <SelectItem value="2">1 Stop or Fewer</SelectItem>
                              <SelectItem value="3">2 Stops or Fewer</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        {/* Bags */}
                        <div className="space-y-2">
                          <div className="flex items-center gap-2">
                            <Label htmlFor="bags" className="text-sm">Carry-on Bags</Label>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <HelpCircle className="h-3.5 w-3.5 text-muted-foreground cursor-help" />
                              </TooltipTrigger>
                              <TooltipContent className="max-w-xs">
                                <p>Number of carry-on bags. Should not exceed total passengers with bag allowance</p>
                              </TooltipContent>
                            </Tooltip>
                          </div>
                          <Select value={bags} onValueChange={setBags}>
                            <SelectTrigger id="bags" data-testid="select-bags">
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

                        {/* Max Price */}
                        <div className="space-y-2">
                          <div className="flex items-center gap-2">
                            <Label htmlFor="max-price" className="text-sm">Max Price (USD)</Label>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <HelpCircle className="h-3.5 w-3.5 text-muted-foreground cursor-help" />
                              </TooltipTrigger>
                              <TooltipContent className="max-w-xs">
                                <p>Set maximum ticket price in USD. Leave empty for no limit</p>
                              </TooltipContent>
                            </Tooltip>
                          </div>
                          <Input
                            id="max-price"
                            type="number"
                            placeholder="e.g., 500"
                            value={maxPrice}
                            onChange={(e) => setMaxPrice(e.target.value)}
                            data-testid="input-max-price"
                          />
                        </div>

                        {/* Exclude Airlines */}
                        <div className="space-y-2">
                          <div className="flex items-center gap-2">
                            <Label htmlFor="exclude-airlines" className="text-sm">Exclude Airlines</Label>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <HelpCircle className="h-3.5 w-3.5 text-muted-foreground cursor-help" />
                              </TooltipTrigger>
                              <TooltipContent className="max-w-xs">
                                <p>Comma-separated airline codes (e.g., UA,AA) or alliances (STAR_ALLIANCE, SKYTEAM, ONEWORLD) to exclude</p>
                              </TooltipContent>
                            </Tooltip>
                          </div>
                          <Input
                            id="exclude-airlines"
                            placeholder="e.g., UA,AA"
                            value={excludeAirlines}
                            onChange={(e) => setExcludeAirlines(e.target.value.toUpperCase())}
                            data-testid="input-exclude-airlines"
                            disabled={!!includeAirlines}
                          />
                        </div>

                        {/* Include Airlines */}
                        <div className="space-y-2">
                          <div className="flex items-center gap-2">
                            <Label htmlFor="include-airlines" className="text-sm">Include Airlines</Label>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <HelpCircle className="h-3.5 w-3.5 text-muted-foreground cursor-help" />
                              </TooltipTrigger>
                              <TooltipContent className="max-w-xs">
                                <p>Comma-separated airline codes (e.g., UA,DL) or alliances to include. Cannot be used with exclude airlines</p>
                              </TooltipContent>
                            </Tooltip>
                          </div>
                          <Input
                            id="include-airlines"
                            placeholder="e.g., UA,DL"
                            value={includeAirlines}
                            onChange={(e) => setIncludeAirlines(e.target.value.toUpperCase())}
                            data-testid="input-include-airlines"
                            disabled={!!excludeAirlines}
                          />
                        </div>

                        {/* Exclude Connections */}
                        <div className="space-y-2">
                          <div className="flex items-center gap-2">
                            <Label htmlFor="exclude-conns" className="text-sm">Exclude Connections</Label>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <HelpCircle className="h-3.5 w-3.5 text-muted-foreground cursor-help" />
                              </TooltipTrigger>
                              <TooltipContent className="max-w-xs">
                                <p>Comma-separated airport codes (e.g., ORD,DFW) to exclude as connection points</p>
                              </TooltipContent>
                            </Tooltip>
                          </div>
                          <Input
                            id="exclude-conns"
                            placeholder="e.g., ORD,DFW"
                            value={excludeConns}
                            onChange={(e) => setExcludeConns(e.target.value.toUpperCase())}
                            data-testid="input-exclude-conns"
                          />
                        </div>

                        {/* Minimum Hours Before Meeting */}
                        <div className="space-y-2">
                          <div className="flex items-center gap-2">
                            <Label htmlFor="min-hours" className="text-sm">Min Hours Before Meeting</Label>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <HelpCircle className="h-3.5 w-3.5 text-muted-foreground cursor-help" />
                              </TooltipTrigger>
                              <TooltipContent className="max-w-xs">
                                <p>Minimum hours needed between flight arrival and meeting time. Flights arriving closer will be highlighted as not suitable.</p>
                              </TooltipContent>
                            </Tooltip>
                          </div>
                          <Input
                            id="min-hours"
                            type="number"
                            min="0"
                            step="0.5"
                            placeholder="e.g., 5"
                            value={minHoursBeforeMeeting}
                            onChange={(e) => setMinHoursBeforeMeeting(e.target.value)}
                            data-testid="input-min-hours-before-meeting"
                          />
                        </div>
                      </div>
                    )}

                    {/* Checkbox Filters */}
                    <div className="flex flex-wrap gap-4 pt-2">
                      <div className="flex items-center space-x-2">
                        <Checkbox
                          id="exclude-basic"
                          checked={excludeBasic}
                          onCheckedChange={(checked) => setExcludeBasic(checked as boolean)}
                          data-testid="checkbox-exclude-basic"
                        />
                        <div className="flex items-center gap-2">
                          <Label htmlFor="exclude-basic" className="text-sm font-normal cursor-pointer">
                            Exclude Basic Economy
                          </Label>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <HelpCircle className="h-3.5 w-3.5 text-muted-foreground cursor-help" />
                            </TooltipTrigger>
                            <TooltipContent className="max-w-xs">
                              <p>Exclude basic fares (includes free seat selection and carry-on). US domestic flights only</p>
                            </TooltipContent>
                          </Tooltip>
                        </div>
                      </div>

                      <div className="flex items-center space-x-2">
                        <Checkbox
                          id="emissions-filter"
                          checked={emissions === '1'}
                          onCheckedChange={(checked) => setEmissions(checked ? '1' : '')}
                          data-testid="checkbox-emissions"
                        />
                        <div className="flex items-center gap-2">
                          <Label htmlFor="emissions-filter" className="text-sm font-normal cursor-pointer">
                            Less Emissions Only
                          </Label>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <HelpCircle className="h-3.5 w-3.5 text-muted-foreground cursor-help" />
                            </TooltipTrigger>
                            <TooltipContent className="max-w-xs">
                              <p>Show only flights with lower carbon emissions</p>
                            </TooltipContent>
                          </Tooltip>
                        </div>
                      </div>
                    </div>
                  </div>
                </TooltipProvider>
                
                <Button 
                  onClick={searchFlights} 
                  disabled={searching} 
                  size="lg"
                  className="w-full"
                  data-testid="button-search-flights"
                >
                  {searching ? (
                    <>
                      <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                      Searching for bundled flights...
                    </>
                  ) : (
                    <>
                      <Plane className="mr-2 h-5 w-5" />
                      Search Bundled Flights
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Results Header */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b">
              <div>
                <h2 className="text-3xl font-bold">Available Flight Bundles</h2>
                <p className="text-muted-foreground mt-1">
                  Found {bundles.length} complete {bundles.length === 1 ? 'itinerary' : 'itineraries'} for your trip
                </p>
                {(() => {
                  const suitableBundles = bundles.filter(checkBundleSuitability);
                  return suitableBundles.length > 0 && (
                    <div className="mt-2 flex items-center gap-2">
                      <Check className="h-4 w-4 text-green-600" />
                      <span className="text-green-600 font-medium" data-testid="text-suitable-count">
                        {suitableBundles.length} {suitableBundles.length === 1 ? 'bundle fits' : 'bundles fit'} your meeting schedule
                      </span>
                    </div>
                  );
                })()}
              </div>
              <Button onClick={resetSearch} variant="outline" size="lg" data-testid="button-reset-search">
                <ArrowLeft className="mr-2 h-4 w-4" />
                New Search
              </Button>
            </div>

            {/* Bundle Cards */}
            <div className="space-y-6">
              {(() => {
                // Sort bundles: suitable ones first, then unsuitable ones
                const sortedBundles = [...bundles].sort((a, b) => {
                  const aIsSuitable = checkBundleSuitability(a);
                  const bIsSuitable = checkBundleSuitability(b);
                  if (aIsSuitable && !bIsSuitable) return -1;
                  if (!aIsSuitable && bIsSuitable) return 1;
                  return 0;
                });
                
                return sortedBundles.map((bundle, bundleIndex) => {
                  const isSuitable = checkBundleSuitability(bundle);
                  return (
                    <Card 
                      key={bundleIndex} 
                      className={`overflow-hidden hover-elevate ${isSuitable ? 'border-green-600 border-2' : ''}`}
                      data-testid={`card-bundle-${bundleIndex}`}
                    >
                    <CardHeader className={isSuitable ? 'bg-green-50 dark:bg-green-950/20' : 'bg-muted/30'}>
                      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                        <div className="flex items-center gap-3">
                          <div className={`flex h-10 w-10 items-center justify-center rounded-md ${isSuitable ? 'bg-green-600' : 'bg-primary'}`}>
                            <span className="text-lg font-bold text-white">{bundleIndex + 1}</span>
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <CardTitle className="text-xl">Flight Bundle {bundleIndex + 1}</CardTitle>
                              {isSuitable && (
                                <Badge className="bg-green-600 text-white hover:bg-green-700" data-testid={`badge-fit-${bundleIndex}`}>
                                  <Check className="h-3 w-3 mr-1" />
                                  Fits Schedule
                                </Badge>
                              )}
                            </div>
                            <CardDescription>Complete multi-city itinerary</CardDescription>
                          </div>
                        </div>
                      <div className="text-right">
                        <div className="text-sm text-muted-foreground">Total Price</div>
                        <div className="text-2xl font-bold text-primary" data-testid={`text-price-${bundleIndex}`}>
                          ${bundle.totalPrice.toFixed(2)}
                        </div>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-6 pt-6">
                    {/* Journey Route Overview */}
                    <div className="p-4 bg-primary/5 border border-primary/20 rounded-lg">
                      <div className="flex items-center gap-2 mb-3">
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
                          
                          {/* Show all flights for this segment */}
                          {segment.flight.flights.map((flight, flightIndex) => {
                            const arrivalTime = formatTime(flight.arrival_airport.time);
                            const arrivalDateString = flight.arrival_airport.time; // Use raw ISO date string
                            const timeCheck = checkFlightArrivalTime(segmentIdx, arrivalTime, arrivalDateString);
                            const isLastFlight = flightIndex === segment.flight.flights.length - 1;
                            
                            return (
                              <div 
                                key={`${segmentIdx}-${flightIndex}`} 
                                className={`p-4 border rounded-lg bg-card ${!timeCheck.isSuitable && isLastFlight ? 'border-destructive border-2' : ''}`}
                                data-testid={`flight-card-${segmentIdx}-${flightIndex}`}
                              >
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
                                    {!timeCheck.isSuitable && isLastFlight && (
                                      <Badge variant="destructive" className="gap-1" data-testid="badge-not-suitable">
                                        <Ban className="h-3 w-3" />
                                        Not Fit
                                      </Badge>
                                    )}
                                  </div>

                                {/* Departure and Arrival Times */}
                                <div className="flex items-center gap-6">
                                  <div className="flex-1">
                                    <div className="text-2xl font-bold">{flight.departure_airport.id}</div>
                                    <div className="text-lg text-muted-foreground">
                                      {formatTime(flight.departure_airport.time)}
                                    </div>
                                    <div className="text-sm text-muted-foreground">
                                      {formatDate(flight.departure_airport.time)}
                                    </div>
                                  </div>
                                  <div className="flex flex-col items-center gap-1">
                                    <Plane className="h-5 w-5 text-primary rotate-90" />
                                    <div className="text-xs text-muted-foreground whitespace-nowrap">
                                      {flight.duration} min
                                    </div>
                                  </div>
                                  <div className="flex-1 text-right">
                                    <div className="text-2xl font-bold">{flight.arrival_airport.id}</div>
                                    <div className="text-lg text-muted-foreground">
                                      {formatTime(flight.arrival_airport.time)}
                                    </div>
                                    <div className="text-sm text-muted-foreground">
                                      {formatDate(flight.arrival_airport.time)}
                                    </div>
                                  </div>
                                </div>

                                {/* Time Warning for Last Flight in Segment */}
                                {!timeCheck.isSuitable && isLastFlight && timeCheck.hoursBeforeMeeting !== null && (
                                  <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-md" data-testid="warning-arrival-time">
                                    <div className="flex items-start gap-2">
                                      <Ban className="h-4 w-4 text-destructive mt-0.5 flex-shrink-0" />
                                      <div className="text-sm">
                                        <div className="font-semibold text-destructive">Insufficient time before meeting</div>
                                        <div className="text-destructive/80 mt-1">
                                          This flight arrives only {timeCheck.hoursBeforeMeeting} hour{Math.abs(timeCheck.hoursBeforeMeeting) !== 1 ? 's' : ''} before your meeting. 
                                          You need at least {minHoursBeforeMeeting} hours.
                                        </div>
                                      </div>
                                    </div>
                                  </div>
                                )}

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

                                {/* Extensions (amenities, features, etc.) */}
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
                          );
                          })}
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
                );
              })
            })()}
            </div>
            
            {/* Debug Information */}
            {debugInfo && (
              <Card className="mt-8">
                <CardHeader>
                  <CardTitle>Debug Information</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <h3 className="text-sm font-semibold mb-2">SerpAPI Request:</h3>
                    <pre className="bg-muted p-4 rounded-md text-xs overflow-auto max-h-60">
                      {JSON.stringify(debugInfo.request, null, 2)}
                    </pre>
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold mb-2">SerpAPI Response:</h3>
                    <pre className="bg-muted p-4 rounded-md text-xs overflow-auto max-h-60">
                      {JSON.stringify(debugInfo.response, null, 2)}
                    </pre>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
