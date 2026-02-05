import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ChevronDown, ChevronUp, Search, Filter, Star, MapPin, Wifi, Car, Utensils, Dumbbell, Hotel, Home, ArrowLeft, FileText, Phone, Navigation, Info } from "lucide-react";
import { Link } from "wouter";

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
  { id: "22", name: "Minshuku" },
  { id: "23", name: "Japanese-style business hotels" },
  { id: "24", name: "Ryokan" },
];

// Amenities
const AMENITIES = [
  { id: "1", name: "Free parking", icon: Car },
  { id: "3", name: "Parking", icon: Car },
  { id: "4", name: "Indoor pool" },
  { id: "5", name: "Outdoor pool" },
  { id: "6", name: "Pool" },
  { id: "7", name: "Fitness center", icon: Dumbbell },
  { id: "8", name: "Restaurant", icon: Utensils },
  { id: "9", name: "Free breakfast" },
  { id: "10", name: "Spa" },
  { id: "11", name: "Beach access" },
  { id: "12", name: "Child-friendly" },
  { id: "15", name: "Bar" },
  { id: "19", name: "Pet-friendly" },
  { id: "22", name: "Room service" },
  { id: "35", name: "Free Wi-Fi", icon: Wifi },
  { id: "40", name: "Air-conditioned" },
  { id: "52", name: "All-inclusive available" },
  { id: "53", name: "Wheelchair accessible" },
  { id: "61", name: "EV charger" },
];

// Hotel brands hierarchy
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

// Sort options
const SORT_OPTIONS = [
  { value: "13", label: "Highest rating" },
  { value: "3", label: "Lowest price" },
  { value: "1", label: "Highest price" },
];

export default function HotelsPage() {
  const [location, setLocation] = useState("");
  const [checkInDate, setCheckInDate] = useState("");
  const [checkOutDate, setCheckOutDate] = useState("");
  const [adults, setAdults] = useState(2);
  const [children, setChildren] = useState(0);
  
  // Store last search params for details queries
  const [lastSearchLocation, setLastSearchLocation] = useState("");
  const [sortBy, setSortBy] = useState("");
  const [minPrice, setMinPrice] = useState("");
  const [maxPrice, setMaxPrice] = useState("");
  const [rating, setRating] = useState("");
  
  const [selectedPropertyTypes, setSelectedPropertyTypes] = useState<string[]>([]);
  const [selectedAmenities, setSelectedAmenities] = useState<string[]>([]);
  const [selectedBrands, setSelectedBrands] = useState<string[]>([]);
  const [selectedHotelClass, setSelectedHotelClass] = useState<string[]>([]);
  const [freeCancellation, setFreeCancellation] = useState(false);
  const [specialOffers, setSpecialOffers] = useState(false);
  const [ecoCertified, setEcoCertified] = useState(false);
  const [bedrooms, setBedrooms] = useState("");
  const [bathrooms, setBathrooms] = useState("");
  
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const [searchResults, setSearchResults] = useState<any>(null);
  const [allProperties, setAllProperties] = useState<any[]>([]);
  const [selectedHotel, setSelectedHotel] = useState<any>(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [showComprehensiveModal, setShowComprehensiveModal] = useState(false);
  const [nextPageToken, setNextPageToken] = useState("");
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [currentRequestId, setCurrentRequestId] = useState(0);
  const [openComprehensiveAfterFetch, setOpenComprehensiveAfterFetch] = useState(false);

  const isVacationRental = selectedPropertyTypes.some(type => 
    ["14", "19", "20", "21", "22", "23", "24"].includes(type)
  );

  const searchMutation = useMutation({
    mutationFn: async (context: { pageToken?: string; requestId: number }) => {
      const response = await apiRequest("POST", "/api/hotels/search", {
        q: location,
        check_in_date: checkInDate,
        check_out_date: checkOutDate,
        adults,
        children: children > 0 ? children : undefined,
        sort_by: sortBy || undefined,
        min_price: minPrice ? Number(minPrice) : undefined,
        max_price: maxPrice ? Number(maxPrice) : undefined,
        property_types: selectedPropertyTypes.length > 0 ? selectedPropertyTypes : undefined,
        amenities: selectedAmenities.length > 0 ? selectedAmenities : undefined,
        rating: rating ? Number(rating) : undefined,
        brands: selectedBrands.length > 0 ? selectedBrands : undefined,
        hotel_class: selectedHotelClass.length > 0 ? selectedHotelClass : undefined,
        free_cancellation: freeCancellation || undefined,
        special_offers: specialOffers || undefined,
        eco_certified: ecoCertified || undefined,
        bedrooms: bedrooms ? Number(bedrooms) : undefined,
        bathrooms: bathrooms ? Number(bathrooms) : undefined,
        next_page_token: context.pageToken || undefined,
      });
      const data = await response.json();
      return { ...data, requestId: context.requestId, isLoadMore: !!context.pageToken };
    },
    onSuccess: (data: any) => {
      if (data.requestId !== currentRequestId) {
        return;
      }
      
      setSearchResults(data);
      setNextPageToken(data.serpapi_pagination?.next_page_token || "");
      
      if (data.isLoadMore) {
        setAllProperties(prev => [...prev, ...(data.properties || [])]);
        setIsLoadingMore(false);
      } else {
        setAllProperties(data.properties || []);
      }
    },
    onError: () => {
      setIsLoadingMore(false);
    },
  });

  const detailsMutation = useMutation({
    mutationFn: async (propertyToken: string) => {
      console.log('Fetching details for property_token:', propertyToken);
      console.log('Using location:', lastSearchLocation);
      const response = await apiRequest("POST", "/api/hotels/details", {
        property_token: propertyToken,
        q: lastSearchLocation,
        check_in_date: checkInDate,
        check_out_date: checkOutDate,
        adults,
        children: children > 0 ? children : undefined,
      });
      const data = await response.json();
      console.log('Hotel details response:', data);
      return data;
    },
    onSuccess: (data: any) => {
      console.log('Setting selected hotel:', data);
      console.log('Has name?', !!data.name);
      console.log('Has description?', !!data.description);
      console.log('Has images?', data.images?.length);
      console.log('Has amenities?', data.amenities?.length);
      
      setSelectedHotel(data);
      
      // Use setTimeout to ensure state is updated before opening modal
      setTimeout(() => {
        if (openComprehensiveAfterFetch) {
          console.log('Opening comprehensive modal');
          setShowComprehensiveModal(true);
          setOpenComprehensiveAfterFetch(false);
        } else {
          console.log('Opening details modal');
          setShowDetailsModal(true);
        }
      }, 0);
    },
    onError: (error: any) => {
      console.error('Hotel details error:', error);
    },
  });

  const handleSearch = () => {
    const newRequestId = currentRequestId + 1;
    setCurrentRequestId(newRequestId);
    setNextPageToken("");
    setIsLoadingMore(false);
    setAllProperties([]);
    setLastSearchLocation(location);
    searchMutation.mutate({ requestId: newRequestId });
  };

  const handleLoadMore = () => {
    if (nextPageToken) {
      setIsLoadingMore(true);
      searchMutation.mutate({ pageToken: nextPageToken, requestId: currentRequestId });
    }
  };

  const handleViewDetails = (propertyToken: string) => {
    detailsMutation.mutate(propertyToken);
  };

  const handleViewComprehensiveDetails = (propertyToken: string) => {
    setOpenComprehensiveAfterFetch(true);
    detailsMutation.mutate(propertyToken);
  };

  const togglePropertyType = (typeId: string) => {
    setSelectedPropertyTypes(prev =>
      prev.includes(typeId) ? prev.filter(id => id !== typeId) : [...prev, typeId]
    );
  };

  const toggleAmenity = (amenityId: string) => {
    setSelectedAmenities(prev =>
      prev.includes(amenityId) ? prev.filter(id => id !== amenityId) : [...prev, amenityId]
    );
  };

  const toggleBrand = (brandId: string) => {
    setSelectedBrands(prev =>
      prev.includes(brandId) ? prev.filter(id => id !== brandId) : [...prev, brandId]
    );
  };

  const toggleHotelClass = (classValue: string) => {
    setSelectedHotelClass(prev =>
      prev.includes(classValue) ? prev.filter(c => c !== classValue) : [...prev, classValue]
    );
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="bg-card border-b px-4 py-3">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Hotel className="h-6 w-6 text-primary" />
            <h1 className="text-xl font-bold">Hotel Search</h1>
          </div>
          <Link href="/">
            <Button variant="ghost" size="sm" data-testid="link-back-home">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Home
            </Button>
          </Link>
        </div>
      </header>

      <main className="max-w-7xl mx-auto p-4 space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Find Your Perfect Stay</CardTitle>
            <CardDescription>Search for hotels and accommodations worldwide</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="space-y-2">
                <Label htmlFor="location" data-testid="label-location">Location</Label>
                <Input
                  id="location"
                  data-testid="input-location"
                  placeholder="e.g., New York, NY"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="check-in" data-testid="label-check-in">Check-in</Label>
                <Input
                  id="check-in"
                  data-testid="input-check-in"
                  type="date"
                  value={checkInDate}
                  onChange={(e) => setCheckInDate(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="check-out" data-testid="label-check-out">Check-out</Label>
                <Input
                  id="check-out"
                  data-testid="input-check-out"
                  type="date"
                  value={checkOutDate}
                  onChange={(e) => setCheckOutDate(e.target.value)}
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-2">
                  <Label htmlFor="adults" data-testid="label-adults">Adults</Label>
                  <Input
                    id="adults"
                    data-testid="input-adults"
                    type="number"
                    min="1"
                    value={adults}
                    onChange={(e) => setAdults(Number(e.target.value))}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="children" data-testid="label-children">Children</Label>
                  <Input
                    id="children"
                    data-testid="input-children"
                    type="number"
                    min="0"
                    value={children}
                    onChange={(e) => setChildren(Number(e.target.value))}
                  />
                </div>
              </div>
            </div>

            <Collapsible open={showAdvancedFilters} onOpenChange={setShowAdvancedFilters}>
              <CollapsibleTrigger asChild>
                <Button variant="outline" className="w-full" data-testid="button-toggle-filters">
                  <Filter className="h-4 w-4 mr-2" />
                  Advanced Filters
                  {showAdvancedFilters ? <ChevronUp className="h-4 w-4 ml-2" /> : <ChevronDown className="h-4 w-4 ml-2" />}
                </Button>
              </CollapsibleTrigger>
              <CollapsibleContent className="space-y-4 mt-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="sort-by" data-testid="label-sort-by">Sort By</Label>
                    <Select value={sortBy} onValueChange={setSortBy}>
                      <SelectTrigger id="sort-by" data-testid="select-sort-by">
                        <SelectValue placeholder="Select..." />
                      </SelectTrigger>
                      <SelectContent>
                        {SORT_OPTIONS.map(option => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="min-price" data-testid="label-min-price">Min Price ($)</Label>
                    <Input
                      id="min-price"
                      data-testid="input-min-price"
                      type="number"
                      placeholder="0"
                      value={minPrice}
                      onChange={(e) => setMinPrice(e.target.value)}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="max-price" data-testid="label-max-price">Max Price ($)</Label>
                    <Input
                      id="max-price"
                      data-testid="input-max-price"
                      type="number"
                      placeholder="1000"
                      value={maxPrice}
                      onChange={(e) => setMaxPrice(e.target.value)}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="rating" data-testid="label-rating">Minimum Rating</Label>
                  <Select value={rating} onValueChange={setRating}>
                    <SelectTrigger id="rating" data-testid="select-rating">
                      <SelectValue placeholder="Any rating" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="3">3+ stars</SelectItem>
                      <SelectItem value="4">4+ stars</SelectItem>
                      <SelectItem value="5">5 stars</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label data-testid="label-property-types">Property Types</Label>
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
                    {PROPERTY_TYPES.map(type => (
                      <div key={type.id} className="flex items-center space-x-2">
                        <Checkbox
                          id={`property-${type.id}`}
                          data-testid={`checkbox-property-${type.id}`}
                          checked={selectedPropertyTypes.includes(type.id)}
                          onCheckedChange={() => togglePropertyType(type.id)}
                        />
                        <Label
                          htmlFor={`property-${type.id}`}
                          className="text-sm font-normal cursor-pointer"
                        >
                          {type.name}
                        </Label>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label data-testid="label-amenities">Amenities</Label>
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
                    {AMENITIES.map(amenity => (
                      <div key={amenity.id} className="flex items-center space-x-2">
                        <Checkbox
                          id={`amenity-${amenity.id}`}
                          data-testid={`checkbox-amenity-${amenity.id}`}
                          checked={selectedAmenities.includes(amenity.id)}
                          onCheckedChange={() => toggleAmenity(amenity.id)}
                        />
                        <Label
                          htmlFor={`amenity-${amenity.id}`}
                          className="text-sm font-normal cursor-pointer"
                        >
                          {amenity.name}
                        </Label>
                      </div>
                    ))}
                  </div>
                </div>

                {!isVacationRental && (
                  <>
                    <Separator />
                    <div className="space-y-4">
                      <h3 className="text-sm font-semibold">Hotel Filters</h3>

                      <div className="space-y-2">
                        <Label data-testid="label-brands">Hotel Brands</Label>
                        <ScrollArea className="h-60 border rounded-md p-4">
                          <div className="space-y-3">
                            {HOTEL_BRANDS.map(brand => (
                              <div key={brand.id} className="space-y-2">
                                <div className="flex items-center space-x-2">
                                  <Checkbox
                                    id={`brand-${brand.id}`}
                                    data-testid={`checkbox-brand-${brand.id}`}
                                    checked={selectedBrands.includes(brand.id)}
                                    onCheckedChange={() => toggleBrand(brand.id)}
                                  />
                                  <Label
                                    htmlFor={`brand-${brand.id}`}
                                    className="text-sm font-medium cursor-pointer"
                                  >
                                    {brand.name}
                                  </Label>
                                </div>

                                {brand.children && brand.children.length > 0 && (
                                  <div className="ml-6 space-y-2">
                                    {brand.children.map(child => (
                                      <div key={child.id} className="flex items-center space-x-2">
                                        <Checkbox
                                          id={`brand-${child.id}`}
                                          data-testid={`checkbox-brand-${child.id}`}
                                          checked={selectedBrands.includes(child.id)}
                                          onCheckedChange={() => toggleBrand(child.id)}
                                        />
                                        <Label
                                          htmlFor={`brand-${child.id}`}
                                          className="text-sm font-normal cursor-pointer"
                                        >
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

                      <div className="space-y-2">
                        <Label data-testid="label-hotel-class">Hotel Class</Label>
                        <div className="flex flex-wrap gap-2">
                          {["2", "3", "4", "5"].map(classValue => (
                            <div key={classValue} className="flex items-center space-x-2">
                              <Checkbox
                                id={`class-${classValue}`}
                                data-testid={`checkbox-class-${classValue}`}
                                checked={selectedHotelClass.includes(classValue)}
                                onCheckedChange={() => toggleHotelClass(classValue)}
                              />
                              <Label
                                htmlFor={`class-${classValue}`}
                                className="text-sm font-normal cursor-pointer flex items-center"
                              >
                                {classValue} <Star className="h-3 w-3 ml-1 fill-current" />
                              </Label>
                            </div>
                          ))}
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="flex items-center justify-between space-x-2">
                          <Label htmlFor="free-cancellation" data-testid="label-free-cancellation">Free Cancellation</Label>
                          <Switch
                            id="free-cancellation"
                            data-testid="switch-free-cancellation"
                            checked={freeCancellation}
                            onCheckedChange={setFreeCancellation}
                          />
                        </div>

                        <div className="flex items-center justify-between space-x-2">
                          <Label htmlFor="special-offers" data-testid="label-special-offers">Special Offers</Label>
                          <Switch
                            id="special-offers"
                            data-testid="switch-special-offers"
                            checked={specialOffers}
                            onCheckedChange={setSpecialOffers}
                          />
                        </div>

                        <div className="flex items-center justify-between space-x-2">
                          <Label htmlFor="eco-certified" data-testid="label-eco-certified">Eco-Certified</Label>
                          <Switch
                            id="eco-certified"
                            data-testid="switch-eco-certified"
                            checked={ecoCertified}
                            onCheckedChange={setEcoCertified}
                          />
                        </div>
                      </div>
                    </div>
                  </>
                )}

                {isVacationRental && (
                  <>
                    <Separator />
                    <div className="space-y-4">
                      <h3 className="text-sm font-semibold">Vacation Rental Filters</h3>

                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="bedrooms" data-testid="label-bedrooms">Bedrooms</Label>
                          <Input
                            id="bedrooms"
                            data-testid="input-bedrooms"
                            type="number"
                            min="1"
                            placeholder="Any"
                            value={bedrooms}
                            onChange={(e) => setBedrooms(e.target.value)}
                          />
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="bathrooms" data-testid="label-bathrooms">Bathrooms</Label>
                          <Input
                            id="bathrooms"
                            data-testid="input-bathrooms"
                            type="number"
                            min="1"
                            placeholder="Any"
                            value={bathrooms}
                            onChange={(e) => setBathrooms(e.target.value)}
                          />
                        </div>
                      </div>
                    </div>
                  </>
                )}
              </CollapsibleContent>
            </Collapsible>

            <Button
              onClick={handleSearch}
              disabled={!location || !checkInDate || !checkOutDate || searchMutation.isPending}
              className="w-full"
              data-testid="button-search"
            >
              <Search className="h-4 w-4 mr-2" />
              {searchMutation.isPending ? "Searching..." : "Search Hotels"}
            </Button>
          </CardContent>
        </Card>

        {searchMutation.isError && (
          <Card className="border-destructive">
            <CardHeader>
              <CardTitle className="text-destructive">Error</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                {searchMutation.error instanceof Error ? searchMutation.error.message : "Failed to search hotels"}
              </p>
            </CardContent>
          </Card>
        )}

        {searchResults && allProperties.length > 0 && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-bold">
                {searchResults.search_information?.total_results ? (
                  <>
                    Showing {allProperties.length} of {searchResults.search_information.total_results.toLocaleString()} {searchResults.search_information.total_results === 1 ? 'property' : 'properties'}
                  </>
                ) : (
                  <>
                    Search Results ({allProperties.length}{nextPageToken ? '+' : ''} {allProperties.length === 1 ? 'property' : 'properties'})
                  </>
                )}
              </h2>
            </div>

            <div className="grid grid-cols-1 gap-4">
              {allProperties.map((property: any, index: number) => (
                <Card key={index} className="hover-elevate" data-testid={`card-property-${index}`}>
                  <CardContent className="p-6">
                    <div className="flex flex-col md:flex-row gap-4">
                      {property.images && property.images.length > 0 && (
                        <div className="w-full md:w-48 h-48 rounded-md overflow-hidden flex-shrink-0">
                          <img
                            src={property.images[0].thumbnail}
                            alt={property.name}
                            className="w-full h-full object-cover"
                            data-testid={`img-property-${index}`}
                          />
                        </div>
                      )}

                      <div className="flex-1 space-y-2">
                        <div className="flex items-start justify-between gap-4">
                          <div>
                            <h3 className="text-xl font-bold" data-testid={`text-name-${index}`}>
                              {property.name}
                            </h3>
                            <div className="flex flex-wrap items-center gap-2 mt-1">
                              {property.hotel_class && (
                                <div className="flex items-center gap-1" data-testid={`hotel-class-${index}`}>
                                  {[...Array(5)].map((_, i) => (
                                    <Star
                                      key={i}
                                      className={`h-3.5 w-3.5 ${
                                        i < (property.extracted_hotel_class || 0)
                                          ? "fill-yellow-400 text-yellow-400"
                                          : "text-gray-300"
                                      }`}
                                    />
                                  ))}
                                  <span className="text-xs text-muted-foreground ml-1">{property.hotel_class}</span>
                                </div>
                              )}
                              {property.type && (
                                <Badge variant="secondary" className="text-xs" data-testid={`badge-type-${index}`}>
                                  {property.type}
                                </Badge>
                              )}
                            </div>
                          </div>
                          
                          <div className="text-right">
                            {property.rate_per_night && (
                              <div className="mb-1">
                                <div className="text-lg font-bold text-primary" data-testid={`text-price-per-night-${index}`}>
                                  {property.rate_per_night.lowest}
                                </div>
                                <div className="text-xs text-muted-foreground">per night</div>
                              </div>
                            )}
                            {property.total_rate && (
                              <div>
                                <div className="text-sm font-medium" data-testid={`text-price-total-${index}`}>
                                  {property.total_rate.lowest}
                                </div>
                                <div className="text-xs text-muted-foreground">total</div>
                              </div>
                            )}
                          </div>
                        </div>

                        {property.overall_rating && (
                          <div className="flex items-center gap-2">
                            <div className="flex items-center">
                              {[...Array(5)].map((_, i) => (
                                <Star
                                  key={i}
                                  className={`h-4 w-4 ${
                                    i < Math.floor(property.overall_rating)
                                      ? "fill-yellow-400 text-yellow-400"
                                      : "text-gray-300"
                                  }`}
                                />
                              ))}
                            </div>
                            <span className="text-sm font-medium" data-testid={`text-rating-${index}`}>
                              {property.overall_rating}
                            </span>
                            {property.reviews && (
                              <span className="text-sm text-muted-foreground">
                                ({property.reviews.toLocaleString()} reviews)
                              </span>
                            )}
                          </div>
                        )}

                        {property.description && (
                          <p className="text-sm text-muted-foreground line-clamp-2">
                            {property.description}
                          </p>
                        )}

                        {property.amenities && property.amenities.length > 0 && (
                          <div className="flex flex-wrap gap-1">
                            {property.amenities.slice(0, 5).map((amenity: string, idx: number) => (
                              <Badge key={idx} variant="outline" className="text-xs">
                                {amenity}
                              </Badge>
                            ))}
                            {property.amenities.length > 5 && (
                              <Badge variant="outline" className="text-xs">
                                +{property.amenities.length - 5} more
                              </Badge>
                            )}
                          </div>
                        )}

                        {property.nearby_places && property.nearby_places.length > 0 && (
                          <div className="flex items-center gap-1 text-sm text-muted-foreground">
                            <MapPin className="h-3 w-3" />
                            <span>{property.nearby_places[0].name}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </CardContent>
                  <CardFooter className="flex justify-between gap-2 pt-0 px-6 pb-6">
                    <Button
                      variant="outline"
                      onClick={() => handleViewDetails(property.property_token)}
                      disabled={detailsMutation.isPending}
                      data-testid={`button-details-${index}`}
                    >
                      View Details & Book
                    </Button>
                    <Button
                      variant="default"
                      onClick={() => handleViewComprehensiveDetails(property.property_token)}
                      disabled={detailsMutation.isPending}
                      data-testid={`button-comprehensive-${index}`}
                    >
                      <FileText className="h-4 w-4 mr-2" />
                      Hotel Details
                    </Button>
                  </CardFooter>
                </Card>
              ))}
            </div>

            {nextPageToken && (
              <div className="flex justify-center">
                <Button
                  variant="outline"
                  onClick={handleLoadMore}
                  disabled={searchMutation.isPending}
                  data-testid="button-load-more"
                >
                  {searchMutation.isPending ? "Loading..." : "Load More"}
                </Button>
              </div>
            )}
          </div>
        )}

        {searchResults && allProperties.length === 0 && (
          <Card>
            <CardHeader>
              <CardTitle>No Results Found</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Try adjusting your search criteria or filters.
              </p>
            </CardContent>
          </Card>
        )}
      </main>

      <Dialog open={showDetailsModal} onOpenChange={setShowDetailsModal}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle data-testid="text-modal-title">
              {selectedHotel?.property?.name || "Hotel Details"}
            </DialogTitle>
            <DialogDescription>
              View detailed information and booking options
            </DialogDescription>
          </DialogHeader>

          {detailsMutation.isPending && (
            <div className="py-8 text-center text-muted-foreground">Loading details...</div>
          )}

          {selectedHotel && (
            <div className="space-y-6">
              {selectedHotel.property?.images && selectedHotel.property.images.length > 0 && (
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                  {selectedHotel.property.images.slice(0, 6).map((image: any, idx: number) => (
                    <img
                      key={idx}
                      src={image.thumbnail || image.original_image}
                      alt={`Hotel image ${idx + 1}`}
                      className="w-full h-32 object-cover rounded-md"
                      data-testid={`img-detail-${idx}`}
                    />
                  ))}
                </div>
              )}

              {selectedHotel.property?.description && (
                <div>
                  <h3 className="font-semibold mb-2">About</h3>
                  <p className="text-sm text-muted-foreground">{selectedHotel.property.description}</p>
                </div>
              )}

              {selectedHotel.property?.amenities && selectedHotel.property.amenities.length > 0 && (
                <div>
                  <h3 className="font-semibold mb-2">Amenities</h3>
                  <div className="flex flex-wrap gap-2">
                    {selectedHotel.property.amenities.map((amenity: string, idx: number) => (
                      <Badge key={idx} variant="secondary">
                        {amenity}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {selectedHotel.prices && selectedHotel.prices.length > 0 && (
                <div>
                  <h3 className="font-semibold mb-3">Booking Options</h3>
                  <div className="space-y-2">
                    {selectedHotel.prices.map((price: any, idx: number) => (
                      <Card key={idx} data-testid={`card-booking-${idx}`}>
                        <CardContent className="p-4">
                          <div className="flex items-start justify-between gap-4">
                            <div className="flex-1 space-y-2">
                              <div className="flex items-center gap-2">
                                {price.logo && (
                                  <img src={price.logo} alt={price.source} className="h-4 w-auto" />
                                )}
                                <div className="font-medium">{price.source}</div>
                              </div>
                              
                              {price.free_cancellation && (
                                <Badge variant="outline" className="text-green-600">
                                  Free Cancellation
                                </Badge>
                              )}
                              
                              <div className="grid grid-cols-2 gap-4 text-sm">
                                {price.rate_per_night && (
                                  <div>
                                    <div className="text-muted-foreground">Per night</div>
                                    <div className="font-medium">{price.rate_per_night.lowest}</div>
                                  </div>
                                )}
                                {price.total_rate && (
                                  <div>
                                    <div className="text-muted-foreground">Total</div>
                                    <div className="font-bold text-primary text-lg">{price.total_rate.lowest}</div>
                                  </div>
                                )}
                              </div>
                            </div>
                            
                            {price.link && (
                              <Button
                                asChild
                                size="sm"
                                data-testid={`button-book-${idx}`}
                              >
                                <a href={price.link} target="_blank" rel="noopener noreferrer">
                                  Book Now
                                </a>
                              </Button>
                            )}
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

      <Dialog open={showComprehensiveModal} onOpenChange={setShowComprehensiveModal}>
        <DialogContent className="max-w-6xl max-h-[90vh] overflow-hidden p-0">
          <div className="sticky top-0 z-10 bg-background border-b px-6 py-4">
            <DialogHeader>
              <DialogTitle className="text-2xl font-bold" data-testid="text-comprehensive-modal-title">
                {selectedHotel?.name || "Hotel Details"}
              </DialogTitle>
              {selectedHotel?.hotel_class && (
                <div className="flex items-center gap-2 mt-2">
                  <div className="flex items-center">
                    {[...Array(5)].map((_, i) => (
                      <Star
                        key={i}
                        className={`h-4 w-4 ${
                          i < selectedHotel.extracted_hotel_class
                            ? "fill-yellow-400 text-yellow-400"
                            : "text-gray-300"
                        }`}
                      />
                    ))}
                  </div>
                  <span className="text-sm text-muted-foreground">{selectedHotel.hotel_class}</span>
                  {selectedHotel.overall_rating && (
                    <>
                      <span className="text-muted-foreground mx-2">•</span>
                      <div className="flex items-center gap-1">
                        <span className="text-sm font-semibold">{selectedHotel.overall_rating}</span>
                        <span className="text-sm text-muted-foreground">
                          ({selectedHotel.reviews?.toLocaleString()} reviews)
                        </span>
                      </div>
                    </>
                  )}
                </div>
              )}
            </DialogHeader>
          </div>

          <div className="overflow-y-auto max-h-[calc(90vh-120px)] px-6 pb-6">
            {detailsMutation.isPending ? (
              <div className="py-12 text-center">
                <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-primary border-r-transparent mb-4"></div>
                <p className="text-muted-foreground">Loading hotel details...</p>
              </div>
            ) : selectedHotel && (
              <Tabs defaultValue="overview" className="w-full">
                <TabsList className="grid w-full grid-cols-4 mb-6">
                  <TabsTrigger value="overview" data-testid="tab-overview">Overview</TabsTrigger>
                  <TabsTrigger value="amenities" data-testid="tab-amenities">Amenities</TabsTrigger>
                  <TabsTrigger value="reviews" data-testid="tab-reviews">Reviews</TabsTrigger>
                  <TabsTrigger value="location" data-testid="tab-location">Location</TabsTrigger>
                </TabsList>

              <TabsContent value="overview" className="space-y-6">
                {selectedHotel.images && selectedHotel.images.length > 0 && (
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    {selectedHotel.images.slice(0, 8).map((image: any, idx: number) => (
                      <div key={idx} className="relative overflow-hidden rounded-lg shadow-sm hover:shadow-md transition-shadow">
                        <img
                          src={image.thumbnail || image.original_image}
                          alt={`Hotel image ${idx + 1}`}
                          className="w-full h-40 object-cover"
                          data-testid={`img-overview-${idx}`}
                        />
                      </div>
                    ))}
                  </div>
                )}

                <div className="space-y-6">
                  {selectedHotel.description && (
                    <Card className="border-0 shadow-sm">
                      <CardHeader>
                        <CardTitle className="text-lg font-semibold">About This Property</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <p className="text-sm text-muted-foreground leading-relaxed">
                          {selectedHotel.description}
                        </p>
                      </CardContent>
                    </Card>
                  )}

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {selectedHotel.type && (
                      <Card className="border-0 shadow-sm">
                        <CardHeader>
                          <CardTitle className="text-base font-semibold">Property Type</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <p className="text-sm capitalize">{selectedHotel.type}</p>
                        </CardContent>
                      </Card>
                    )}

                    {(selectedHotel.check_in_time || selectedHotel.check_out_time) && (
                      <Card className="border-0 shadow-sm">
                        <CardHeader>
                          <CardTitle className="text-base font-semibold">Check-in & Check-out</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-2">
                          {selectedHotel.check_in_time && (
                            <div className="flex justify-between items-center">
                              <span className="text-sm text-muted-foreground">Check-in:</span>
                              <span className="text-sm font-medium">{selectedHotel.check_in_time}</span>
                            </div>
                          )}
                          {selectedHotel.check_out_time && (
                            <div className="flex justify-between items-center">
                              <span className="text-sm text-muted-foreground">Check-out:</span>
                              <span className="text-sm font-medium">{selectedHotel.check_out_time}</span>
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    )}
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="amenities" className="space-y-4">
                {selectedHotel.amenities && selectedHotel.amenities.length > 0 && (
                  <Card className="border-0 shadow-sm">
                    <CardHeader>
                      <CardTitle className="text-lg font-semibold">Available Amenities</CardTitle>
                      <p className="text-sm text-muted-foreground mt-1">{selectedHotel.amenities.length} amenities available</p>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                        {selectedHotel.amenities.map((amenity: string, idx: number) => (
                          <div key={idx} className="flex items-center gap-2 p-2 rounded-md hover:bg-accent/50 transition-colors">
                            <div className="w-1.5 h-1.5 bg-primary rounded-full flex-shrink-0" />
                            <span className="text-sm">{amenity}</span>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}

                {selectedHotel.excluded_amenities && selectedHotel.excluded_amenities.length > 0 && (
                  <Card className="border-0 shadow-sm">
                    <CardHeader>
                      <CardTitle className="text-lg font-semibold">Not Available</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                        {selectedHotel.excluded_amenities.map((amenity: string, idx: number) => (
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
                {selectedHotel.overall_rating && (
                  <Card className="border-0 shadow-sm">
                    <CardHeader>
                      <CardTitle className="text-lg font-semibold">Overall Rating</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="flex items-center gap-6">
                        <div className="text-6xl font-bold text-primary">
                          {selectedHotel.overall_rating}
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-1 mb-2">
                            {[...Array(5)].map((_, i) => (
                              <Star
                                key={i}
                                className={`h-6 w-6 ${
                                  i < Math.floor(selectedHotel.overall_rating)
                                    ? "fill-yellow-400 text-yellow-400"
                                    : "text-gray-300"
                                }`}
                              />
                            ))}
                          </div>
                          {selectedHotel.reviews && (
                            <p className="text-sm text-muted-foreground">
                              Based on {selectedHotel.reviews.toLocaleString()} guest reviews
                            </p>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )}

                {selectedHotel.ratings && selectedHotel.ratings.length > 0 && (
                  <Card className="border-0 shadow-sm">
                    <CardHeader>
                      <CardTitle className="text-lg font-semibold">Rating Distribution</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        {selectedHotel.ratings.map((rating: any, idx: number) => (
                          <div key={idx} className="flex items-center gap-4">
                            <div className="flex items-center gap-1 w-16">
                              <span className="font-medium text-sm">{rating.stars}</span>
                              <Star className="h-3.5 w-3.5 fill-yellow-400 text-yellow-400" />
                            </div>
                            <div className="flex-1 bg-gray-200 dark:bg-gray-700 rounded-full h-2.5">
                              <div
                                className="bg-primary h-2.5 rounded-full transition-all"
                                style={{
                                  width: `${(rating.count / (selectedHotel.reviews || 1)) * 100}%`
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

                {selectedHotel.reviews_breakdown && selectedHotel.reviews_breakdown.length > 0 && (
                  <Card className="border-0 shadow-sm">
                    <CardHeader>
                      <CardTitle className="text-lg font-semibold">Review Highlights</CardTitle>
                      <p className="text-sm text-muted-foreground mt-1">What guests are saying</p>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-5">
                        {selectedHotel.reviews_breakdown.map((review: any, idx: number) => (
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
                {selectedHotel.address && (
                  <Card className="border-0 shadow-sm">
                    <CardHeader>
                      <CardTitle className="text-lg font-semibold">Address & Contact</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="flex items-start gap-3">
                        <MapPin className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                        <div className="flex-1">
                          <p className="text-sm leading-relaxed">{selectedHotel.address}</p>
                          {selectedHotel.directions && (
                            <a 
                              href={selectedHotel.directions} 
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
                      {selectedHotel.phone && (
                        <div className="flex items-center gap-3 pt-4 border-t">
                          <Phone className="h-5 w-5 text-primary flex-shrink-0" />
                          <a 
                            href={selectedHotel.phone_link || `tel:${selectedHotel.phone}`}
                            className="text-sm hover:underline font-medium"
                          >
                            {selectedHotel.phone}
                          </a>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                )}

                {selectedHotel.nearby_places && selectedHotel.nearby_places.length > 0 && (
                  <Card className="border-0 shadow-sm">
                    <CardHeader>
                      <CardTitle className="text-lg font-semibold">Nearby Places</CardTitle>
                      <p className="text-sm text-muted-foreground mt-1">Points of interest near this property</p>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        {selectedHotel.nearby_places.map((place: any, idx: number) => (
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

                {selectedHotel.gps_coordinates && (
                  <Card className="border-0 shadow-sm">
                    <CardHeader>
                      <CardTitle className="text-lg font-semibold">GPS Coordinates</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2 text-sm">
                        <div className="flex items-center justify-between">
                          <span className="text-muted-foreground">Latitude:</span>
                          <span className="font-mono font-medium">{selectedHotel.gps_coordinates.latitude}</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-muted-foreground">Longitude:</span>
                          <span className="font-mono font-medium">{selectedHotel.gps_coordinates.longitude}</span>
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
  );
}
