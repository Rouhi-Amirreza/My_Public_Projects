# XNooks - Travel Expense Optimization Platform

## Overview
XNooks is a comprehensive travel expense optimization platform designed to help corporate travel managers plan cost-effective business trips. The application integrates SerpApi's Google Flights and Google Hotels APIs with Google Maps services to provide intelligent travel planning, real-time expense tracking, and optimized booking recommendations. The platform is fully public with no authentication or database requirements, delivering a professional, streamlined interface for efficient travel expense management.

## Brand Identity
- **Platform Name**: XNooks
- **Tagline**: Travel Expense Optimizer
- **Design Focus**: Cost optimization, automated planning, professional corporate interface
- **Color Scheme**: Violet-Indigo-Blue gradient (modern, trustworthy, professional)
- **Target Audience**: Corporate travel managers, finance teams, business travelers

## User Preferences
- Professional corporate design with emphasis on expense optimization
- Violet-indigo-blue gradient color scheme throughout
- Card-based layouts with modern shadows and borders
- Responsive mobile-first approach
- Stock photography for professional appearance
- Clean, modern interface with focus on cost savings

## Recent Changes (October 2025)
### Completed Redesigns
1. **Home Page**: Complete professional redesign with XNooks branding
   - Hero section with professional stock imagery
   - Expense optimization focus with savings calculator
   - Feature highlights with icons
   - Testimonials and call-to-action sections
   - Professional navigation with theme toggle

2. **Trip Planner Page**: Premium interface with XNooks branding
   - Professional hero section with stock imagery
   - Sticky navigation header with XNooks logo
   - Smart Trip Builder interface
   - Multi-step wizard with progress indicators
   - Cost optimization badges and visual elements
   - Enhanced employee info section with gradient styling

### Stock Images Used
- Professional office scenes
- Business travelers
- Corporate meetings
- Expense tracking visuals
- Modern workplace environments

## System Architecture
The application is built with a React TypeScript frontend and an Express.js backend. **No database or authentication required** - the app runs as a fully public tool without persistent storage.

### Frontend
- **Framework & Routing**: React with TypeScript and Wouter for routing
- **Data Fetching**: TanStack Query for data fetching and caching
- **Form Management & Validation**: React Hook Form with Zod validation
- **UI/UX**: Shadcn UI components with Tailwind CSS for styling, Lucide React for icons, and date-fns for date formatting
- **Theming**: Dark mode support with theme toggle component
- **Key Features**:
    - **Smart Trip Planner**: 6-step wizard for comprehensive business trip planning
      - Step 1: Meeting information with city/address/airport selection
      - Step 2: Flight preferences with travel class and passenger details
      - Step 3: Hotel preferences with amenities and brand filters
      - Step 4: Flight selection from bundled options
      - Step 5: Hotel selection with distance optimization
      - Step 6: Itinerary summary with expense breakdown
    - **Two-step Round-trip Selection**: Users select outbound flights, then return flights are fetched based on the selected outbound `departure_token`
    - **Multi-city Selection**: A multi-step process where flights are selected segment-by-segment. The price displayed for each flight is the total for the entire multi-city trip
    - **Hotel Search**: Comprehensive hotel and accommodation search using Google Hotels API with property types, amenities, brands, ratings, price ranges, and sorting options
    - **Deep Search & Show Hidden Flights**: Options to enable more comprehensive results
    - **Expense Optimization**: Real-time cost analysis and savings recommendations

### Backend
- **Server**: Express.js
- **Database**: None - Application runs without database requirements
- **Authentication**: Disabled. The application is fully public and accessible without login
- **Storage**: NoOpStorage implementation (no persistent data)
- **Validation**: Zod for request validation
- **API Endpoints**:
    - `/api/flights/search`: For initial flight searches
    - `/api/flights/return`: Fetches return flights for round-trip searches
    - `/api/flights/next-segment`: Fetches subsequent segments for multi-city searches
    - `/api/hotels/search`: Searches for hotels and accommodations with comprehensive filtering options
    - `/api/hotels/details`: Fetches detailed hotel information and booking options using property_token
    - `/api/saved-searches`: Returns empty array (feature disabled without authentication)

## Setup Instructions

### 1. Environment Configuration
Create a `.env` file in the root directory based on `.env.example`:

```bash
cp .env.example .env
```

Then edit `.env` and add your API keys:

```env
SERPAPI_KEY=your_serpapi_key_here
VITE_GOOGLE_MAPS_API_KEY=your_google_maps_api_key_here
```

### 2. Google Maps API Setup
The application uses Google Maps Places API for location autocomplete and airport search features in the Trip Planner:

1. **Get a Google Maps API Key**:
   - Visit [Google Cloud Console](https://console.cloud.google.com/google/maps-apis)
   - Create a new project or select an existing one
   - Enable the following APIs:
     - **Maps JavaScript API**
     - **Places API**
   - Create credentials (API key) and restrict it to your domain for security

2. **Add the API Key to Environment**:
   - Add `VITE_GOOGLE_MAPS_API_KEY=your_actual_api_key` to your `.env` file
   - The API key is used by the trip planner for city and address autocomplete, and airport search

### 3. Required APIs
- **Maps JavaScript API**: For loading the Google Maps library
- **Places API**: For autocomplete functionality and place searches

## External Dependencies
- **SerpApi**: Used for real-time travel data via environment variable `SERPAPI_KEY`:
  - **Google Flights API**: Flight search and pricing data
  - **Google Hotels API**: Hotel search, property details, and booking options
- **Google Maps Platform**: Used for location services in the trip planner via `VITE_GOOGLE_MAPS_API_KEY`:
  - **Maps JavaScript API**: Core Google Maps functionality
  - **Places API**: Location autocomplete and place search

## Project Structure
```
client/src/
├── pages/
│   ├── home.tsx                    # XNooks homepage with expense optimization focus
│   ├── trip-planner.tsx            # Smart trip builder with 6-step wizard
│   ├── flights.tsx                 # Flight search interface
│   ├── hotels.tsx                  # Hotel search interface
│   └── meeting-flights.tsx         # Multi-city business trip planner
├── components/
│   ├── ui/                         # Shadcn UI components
│   ├── theme-toggle.tsx            # Dark/light mode switcher
│   └── google-places-autocomplete.tsx  # Google Maps integration
└── lib/
    └── queryClient.ts              # TanStack Query configuration

server/
├── index.ts                        # Express server entry point
└── routes.ts                       # API route handlers

attached_assets/
└── stock_images/                   # Professional stock photography
```

## Development
- Run `npm run dev` to start both frontend (Vite) and backend (Express)
- The application runs on port 5000
- Hot reload enabled for development

## Design System
- **Primary Colors**: Violet-Indigo-Blue gradient
- **Components**: Shadcn UI with custom XNooks theming
- **Typography**: Modern sans-serif with clear hierarchy
- **Spacing**: Consistent padding and margins throughout
- **Icons**: Lucide React for consistent iconography
- **Cards**: Elevated with subtle shadows and borders
- **Buttons**: Multiple variants (default, outline, ghost) with hover states
- **Badges**: Color-coded for different information types