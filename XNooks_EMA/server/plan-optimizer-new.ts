// New two-step plan optimizer implementation
// This will replace the existing logic in routes.ts

export async function optimizeFlights(
  optimizationData: any,
  segments: any[],
  SERPAPI_KEY: string,
  SERPAPI_BASE_URL: string
) {
  const firstSegment = segments[0];
  const lastSegment = segments[segments.length - 1];

  // Step 1: Search for OUTBOUND flights across the flexible date range
  const outboundDates: string[] = [];

  // Generate outbound dates within arrival flexibility
  const firstMeetingStart = new Date(firstSegment.requiredArrival);
  for (let daysBefore = optimizationData.settings.maxArrivalFlexDays; daysBefore >= optimizationData.settings.minArrivalFlexDays; daysBefore--) {
    const searchDate = new Date(firstMeetingStart);
    searchDate.setDate(searchDate.getDate() - daysBefore);
    outboundDates.push(searchDate.toISOString().split('T')[0]);
  }

  console.log(`Step 1: Searching ${outboundDates.length} outbound dates`);
  console.log('Outbound dates:', outboundDates);

  const allOutboundFlights: any[] = [];

  // Search for outbound flights on each date
  for (const outboundDate of outboundDates) {
    const params = new URLSearchParams({
      engine: 'google_flights',
      api_key: SERPAPI_KEY || '',
      currency: optimizationData.currency || 'USD',
      hl: 'en',
      type: '2', // One-way to get outbound flights with departure_token
      travel_class: optimizationData.travelClass,
      adults: optimizationData.adults.toString(),
      children: (optimizationData.children || 0).toString(),
      infants_in_seat: (optimizationData.infantsInSeat || 0).toString(),
      infants_on_lap: (optimizationData.infantsOnLap || 0).toString(),
      departure_id: optimizationData.homeAirport,
      arrival_id: segments[0].airport,
      outbound_date: outboundDate,
    });

    // Add max stops filter
    if (optimizationData.settings.maxStops === 0) {
      params.append('stops', '0');
    } else if (optimizationData.settings.maxStops === 1) {
      params.append('stops', '1');
    }

    // Add show_hidden and deep_search parameters
    if (optimizationData.showHidden) {
      params.append('show_hidden', 'true');
    }
    if (optimizationData.deepSearch) {
      params.append('deep_search', 'true');
    }

    console.log(`Fetching outbound flights for ${outboundDate}`);
    const response = await fetch(`${SERPAPI_BASE_URL}?${params.toString()}`);
    
    if (!response.ok) {
      console.warn(`Failed to fetch outbound flights for ${outboundDate}`);
      continue;
    }

    const data = await response.json();
    const flights = [...(data.best_flights || []), ...(data.other_flights || [])];
    console.log(`Found ${flights.length} outbound flights for ${outboundDate}`);
    allOutboundFlights.push(...flights);
  }

  console.log(`Total outbound flights found: ${allOutboundFlights.length}`);

  // Step 2: Filter outbound flights that arrive in time for the meeting
  const latestAcceptableArrival = new Date(firstSegment.requiredArrival);
  
  const fittingOutboundFlights = allOutboundFlights.filter(flight => {
    if (!flight.flights || flight.flights.length === 0) return false;
    
    // Get arrival time at meeting city
    const lastSegment = flight.flights[flight.flights.length - 1];
    const arrivalTimeStr = lastSegment.arrival_airport?.time;
    if (!arrivalTimeStr) return false;

    const arrivalTime = new Date(arrivalTimeStr);

    // Check if arrives on time
    return arrivalTime <= latestAcceptableArrival;
  });

  console.log(`${fittingOutboundFlights.length} outbound flights arrive in time for the meeting`);

  // Step 3: For each fitting outbound flight, get return flights using departure_token
  const allFlightCombinations: any[] = [];
  
  for (const outboundFlight of fittingOutboundFlights) {
    if (!outboundFlight.departure_token) {
      console.warn('Outbound flight missing departure_token, skipping');
      continue;
    }

    // Generate return dates within departure flexibility
    const returnDates: string[] = [];
    const lastMeetingEnd = new Date(lastSegment.earliestDeparture);
    
    for (let daysAfter = optimizationData.settings.minDepartureFlexDays; daysAfter <= optimizationData.settings.maxDepartureFlexDays; daysAfter++) {
      const searchDate = new Date(lastMeetingEnd);
      searchDate.setDate(searchDate.getDate() + daysAfter);
      returnDates.push(searchDate.toISOString().split('T')[0]);
    }

    // Get return flights for each return date
    for (const returnDate of returnDates) {
      const params = new URLSearchParams({
        engine: 'google_flights',
        api_key: SERPAPI_KEY || '',
        departure_token: outboundFlight.departure_token,
        type: '1', // Round-trip
        hl: 'en',
        departure_id: optimizationData.homeAirport,
        arrival_id: segments[0].airport,
        return_date: returnDate,
        travel_class: optimizationData.travelClass,
        adults: optimizationData.adults.toString(),
        currency: optimizationData.currency || 'USD',
      });

      if (optimizationData.showHidden) params.append('show_hidden', 'true');
      if (optimizationData.deepSearch) params.append('deep_search', 'true');

      const response = await fetch(`${SERPAPI_BASE_URL}?${params.toString()}`);
      
      if (!response.ok) {
        console.warn(`Failed to fetch return flights for return date ${returnDate}`);
        continue;
      }

      const data = await response.json();
      const returnFlights = [...(data.best_flights || []), ...(data.other_flights || [])];
      
      // Each return flight is a complete round-trip with the selected outbound
      allFlightCombinations.push(...returnFlights);
    }
  }

  console.log(`Total flight combinations found: ${allFlightCombinations.length}`);

  // Step 4: Mark each flight as fitting or not based on return departure time
  const earliestAcceptableDeparture = new Date(lastSegment.earliestDeparture);

  const flightsWithFitStatus = allFlightCombinations.map(flight => {
    const issues: string[] = [];
    
    if (!flight.flights || flight.flights.length === 0) {
      return { ...flight, fitsConstraints: false, constraintIssues: ['No flight segments'] };
    }

    // Find return departure (first segment leaving meeting city)
    const meetingAirport = segments[0].airport;
    let returnStartIndex = -1;
    
    for (let i = 0; i < flight.flights.length; i++) {
      if (flight.flights[i].departure_airport?.id === meetingAirport) {
        returnStartIndex = i;
        break;
      }
    }

    if (returnStartIndex === -1) {
      return { ...flight, fitsConstraints: false, constraintIssues: ['No return departure found'] };
    }

    // Get return departure time
    const returnDepartureTimeStr = flight.flights[returnStartIndex].departure_airport?.time;
    if (!returnDepartureTimeStr) {
      return { ...flight, fitsConstraints: false, constraintIssues: ['Missing return departure time'] };
    }

    const returnDepartureTime = new Date(returnDepartureTimeStr);

    // Check if return departs after the meeting ends (with buffer)
    if (returnDepartureTime < earliestAcceptableDeparture) {
      issues.push('Departs too early after meeting');
    }

    return { 
      ...flight, 
      fitsConstraints: issues.length === 0, 
      constraintIssues: issues.length > 0 ? issues : undefined 
    };
  });

  // Separate flights into fitting and non-fitting
  const fittingFlights = flightsWithFitStatus.filter(f => f.fitsConstraints);
  const nonFittingFlights = flightsWithFitStatus.filter(f => !f.fitsConstraints);

  console.log(`Flight analysis: ${fittingFlights.length} fit all constraints, ${nonFittingFlights.length} don't fit`);

  return {
    flights: flightsWithFitStatus,
    totalFlightsChecked: allFlightCombinations.length,
    validFlightsCount: fittingFlights.length,
    nonFittingFlightsCount: nonFittingFlights.length
  };
}
