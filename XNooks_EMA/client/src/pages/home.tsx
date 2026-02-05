import { useState, useEffect, MouseEvent } from "react";
import { useLocation } from "wouter";
import { useMutation } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { isUnauthorizedError } from "@/lib/authUtils";
import { useAuth } from "@/contexts/AuthContext";
import { FlightSearchForm } from "@/components/flight-search-form";
import { FlightCard } from "@/components/flight-card";
import { FlightFilters, FilterState } from "@/components/flight-filters";
import { FlightSkeleton } from "@/components/flight-skeleton";
import { EmptyState } from "@/components/empty-state";
import { ErrorState } from "@/components/error-state";
import { ThemeToggle } from "@/components/theme-toggle";
import { FlightSearchResponse, FlightOption, FlightSearchRequest } from "@shared/schema";
import { Plane, SlidersHorizontal, Bookmark, Save, CalendarDays, Hotel, MapPinned, TrendingDown, Shield, Sparkles, Globe, ArrowRight, DollarSign, PieChart, Users, Zap, Target, CheckCircle2, BarChart3, Clock, LogOut } from "lucide-react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { apiRequest } from "@/lib/queryClient";
import heroImage from '@assets/stock_images/professional_busines_02fbcac7.jpg';
import analyticsImage from '@assets/stock_images/business_team_analyz_ffac9b5b.jpg';
import planningImage from '@assets/stock_images/modern_corporate_tra_eda9a950.jpg';
import { SHOW_MONEY_SAVING_TIPS, RESTRICTED_FEATURE_MESSAGE } from "@/config/featureFlags";

interface MultiCitySegment {
  departure_id: string;
  arrival_id: string;
  date: Date;
}

interface SearchParams {
  type: "1" | "2" | "3";
  departure_id?: string;
  arrival_id?: string;
  outbound_date?: Date;
  return_date?: Date;
  multi_city_segments?: MultiCitySegment[];
  travel_class: string;
  adults: number;
  children: number;
  infants_in_seat: number;
  infants_on_lap: number;
  show_hidden?: boolean;
  deep_search?: boolean;
}

export default function Home() {
  const { toast } = useToast();
  const { logout } = useAuth();
  const [location] = useLocation();
  const [searchParams, setSearchParams] = useState<SearchParams | null>(null);
  const [filters, setFilters] = useState<FilterState>({
    stops: "0",
    maxPrice: 5000,
    sortBy: "1",
    airlines: [],
  });
  const [showMobileFilters, setShowMobileFilters] = useState(false);
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [searchName, setSearchName] = useState("");
  const [initialSearch, setInitialSearch] = useState<any>(null);
  const [showComparisonDialog, setShowComparisonDialog] = useState(false);
  const [comparisonName, setComparisonName] = useState("");
  const [comparisonNotes, setComparisonNotes] = useState("");
  const [selectedFlights, setSelectedFlights] = useState<FlightOption[]>([]);
  const [showAlertDialog, setShowAlertDialog] = useState(false);
  const [alertFlight, setAlertFlight] = useState<FlightOption | null>(null);
  const [alertName, setAlertName] = useState("");
  const [targetPrice, setTargetPrice] = useState("");
  const [selectedOutboundFlight, setSelectedOutboundFlight] = useState<FlightOption | null>(null);
  const [returnFlightData, setReturnFlightData] = useState<FlightSearchResponse | null>(null);
  
  const [currentSegmentIndex, setCurrentSegmentIndex] = useState(0);
  const [selectedSegmentFlights, setSelectedSegmentFlights] = useState<FlightOption[]>([]);
  const [segmentFlightData, setSegmentFlightData] = useState<FlightSearchResponse | null>(null);

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const searchParam = urlParams.get('search');
    
    if (searchParam) {
      const params = new URLSearchParams(searchParam);
      const outboundDateStr = params.get('outbound_date');
      const returnDateStr = params.get('return_date');
      
      const outboundDate = outboundDateStr && !isNaN(Date.parse(outboundDateStr)) ? new Date(outboundDateStr) : undefined;
      const returnDate = returnDateStr && !isNaN(Date.parse(returnDateStr)) ? new Date(returnDateStr) : undefined;
      
      if (outboundDate) {
        const searchData = {
          type: (params.get('type') || "1") as "1" | "2",
          departure_id: params.get('departure_id') || "",
          arrival_id: params.get('arrival_id') || "",
          outbound_date: outboundDate,
          return_date: returnDate,
          travel_class: (params.get('travel_class') || "1") as "1" | "2" | "3" | "4",
          adults: parseInt(params.get('adults') || "1"),
          children: parseInt(params.get('children') || "0"),
          infants_in_seat: parseInt(params.get('infants_in_seat') || "0"),
          infants_on_lap: parseInt(params.get('infants_on_lap') || "0"),
        };
        setInitialSearch(searchData);
      }
    }
  }, []);

  const buildRequestData = (params: SearchParams, currentFilters: FilterState): FlightSearchRequest => {
    const baseData = {
      type: params.type,
      travel_class: params.travel_class as "1" | "2" | "3" | "4",
      adults: params.adults,
      children: params.children,
      infants_in_seat: params.infants_in_seat,
      infants_on_lap: params.infants_on_lap,
      stops: currentFilters.stops !== "0" ? currentFilters.stops as "1" | "2" | "3" : undefined,
      max_price: currentFilters.maxPrice !== 5000 ? currentFilters.maxPrice : undefined,
      sort_by: currentFilters.sortBy !== "1" ? currentFilters.sortBy as "2" | "3" | "4" | "5" | "6" : undefined,
      show_hidden: params.show_hidden ? true : undefined,
      deep_search: params.deep_search ? true : undefined,
      currency: "USD",
    };

    if (params.type === "3" && params.multi_city_segments) {
      return {
        ...baseData,
        multi_city_json: params.multi_city_segments.map(seg => ({
          departure_id: seg.departure_id,
          arrival_id: seg.arrival_id,
          date: format(seg.date, 'yyyy-MM-dd'),
        })),
      };
    } else {
      return {
        ...baseData,
        departure_id: params.departure_id!,
        arrival_id: params.arrival_id!,
        outbound_date: format(params.outbound_date!, 'yyyy-MM-dd'),
        return_date: params.return_date ? format(params.return_date, 'yyyy-MM-dd') : undefined,
      };
    }
  };

  const searchMutation = useMutation<FlightSearchResponse, Error, FlightSearchRequest>({
    mutationFn: async (requestData) => {
      const response = await apiRequest('POST', '/api/flights/search', requestData);
      return response.json();
    },
  });

  const returnFlightsMutation = useMutation<FlightSearchResponse, Error, { departure_token: string; searchParams: SearchParams }>({
    mutationFn: async ({ departure_token, searchParams: params }) => {
      const response = await apiRequest('POST', '/api/flights/return', { 
        departure_token,
        departure_id: params.departure_id,
        arrival_id: params.arrival_id,
        outbound_date: params.outbound_date ? format(params.outbound_date, 'yyyy-MM-dd') : undefined,
        return_date: params.return_date ? format(params.return_date, 'yyyy-MM-dd') : undefined,
        travel_class: params.travel_class,
        adults: params.adults,
        currency: "USD",
        show_hidden: params.show_hidden ? true : undefined,
        deep_search: params.deep_search ? true : undefined,
      });
      return response.json();
    },
    onSuccess: (data) => {
      setReturnFlightData(data);
    },
  });

  const nextSegmentMutation = useMutation<FlightSearchResponse, Error, { departure_token: string; searchParams: SearchParams }>({
    mutationFn: async ({ departure_token, searchParams: params }) => {
      const response = await apiRequest('POST', '/api/flights/next-segment', { 
        departure_token,
        multi_city_json: params.multi_city_segments ? JSON.stringify(params.multi_city_segments.map(seg => ({
          departure_id: seg.departure_id,
          arrival_id: seg.arrival_id,
          date: format(seg.date, 'yyyy-MM-dd'),
        }))) : undefined,
        travel_class: params.travel_class,
        adults: params.adults,
        currency: "USD",
        show_hidden: params.show_hidden ? true : undefined,
        deep_search: params.deep_search ? true : undefined,
      });
      return response.json();
    },
    onSuccess: (data) => {
      setSegmentFlightData(data);
    },
  });

  const handleSearch = (values: SearchParams) => {
    setSearchParams(values);
    setSelectedOutboundFlight(null);
    setReturnFlightData(null);
    setCurrentSegmentIndex(0);
    setSelectedSegmentFlights([]);
    setSegmentFlightData(null);
    const requestData = buildRequestData(values, filters);
    searchMutation.mutate(requestData);
  };

  const data = searchMutation.data;
  const isLoading = searchMutation.isPending || returnFlightsMutation.isPending || nextSegmentMutation.isPending;
  const error = searchMutation.error || returnFlightsMutation.error || nextSegmentMutation.error;
  
  const isViewingReturnFlights = searchParams?.type === "1" && selectedOutboundFlight && returnFlightData;
  const isViewingMultiCity = searchParams?.type === "3" && currentSegmentIndex > 0 && segmentFlightData;
  const displayData = isViewingReturnFlights ? returnFlightData : (isViewingMultiCity ? segmentFlightData : data);

  const handleFiltersChange = (newFilters: FilterState) => {
    setFilters(newFilters);
    setShowMobileFilters(false);
    if (searchParams) {
      const requestData = buildRequestData(searchParams, newFilters);
      searchMutation.mutate(requestData);
    }
  };

  const handleSelectFlight = (flight: FlightOption) => {
    if (searchParams?.type === "1" && !selectedOutboundFlight) {
      setSelectedOutboundFlight(flight);
      if (flight.departure_token && searchParams) {
        returnFlightsMutation.mutate({ 
          departure_token: flight.departure_token,
          searchParams: searchParams
        });
      }
    } else if (searchParams?.type === "3" && searchParams.multi_city_segments) {
      const newSelectedFlights = [...selectedSegmentFlights, flight];
      setSelectedSegmentFlights(newSelectedFlights);
      
      const totalSegments = searchParams.multi_city_segments.length;
      const nextIndex = currentSegmentIndex + 1;
      
      if (nextIndex < totalSegments && flight.departure_token) {
        setCurrentSegmentIndex(nextIndex);
        nextSegmentMutation.mutate({
          departure_token: flight.departure_token,
          searchParams: searchParams
        });
      } else {
        toast({
          title: "Multi-city flights selected!",
          description: `Total price: $${flight.price}`,
        });
      }
    } else {
      if (selectedOutboundFlight) {
        const totalPrice = selectedOutboundFlight.price + flight.price;
        toast({
          title: "Flights selected!",
          description: `Total price: $${totalPrice}`,
        });
      }
    }
  };

  const saveSearchMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await apiRequest("POST", "/api/saved-searches", data);
      return response.json();
    },
    onSuccess: () => {
      setShowSaveDialog(false);
      setSearchName("");
      toast({
        title: "Success",
        description: "Search saved successfully",
      });
    },
    onError: (error: Error) => {
      if (isUnauthorizedError(error)) {
        toast({
          title: "Unauthorized",
          description: "You are logged out. Logging in again...",
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/api/login";
        }, 500);
        return;
      }
      toast({
        title: "Error",
        description: "Failed to save search",
        variant: "destructive",
      });
    },
  });

  const handleSaveSearch = () => {
    if (!searchParams || !searchName.trim()) {
      toast({
        title: "Error",
        description: "Please enter a name for this search",
        variant: "destructive",
      });
      return;
    }

    saveSearchMutation.mutate({
      name: searchName.trim(),
      type: searchParams.type,
      departureId: searchParams.departure_id,
      arrivalId: searchParams.arrival_id,
      outboundDate: searchParams.outbound_date ? format(searchParams.outbound_date, 'yyyy-MM-dd') : null,
      returnDate: searchParams.return_date ? format(searchParams.return_date, 'yyyy-MM-dd') : null,
      travelClass: searchParams.travel_class,
      adults: searchParams.adults,
      children: searchParams.children,
      infantsInSeat: searchParams.infants_in_seat,
      infantsOnLap: searchParams.infants_on_lap,
    });
  };

  const createComparisonMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await apiRequest("POST", "/api/trip-comparisons", data);
      return response.json();
    },
    onSuccess: () => {
      setShowComparisonDialog(false);
      setComparisonName("");
      setComparisonNotes("");
      setSelectedFlights([]);
      toast({
        title: "Success",
        description: "Trip comparison created successfully",
      });
    },
    onError: (error: Error) => {
      if (isUnauthorizedError(error)) {
        toast({
          title: "Unauthorized",
          description: "You are logged out. Logging in again...",
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/api/login";
        }, 500);
        return;
      }
      toast({
        title: "Error",
        description: "Failed to create comparison",
        variant: "destructive",
      });
    },
  });

  const createAlertMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await apiRequest("POST", "/api/price-alerts", data);
      return response.json();
    },
    onSuccess: () => {
      setShowAlertDialog(false);
      setAlertName("");
      setTargetPrice("");
      setAlertFlight(null);
      toast({
        title: "Success",
        description: "Price alert created successfully",
      });
    },
    onError: (error: Error) => {
      if (isUnauthorizedError(error)) {
        toast({
          title: "Unauthorized",
          description: "You are logged out. Logging in again...",
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/api/login";
        }, 500);
        return;
      }
      toast({
        title: "Error",
        description: "Failed to create alert",
        variant: "destructive",
      });
    },
  });

  const handleSetAlert = (flight: FlightOption) => {
    setAlertFlight(flight);
    setAlertName(`${searchParams?.departure_id} → ${searchParams?.arrival_id}`);
    setTargetPrice(flight.price.toString());
    setShowAlertDialog(true);
  };

  const handleCreateAlert = () => {
    if (!alertName.trim() || !targetPrice || !alertFlight || !searchParams) {
      toast({
        title: "Error",
        description: "Please fill in all required fields",
        variant: "destructive",
      });
      return;
    }

    const price = parseFloat(targetPrice);
    if (isNaN(price) || price <= 0) {
      toast({
        title: "Error",
        description: "Please enter a valid price",
        variant: "destructive",
      });
      return;
    }

    createAlertMutation.mutate({
      name: alertName.trim(),
      type: searchParams.type,
      departureId: searchParams.departure_id,
      arrivalId: searchParams.arrival_id,
      outboundDate: searchParams.outbound_date ? format(searchParams.outbound_date, 'yyyy-MM-dd') : null,
      returnDate: searchParams.return_date ? format(searchParams.return_date, 'yyyy-MM-dd') : null,
      travelClass: searchParams.travel_class,
      adults: searchParams.adults,
      targetPrice: price,
      currentPrice: alertFlight.price,
    });
  };

  const handleAddToComparison = (flight: FlightOption) => {
    const isAlreadySelected = selectedFlights.some(f => f.booking_token === flight.booking_token);
    
    if (isAlreadySelected) {
      toast({
        title: "Already added",
        description: "This flight is already in your comparison",
        variant: "destructive",
      });
      return;
    }
    
    setSelectedFlights(prev => [...prev, flight]);
    toast({
      title: "Added to comparison",
      description: `${selectedFlights.length + 1} flight(s) selected`,
    });
  };

  const handleCreateComparison = () => {
    if (!comparisonName.trim()) {
      toast({
        title: "Error",
        description: "Please enter a name for this comparison",
        variant: "destructive",
      });
      return;
    }

    if (selectedFlights.length === 0) {
      toast({
        title: "Error",
        description: "Please select at least one flight",
        variant: "destructive",
      });
      return;
    }

    createComparisonMutation.mutate({
      name: comparisonName.trim(),
      flights: JSON.stringify(selectedFlights),
      notes: comparisonNotes.trim() || null,
    });
  };

  const allFlights = [
    ...(displayData?.best_flights || []),
    ...(displayData?.other_flights || [])
  ];

  const availableAirlines = Array.from(
    new Set(
      allFlights.flatMap(flight => 
        flight.flights.map(f => f.airline)
      )
    )
  ).sort();

  const filteredFlights = allFlights.filter(flight => {
    if (!filters.airlines || filters.airlines.length === 0) {
      return true;
    }
    return flight.flights.some(f => filters.airlines?.includes(f.airline));
  });

  const filteredBestFlights = filteredFlights.filter(f => 
    displayData?.best_flights?.some(bf => bf.booking_token === f.booking_token)
  );
  const filteredOtherFlights = filteredFlights.filter(f => 
    displayData?.other_flights?.some(of => of.booking_token === f.booking_token)
  );

  const hasResults = allFlights.length > 0;
  const handleRestrictedNavigation = (event: MouseEvent<HTMLAnchorElement | HTMLButtonElement>) => {
    if (!SHOW_MONEY_SAVING_TIPS) {
      return;
    }
    event.preventDefault();
    event.stopPropagation();
    toast({
      title: "Access Restricted",
      description: RESTRICTED_FEATURE_MESSAGE,
      variant: "destructive",
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-blue-50/30 dark:from-gray-950 dark:via-gray-900 dark:to-blue-950/20">
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

            <nav className="hidden lg:flex items-center gap-2">
              <Link href="/saved-searches" onClick={handleRestrictedNavigation}>
                <Button variant="ghost" size="sm" className="gap-2">
                  <Bookmark className="h-4 w-4" />
                  <span>Saved</span>
                </Button>
              </Link>
              <Link href="/meeting-flights" onClick={handleRestrictedNavigation}>
                <Button variant="ghost" size="sm" className="gap-2">
                  <CalendarDays className="h-4 w-4" />
                  <span>Meetings</span>
                </Button>
              </Link>
              <Link href="/trip-planner">
                <Button variant="default" size="sm" className="gap-2 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 shadow-lg">
                  <Target className="h-4 w-4" />
                  <span>Trip Planner</span>
                </Button>
              </Link>
              <Link href="/hotels" onClick={handleRestrictedNavigation}>
                <Button variant="ghost" size="sm" className="gap-2">
                  <Hotel className="h-4 w-4" />
                  <span>Hotels</span>
                </Button>
              </Link>
              <ThemeToggle />
              <Button 
                variant="ghost" 
                size="sm" 
                className="gap-2 text-red-600 hover:text-red-700 hover:bg-red-50 dark:text-red-400 dark:hover:text-red-300 dark:hover:bg-red-950/20"
                onClick={logout}
              >
                <LogOut className="h-4 w-4" />
                <span>Logout</span>
              </Button>
            </nav>
          </div>
        </div>
      </header>

      {!searchParams && (
        <>
          {/* Hero Section */}
          <section className="relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-violet-600/10 via-indigo-600/5 to-blue-600/10" />
            <div className="container mx-auto px-4 lg:px-8 py-20 lg:py-32">
              <div className="grid lg:grid-cols-2 gap-12 items-center">
                <div className="space-y-8">
                  <Badge className="bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-300 border-violet-200 dark:border-violet-800">
                    <Sparkles className="h-3 w-3 mr-1" />
                    Smart Travel Management
                  </Badge>
                  <div className="space-y-4">
                    <h1 className="text-5xl lg:text-6xl font-bold leading-tight">
                      Optimize Your
                      <span className="block bg-gradient-to-r from-violet-600 via-indigo-600 to-blue-600 bg-clip-text text-transparent">
                        Travel Expenses
                      </span>
                    </h1>
                    <p className="text-xl text-muted-foreground max-w-lg">
                      Reduce business travel costs by up to 35% with intelligent flight comparison, expense tracking, and AI-powered recommendations.
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-4">
                    <Button size="lg" className="bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 shadow-lg gap-2">
                      <Zap className="h-5 w-5" />
                      Start Saving Now
                      <ArrowRight className="h-5 w-5" />
                    </Button>
                    <Link href="/trip-planner">
                      <Button size="lg" variant="outline" className="gap-2">
                        <Target className="h-5 w-5" />
                        Plan a Trip
                      </Button>
                    </Link>
                  </div>
                  <div className="flex flex-wrap gap-8 pt-4">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="h-5 w-5 text-green-600" />
                      <span className="text-sm font-medium">Real-time Price Tracking</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="h-5 w-5 text-green-600" />
                      <span className="text-sm font-medium">Policy Compliance</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="h-5 w-5 text-green-600" />
                      <span className="text-sm font-medium">Budget Controls</span>
                    </div>
                  </div>
                </div>
                <div className="relative">
                  <div className="absolute -inset-4 bg-gradient-to-r from-violet-600 to-blue-600 rounded-2xl blur-2xl opacity-20" />
                  <img src={heroImage} alt="Professional Business Travel" className="relative rounded-2xl shadow-2xl w-full" />
                </div>
              </div>
            </div>
          </section>

          {/* Stats Section */}
          <section className="py-16 bg-white dark:bg-gray-900 border-y border-border/50">
            <div className="container mx-auto px-4 lg:px-8">
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-8">
                <div className="text-center space-y-2">
                  <div className="text-4xl font-bold bg-gradient-to-r from-violet-600 to-indigo-600 bg-clip-text text-transparent">
                    35%
                  </div>
                  <p className="text-sm text-muted-foreground">Average Cost Savings</p>
                </div>
                <div className="text-center space-y-2">
                  <div className="text-4xl font-bold bg-gradient-to-r from-violet-600 to-indigo-600 bg-clip-text text-transparent">
                    500+
                  </div>
                  <p className="text-sm text-muted-foreground">Airlines Monitored</p>
                </div>
                <div className="text-center space-y-2">
                  <div className="text-4xl font-bold bg-gradient-to-r from-violet-600 to-indigo-600 bg-clip-text text-transparent">
                    24/7
                  </div>
                  <p className="text-sm text-muted-foreground">Price Monitoring</p>
                </div>
                <div className="text-center space-y-2">
                  <div className="text-4xl font-bold bg-gradient-to-r from-violet-600 to-indigo-600 bg-clip-text text-transparent">
                    99.9%
                  </div>
                  <p className="text-sm text-muted-foreground">Uptime Guarantee</p>
                </div>
              </div>
            </div>
          </section>

          {/* Features Section */}
          <section className="py-20 lg:py-32">
            <div className="container mx-auto px-4 lg:px-8">
              <div className="text-center max-w-3xl mx-auto mb-16 space-y-4">
                <Badge className="bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-300 border-violet-200 dark:border-violet-800">
                  Features
                </Badge>
                <h2 className="text-4xl font-bold">
                  Everything You Need to
                  <span className="block bg-gradient-to-r from-violet-600 to-indigo-600 bg-clip-text text-transparent">
                    Control Travel Costs
                  </span>
                </h2>
                <p className="text-lg text-muted-foreground">
                  Powerful tools designed for corporate travel managers and finance teams
                </p>
              </div>

              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
                <Card className="border-2 hover:border-violet-200 dark:hover:border-violet-800 transition-all hover:shadow-lg">
                  <CardHeader>
                    <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-violet-600 to-indigo-600 flex items-center justify-center mb-4">
                      <BarChart3 className="h-6 w-6 text-white" />
                    </div>
                    <CardTitle>Expense Analytics</CardTitle>
                    <CardDescription>
                      Real-time dashboards showing travel spend patterns, trends, and optimization opportunities
                    </CardDescription>
                  </CardHeader>
                </Card>

                <Card className="border-2 hover:border-violet-200 dark:hover:border-violet-800 transition-all hover:shadow-lg">
                  <CardHeader>
                    <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-violet-600 to-indigo-600 flex items-center justify-center mb-4">
                      <DollarSign className="h-6 w-6 text-white" />
                    </div>
                    <CardTitle>Budget Controls</CardTitle>
                    <CardDescription>
                      Set spending limits, approve bookings, and enforce travel policies automatically
                    </CardDescription>
                  </CardHeader>
                </Card>

                <Card className="border-2 hover:border-violet-200 dark:hover:border-violet-800 transition-all hover:shadow-lg">
                  <CardHeader>
                    <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-violet-600 to-indigo-600 flex items-center justify-center mb-4">
                      <Target className="h-6 w-6 text-white" />
                    </div>
                    <CardTitle>Smart Recommendations</CardTitle>
                    <CardDescription>
                      AI-powered suggestions for cost-effective routes, optimal booking times, and alternatives
                    </CardDescription>
                  </CardHeader>
                </Card>

                <Card className="border-2 hover:border-violet-200 dark:hover:border-violet-800 transition-all hover:shadow-lg">
                  <CardHeader>
                    <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-violet-600 to-indigo-600 flex items-center justify-center mb-4">
                      <Clock className="h-6 w-6 text-white" />
                    </div>
                    <CardTitle>Price Alerts</CardTitle>
                    <CardDescription>
                      Get notified instantly when flight prices drop below your target threshold
                    </CardDescription>
                  </CardHeader>
                </Card>

                <Card className="border-2 hover:border-violet-200 dark:hover:border-violet-800 transition-all hover:shadow-lg">
                  <CardHeader>
                    <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-violet-600 to-indigo-600 flex items-center justify-center mb-4">
                      <Users className="h-6 w-6 text-white" />
                    </div>
                    <CardTitle>Team Management</CardTitle>
                    <CardDescription>
                      Centralized booking for entire teams with role-based access and approval workflows
                    </CardDescription>
                  </CardHeader>
                </Card>

                <Card className="border-2 hover:border-violet-200 dark:hover:border-violet-800 transition-all hover:shadow-lg">
                  <CardHeader>
                    <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-violet-600 to-indigo-600 flex items-center justify-center mb-4">
                      <Shield className="h-6 w-6 text-white" />
                    </div>
                    <CardTitle>Policy Compliance</CardTitle>
                    <CardDescription>
                      Ensure all bookings meet company travel policies with automated checks and alerts
                    </CardDescription>
                  </CardHeader>
                </Card>
              </div>
            </div>
          </section>

          {/* How It Works Section */}
          <section className="py-20 bg-gradient-to-br from-violet-50 to-indigo-50 dark:from-gray-900 dark:to-gray-800">
            <div className="container mx-auto px-4 lg:px-8">
              <div className="text-center max-w-3xl mx-auto mb-16 space-y-4">
                <Badge className="bg-white dark:bg-gray-800 text-violet-700 dark:text-violet-300 border-violet-200 dark:border-violet-800">
                  How It Works
                </Badge>
                <h2 className="text-4xl font-bold">Start Saving in 3 Simple Steps</h2>
              </div>

              <div className="grid md:grid-cols-3 gap-8">
                <div className="relative">
                  <div className="absolute top-0 left-0 w-12 h-12 rounded-full bg-gradient-to-br from-violet-600 to-indigo-600 flex items-center justify-center text-white font-bold text-xl shadow-lg">
                    1
                  </div>
                  <Card className="pt-16 border-2">
                    <CardHeader>
                      <CardTitle>Search & Compare</CardTitle>
                      <CardDescription>
                        Enter your travel details and instantly compare prices across 500+ airlines. Our smart filters help you find the best value options.
                      </CardDescription>
                    </CardHeader>
                  </Card>
                </div>

                <div className="relative">
                  <div className="absolute top-0 left-0 w-12 h-12 rounded-full bg-gradient-to-br from-violet-600 to-indigo-600 flex items-center justify-center text-white font-bold text-xl shadow-lg">
                    2
                  </div>
                  <Card className="pt-16 border-2">
                    <CardHeader>
                      <CardTitle>Analyze & Optimize</CardTitle>
                      <CardDescription>
                        Review expense breakdowns, alternative routes, and savings opportunities. Set budget limits and get AI recommendations.
                      </CardDescription>
                    </CardHeader>
                  </Card>
                </div>

                <div className="relative">
                  <div className="absolute top-0 left-0 w-12 h-12 rounded-full bg-gradient-to-br from-violet-600 to-indigo-600 flex items-center justify-center text-white font-bold text-xl shadow-lg">
                    3
                  </div>
                  <Card className="pt-16 border-2">
                    <CardHeader>
                      <CardTitle>Track & Report</CardTitle>
                      <CardDescription>
                        Monitor your travel spend in real-time with comprehensive analytics. Generate reports for finance and stakeholders.
                      </CardDescription>
                    </CardHeader>
                  </Card>
                </div>
              </div>
            </div>
          </section>

          {/* CTA Section */}
          <section className="py-20 lg:py-32">
            <div className="container mx-auto px-4 lg:px-8">
              <Card className="border-2 border-violet-200 dark:border-violet-800 bg-gradient-to-br from-violet-50 to-indigo-50 dark:from-gray-900 dark:to-gray-800 overflow-hidden">
                <div className="grid lg:grid-cols-2 gap-8 items-center">
                  <CardContent className="p-8 lg:p-12 space-y-6">
                    <Badge className="bg-white dark:bg-gray-800 text-violet-700 dark:text-violet-300 border-violet-200 dark:border-violet-800">
                      Get Started
                    </Badge>
                    <h2 className="text-3xl lg:text-4xl font-bold">
                      Ready to Optimize Your Travel Budget?
                    </h2>
                    <p className="text-lg text-muted-foreground">
                      Join thousands of companies saving millions on business travel. Start searching for flights below and see the XNooks difference.
                    </p>
                    <div className="flex flex-wrap gap-4">
                      <Button size="lg" className="bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 gap-2">
                        <Zap className="h-5 w-5" />
                        Search Flights Below
                      </Button>
                      <Link href="/trip-planner">
                        <Button size="lg" variant="outline" className="gap-2">
                          <Target className="h-5 w-5" />
                          Use Trip Planner
                        </Button>
                      </Link>
                    </div>
                  </CardContent>
                  <div className="relative h-full min-h-[300px]">
                    <img src={analyticsImage} alt="Analytics Dashboard" className="absolute inset-0 w-full h-full object-cover" />
                  </div>
                </div>
              </Card>
            </div>
          </section>
        </>
      )}

      {/* Search Form Section */}
      <section className={`${!searchParams ? 'bg-white dark:bg-gray-900 border-t border-border/50' : ''} py-12`}>
        <div className="container mx-auto px-4 lg:px-8">
          <div className="max-w-4xl mx-auto">
            {!searchParams && (
              <div className="text-center mb-8 space-y-2">
                <h2 className="text-3xl font-bold">Find Your Best Flight Deal</h2>
                <p className="text-muted-foreground">Search, compare, and save on business travel</p>
              </div>
            )}
            <FlightSearchForm 
              onSearch={handleSearch} 
              initialValues={initialSearch}
            />
          </div>
        </div>
      </section>

      {/* Results Section */}
      {searchParams && (
        <section className="py-8">
          <div className="container mx-auto px-4 lg:px-8">
            <div className="max-w-7xl mx-auto">
              {isViewingReturnFlights && (
                <div className="mb-6 p-4 bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                  <div className="flex items-center justify-between flex-wrap gap-4">
                    <div>
                      <h3 className="font-semibold text-blue-900 dark:text-blue-100">
                        Step 2: Select Your Return Flight
                      </h3>
                      <p className="text-sm text-blue-700 dark:text-blue-300">
                        Outbound flight selected: {selectedOutboundFlight?.flights[0]?.departure_airport?.name} → {selectedOutboundFlight?.flights[selectedOutboundFlight.flights.length - 1]?.arrival_airport?.name} (${selectedOutboundFlight?.price})
                      </p>
                    </div>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => {
                        setSelectedOutboundFlight(null);
                        setReturnFlightData(null);
                      }}
                    >
                      Change Outbound Flight
                    </Button>
                  </div>
                </div>
              )}

              {isViewingMultiCity && (
                <div className="mb-6 p-4 bg-purple-50 dark:bg-purple-950/20 border border-purple-200 dark:border-purple-800 rounded-lg">
                  <h3 className="font-semibold text-purple-900 dark:text-purple-100">
                    Multi-city Trip: Segment {currentSegmentIndex + 1} of {searchParams.multi_city_segments?.length}
                  </h3>
                  <p className="text-sm text-purple-700 dark:text-purple-300 mt-1">
                    Selected {selectedSegmentFlights.length} segment(s)
                  </p>
                </div>
              )}

              <div className="grid lg:grid-cols-4 gap-8">
                <div className="lg:col-span-1">
                  <div className="sticky top-24">
                    <div className="hidden lg:block">
                      <FlightFilters
                        filters={filters}
                        onFiltersChange={handleFiltersChange}
                        availableAirlines={availableAirlines}
                      />
                    </div>
                    <div className="lg:hidden">
                      <Sheet open={showMobileFilters} onOpenChange={setShowMobileFilters}>
                        <SheetTrigger asChild>
                          <Button variant="outline" className="w-full gap-2">
                            <SlidersHorizontal className="h-4 w-4" />
                            Filters
                          </Button>
                        </SheetTrigger>
                        <SheetContent side="left">
                          <SheetHeader>
                            <SheetTitle>Filter Results</SheetTitle>
                          </SheetHeader>
                          <div className="mt-6">
                            <FlightFilters
                              filters={filters}
                              onFiltersChange={handleFiltersChange}
                              availableAirlines={availableAirlines}
                            />
                          </div>
                        </SheetContent>
                      </Sheet>
                    </div>
                  </div>
                </div>

                <div className="lg:col-span-3 space-y-6">
                  {isLoading ? (
                    <div className="space-y-4">
                      {[...Array(3)].map((_, i) => (
                        <FlightSkeleton key={i} />
                      ))}
                    </div>
                  ) : error ? (
                    <ErrorState 
                      title="Search Failed" 
                      message={error.message} 
                      onRetry={() => {
                        if (searchParams) {
                          const requestData = buildRequestData(searchParams, filters);
                          searchMutation.mutate(requestData);
                        }
                      }}
                    />
                  ) : !hasResults ? (
                    <EmptyState 
                      title="No Flights Found" 
                      description="Try adjusting your search criteria or filters"
                    />
                  ) : (
                    <>
                      {filteredBestFlights.length > 0 && (
                        <div className="space-y-4">
                          <h3 className="font-semibold text-lg flex items-center gap-2">
                            <Sparkles className="h-5 w-5 text-violet-600" />
                            Best Flights
                          </h3>
                          {filteredBestFlights.map((flight) => (
                            <FlightCard
                              key={flight.booking_token}
                              flight={flight}
                              isBestDeal={true}
                              onSelect={() => handleSelectFlight(flight)}
                              onSetAlert={() => handleSetAlert(flight)}
                              onAddToComparison={() => handleAddToComparison(flight)}
                            />
                          ))}
                        </div>
                      )}

                      {filteredOtherFlights.length > 0 && (
                        <div className="space-y-4">
                          <h3 className="font-semibold text-lg">Other Flights</h3>
                          {filteredOtherFlights.map((flight) => (
                            <FlightCard
                              key={flight.booking_token}
                              flight={flight}
                              onSelect={() => handleSelectFlight(flight)}
                              onSetAlert={() => handleSetAlert(flight)}
                              onAddToComparison={() => handleAddToComparison(flight)}
                            />
                          ))}
                        </div>
                      )}
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>
        </section>
      )}

      <Dialog open={showSaveDialog} onOpenChange={setShowSaveDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Save Search</DialogTitle>
            <DialogDescription>
              Save this search to quickly access it later
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="search-name">Search Name</Label>
              <Input
                id="search-name"
                placeholder="e.g., Weekly commute LAX-SFO"
                value={searchName}
                onChange={(e) => setSearchName(e.target.value)}
                data-testid="input-search-name"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowSaveDialog(false)}
              data-testid="button-cancel-save"
            >
              Cancel
            </Button>
            <Button
              onClick={handleSaveSearch}
              disabled={saveSearchMutation.isPending || !searchName.trim()}
              data-testid="button-confirm-save"
            >
              Save Search
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showComparisonDialog} onOpenChange={setShowComparisonDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create Trip Comparison</DialogTitle>
            <DialogDescription>
              Compare {selectedFlights.length} selected flight{selectedFlights.length !== 1 ? 's' : ''} side-by-side
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="comparison-name">Comparison Name</Label>
              <Input
                id="comparison-name"
                placeholder="e.g., LA to SF options"
                value={comparisonName}
                onChange={(e) => setComparisonName(e.target.value)}
                data-testid="input-comparison-name"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="comparison-notes">Notes (Optional)</Label>
              <Textarea
                id="comparison-notes"
                placeholder="Add any notes or preferences..."
                value={comparisonNotes}
                onChange={(e) => setComparisonNotes(e.target.value)}
                rows={3}
                data-testid="input-comparison-notes"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowComparisonDialog(false)}
              data-testid="button-cancel-comparison"
            >
              Cancel
            </Button>
            <Button
              onClick={handleCreateComparison}
              disabled={createComparisonMutation.isPending || selectedFlights.length === 0 || !comparisonName.trim()}
              data-testid="button-confirm-comparison"
            >
              Create
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showAlertDialog} onOpenChange={setShowAlertDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Set Price Alert</DialogTitle>
            <DialogDescription>
              Get notified when prices drop for this route
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="alert-name">Alert Name</Label>
              <Input
                id="alert-name"
                placeholder="e.g., LAX to SFO"
                value={alertName}
                onChange={(e) => setAlertName(e.target.value)}
                data-testid="input-alert-name"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="target-price">Target Price (USD)</Label>
              <Input
                id="target-price"
                type="number"
                placeholder="Enter target price"
                value={targetPrice}
                onChange={(e) => setTargetPrice(e.target.value)}
                data-testid="input-target-price"
              />
              <p className="text-xs text-muted-foreground">
                Current price: ${alertFlight?.price || 0}
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowAlertDialog(false)}
              data-testid="button-cancel-alert"
            >
              Cancel
            </Button>
            <Button
              onClick={handleCreateAlert}
              disabled={createAlertMutation.isPending || !alertName.trim() || !targetPrice}
              data-testid="button-confirm-alert"
            >
              Create Alert
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
