import { z } from "zod";
import { sql } from 'drizzle-orm';
import {
  index,
  jsonb,
  pgTable,
  timestamp,
  varchar,
  integer,
  text,
  boolean,
  decimal,
} from "drizzle-orm/pg-core";

// Session storage table.
// (IMPORTANT) This table is mandatory for Replit Auth, don't drop it.
export const sessions = pgTable(
  "sessions",
  {
    sid: varchar("sid").primaryKey(),
    sess: jsonb("sess").notNull(),
    expire: timestamp("expire").notNull(),
  },
  (table) => [index("IDX_session_expire").on(table.expire)],
);

// User storage table.
// (IMPORTANT) This table is mandatory for Replit Auth, don't drop it.
export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  email: varchar("email").unique(),
  firstName: varchar("first_name"),
  lastName: varchar("last_name"),
  profileImageUrl: varchar("profile_image_url"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export type UpsertUser = typeof users.$inferInsert;
export type User = typeof users.$inferSelect;

// Saved searches table
export const savedSearches = pgTable("saved_searches", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: 'cascade' }),
  name: varchar("name").notNull(),
  type: varchar("type").notNull(), // "1", "2", or "3" (Round trip, One way, Multi-city)
  departureId: varchar("departure_id"),
  arrivalId: varchar("arrival_id"),
  outboundDate: varchar("outbound_date"),
  returnDate: varchar("return_date"),
  multiCitySegments: jsonb("multi_city_segments"), // Array of segments for multi-city
  travelClass: varchar("travel_class").notNull(),
  adults: integer("adults").notNull(),
  children: integer("children").notNull().default(0),
  infantsInSeat: integer("infants_in_seat").notNull().default(0),
  infantsOnLap: integer("infants_on_lap").notNull().default(0),
  createdAt: timestamp("created_at").defaultNow(),
});

export type SavedSearch = typeof savedSearches.$inferSelect;
export type InsertSavedSearch = typeof savedSearches.$inferInsert;

// Price alerts table
export const priceAlerts = pgTable("price_alerts", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: 'cascade' }),
  name: varchar("name").notNull(),
  type: varchar("type").notNull(), // "1" or "2"
  departureId: varchar("departure_id").notNull(),
  arrivalId: varchar("arrival_id").notNull(),
  outboundDate: varchar("outbound_date"),
  returnDate: varchar("return_date"),
  travelClass: varchar("travel_class").notNull(),
  adults: integer("adults").notNull(),
  targetPrice: decimal("target_price", { precision: 10, scale: 2 }).notNull(),
  currentPrice: decimal("current_price", { precision: 10, scale: 2 }),
  isActive: boolean("is_active").notNull().default(true),
  lastChecked: timestamp("last_checked"),
  createdAt: timestamp("created_at").defaultNow(),
});

export type PriceAlert = typeof priceAlerts.$inferSelect;
export type InsertPriceAlert = typeof priceAlerts.$inferInsert;

// Trip comparisons table
export const tripComparisons = pgTable("trip_comparisons", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: 'cascade' }),
  name: varchar("name").notNull(),
  flights: jsonb("flights").notNull(), // Array of FlightOption
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export type TripComparison = typeof tripComparisons.$inferSelect;
export type InsertTripComparison = typeof tripComparisons.$inferInsert;

// Plan Optimizer table
export const planOptimizations = pgTable("plan_optimizations", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: 'cascade' }),
  name: varchar("name").notNull(),
  meetings: jsonb("meetings").notNull(), // Array of meeting objects
  settings: jsonb("settings").notNull(), // Optimization settings object
  results: jsonb("results"), // Array of valid flight combinations
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export type PlanOptimization = typeof planOptimizations.$inferSelect;
export type InsertPlanOptimization = typeof planOptimizations.$inferInsert;

// Flight search request schemas
export const multiCitySegmentSchema = z.object({
  departure_id: z.string().min(3, "Departure airport required"),
  arrival_id: z.string().min(3, "Arrival airport required"),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date format"),
  times: z.string().optional(),
});

export const flightSearchSchema = z.object({
  type: z.enum(["1", "2", "3"]), // 1: Round trip, 2: One way, 3: Multi-city
  departure_id: z.string().min(3, "Departure airport required").optional(),
  arrival_id: z.string().min(3, "Arrival airport required").optional(),
  outbound_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date format").optional(),
  return_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date format").optional(),
  multi_city_json: z.array(multiCitySegmentSchema).optional(),
  travel_class: z.enum(["1", "2", "3", "4"]).default("1"), // 1: Economy, 2: Premium economy, 3: Business, 4: First
  adults: z.number().min(1).max(9).default(1),
  children: z.number().min(0).max(9).default(0),
  infants_in_seat: z.number().min(0).max(9).default(0),
  infants_on_lap: z.number().min(0).max(9).default(0),
  stops: z.enum(["0", "1", "2", "3"]).optional(), // 0: Any, 1: Nonstop, 2: 1 stop or fewer, 3: 2 stops or fewer
  max_price: z.number().optional(),
  sort_by: z.enum(["1", "2", "3", "4", "5", "6"]).optional(), // 1: Top, 2: Price, 3: Departure, 4: Arrival, 5: Duration, 6: Emissions
  show_hidden: z.boolean().optional(), // Include hidden flights in results
  deep_search: z.boolean().optional(), // Enable deep search for more comprehensive results
  no_cache: z.boolean().optional(), // Bypass cache for fresh results
  currency: z.string().default("USD"),
});

export type FlightSearchRequest = z.infer<typeof flightSearchSchema>;
export type MultiCitySegment = z.infer<typeof multiCitySegmentSchema>;

// For backwards compatibility
export const multiCityFlightSchema = multiCitySegmentSchema;

// Flight response types
export interface Airport {
  name: string;
  id: string;
  time: string;
}

export interface Flight {
  departure_airport: Airport;
  arrival_airport: Airport;
  duration: number;
  airplane?: string;
  airline: string;
  airline_logo: string;
  travel_class: string;
  flight_number: string;
  extensions?: string[];
  legroom?: string;
  overnight?: boolean;
  often_delayed_by_over_30_min?: boolean;
}

export interface Layover {
  duration: number;
  name: string;
  id: string;
  overnight?: boolean;
}

export interface CarbonEmissions {
  this_flight: number;
  typical_for_this_route: number;
  difference_percent: number;
}

export interface FlightOption {
  flights: Flight[];
  layovers?: Layover[];
  total_duration: number;
  carbon_emissions?: CarbonEmissions;
  price: number;
  type: string;
  airline_logo: string;
  extensions?: string[];
  departure_token?: string;
  booking_token?: string;
}

export interface PriceInsights {
  lowest_price: number;
  price_level: string;
  typical_price_range?: number[];
  price_history?: number[][];
}

export interface FlightSearchResponse {
  search_metadata?: {
    status: string;
  };
  best_flights?: FlightOption[];
  other_flights?: FlightOption[];
  price_insights?: PriceInsights;
  error?: string;
}

export type MultiCityFlight = z.infer<typeof multiCityFlightSchema>;

// Plan Optimizer schemas
export const meetingSchema = z.object({
  name: z.string().min(1, "Meeting name required"),
  address: z.string().min(1, "Address required"),
  city: z.string().min(1, "City required"),
  airport_id: z.string().min(3, "Airport required"),
  start_datetime: z.string().regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/, "Invalid datetime format"),
  end_datetime: z.string().regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/, "Invalid datetime format"),
  arrival_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date format"),
});

export const optimizationSettingsSchema = z.object({
  driving_time_minutes: z.number().min(0).max(300).default(30),
  airport_buffer_hours: z.number().min(0).max(12).default(3),
  include_airlines: z.string().optional(),
  exclude_airlines: z.string().optional(),
  travel_class: z.enum(["1", "2", "3", "4"]).default("1"),
  currency: z.string().default("USD"),
  outbound_times: z.string().optional(),
  return_times: z.string().optional(),
  layover_duration: z.string().optional(),
  adults: z.number().min(1).max(9).default(1),
  children: z.number().min(0).max(9).default(0),
  infants_in_seat: z.number().min(0).max(9).default(0),
  infants_on_lap: z.number().min(0).max(9).default(0),
});

export const planOptimizationRequestSchema = z.object({
  name: z.string().min(1, "Plan name required"),
  home_airport_id: z.string().min(3, "Home airport required"),
  return_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date format"),
  meetings: z.array(meetingSchema).min(1, "At least one meeting required"),
  settings: optimizationSettingsSchema,
});

export type Meeting = z.infer<typeof meetingSchema>;
export type OptimizationSettings = z.infer<typeof optimizationSettingsSchema>;
export type PlanOptimizationRequest = z.infer<typeof planOptimizationRequestSchema>;

// Airport autocomplete suggestion type
export interface AirportSuggestion {
  code: string;
  name: string;
  city?: string;
  country?: string;
}
