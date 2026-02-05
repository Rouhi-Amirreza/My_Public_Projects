# Flight Search Web Application - Design Guidelines

## Design Approach
**System-Based with Travel Industry References**  
Drawing from Material Design principles with inspiration from Google Flights, Kayak, and Skyscanner for flight-specific UI patterns. The focus is on clarity, efficiency, and data-dense layouts that help users make quick booking decisions.

## Core Design Principles
- **Information Hierarchy**: Critical flight data (price, duration, stops) prominently displayed
- **Scannable Results**: Card-based layouts with clear visual separation between flight options
- **Progressive Disclosure**: Show essential info first, expand for details on demand
- **Trust Signals**: Display airline logos, carbon emissions, and booking confidence indicators

## Color Palette

**Light Mode:**
- Primary: 220 90% 56% (Blue - trustworthy, travel-associated)
- Surface: 0 0% 100% (White cards on slight gray background)
- Background: 220 14% 96% (Light gray)
- Success: 142 71% 45% (Green for best deals)
- Warning: 38 92% 50% (Amber for price alerts)
- Text Primary: 220 9% 15%
- Text Secondary: 220 9% 46%

**Dark Mode:**
- Primary: 220 90% 66%
- Surface: 220 13% 15%
- Background: 220 13% 10%
- Success: 142 71% 55%
- Warning: 38 92% 60%
- Text Primary: 220 9% 98%
- Text Secondary: 220 9% 65%

## Typography
- **Font Family**: 'Inter' for UI, 'Manrope' for headings
- **Headings**: 
  - H1: 2.5rem/3rem, font-weight 700 (Search section titles)
  - H2: 1.875rem/2.25rem, font-weight 600 (Results headers)
  - H3: 1.5rem/2rem, font-weight 600 (Flight card titles)
- **Body**: 
  - Large: 1rem/1.5rem, font-weight 400 (Primary content)
  - Regular: 0.875rem/1.25rem, font-weight 400 (Flight details)
  - Small: 0.75rem/1rem, font-weight 500 (Labels, badges)
- **Emphasis**: 
  - Price: 1.5rem/2rem, font-weight 700
  - Duration: 0.875rem/1.25rem, font-weight 500

## Layout System
**Spacing Primitives**: Use Tailwind units of 4, 6, 8, 12, 16, 24
- Component padding: p-6
- Card spacing: gap-4
- Section margins: my-12 or my-16
- Inline spacing: space-x-4

**Grid Structure**:
- Search form: Full-width container, max-w-7xl
- Results layout: Single column on mobile, max-w-7xl on desktop
- Filters sidebar: Hidden on mobile (drawer), 280px fixed on lg:

## Component Library

### Search Form Section
- Tabbed interface: Round Trip | One Way | Multi-city
- Input fields with icon prefixes (plane, calendar, users)
- Auto-complete dropdowns for airport selection with IATA codes
- Date picker with calendar overlay showing price trends
- Passenger selector with increment/decrement controls
- Travel class dropdown: Economy, Premium Economy, Business, First
- Large CTA button: "Search Flights" w-full on mobile, auto-width on desktop
- Advanced filters accordion below (optional): stops, airlines, times

### Flight Results Cards
- White/dark surface cards with subtle shadow and hover elevation
- Header row: Airline logo (48x48), flight number, aircraft type
- Time display: Large departure/arrival times with airport codes
- Duration bar: Visual timeline with layover indicators (dots)
- Price display: Bold, right-aligned with "Select" CTA button
- Expandable details: Show on click with flight path, amenities, baggage
- Carbon emissions badge: Icon + percentage difference from typical
- Best deal ribbon: Green "Best Value" or "Fastest" flag on top deals

### Filter Sidebar
- Sticky position on desktop (top-24)
- Collapsible sections: Stops, Price Range, Airlines, Departure Times, Layovers
- Price slider with min/max handles
- Checkbox groups for airlines with logos
- Time range sliders (visual blocks for AM/PM periods)
- Apply/Reset buttons at bottom

### Navigation Header
- Logo left, primary nav center (for multi-page expansion)
- User account/settings icon right
- Search summary bar below on results page (editable chips)

### Loading & Empty States
- Skeleton cards matching result card dimensions (3-4 visible)
- Empty state: Friendly illustration, "No flights found" message, filter adjustment suggestions
- Error state: Clear error message with retry button

## Images
**Hero Section**: 
Full-width hero image (h-96 on desktop, h-64 on mobile) showing airplane wing view from window during golden hour flight - conveys travel excitement. Search form overlays bottom 50% with frosted glass background (backdrop-blur-lg bg-white/90 dark:bg-gray-900/90). Subtle gradient overlay from transparent to primary color at 20% opacity for depth.

**Empty States**:
Illustrated SVG graphics (not photos) for empty/error states - minimal, line-art style in primary brand color.

## Animations
- Card hover: Subtle scale(1.01) + shadow increase (150ms ease)
- Filter apply: Smooth height transition for collapsible sections
- Results load: Staggered fade-in (50ms delay between cards)
- Date picker: Slide-in from bottom on mobile

## Accessibility
- Maintain WCAG AA contrast (4.5:1 for body text)
- Focus indicators: 2px solid ring in primary color with offset
- Screen reader labels for all icon buttons
- Keyboard navigation: Tab order follows visual hierarchy
- Date pickers: Fully keyboard accessible with arrow key navigation

## Responsive Breakpoints
- Mobile (base): Stacked layout, drawer filters, simplified cards
- Tablet (md: 768px): 2-column where appropriate, visible filters toggle
- Desktop (lg: 1024px): Full sidebar filters, optimized card density
- Wide (xl: 1280px): Max content width, generous spacing

This design creates a professional, data-rich flight search experience that prioritizes user efficiency while maintaining visual appeal and modern web standards.