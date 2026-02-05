import {
  type User,
  type UpsertUser,
  type SavedSearch,
  type InsertSavedSearch,
  type PriceAlert,
  type InsertPriceAlert,
  type TripComparison,
  type InsertTripComparison,
  type PlanOptimization,
  type InsertPlanOptimization,
} from "@shared/schema";

// Interface for storage operations
export interface IStorage {
  // User operations (not used without auth)
  getUser(id: string): Promise<User | undefined>;
  upsertUser(user: UpsertUser): Promise<User>;
  
  // Saved searches (not used without auth)
  getSavedSearches(userId: string): Promise<SavedSearch[]>;
  getSavedSearch(id: string): Promise<SavedSearch | undefined>;
  createSavedSearch(search: InsertSavedSearch): Promise<SavedSearch>;
  deleteSavedSearch(id: string): Promise<void>;
  
  // Price alerts (not used - feature removed)
  getPriceAlerts(userId: string): Promise<PriceAlert[]>;
  getPriceAlert(id: string): Promise<PriceAlert | undefined>;
  createPriceAlert(alert: InsertPriceAlert): Promise<PriceAlert>;
  updatePriceAlert(id: string, data: Partial<InsertPriceAlert>): Promise<PriceAlert | undefined>;
  deletePriceAlert(id: string): Promise<void>;
  
  // Trip comparisons (not used - feature removed)
  getTripComparisons(userId: string): Promise<TripComparison[]>;
  getTripComparison(id: string): Promise<TripComparison | undefined>;
  createTripComparison(comparison: InsertTripComparison): Promise<TripComparison>;
  updateTripComparison(id: string, data: Partial<InsertTripComparison>): Promise<TripComparison | undefined>;
  deleteTripComparison(id: string): Promise<void>;
  
  // Plan optimizations (not used - feature removed)
  getPlanOptimizations(userId: string): Promise<PlanOptimization[]>;
  getPlanOptimization(id: string): Promise<PlanOptimization | undefined>;
  createPlanOptimization(plan: InsertPlanOptimization): Promise<PlanOptimization>;
  updatePlanOptimization(id: string, data: Partial<InsertPlanOptimization>): Promise<PlanOptimization | undefined>;
  deletePlanOptimization(id: string): Promise<void>;
}

// No-op storage implementation (no database required)
// All methods are stubs since we don't use authentication or persistent storage
export class NoOpStorage implements IStorage {
  // User operations (not used without auth)
  async getUser(id: string): Promise<User | undefined> {
    return undefined;
  }

  async upsertUser(userData: UpsertUser): Promise<User> {
    return {
      id: userData.id || 'default-id',
      email: userData.email || null,
      firstName: userData.firstName || null,
      lastName: userData.lastName || null,
      profileImageUrl: userData.profileImageUrl || null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
  }

  // Saved searches (not used without auth)
  async getSavedSearches(userId: string): Promise<SavedSearch[]> {
    return [];
  }

  async getSavedSearch(id: string): Promise<SavedSearch | undefined> {
    return undefined;
  }

  async createSavedSearch(search: InsertSavedSearch): Promise<SavedSearch> {
    throw new Error("Saved searches not available without authentication");
  }

  async deleteSavedSearch(id: string): Promise<void> {
    throw new Error("Saved searches not available without authentication");
  }

  // Price alerts (feature removed)
  async getPriceAlerts(userId: string): Promise<PriceAlert[]> {
    return [];
  }

  async getPriceAlert(id: string): Promise<PriceAlert | undefined> {
    return undefined;
  }

  async createPriceAlert(alert: InsertPriceAlert): Promise<PriceAlert> {
    throw new Error("Price alerts feature removed");
  }

  async updatePriceAlert(id: string, data: Partial<InsertPriceAlert>): Promise<PriceAlert | undefined> {
    return undefined;
  }

  async deletePriceAlert(id: string): Promise<void> {
    throw new Error("Price alerts feature removed");
  }

  // Trip comparisons (feature removed)
  async getTripComparisons(userId: string): Promise<TripComparison[]> {
    return [];
  }

  async getTripComparison(id: string): Promise<TripComparison | undefined> {
    return undefined;
  }

  async createTripComparison(comparison: InsertTripComparison): Promise<TripComparison> {
    throw new Error("Trip comparisons feature removed");
  }

  async updateTripComparison(id: string, data: Partial<InsertTripComparison>): Promise<TripComparison | undefined> {
    return undefined;
  }

  async deleteTripComparison(id: string): Promise<void> {
    throw new Error("Trip comparisons feature removed");
  }

  // Plan optimizations (feature removed)
  async getPlanOptimizations(userId: string): Promise<PlanOptimization[]> {
    return [];
  }

  async getPlanOptimization(id: string): Promise<PlanOptimization | undefined> {
    return undefined;
  }

  async createPlanOptimization(plan: InsertPlanOptimization): Promise<PlanOptimization> {
    throw new Error("Plan optimizations feature removed");
  }

  async updatePlanOptimization(id: string, data: Partial<InsertPlanOptimization>): Promise<PlanOptimization | undefined> {
    return undefined;
  }

  async deletePlanOptimization(id: string): Promise<void> {
    throw new Error("Plan optimizations feature removed");
  }
}

export const storage = new NoOpStorage();
