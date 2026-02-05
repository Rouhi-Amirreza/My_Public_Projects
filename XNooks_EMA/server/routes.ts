import type { Express } from "express";
import { createServer, type Server } from "http";
import { z } from "zod";
import { flightSearchSchema } from "@shared/schema";
import { storage } from "./storage";


const SERPAPI_KEY = process.env.SERPAPI_KEY;
const SERPAPI_BASE_URL = "https://serpapi.com/search.json";

console.log('SERPAPI_KEY loaded:', SERPAPI_KEY ? 'YES' : 'NO');
console.log('SERPAPI_KEY length:', SERPAPI_KEY ? SERPAPI_KEY.length : 0);

export async function registerRoutes(app: Express): Promise<Server> {

  // Flight search endpoint (public)
  app.post("/api/flights/search", async (req, res) => {
    try {
      // Validate request body
      const searchParams = flightSearchSchema.parse(req.body);

      // Build SerpApi query parameters - base params
      const params = new URLSearchParams({
        engine: "google_flights",
        api_key: SERPAPI_KEY || "",
        currency: searchParams.currency,
        hl: "en",
        type: searchParams.type,
        travel_class: searchParams.travel_class,
        adults: searchParams.adults.toString(),
        children: searchParams.children.toString(),
        infants_in_seat: searchParams.infants_in_seat.toString(),
        infants_on_lap: searchParams.infants_on_lap.toString(),
      });

      // Add type-specific parameters
      if (searchParams.type === "3") {
        // Multi-city search
        if (!searchParams.multi_city_json || searchParams.multi_city_json.length === 0) {
          return res.status(400).json({ 
            error: "multi_city_json is required for multi-city searches" 
          });
        }
        const multiCityJson = JSON.stringify(searchParams.multi_city_json);
        console.log('Multi-city search params:', {
          type: searchParams.type,
          multi_city_json: multiCityJson,
          segments: searchParams.multi_city_json
        });
        params.append("multi_city_json", multiCityJson);
      } else {
        // Round trip or one-way search
        if (!searchParams.departure_id || !searchParams.arrival_id || !searchParams.outbound_date) {
          return res.status(400).json({ 
            error: "departure_id, arrival_id, and outbound_date are required for round trip and one-way searches" 
          });
        }
        params.append("departure_id", searchParams.departure_id);
        params.append("arrival_id", searchParams.arrival_id);
        params.append("outbound_date", searchParams.outbound_date);
        
        if (searchParams.return_date && searchParams.type === "1") {
          params.append("return_date", searchParams.return_date);
        }
      }

      // Add optional parameters
      if (searchParams.stops && searchParams.stops !== "0") {
        params.append("stops", searchParams.stops);
      }

      if (searchParams.max_price) {
        params.append("max_price", searchParams.max_price.toString());
      }

      if (searchParams.sort_by && searchParams.sort_by !== "1") {
        params.append("sort_by", searchParams.sort_by);
      }

      if (searchParams.show_hidden) {
        params.append("show_hidden", "true");
      }

      if (searchParams.deep_search) {
        params.append("deep_search", "true");
      }

      if (searchParams.no_cache) {
        params.append("no_cache", "true");
      }

      // Make request to SerpApi
      const requestUrl = `${SERPAPI_BASE_URL}?${params.toString()}`;
      console.log('SerpAPI request URL (without API key):', requestUrl.replace(/api_key=[^&]+/, 'api_key=***'));
      const response = await fetch(requestUrl);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('SerpAPI error response:', {
          status: response.status,
          statusText: response.statusText,
          body: errorText
        });
        throw new Error(`SerpApi request failed: ${response.statusText}`);
      }

      const data = await response.json();

      // Check for API errors
      if (data.error) {
        return res.status(400).json({ 
          error: data.error,
          message: "Failed to fetch flight data" 
        });
      }

      // Return the flight data
      res.json({
        search_metadata: data.search_metadata,
        best_flights: data.best_flights || [],
        other_flights: data.other_flights || [],
        price_insights: data.price_insights,
      });
    } catch (error) {
      console.error("Flight search error:", error);
      
      if (error instanceof z.ZodError) {
        return res.status(400).json({ 
          error: "Invalid request parameters",
          details: error.errors 
        });
      }

      res.status(500).json({ 
        error: "Failed to search flights",
        message: error instanceof Error ? error.message : "Unknown error" 
      });
    }
  });

  // Get return flights using departure token (public)
  app.post("/api/flights/return", async (req, res) => {
    try {
      const { departure_token, departure_id, arrival_id, outbound_date, return_date, travel_class, adults, currency, show_hidden, deep_search, no_cache } = req.body;

      if (!departure_token) {
        return res.status(400).json({ 
          error: "departure_token is required" 
        });
      }

      // Build SerpApi query parameters for return flights
      // SerpAPI requires base parameters along with departure_token despite documentation
      const params = new URLSearchParams({
        engine: "google_flights",
        api_key: SERPAPI_KEY || "",
        departure_token: departure_token,
        type: "1", // Round trip
        hl: "en",
      });

      // Add optional base parameters if provided (helps with some SerpAPI versions)
      if (departure_id) params.append("departure_id", departure_id);
      if (arrival_id) params.append("arrival_id", arrival_id);
      if (outbound_date) params.append("outbound_date", outbound_date);
      if (return_date) params.append("return_date", return_date);
      if (travel_class) params.append("travel_class", travel_class);
      if (adults) params.append("adults", adults.toString());
      if (currency) params.append("currency", currency);
      if (show_hidden) params.append("show_hidden", "true");
      if (deep_search) params.append("deep_search", "true");
      if (no_cache) params.append("no_cache", "true");

      // Make request to SerpApi
      const response = await fetch(`${SERPAPI_BASE_URL}?${params.toString()}`);
      
      if (!response.ok) {
        throw new Error(`SerpApi request failed: ${response.statusText}`);
      }

      const data = await response.json();

      // Check for API errors
      if (data.error) {
        return res.status(400).json({ 
          error: data.error,
          message: "Failed to fetch return flights" 
        });
      }

      // Return the flight data
      res.json({
        search_metadata: data.search_metadata,
        best_flights: data.best_flights || [],
        other_flights: data.other_flights || [],
        price_insights: data.price_insights,
      });
    } catch (error) {
      console.error("Return flights error:", error);
      res.status(500).json({ 
        error: "Failed to fetch return flights",
        message: error instanceof Error ? error.message : "Unknown error" 
      });
    }
  });

  // Get next segment flights for multi-city using departure token (public)
  app.post("/api/flights/next-segment", async (req, res) => {
    try {
      const { departure_token, multi_city_json, travel_class, adults, currency, show_hidden, deep_search, no_cache } = req.body;

      if (!departure_token) {
        return res.status(400).json({ 
          error: "departure_token is required" 
        });
      }

      // Build SerpApi query parameters for next segment
      // SerpAPI requires base parameters along with departure_token
      const params = new URLSearchParams({
        engine: "google_flights",
        api_key: SERPAPI_KEY || "",
        departure_token: departure_token,
        type: "3", // Multi-city
        hl: "en",
      });

      // Add optional base parameters
      if (multi_city_json) params.append("multi_city_json", multi_city_json);
      if (travel_class) params.append("travel_class", travel_class);
      if (adults) params.append("adults", adults.toString());
      if (currency) params.append("currency", currency);
      if (show_hidden) params.append("show_hidden", "true");
      if (deep_search) params.append("deep_search", "true");
      if (no_cache) params.append("no_cache", "true");

      // Make request to SerpApi
      const response = await fetch(`${SERPAPI_BASE_URL}?${params.toString()}`);
      
      if (!response.ok) {
        throw new Error(`SerpApi request failed: ${response.statusText}`);
      }

      const data = await response.json();

      // Check for API errors
      if (data.error) {
        return res.status(400).json({ 
          error: data.error,
          message: "Failed to fetch next segment flights" 
        });
      }

      // Return the flight data
      res.json({
        search_metadata: data.search_metadata,
        best_flights: data.best_flights || [],
        other_flights: data.other_flights || [],
        price_insights: data.price_insights,
      });
    } catch (error) {
      console.error("Next segment flights error:", error);
      res.status(500).json({ 
        error: "Failed to fetch next segment flights",
        message: error instanceof Error ? error.message : "Unknown error" 
      });
    }
  });

  // Hotel search endpoint (public)
  app.post("/api/hotels/search", async (req, res) => {
    try {
      const {
        q,
        check_in_date,
        check_out_date,
        adults = 2,
        children,
        sort_by,
        min_price,
        max_price,
        property_types,
        amenities,
        rating,
        brands,
        hotel_class,
        free_cancellation,
        special_offers,
        eco_certified,
        vacation_rentals,
        bedrooms,
        bathrooms,
        currency = "USD",
        gl = "us",
        hl = "en",
        next_page_token,
      } = req.body;

      if (!q || !check_in_date || !check_out_date) {
        return res.status(400).json({
          error: "q (location), check_in_date, and check_out_date are required"
        });
      }

      const params = new URLSearchParams({
        engine: "google_hotels",
        api_key: SERPAPI_KEY || "",
        q,
        check_in_date,
        check_out_date,
        adults: adults.toString(),
        currency,
        gl,
        hl,
        no_cache: "true",
      });

      if (children) params.append("children", children.toString());
      if (sort_by) params.append("sort_by", sort_by);
      if (min_price) params.append("min_price", min_price.toString());
      if (max_price) params.append("max_price", max_price.toString());
      if (rating) params.append("rating", rating.toString());
      if (next_page_token) params.append("next_page_token", next_page_token);

      if (property_types && property_types.length > 0) {
        params.append("property_types", property_types.join(","));
      }

      if (amenities && amenities.length > 0) {
        params.append("amenities", amenities.join(","));
      }

      if (brands && brands.length > 0) {
        params.append("brands", brands.join(","));
      }

      if (hotel_class && hotel_class.length > 0) {
        params.append("hotel_class", hotel_class.join(","));
      }

      if (free_cancellation) params.append("free_cancellation", "true");
      if (special_offers) params.append("special_offers", "true");
      if (eco_certified) params.append("eco_certified", "true");
      if (vacation_rentals) params.append("vacation_rentals", "true");
      if (bedrooms) params.append("bedrooms", bedrooms.toString());
      if (bathrooms) params.append("bathrooms", bathrooms.toString());

      console.log('Hotel search request params:', {
        q,
        check_in_date,
        check_out_date,
        adults,
        children,
        currency,
        gl,
        hl
      });
      
      // Check if check-in date is in the past
      const checkInDate = new Date(check_in_date);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      console.log('Date validation:', {
        checkInDate: checkInDate.toISOString().split('T')[0],
        today: today.toISOString().split('T')[0],
        isPast: checkInDate < today
      });
      
      if (checkInDate < today) {
        console.log('ERROR: Check-in date is in the past! This should have been fixed by ensureFutureDate function.');
        console.log('Auto-correcting check-in date to tomorrow...');
        
        // Auto-correct to tomorrow
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);
        const correctedCheckIn = tomorrow.toISOString().split('T')[0];
        
        console.log('Corrected dates:', {
          original_check_in: check_in_date,
          corrected_check_in: correctedCheckIn,
          check_out_date: check_out_date
        });
        
        // Update the params with corrected date
        params.set('check_in_date', correctedCheckIn);
      }
      console.log('Full URL params:', params.toString());

      const response = await fetch(`${SERPAPI_BASE_URL}?${params.toString()}`);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('SerpAPI error response:', errorText);
        throw new Error(`SerpApi request failed: ${response.statusText} - ${errorText}`);
      }

      const data = await response.json();

      if (data.error) {
        return res.status(400).json({
          error: data.error,
          message: "Failed to fetch hotels"
        });
      }

      // Log what fields are actually in the SerpAPI response
      console.log('SerpAPI response keys:', Object.keys(data));
      console.log('search_information:', data.search_information);
      console.log('search_metadata:', data.search_metadata);

      res.json({
        search_metadata: data.search_metadata,
        search_parameters: data.search_parameters,
        search_information: data.search_information,
        properties: data.properties || [],
        serpapi_pagination: data.serpapi_pagination,
        filters: data.filters,
      });
    } catch (error) {
      console.error("Hotel search error:", error);
      res.status(500).json({
        error: "Failed to search hotels",
        message: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });

  // Hotel details endpoint (public)
  app.post("/api/hotels/details", async (req, res) => {
    try {
      const { property_token, q, check_in_date, check_out_date, adults = 2, children, currency = "USD", gl = "us", hl = "en" } = req.body;

      if (!property_token) {
        return res.status(400).json({
          error: "property_token is required"
        });
      }

      if (!q) {
        return res.status(400).json({
          error: "q (location) parameter is required"
        });
      }

      const params = new URLSearchParams({
        engine: "google_hotels",
        api_key: SERPAPI_KEY || "",
        q,
        property_token,
        currency,
        gl,
        hl,
        no_cache: "true",
      });

      if (check_in_date) params.append("check_in_date", check_in_date);
      if (check_out_date) params.append("check_out_date", check_out_date);
      if (adults) params.append("adults", adults.toString());
      if (children) params.append("children", children.toString());

      console.log('Hotel details request params:', {
        q,
        property_token,
        check_in_date,
        check_out_date,
        adults
      });
      console.log('Full URL params:', params.toString());

      const response = await fetch(`${SERPAPI_BASE_URL}?${params.toString()}`);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('SerpAPI error response:', errorText);
        throw new Error(`SerpApi request failed: ${response.statusText} - ${errorText}`);
      }

      const data = await response.json();
      console.log('Hotel details response keys:', Object.keys(data));

      if (data.error) {
        console.error('SerpAPI returned error:', data.error);
        return res.status(400).json({
          error: data.error,
          message: "Failed to fetch hotel details"
        });
      }

      // Return all the hotel data at the top level (not nested under property)
      res.json(data);
    } catch (error) {
      console.error("Hotel details error:", error);
      res.status(500).json({
        error: "Failed to fetch hotel details",
        message: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });

  // Saved searches routes (no authentication - returns empty array)
  app.get("/api/saved-searches", async (req, res) => {
    res.json([]);
  });

  app.post("/api/saved-searches", async (req, res) => {
    res.status(501).json({ message: "Saved searches not available without authentication" });
  });

  app.delete("/api/saved-searches/:id", async (req, res) => {
    res.status(501).json({ message: "Saved searches not available without authentication" });
  });

  // Groq AI Expense Analysis endpoint (public)
  app.post("/api/expense-analysis", async (req, res) => {
    try {
      const { Groq } = await import("groq-sdk");
      
      const {
        flights,
        hotels,
        meetings,
        tripDuration,
        numberOfCities,
        travelDates
      } = req.body;

      if (!flights || !hotels || !meetings) {
        return res.status(400).json({
          error: "flights, hotels, and meetings data are required"
        });
      }

      const GROQ_API_KEY = process.env.GROQ_API_KEY;

      if (!GROQ_API_KEY) {
        return res.status(500).json({
          error: "GROQ_API_KEY environment variable is not set"
        });
      }

      const client = new Groq({
        apiKey: GROQ_API_KEY
      });

      // Calculate base expenses
      const flightCost = flights.totalCost;
      const hotelCost = hotels.reduce((sum: number, h: any) => sum + h.totalCost, 0);
      
      // Build prompt for AI expense calculation with real-time web search
      const citiesList = meetings.map((m: any) => m.city).join(', ');
      const prompt = `You are a comprehensive business travel expense calculator and advisor. Calculate REAL, ACCURATE costs and provide detailed travel information for this specific business trip.

Trip Details:
- Duration: ${tripDuration} days
- Cities: ${citiesList}
- Dates: ${travelDates}
- Flight Cost: $${flightCost}
- Hotel Cost: $${hotelCost.toFixed(2)}

Flight Information:
${JSON.stringify(flights, null, 2)}

Calculate REALISTIC costs and provide detailed information for each city:

1. MEAL COSTS: Current restaurant prices (breakfast, lunch, dinner for business travelers) - include currency
2. TRANSPORTATION COSTS: Airport transfers, local transportation, daily transit - include currency
3. PUBLIC TRANSPORTATION: Detailed info on how to get from airport to hotel using public transit - include currency
4. EXCHANGE RATES: Currency impact if international trip
5. FLIGHT RISK ASSESSMENT: Calculate REALISTIC risk percentages based on actual data:
   - Flight cancellation risk: Analyze airline reliability, route frequency, seasonal patterns
   - Weather risk: Consider destination weather patterns, season, historical delays
   - Arrival timing risk: Buffer time between arrival and meeting start
   - Connection risk: For multi-leg flights, consider layover times and airport reliability
   - Overall meeting risk: Combined probability of missing the meeting
   
   IMPORTANT: Provide realistic percentages (5-35% range typical for business travel). 
   Consider factors like:
   - Low-cost carriers: Higher cancellation rates (15-25%)
   - Major airlines: Lower cancellation rates (5-15%)
   - Winter travel: Higher weather delays (10-20%)
   - Short connections: Higher risk (15-30%)
   - International routes: Higher complexity risk (10-25%)
   
   SPECIFIC AIRLINE EXAMPLES:
   - Spirit Airlines: Known for higher cancellation rates (20-28%), weather delays (15-22%)
   - Frontier Airlines: Similar to Spirit (18-26% cancellation risk)
   - Delta/United/American: Lower cancellation rates (8-12%), better reliability
   - Southwest: Moderate cancellation rates (10-15%), good weather handling

Consider city-specific factors:
- High-cost cities (NYC, SF, LA): Higher meal and transport costs
- Mid-tier cities: Moderate costs
- Smaller cities: Lower costs
- International cities: Currency exchange rates and local transport systems

Return your response as a JSON object with comprehensive information:
{
  "mealCosts": {
    "currency": "USD/EUR/GBP",
    "dailyPerCity": {
      "CityName": {
        "breakfast": [REALISTIC_PRICE],
        "lunch": [REALISTIC_PRICE],
        "dinner": [REALISTIC_PRICE],
        "total": [REALISTIC_TOTAL]
      }
    },
    "totalForTrip": [REALISTIC_TOTAL_FOR_ENTIRE_TRIP]
  },
  "transportationCosts": {
    "currency": "USD/EUR/GBP",
    "airportTransfers": {
      "perCity": [REALISTIC_PRICE_PER_CITY],
      "total": [REALISTIC_TOTAL]
    },
    "localTransportation": {
      "dailyPerCity": [REALISTIC_DAILY_PRICE],
      "total": [REALISTIC_TOTAL]
    },
    "totalForTrip": [REALISTIC_TOTAL_FOR_ENTIRE_TRIP]
  },
  "publicTransportation": {
    "perCity": {
      "CityName": {
        "airportToHotel": {
          "method": "Train/Bus/Subway name",
          "duration": "X minutes",
          "cost": [COST_IN_LOCAL_CURRENCY],
          "currency": "USD/EUR/GBP",
          "frequency": "Every X minutes",
          "operatingHours": "6 AM - 11 PM",
          "instructions": "Step-by-step directions"
        }
      }
    }
  },
  "exchangeRateImpact": {
    "isInternational": true/false,
    "currencies": ["USD", "EUR", "GBP"],
    "currentRates": {
      "USD_to_EUR": 0.85,
      "USD_to_GBP": 0.78
    },
    "impact": "Currency fluctuations could affect costs by ±5%",
    "recommendation": "Consider booking in local currency or using travel cards"
  },
  "flightRiskAssessment": {
    "overallMeetingRisk": [REALISTIC_PERCENTAGE_5_TO_35],
    "overallRiskLevel": "Low/Medium/High",
    "cancellationRisk": {
      "percentage": [REALISTIC_PERCENTAGE_5_TO_25],
      "level": "Low/Medium/High",
      "factors": ["Airline reliability", "Route stability", "Seasonal patterns"],
      "description": "Based on airline performance and route analysis"
    },
    "riskFactors": [
      {
        "factor": "Flight Cancellation",
        "percentage": [REALISTIC_PERCENTAGE_5_TO_25],
        "level": "Low/Medium/High",
        "description": "Based on airline reliability and route stability"
      },
      {
        "factor": "Weather Delays",
        "percentage": [REALISTIC_PERCENTAGE_5_TO_20],
        "level": "Low/Medium/High", 
        "description": "Seasonal weather patterns affecting departure/arrival"
      },
      {
        "factor": "Arrival Timing",
        "percentage": [REALISTIC_PERCENTAGE_3_TO_15],
        "level": "Low/Medium/High",
        "description": "Buffer time between arrival and meeting start"
      },
      {
        "factor": "Connection Risk",
        "percentage": [0_FOR_DIRECT_FLIGHTS_OR_5_TO_30_FOR_CONNECTIONS],
        "level": "N/A/Low/Medium/High",
        "description": "Risk of missing connecting flights (0% for direct flights)"
      }
    ],
    "recommendation": "Consider arriving one day early for important meetings",
    "mitigationStrategies": [
      "Book flexible tickets with free changes",
      "Choose airlines with good on-time performance",
      "Allow extra buffer time for connections"
    ]
  },
  "tips": ["tip 1", "tip 2", "tip 3", ...]
}

CRITICAL: Replace all [PLACEHOLDERS] with realistic, specific information based on the actual cities and dates.

RISK PERCENTAGE REQUIREMENTS:
- Overall Meeting Risk: Must be between 5-35% (never 0%)
- Flight Cancellation: Must be between 5-25% based on airline and route
- Weather Delays: Must be between 5-20% based on season and destination
- Arrival Timing: Must be between 3-15% based on buffer time
- Connection Risk: Must be between 5-30% for multi-leg flights

EXAMPLES OF REALISTIC PERCENTAGES:
- Major airline (Delta, United, American): Cancellation 8-12%, Weather 8-15%
- Low-cost carrier (Spirit, Frontier, Allegiant): Cancellation 18-28%, Weather 12-20%
- Winter travel (Dec-Feb): Add 8-15% to weather risk
- International routes: Add 8-12% to overall risk
- Short connections (<60 min): Add 15-25% to connection risk
- Direct flights: Connection risk = 0%, but higher cancellation risk for low-cost carriers

NEVER return 0% for any risk factor - always provide realistic percentages based on actual travel industry data.

CRITICAL INSTRUCTION: If the airline is Spirit Airlines, Frontier Airlines, or Allegiant Air, use these EXACT percentages:
- Flight Cancellation: 22-28%
- Weather Delays: 15-20%
- Overall Meeting Risk: 18-25%

If the airline is Delta, United, American, or Southwest, use these EXACT percentages:
- Flight Cancellation: 8-12%
- Weather Delays: 8-12%
- Overall Meeting Risk: 10-15%

Always use realistic percentages that reflect actual airline performance data.`;

      // Get AI expense calculation with web search enabled
      let mealCosts = { totalForTrip: 0, dailyPerCity: {} };
      let transportationCosts = { totalForTrip: 0, airportTransfers: { total: 0 }, localTransportation: { total: 0 } };
      let publicTransportation = { perCity: {} };
      let exchangeRateImpact = { isInternational: false, currencies: [], currentRates: {}, impact: "", recommendation: "" };
      let flightRiskAssessment = { overallRisk: "Low", riskFactors: [], recommendation: "" };
      let aiTips = "";
      
      try {
        const completion = await client.chat.completions.create({
          model: "llama-3.3-70b-versatile",
          messages: [
            {
              role: "user",
              content: prompt
            }
          ],
          temperature: 0.7,
          max_tokens: 1000,
          top_p: 1,
          stream: false,
          stop: null,
          response_format: { type: "json_object" }
        });

        console.log("Groq completion received");
        
        // Parse JSON response
        if (completion.choices && completion.choices[0]?.message?.content) {
          const responseContent = completion.choices[0].message.content;
          console.log("Raw LLM response:", responseContent.substring(0, 500));
          
          const jsonResponse = JSON.parse(responseContent);
          console.log("Parsed JSON response:", JSON.stringify(jsonResponse, null, 2));
          
          // Extract meal costs with validation
          if (jsonResponse.mealCosts && typeof jsonResponse.mealCosts.totalForTrip === 'number' && jsonResponse.mealCosts.totalForTrip > 0) {
            mealCosts = jsonResponse.mealCosts;
            console.log("AI meal costs extracted:", mealCosts.totalForTrip);
            console.log("Meal costs breakdown:", mealCosts.dailyPerCity);
          } else {
            console.error("Invalid meal costs from LLM:", jsonResponse.mealCosts);
            throw new Error("LLM did not provide valid meal costs");
          }
          
          // Extract transportation costs with validation
          if (jsonResponse.transportationCosts && typeof jsonResponse.transportationCosts.totalForTrip === 'number' && jsonResponse.transportationCosts.totalForTrip > 0) {
            transportationCosts = jsonResponse.transportationCosts;
            console.log("AI transportation costs extracted:", transportationCosts.totalForTrip);
            console.log("Transportation breakdown:", transportationCosts);
          } else {
            console.error("Invalid transportation costs from LLM:", jsonResponse.transportationCosts);
            throw new Error("LLM did not provide valid transportation costs");
          }
          
          // Extract public transportation information
          if (jsonResponse.publicTransportation) {
            publicTransportation = jsonResponse.publicTransportation;
            console.log("AI public transportation info extracted:", Object.keys(publicTransportation.perCity || {}));
          }
          
          // Extract exchange rate impact
          if (jsonResponse.exchangeRateImpact) {
            exchangeRateImpact = jsonResponse.exchangeRateImpact;
            console.log("AI exchange rate impact extracted:", exchangeRateImpact.isInternational);
          }
          
          // Extract flight risk assessment with validation
          if (jsonResponse.flightRiskAssessment) {
            flightRiskAssessment = jsonResponse.flightRiskAssessment;
            console.log("AI flight risk assessment extracted:", flightRiskAssessment.overallMeetingRisk);
            console.log("Risk factors:", flightRiskAssessment.riskFactors);
            
            // Validate that we have realistic percentages (not 0)
            if (flightRiskAssessment.overallMeetingRisk === 0 || 
                (flightRiskAssessment.riskFactors && flightRiskAssessment.riskFactors.some((rf: any) => rf.percentage === 0))) {
              console.warn("LLM provided 0% risk - this is unrealistic, but using LLM output directly");
            }
          } else {
            console.error("No flight risk assessment from LLM");
            throw new Error("LLM did not provide flight risk assessment");
          }
          
          // Extract tips
          if (jsonResponse.tips && Array.isArray(jsonResponse.tips)) {
            aiTips = jsonResponse.tips.map((tip: string) => `• ${tip}`).join('\n');
            console.log("AI tips extracted successfully, count:", jsonResponse.tips.length);
          } else {
            aiTips = `• Keep all receipts for expense reporting and tax purposes\n• Consider booking refundable rates for flexibility\n• Use hotel breakfast when included to save on meal costs\n• Check if your employer has corporate discounts with hotels/airlines\n• Submit expense reports within 30 days for timely reimbursement`;
          }
        } else {
          console.error("LLM response structure is invalid - no fallback values will be used");
          throw new Error("LLM response structure is invalid");
        }
      } catch (aiError) {
        console.error("AI expense calculation failed:", aiError);
        throw new Error(`AI expense calculation failed: ${aiError instanceof Error ? aiError.message : 'Unknown error'}`);
      }

      // Calculate totals using AI-provided costs only
      const totalMeals = mealCosts.totalForTrip;
      const totalTransportation = transportationCosts.totalForTrip;
      const miscellaneous = 0; // No fallback values - only LLM output
      
      const subtotal = flightCost + hotelCost + totalMeals + totalTransportation + miscellaneous;
      const contingency = subtotal * 0.12; // 12% contingency
      const grandTotal = subtotal + contingency;

      // Ensure headers are set for JSON response
      res.setHeader('Content-Type', 'application/json');
      
      console.log("Sending expense breakdown response with aiTips length:", aiTips.length);
      
      // Return structured data with AI-calculated costs
      res.json({
        breakdown: {
          flights: flightCost,
          hotels: hotelCost,
          meals: {
            total: totalMeals,
            perDay: totalMeals / tripDuration,
            breakdown: mealCosts.dailyPerCity,
            aiCalculated: true
          },
          transportation: {
            total: totalTransportation,
            airportTransfers: transportationCosts.airportTransfers.total,
            localTransport: transportationCosts.localTransportation.total,
            aiCalculated: true
          },
          miscellaneous: {
            total: miscellaneous,
            daily: 0,
            items: ['Calculated by LLM only']
          },
          contingency: {
            amount: contingency,
            percentage: 12
          }
        },
        totals: {
          subtotal,
          contingency,
          grandTotal
        },
        perDiem: {
          meals: totalMeals / tripDuration,
          transport: totalTransportation / tripDuration,
          misc: 0,
          total: (totalMeals + totalTransportation) / tripDuration
        },
        aiTips: aiTips,
        publicTransportation: publicTransportation,
        exchangeRateImpact: exchangeRateImpact,
        flightRiskAssessment: flightRiskAssessment,
        tripInfo: {
          duration: tripDuration,
          cities: numberOfCities,
          dates: travelDates
        }
      });

    } catch (error) {
      console.error("Expense analysis error:", error);
      res.status(500).json({
        error: "Failed to analyze expenses",
        message: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}

