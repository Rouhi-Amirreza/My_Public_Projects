import React, { useEffect, useState, useRef } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent } from "@/components/ui/card";
import { setOptions, importLibrary } from "@googlemaps/js-api-loader";
import {
  findAirportByCode,
  findAirportByName,
  findNearestAirports,
  NearbyAirport,
} from "@/lib/airportData";

// Type declaration for the Google Places Autocomplete Element
declare global {
  namespace google.maps.places {
    var PlaceAutocompleteElement: {
      new (): HTMLElement;
      prototype: HTMLElement;
    };
  }
}

declare global {
  interface Window {
    google: any;
  }
}

// Distance and Duration result interface
export interface DistanceResult {
  distance: string;
  duration: string;
  durationValue: number; // in seconds
  distanceValue: number; // in meters
}

// Function to calculate distance and duration between two locations
export const calculateDistance = async (
  origin: string,
  destination: string,
  apiKey: string,
  travelMode: 'DRIVING' | 'WALKING' = 'DRIVING'
): Promise<DistanceResult | null> => {
  try {
    await loadGoogleMapsAPI(apiKey);

    if (!window.google || !window.google.maps) {
      console.error('Google Maps API not loaded');
      return null;
    }

    const service = new window.google.maps.DistanceMatrixService();

    return new Promise((resolve, reject) => {
      service.getDistanceMatrix(
        {
          origins: [origin],
          destinations: [destination],
          travelMode: window.google.maps.TravelMode[travelMode],
          unitSystem: window.google.maps.UnitSystem.IMPERIAL,
        },
        (response: any, status: any) => {
          if (status === 'OK' && response.rows[0]?.elements[0]?.status === 'OK') {
            const element = response.rows[0].elements[0];
            resolve({
              distance: element.distance.text,
              duration: element.duration.text,
              durationValue: element.duration.value,
              distanceValue: element.distance.value,
            });
          } else {
            const elementStatus = response?.rows?.[0]?.elements?.[0]?.status;
            console.error('Distance Matrix request failed. Status:', status, 'Element status:', elementStatus);
            resolve(null);
          }
        }
      );
    });
  } catch (error) {
    console.error('Error calculating distance:', error);
    return null;
  }
};

// Hook for Google Places autocomplete functionality
const useGooglePlacesAutocomplete = (
  apiKey: string,
  searchType: 'cities' | 'addresses' | 'airports' = 'addresses',
  onPlaceSelect?: (place: any) => void,
  initialValue: string = '',
  restrictToCity?: string // New parameter to restrict address searches to a specific city
) => {
  const [isLoading, setIsLoading] = useState(true);
  const [apiError, setApiError] = useState<string | null>(null);
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [searchTerm, setSearchTerm] = useState(initialValue);
  const [isInitialized, setIsInitialized] = useState(false);
  const [userIsTyping, setUserIsTyping] = useState(false);

  useEffect(() => {
    let isMounted = true;

    const initAutocomplete = async () => {
      // Check if API key is provided
      if (!apiKey || apiKey.trim() === '') {
        if (isMounted) {
          setApiError('Google Maps API key is required. Please configure VITE_GOOGLE_MAPS_API_KEY in your environment variables.');
          setIsLoading(false);
        }
        return;
      }

      try {
        await loadGoogleMapsAPI(apiKey);

        if (window.google && window.google.maps && window.google.maps.places && isMounted) {
          setIsLoading(false);
          setApiError(null);
          setIsInitialized(true);
        }
      } catch (error) {
        console.error("Error loading Google Maps API:", error);
        if (isMounted) {
          setApiError(error instanceof Error ? error.message : 'Failed to load Google Maps API');
          setIsLoading(false);
        }
      }
    };

    initAutocomplete();

    return () => {
      isMounted = false;
    };
  }, [apiKey]);

  // Sync search term with external value changes (but not when user is actively typing)
  useEffect(() => {
    if (isInitialized && !userIsTyping) {
      setSearchTerm(initialValue);
    }
  }, [initialValue, isInitialized, userIsTyping]);

  const searchPlaces = async (query: string) => {
    if (!query.trim() || !window.google || !window.google.maps || !window.google.maps.places) {
      setSuggestions([]);
      setShowSuggestions(false);
      return;
    }

    try {
      const service = new window.google.maps.places.PlacesService(document.createElement('div'));

      // For addresses, append city name to query to restrict results to that city
      const searchQuery = searchType === 'addresses' && restrictToCity 
        ? `${query}, ${restrictToCity}` 
        : query;

      const request: any = {
        query: searchQuery,
        fields: ['name', 'formatted_address', 'place_id', 'types', 'geometry'],
      };

      if (searchType === 'cities') {
        request.types = ['(cities)'];
      } else if (searchType === 'airports') {
        request.types = ['airport'];
      }
      // For addresses, we don't set specific types to get broader results

      service.textSearch(request, (results: any, status: any) => {
        if (status === window.google.maps.places.PlacesServiceStatus.OK && results) {
          // Additional filtering based on search type
          let filteredResults = results;
          
          // For cities: filter to only show cities and localities, not streets or establishments
          if (searchType === 'cities') {
            filteredResults = results.filter((result: any) => {
              const types = result.types || [];
              // Only show if it's a city, locality, or similar administrative area
              const isCity = types.some((type: string) => 
                type === 'locality' || 
                type === 'administrative_area_level_1' ||
                type === 'administrative_area_level_2' ||
                type === 'administrative_area_level_3' ||
                type === 'sublocality' ||
                type === 'sublocality_level_1' ||
                type === 'country'
              );
              // Exclude streets, establishments, and specific addresses
              const isExcluded = types.some((type: string) =>
                type === 'street_address' ||
                type === 'route' ||
                type === 'establishment' ||
                type === 'point_of_interest' ||
                type === 'store' ||
                type === 'restaurant' ||
                type === 'cafe' ||
                type === 'bank' ||
                type === 'hospital'
              );
              return isCity && !isExcluded;
            });
          }
          // For addresses: filter to ensure they're in the specified city
          else if (searchType === 'addresses' && restrictToCity) {
            filteredResults = results.filter((result: any) => {
              const address = result.formatted_address?.toLowerCase() || '';
              const cityLower = restrictToCity.toLowerCase();
              return address.includes(cityLower);
            });
          }
          
          setSuggestions(filteredResults.slice(0, 5)); // Limit to 5 suggestions
          setShowSuggestions(true);
        } else {
          setSuggestions([]);
          setShowSuggestions(false);
        }
      });
    } catch (error) {
      console.error("Error searching places:", error);
      setSuggestions([]);
      setShowSuggestions(false);
    }
  };

  const handleInputChange = (value: string) => {
    setUserIsTyping(true);
    setSearchTerm(value);
    if (value.trim()) {
      searchPlaces(value);
    } else {
      setSuggestions([]);
      setShowSuggestions(false);
    }
  };

  const handlePlaceSelect = (place: any) => {
    setUserIsTyping(false);
    setSearchTerm(place.name || place.formatted_address || '');
    setSuggestions([]);
    setShowSuggestions(false);
    if (onPlaceSelect) {
      // Extract KG MID and other identifiers from the place data
      const identifiers = extractPlaceIdentifiers(place);
      // Merge the original place data with extracted identifiers
      const enhancedPlace = {
        ...place,
        identifiers
      };
      onPlaceSelect(enhancedPlace);
    }
  };

  const extractPlaceIdentifiers = (place: any) => {
    const identifiers: any = {
      placeId: place.place_id,
      types: place.types || [],
      addressComponents: place.address_components || []
    };

    // Extract administrative information
    if (place.address_components) {
      const components = place.address_components;
      identifiers.country = components.find((c: any) => c.types.includes('country'))?.long_name;
      identifiers.countryCode = components.find((c: any) => c.types.includes('country'))?.short_name;
      identifiers.administrativeArea = components.find((c: any) => c.types.includes('administrative_area_level_1'))?.long_name;
      identifiers.locality = components.find((c: any) => c.types.includes('locality'))?.long_name;
      identifiers.postalCode = components.find((c: any) => c.types.includes('postal_code'))?.long_name;
    }

    // Try to extract KG MID from the place data
    // KG MID is typically available in the place result
    if (place.kg_mid || place.kgmid) {
      identifiers.kgMid = place.kg_mid || place.kgmid;
    }

    // Extract coordinates
    if (place.geometry?.location) {
      identifiers.coordinates = {
        lat: place.geometry.location.lat(),
        lng: place.geometry.location.lng()
      };
    }

    return identifiers;
  };

  return {
    isLoading,
    apiError,
    suggestions,
    showSuggestions,
    searchTerm,
    handleInputChange,
    handlePlaceSelect,
    setShowSuggestions,
    setUserIsTyping
  };
};

interface EnhancedPlaceData {
  name?: string;
  formatted_address?: string;
  place_id?: string;
  geometry?: any;
  types?: string[];
  address_components?: any[];
  identifiers?: {
    placeId: string;
    types: string[];
    addressComponents: any[];
    country?: string;
    countryCode?: string;
    administrativeArea?: string;
    locality?: string;
    postalCode?: string;
    kgMid?: string;
    coordinates?: {
      lat: number;
      lng: number;
    };
  };
}

interface CityAutocompleteProps {
  value: string;
  onChange: (city: string, cityData?: EnhancedPlaceData) => void;
  label?: string;
  placeholder?: string;
  error?: string;
  apiKey: string;
}

interface AddressAutocompleteProps {
  value: string;
  onChange: (address: string, addressData?: EnhancedPlaceData) => void;
  city?: string;
  label?: string;
  placeholder?: string;
  error?: string;
  apiKey: string;
}

interface AirportSelectionProps {
  selectedAirports: string[];
  onChange: (airports: string[]) => void;
  city: string;
  label?: string;
  error?: string;
  apiKey: string;
}

interface Airport {
  code: string;
  name: string;
  placeId: string;
  city?: string;
  country?: string;
}

// Initialize Google Maps API using the new loader
let isGoogleMapsLoaded = false;
let loadingPromise: Promise<void> | null = null;

const loadGoogleMapsAPI = async (apiKey: string): Promise<void> => {
  if (isGoogleMapsLoaded) return;

  if (loadingPromise) return loadingPromise;

  if (!apiKey) {
    throw new Error('Google Maps API key is required');
  }

  loadingPromise = (async () => {
    try {
    // Check if already loaded
    if (window.google && window.google.maps && window.google.maps.places) {
      isGoogleMapsLoaded = true;
      loadingPromise = null;
      return;
    }

      // Configure the loader
      setOptions({
        key: apiKey,
        libraries: ['places', 'geometry'],
        region: 'US',
        language: 'en',
      });

      // Load the Google Maps API
      await importLibrary('places');
      await importLibrary('geometry');

        isGoogleMapsLoaded = true;
        loadingPromise = null;
    } catch (error) {
      loadingPromise = null;
      throw new Error(`Failed to load Google Maps API: ${error}`);
    }
  })();

  return loadingPromise;
};

// City Autocomplete Component
export const CityAutocomplete: React.FC<CityAutocompleteProps> = ({
  value,
  onChange,
  label = "City",
  placeholder = "Enter city name",
  error,
  apiKey,
}) => {
  const autocomplete = useGooglePlacesAutocomplete(apiKey, 'cities', (place) => {
    if (place && place.name) {
      onChange(place.name, place);
    }
  }, value);

  return (
    <div>
      {label && <Label htmlFor="city">{label}</Label>}
      <div className="mt-1 relative">
      <Input
        id="city"
          value={autocomplete.searchTerm}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => autocomplete.handleInputChange(e.target.value)}
          placeholder={autocomplete.isLoading ? "Loading..." : placeholder}
          disabled={autocomplete.isLoading || !!autocomplete.apiError}
        className="mt-1"
          onBlur={() => {
            setTimeout(() => autocomplete.setShowSuggestions(false), 200);
            autocomplete.setUserIsTyping(false);
          }}
          onFocus={() => autocomplete.searchTerm && autocomplete.setShowSuggestions(true)}
        />

        {autocomplete.showSuggestions && autocomplete.suggestions.length > 0 && (
          <div className="absolute z-50 w-full mt-1 bg-popover border border-border rounded-md shadow-lg">
            {autocomplete.suggestions.map((suggestion, index) => (
              <div
                key={suggestion.place_id || index}
                className="px-3 py-2 cursor-pointer hover:bg-accent hover:text-accent-foreground border-b border-border last:border-b-0"
                onClick={() => autocomplete.handlePlaceSelect(suggestion)}
              >
                <div className="font-medium">{suggestion.name}</div>
                {suggestion.formatted_address && (
                  <div className="text-sm text-muted-foreground">{suggestion.formatted_address}</div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
      {autocomplete.apiError && <p className="text-sm text-red-500 mt-1">{autocomplete.apiError}</p>}
      {error && <p className="text-sm text-red-500 mt-1">{error}</p>}
    </div>
  );
};

// Address Autocomplete Component
export const AddressAutocomplete: React.FC<AddressAutocompleteProps> = ({
  value,
  onChange,
  city,
  label = "Address",
  placeholder = "Enter address",
  error,
  apiKey,
}) => {
  const autocomplete = useGooglePlacesAutocomplete(apiKey, 'addresses', (place) => {
    if (place && place.formatted_address) {
      onChange(place.formatted_address, place);
    }
  }, value, city); // Pass city to restrict address searches

  return (
    <div>
      {label && <Label htmlFor="address">{label}</Label>}
      <div className="mt-1 relative">
      <Input
        id="address"
          value={autocomplete.searchTerm}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => autocomplete.handleInputChange(e.target.value)}
          placeholder={autocomplete.isLoading ? "Loading..." : (!city || city.trim() === '' ? 'Please select a city first' : placeholder)}
          disabled={autocomplete.isLoading || !!autocomplete.apiError || !city || city.trim() === ''}
        className="mt-1"
          onBlur={() => {
            setTimeout(() => autocomplete.setShowSuggestions(false), 200);
            autocomplete.setUserIsTyping(false);
          }}
          onFocus={() => autocomplete.searchTerm && autocomplete.setShowSuggestions(true)}
        />

        {autocomplete.showSuggestions && autocomplete.suggestions.length > 0 && (
          <div className="absolute z-50 w-full mt-1 bg-popover border border-border rounded-md shadow-lg">
            {autocomplete.suggestions.map((suggestion, index) => (
              <div
                key={suggestion.place_id || index}
                className="px-3 py-2 cursor-pointer hover:bg-accent hover:text-accent-foreground border-b border-border last:border-b-0"
                onClick={() => autocomplete.handlePlaceSelect(suggestion)}
              >
                <div className="font-medium">{suggestion.name}</div>
                {suggestion.formatted_address && (
                  <div className="text-sm text-muted-foreground">{suggestion.formatted_address}</div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
      {autocomplete.apiError && <p className="text-sm text-red-500 mt-1">{autocomplete.apiError}</p>}
      {error && <p className="text-sm text-red-500 mt-1">{error}</p>}
    </div>
  );
};


// Airport Selection Component
export const AirportSelection: React.FC<AirportSelectionProps> = ({
  selectedAirports,
  onChange,
  city,
  label = "Airports",
  error,
  apiKey,
}) => {
  const [airports, setAirports] = useState<Airport[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);
  const [manualAirportInput, setManualAirportInput] = useState("");

  useEffect(() => {
    let isComponentMounted = true;

    const fetchAirports = async () => {
      if (!city) {
        if (isComponentMounted) setAirports([]);
        return;
      }

      // Check if API key is provided
      if (!apiKey || apiKey.trim() === '') {
        if (isComponentMounted) {
          setApiError('Google Maps API key is required. Please configure VITE_GOOGLE_MAPS_API_KEY in your environment variables.');
        setAirports([]);
        }
        return;
      }

      if (isComponentMounted) setIsLoading(true);

      try {
        await loadGoogleMapsAPI(apiKey);

        if (window.google && window.google.maps && isComponentMounted) {
          try {
            const geocoder = new window.google.maps.Geocoder();

            geocoder.geocode(
              { address: city },
              async (results: any, status: any) => {
                if (!isComponentMounted) {
                  return;
                }

                if (
                  status === window.google.maps.GeocoderStatus.OK &&
                  results &&
                  results[0]
                ) {
                  const cityLocation = results[0].geometry.location;
                  try {
                    const nearbyAirports = await findNearestAirports(
                      cityLocation.lat(),
                      cityLocation.lng(),
                      {
                        limit: 8,
                        maxDistanceKm: 250,
                        cityHint: city,
                      }
                    );

                    if (isComponentMounted && nearbyAirports.length > 0) {
                      const airportList = nearbyAirports.map(
                        (airport: NearbyAirport) => ({
                          code: airport.iata,
                          name: airport.name,
                          placeId: airport.icao || airport.iata,
                          city: airport.city,
                          country: airport.country,
                        })
                      );

                      setAirports(airportList);
                      onChange(airportList.map((airport) => airport.code));
                      setIsLoading(false);
                      setApiError(null);
                      return;
                    }
                  } catch (error) {
                    console.warn("Failed to load nearby airports dataset", error);
                  }

                  // Dataset fallback: use Places API nearby search
                  const map = new window.google.maps.Map(
                    document.createElement("div")
                  );
                  const service = new window.google.maps.places.PlacesService(
                    map
                  );

                  const request: any = {
                    location: cityLocation,
                    radius: 50000,
                    type: "airport",
                  };

                  service.nearbySearch(
                    request,
                    (places: any, nearbyStatus: any) => {
                      if (!isComponentMounted) {
                        return;
                      }

                      if (
                        nearbyStatus ===
                          window.google.maps.places.PlacesServiceStatus.OK &&
                        places
                      ) {
                        const airportList: Airport[] = places
                          .filter((place: any) => place && place.place_id)
                          .map((place: any) => {
                            const code = extractAirportCode(
                              place.name || "",
                              place.place_id || ""
                            );
                            return {
                              code,
                              name: place.name || "",
                              placeId: place.place_id || "",
                            };
                          })
                          .filter(
                            (airport: Airport) =>
                              airport.code && airport.code.length === 3
                          )
                          .slice(0, 6);

                        setAirports(airportList);

                        if (airportList.length > 0) {
                          const allAirportCodes = airportList.map(
                            (airport) => airport.code
                          );
                          onChange(allAirportCodes);
                        }
                      } else {
                        const staticAirports = getStaticAirportsForCity(city);
                        setAirports(staticAirports);
                        if (staticAirports.length > 0) {
                          const allAirportCodes = staticAirports.map(
                            (airport) => airport.code
                          );
                          onChange(allAirportCodes);
                        }
                      }
                      setIsLoading(false);
                      setApiError(null);
                    }
                  );
                } else {
                  const staticAirports = getStaticAirportsForCity(city);
                  setAirports(staticAirports);
                  if (staticAirports.length > 0) {
                    const allAirportCodes = staticAirports.map(
                      (airport) => airport.code
                    );
                    onChange(allAirportCodes);
                  }
                  setIsLoading(false);
                  setApiError(null);
                }
              }
            );
          } catch (error) {
            console.warn("Airport search failed, using static list:", error);
            const staticAirports = getStaticAirportsForCity(city);
            setAirports(staticAirports);
            if (staticAirports.length > 0) {
              const allAirportCodes = staticAirports.map(
                (airport) => airport.code
              );
              onChange(allAirportCodes);
            }
            setIsLoading(false);
            setApiError(null);
          }
        } else if (isComponentMounted) {
          setIsLoading(false);
          setApiError('Google Maps API not available');
        }
      } catch (error) {
        console.error("Error fetching airports:", error);
        if (isComponentMounted) {
          setApiError(error instanceof Error ? error.message : 'Failed to load airports');
        setIsLoading(false);
          setAirports([]);
        }
      }
    };

    fetchAirports();

    return () => {
      isComponentMounted = false;
    };
  }, [city, apiKey]);

  const extractAirportCode = (name: string, placeId?: string): string => {
    // First try to extract code from name (e.g., "Los Angeles International Airport (LAX)")
    const match = name.match(/\(([A-Z]{3})\)/);
    if (match) return match[1];

    // Last resort: try to extract any 3-letter uppercase code from the name first
    const anyCodeMatch = name.match(/\b([A-Z]{3})\b/);
    if (anyCodeMatch) return anyCodeMatch[1];

    // Use lookup table for common airport names (much expanded)
    const airportCodeMap: { [key: string]: string } = {
      // US Airports
      'los angeles international': 'LAX',
      'lax': 'LAX',
      'john f. kennedy international': 'JFK',
      'john f kennedy': 'JFK',
      'jfk': 'JFK',
      'laguardia': 'LGA',
      'newark liberty international': 'EWR',
      'newark': 'EWR',
      "o'hare international": 'ORD',
      "o'hare": 'ORD',
      'ohare': 'ORD',
      'chicago midway': 'MDW',
      'midway': 'MDW',
      'miami international': 'MIA',
      'fort lauderdale': 'FLL',
      'san francisco international': 'SFO',
      'sfo': 'SFO',
      'oakland international': 'OAK',
      'san jose international': 'SJC',
      'hollywood burbank': 'BUR',
      'burbank': 'BUR',
      'long beach': 'LGB',
      'seattle-tacoma international': 'SEA',
      'seattle tacoma': 'SEA',
      'sea-tac': 'SEA',
      'boston logan international': 'BOS',
      'logan international': 'BOS',
      'philadelphia international': 'PHL',
      'washington dulles international': 'IAD',
      'dulles': 'IAD',
      'ronald reagan washington national': 'DCA',
      'reagan national': 'DCA',
      'baltimore/washington international': 'BWI',
      'bwi': 'BWI',
      'denver international': 'DEN',
      'dallas/fort worth international': 'DFW',
      'dfw': 'DFW',
      'dallas love field': 'DAL',
      'love field': 'DAL',
      'george bush intercontinental': 'IAH',
      'houston intercontinental': 'IAH',
      'william p. hobby': 'HOU',
      'houston hobby': 'HOU',
      'phoenix sky harbor international': 'PHX',
      'sky harbor': 'PHX',
      'mccarran international': 'LAS',
      'las vegas': 'LAS',
      'orlando international': 'MCO',
      'tampa international': 'TPA',
      'atlanta hartsfield-jackson': 'ATL',
      'hartsfield-jackson': 'ATL',
      'charlotte douglas international': 'CLT',
      'detroit metropolitan wayne county': 'DTW',
      'minneapolis-saint paul international': 'MSP',
      'minneapolis st paul': 'MSP',
      'salt lake city international': 'SLC',
      'portland international': 'PDX',
      'san diego international': 'SAN',
      'sacramento international': 'SMF',
      
      // International Airports
      'heathrow': 'LHR',
      'gatwick': 'LGW',
      'london city': 'LCY',
      'stansted': 'STN',
      'luton': 'LTN',
      'charles de gaulle': 'CDG',
      'cdg': 'CDG',
      'paris orly': 'ORY',
      'orly': 'ORY',
      'frankfurt': 'FRA',
      'munich': 'MUC',
      'amsterdam schiphol': 'AMS',
      'schiphol': 'AMS',
      'madrid-barajas': 'MAD',
      'barajas': 'MAD',
      'barcelona-el prat': 'BCN',
      'el prat': 'BCN',
      'rome fiumicino': 'FCO',
      'fiumicino': 'FCO',
      'narita international': 'NRT',
      'narita': 'NRT',
      'haneda': 'HND',
      'tokyo haneda': 'HND',
      'sydney kingsford smith': 'SYD',
      'kingsford smith': 'SYD',
      'sydney': 'SYD',
      'melbourne': 'MEL',
      'toronto pearson': 'YYZ',
      'pearson': 'YYZ',
      'billy bishop toronto': 'YTZ',
      'billy bishop': 'YTZ',
      'vancouver international': 'YVR',
      'mexico city international': 'MEX',
      'cancún international': 'CUN',
      'cancun': 'CUN',
      'rio de janeiro-galeão': 'GIG',
      'galeão': 'GIG',
      'santos dumont': 'SDU',
      'são paulo-guarulhos': 'GRU',
      'sao paulo guarulhos': 'GRU',
      'guarulhos': 'GRU',
      'são paulo-congonhas': 'CGH',
      'congonhas': 'CGH',
      'dubai international': 'DXB',
      'singapore changi': 'SIN',
      'changi': 'SIN',
      'hong kong international': 'HKG',
      'beijing capital international': 'PEK',
      'shanghai pudong': 'PVG',
      'pudong': 'PVG',
      'incheon international': 'ICN',
      'incheon': 'ICN',
    };

    // Convert name to lowercase for lookup
    const normalizedName = name.toLowerCase().trim();

    // Direct lookup
    if (airportCodeMap[normalizedName]) {
      return airportCodeMap[normalizedName];
    }

    // Partial match lookup (check if normalized name contains any key)
    for (const [airportName, code] of Object.entries(airportCodeMap)) {
      if (normalizedName.includes(airportName)) {
        return code;
      }
    }

    // Try to extract from placeId (sometimes contains airport code)
    if (placeId) {
      const idMatch = placeId.match(/([A-Z]{3})$/);
      if (idMatch) return idMatch[1];
    }

    // If all else fails, return empty string (will be filtered out)
    console.warn(`Could not extract airport code for: "${name}"`);
    return "";
  };

  const getStaticAirportsForCity = (cityName: string): Airport[] => {
    // Static list of major airports for common cities
    const airportData: { [key: string]: Airport[] } = {
      'new york': [
        { code: 'JFK', name: 'John F. Kennedy International Airport', placeId: 'jfk', city: 'New York', country: 'United States' },
        { code: 'LGA', name: 'LaGuardia Airport', placeId: 'lga', city: 'New York', country: 'United States' },
        { code: 'EWR', name: 'Newark Liberty International Airport', placeId: 'ewr', city: 'Newark', country: 'United States' }
      ],
      'los angeles': [
        { code: 'LAX', name: 'Los Angeles International Airport', placeId: 'lax', city: 'Los Angeles', country: 'United States' },
        { code: 'BUR', name: 'Hollywood Burbank Airport', placeId: 'bur', city: 'Burbank', country: 'United States' },
        { code: 'LGB', name: 'Long Beach Airport', placeId: 'lgb', city: 'Long Beach', country: 'United States' }
      ],
      'chicago': [
        { code: 'ORD', name: "O'Hare International Airport", placeId: 'ord', city: 'Chicago', country: 'United States' },
        { code: 'MDW', name: 'Chicago Midway International Airport', placeId: 'mdw', city: 'Chicago', country: 'United States' }
      ],
      'miami': [
        { code: 'MIA', name: 'Miami International Airport', placeId: 'mia', city: 'Miami', country: 'United States' },
        { code: 'FLL', name: 'Fort Lauderdale-Hollywood International Airport', placeId: 'fll', city: 'Fort Lauderdale', country: 'United States' }
      ],
      'san francisco': [
        { code: 'SFO', name: 'San Francisco International Airport', placeId: 'sfo', city: 'San Francisco', country: 'United States' },
        { code: 'OAK', name: 'Oakland International Airport', placeId: 'oak', city: 'Oakland', country: 'United States' },
        { code: 'SJC', name: 'San Jose International Airport', placeId: 'sjc', city: 'San Jose', country: 'United States' }
      ],
      'london': [
        { code: 'LHR', name: 'Heathrow Airport', placeId: 'lhr', city: 'London', country: 'United Kingdom' },
        { code: 'LGW', name: 'Gatwick Airport', placeId: 'lgw', city: 'London', country: 'United Kingdom' },
        { code: 'LCY', name: 'London City Airport', placeId: 'lcy', city: 'London', country: 'United Kingdom' }
      ],
      'paris': [
        { code: 'CDG', name: 'Charles de Gaulle Airport', placeId: 'cdg', city: 'Paris', country: 'France' },
        { code: 'ORY', name: "Paris Orly Airport", placeId: 'ory', city: 'Paris', country: 'France' }
      ],
      'tokyo': [
        { code: 'NRT', name: 'Narita International Airport', placeId: 'nrt', city: 'Tokyo', country: 'Japan' },
        { code: 'HND', name: 'Haneda Airport', placeId: 'hnd', city: 'Tokyo', country: 'Japan' }
      ],
      'sydney': [
        { code: 'SYD', name: 'Sydney Airport', placeId: 'syd', city: 'Sydney', country: 'Australia' }
      ],
      'toronto': [
        { code: 'YYZ', name: 'Toronto Pearson International Airport', placeId: 'yyz', city: 'Toronto', country: 'Canada' },
        { code: 'YTZ', name: 'Billy Bishop Toronto City Airport', placeId: 'ytz', city: 'Toronto', country: 'Canada' }
      ],
      'vancouver': [
        { code: 'YVR', name: 'Vancouver International Airport', placeId: 'yvr', city: 'Vancouver', country: 'Canada' }
      ],
      'mexico city': [
        { code: 'MEX', name: 'Mexico City International Airport', placeId: 'mex', city: 'Mexico City', country: 'Mexico' }
      ],
      'rio de janeiro': [
        { code: 'GIG', name: 'Rio de Janeiro-Galeão International Airport', placeId: 'gig', city: 'Rio de Janeiro', country: 'Brazil' },
        { code: 'SDU', name: 'Santos Dumont Airport', placeId: 'sdu', city: 'Rio de Janeiro', country: 'Brazil' }
      ],
      'sao paulo': [
        { code: 'GRU', name: 'São Paulo-Guarulhos International Airport', placeId: 'gru', city: 'São Paulo', country: 'Brazil' },
        { code: 'CGH', name: 'São Paulo-Congonhas Airport', placeId: 'cgh', city: 'São Paulo', country: 'Brazil' }
      ]
    };

    // Try to find airports for the city (case insensitive)
    const normalizedCity = cityName.toLowerCase().trim();

    // Direct match
    if (airportData[normalizedCity]) {
      return airportData[normalizedCity];
    }

    // Partial match (e.g., "los angeles" matches "los angeles")
    for (const [city, airports] of Object.entries(airportData)) {
      if (normalizedCity.includes(city) || city.includes(normalizedCity)) {
        return airports;
      }
    }

    // If no match found, return a default list of major airports
    return [
      { code: 'LAX', name: 'Los Angeles International Airport', placeId: 'lax' },
      { code: 'JFK', name: 'John F. Kennedy International Airport', placeId: 'jfk' },
      { code: 'ORD', name: "O'Hare International Airport", placeId: 'ord' }
    ];
  };

  const handleAirportToggle = (airportCode: string) => {
    if (selectedAirports.includes(airportCode)) {
      // Deselect if already selected
      const newSelection = selectedAirports.filter((code) => code !== airportCode);
      if (newSelection.length > 0) {
        onChange(newSelection);
      }
    } else {
      // Select if not selected
      onChange([...selectedAirports, airportCode]);
    }
  };

  const handleAddManualAirport = async () => {
    if (manualAirportInput.trim()) {
      const input = manualAirportInput.trim().toUpperCase();

      // Check if it's an airport code (3 letters) or a full name
      if (input.length === 3 && /^[A-Z]{3}$/.test(input)) {
        // It's an airport code
        const airportReference = await findAirportByCode(input);
        const newAirport: Airport = airportReference
          ? {
              code: airportReference.iata,
              name: airportReference.name,
              placeId: airportReference.icao || airportReference.iata,
              city: airportReference.city,
              country: airportReference.country,
            }
          : {
              code: input,
              name: `${input} Airport`,
              placeId: input.toLowerCase(),
            };

        // Add to airports list if not already present
        const existingIndex = airports.findIndex(a => a.code === newAirport.code);
        if (existingIndex === -1) {
          setAirports(prev => [...prev, newAirport]);
          // Auto-select the new airport (use code, not placeId)
          onChange([...selectedAirports, newAirport.code]);
        }
      } else {
        // Try to extract airport code from the input or create a generic one
        const matchedAirport = await findAirportByName(input);
        const code =
          matchedAirport?.iata ||
          extractAirportCode(input) ||
          input.substring(0, 3).toUpperCase();
        const newAirport: Airport = matchedAirport
          ? {
              code: matchedAirport.iata,
              name: matchedAirport.name,
              placeId: matchedAirport.icao || matchedAirport.iata,
              city: matchedAirport.city,
              country: matchedAirport.country,
            }
          : {
              code: code,
              name: input,
              placeId: code.toLowerCase(),
            };

        // Add to airports list if not already present
        const existingIndex = airports.findIndex(a => a.code === newAirport.code);
        if (existingIndex === -1) {
          setAirports(prev => [...prev, newAirport]);
          // Auto-select the new airport (use code, not placeId)
          onChange([...selectedAirports, newAirport.code]);
        }
      }

      setManualAirportInput("");
    }
  };

  if (!city) {
    return (
      <div>
        {label && <Label>{label}</Label>}
        <p className="text-sm text-muted-foreground mt-1">
          Please select a city first to see available airports
        </p>
      </div>
    );
  }

  return (
    <div>
      {label && <Label>{label}</Label>}

      {/* Manual airport input */}
      <div className="mt-1 flex gap-2">
        <Input
          placeholder="Enter airport code (e.g., LAX, JFK)"
          value={manualAirportInput}
          onChange={(e) => setManualAirportInput(e.target.value.toUpperCase())}
          className="flex-1"
          maxLength={3}
        />
        <Button
          type="button"
          onClick={handleAddManualAirport}
          disabled={!manualAirportInput.trim()}
          size="sm"
        >
          Add
        </Button>
      </div>

      {isLoading ? (
        <p className="text-sm text-muted-foreground mt-1">Loading airports...</p>
      ) : airports.length === 0 ? (
        <p className="text-sm text-muted-foreground mt-1">
          No airports found. Enter an airport code above to add one manually.
        </p>
      ) : (
        <Card className="mt-2">
          <CardContent className="pt-4">
            <div className="space-y-2">
              {airports.map((airport) => (
                <div key={airport.code} className="flex items-center space-x-2">
                  <Checkbox
                    id={airport.code}
                    checked={selectedAirports.includes(airport.code)}
                    onCheckedChange={() => handleAirportToggle(airport.code)}
                    disabled={!!apiError}
                  />
                  <label
                    htmlFor={airport.code}
                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                  >
                    {airport.name} ({airport.code})
                    {airport.city && (
                      <span className="text-muted-foreground">
                        {" "}
                        • {airport.city}
                        {airport.country ? `, ${airport.country}` : ""}
                      </span>
                    )}
                  </label>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
      {apiError && <p className="text-sm text-red-500 mt-1">{apiError}</p>}
      {error && <p className="text-sm text-red-500 mt-1">{error}</p>}
    </div>
  );
};
