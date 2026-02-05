export interface AirportReference {
  iata: string;
  icao?: string;
  name: string;
  city?: string;
  state?: string;
  country?: string;
  latitude: number;
  longitude: number;
}

export interface NearbyAirport extends AirportReference {
  distanceKm: number;
}

const AIRPORTS_DATA_PATH = `${import.meta.env.BASE_URL || "/"}airports.json`;
const EARTH_RADIUS_KM = 6371;

let airportCache: AirportReference[] | null = null;
let loadPromise: Promise<AirportReference[]> | null = null;

const toRadians = (value: number) => (value * Math.PI) / 180;

const haversineDistance = (
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number => {
  const dLat = toRadians(lat2 - lat1);
  const dLon = toRadians(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRadians(lat1)) *
      Math.cos(toRadians(lat2)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return EARTH_RADIUS_KM * c;
};

const normalize = (value?: string | null) =>
  value
    ? value
        .toLowerCase()
        .normalize("NFKD")
        .replace(/[^\w\s-]/g, "")
        .replace(/\s+/g, " ")
        .trim()
    : "";

const loadAirportData = async (): Promise<AirportReference[]> => {
  if (airportCache) {
    return airportCache;
  }

  if (!loadPromise) {
    loadPromise = (async () => {
      const response = await fetch(AIRPORTS_DATA_PATH);

      if (!response.ok) {
        throw new Error("Unable to fetch airport reference data.");
      }

      const rawData = await response.json();

      const airports: AirportReference[] = Object.values(rawData)
        .filter((entry: any) => entry && typeof entry === "object")
        .map((entry: any) => ({
          iata: entry.iata?.toUpperCase?.() ?? "",
          icao: entry.icao?.toUpperCase?.(),
          name: entry.name ?? "",
          city: entry.city ?? entry.municipality,
          state: entry.state,
          country: entry.country ?? entry.iso,
          latitude:
            typeof entry.lat === "number"
              ? entry.lat
              : typeof entry.lat_deg === "number"
              ? entry.lat_deg
              : NaN,
          longitude:
            typeof entry.lon === "number"
              ? entry.lon
              : typeof entry.lon_deg === "number"
              ? entry.lon_deg
              : NaN,
        }))
        .filter(
          (airport) =>
            airport.iata &&
            airport.iata.length === 3 &&
            Number.isFinite(airport.latitude) &&
            Number.isFinite(airport.longitude)
        );

      airportCache = airports;
      loadPromise = null;
      return airports;
    })().catch((error) => {
      loadPromise = null;
      throw error;
    });
  }

  return loadPromise;
};

export const getAirportReferenceData = async (): Promise<AirportReference[]> => {
  return loadAirportData();
};

export const findAirportByCode = async (
  code: string
): Promise<AirportReference | undefined> => {
  if (!code) return undefined;
  const normalizedCode = code.trim().toUpperCase();
  const airports = await loadAirportData();
  return airports.find((airport) => airport.iata === normalizedCode);
};

export const findAirportByName = async (
  name: string,
  cityHint?: string
): Promise<AirportReference | undefined> => {
  if (!name) return undefined;
  const normalizedName = normalize(name);
  const normalizedCity = normalize(cityHint);
  const airports = await loadAirportData();

  let candidates = airports.filter((airport) => {
    const airportName = normalize(airport.name);
    const airportCity = normalize(airport.city);

    const exactMatch =
      airportName === normalizedName || airportName.includes(normalizedName);
    const cityMatch =
      normalizedCity &&
      (airportCity === normalizedCity || airportCity.includes(normalizedCity));
    const combinedMatch =
      normalizedName &&
      (airportName.includes(normalizedName) ||
        normalizedName.includes(airportName));

    return exactMatch || (cityMatch && combinedMatch);
  });

  if (candidates.length === 0) {
    candidates = airports.filter((airport) => {
      const airportName = normalize(airport.name);
      return normalizedName && normalizedName.includes(airportName);
    });
  }

  return candidates.sort((a, b) =>
    normalize(a.name).length - normalize(b.name).length
  )[0];
};

export interface NearbyAirportOptions {
  limit?: number;
  maxDistanceKm?: number;
  cityHint?: string;
}

export const findNearestAirports = async (
  latitude: number,
  longitude: number,
  options: NearbyAirportOptions = {}
): Promise<NearbyAirport[]> => {
  const airports = await loadAirportData();
  const limit = options.limit ?? 6;
  const maxDistance = options.maxDistanceKm ?? 200;
  const normalizedCity = normalize(options.cityHint);

  const nearbyAirports = airports
    .map((airport) => {
      const distanceKm = haversineDistance(
        latitude,
        longitude,
        airport.latitude,
        airport.longitude
      );
      return {
        ...airport,
        distanceKm,
      };
    })
    .filter((airport) => airport.distanceKm <= maxDistance)
    .sort((a, b) => a.distanceKm - b.distanceKm);

  if (nearbyAirports.length === 0) {
    return airports
      .map((airport) => ({
        ...airport,
        distanceKm: haversineDistance(
          latitude,
          longitude,
          airport.latitude,
          airport.longitude
        ),
      }))
      .sort((a, b) => a.distanceKm - b.distanceKm)
      .slice(0, limit);
  }

  if (normalizedCity) {
    const cityMatches = nearbyAirports.filter((airport) =>
      normalize(airport.city).includes(normalizedCity)
    );
    if (cityMatches.length > 0) {
      return cityMatches.slice(0, limit);
    }
  }

  return nearbyAirports.slice(0, limit);
};

