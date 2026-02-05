# XNooks - Travel Expense Optimization Platform

A comprehensive travel expense optimization platform designed for corporate travel managers to plan cost-effective business trips with intelligent travel planning, expense tracking, and optimized booking recommendations.

## Features

### Smart Trip Planning
- **6-Step Trip Wizard** - Guided workflow from meeting details to complete itinerary with expense breakdown
- **Multi-City Travel Support** - Plan trips across multiple meetings in different cities with optimized routing
- **Meeting-Based Itinerary Building** - Automatically calculates optimal flight bundles connecting all meeting locations
- **Complete Trip Summary** - View comprehensive itinerary overview with detailed expense analysis

### Flight Search & Booking
- **Flexible Search Options** - Support for round-trip, one-way, and multi-city flight searches
- **Real-Time Pricing** - Integration with Google Flights API via SerpAPI for up-to-date flight data
- **Intelligent Flight Selection** - Two-step round-trip selection (outbound then return) and multi-segment selection for complex itineraries
- **Advanced Filtering** - Filter by number of stops, price range, airlines, departure times, carbon emissions, and luggage options
- **Best Deal Indicators** - Highlighted recommendations for best value flights
- **Carbon Footprint Tracking** - View and compare emissions across different flight options

### Hotel Search & Selection
- **Comprehensive Hotel Search** - Powered by Google Hotels API with extensive property database
- **Smart Filtering** - Filter by property type, amenities, hotel brands, star ratings, price range, cancellation policies, and eco-certifications
- **Distance Optimization** - Calculate hotel proximity to meeting locations for convenience
- **Detailed Property Information** - Access comprehensive hotel details with direct booking links
- **Amenity Preferences** - Specify required amenities (WiFi, parking, fitness center, etc.)

### Search Management
- **Saved Searches** - Save flight search parameters for future reference and reuse
- **Price Alerts** - Set target prices for specific routes and receive notifications when prices drop
- **Trip Comparisons** - Compare multiple flight and hotel options side-by-side with notes
- **Shareable Searches** - URL-based search parameters for easy sharing

### Expense Optimization
- **Cost Analysis** - Detailed breakdown of travel expenses across flights, hotels, and ground transportation
- **Budget Tracking** - Monitor spending against travel budgets
- **Money-Saving Tips** - Intelligent recommendations for reducing travel costs
- **Expense Reports** - Generate comprehensive expense summaries

### User Experience
- **Dark/Light Mode** - Theme support for user preference
- **Responsive Design** - Optimized for desktop and mobile devices
- **Professional UI** - Clean, data-dense layouts built with Shadcn UI components
- **Location Autocomplete** - Google Places integration for accurate location search
- **Real-time Updates** - WebSocket support for live data updates

## Tech Stack

### Frontend
- React 18 with TypeScript
- Wouter (routing)
- TanStack Query (data fetching and caching)
- React Hook Form + Zod (form management and validation)
- Shadcn UI + Radix UI (component library)
- Tailwind CSS (styling)
- Lucide React (icons)
- Google Maps JavaScript API (location services)

### Backend
- Express.js with TypeScript
- SerpAPI (Google Flights and Hotels data)
- WebSocket (real-time updates)
- Drizzle ORM (database management)
- PostgreSQL with Neon serverless adapter

### Build Tools
- Vite (frontend build)
- esbuild (backend bundling)
- TypeScript (type safety)

## Getting Started

### Prerequisites
- Node.js (v18 or higher)
- npm or yarn
- SerpAPI account and API key
- Google Maps API key
- PostgreSQL database (optional, for persistent storage)

### Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd XNooks_EMA
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables:
Create a `.env` file in the root directory:
```env
# Required
SERPAPI_KEY=your_serpapi_key_here
GOOGLE_MAPS_API_KEY=your_google_maps_api_key_here

# Optional (for persistent storage)
DATABASE_URL=your_postgresql_connection_string
SESSION_SECRET=your_session_secret
```

4. Run the development server:
```bash
npm run dev
```

5. Open your browser and navigate to `http://localhost:5000`

### Production Build

```bash
npm run build
npm start
```

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `SERPAPI_KEY` | Yes | API key for SerpAPI (Google Flights/Hotels) |
| `GOOGLE_MAPS_API_KEY` | Yes | Google Maps JavaScript API key for location services |
| `DATABASE_URL` | No | PostgreSQL connection string (optional for persistence) |
| `SESSION_SECRET` | No | Secret key for session management |

## Usage

1. **Start a New Trip**: Use the Smart Trip Planner to create a new business trip
2. **Add Meeting Details**: Enter meeting locations, dates, and times
3. **Set Preferences**: Choose flight class, hotel amenities, and budget constraints
4. **Browse Options**: Review flight and hotel options with intelligent filtering
5. **Compare & Select**: Use comparison tools to evaluate options
6. **Review Itinerary**: View complete trip summary with expense breakdown
7. **Save & Share**: Save searches and share trip details with stakeholders

## Features in Development

- Calendar integration for meeting synchronization
- Team collaboration for multi-traveler bookings
- Expense report export (PDF, CSV)
- Travel policy compliance checking
- Historical price tracking and trends

## License

Copyright © 2024 XNooks. All rights reserved.
