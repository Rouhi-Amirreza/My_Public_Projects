# Philadelphia Itinerary App - Quick Start Guide

## 🚀 Getting Started

This React Native app generates AI-powered travel itineraries for Philadelphia using real place data and Google Maps integration.

### Prerequisites
- Node.js (v14+)
- React Native development environment
- Android Studio or Xcode

### Installation & Setup

1. **Navigate to the project directory:**
```bash
cd PhiladelphiaItineraryApp
```

2. **Install dependencies:**
```bash
npm install
```

3. **For iOS (macOS only):**
```bash
cd ios && pod install && cd ..
```

### Running the App

**Android:**
```bash
npm run android
```

**iOS (macOS only):**
```bash
npm run ios
```

**Start Metro Bundler (if needed):**
```bash
npm start
```

## 📱 App Features

### Smart Input Form
- **Starting Address**: Google Places autocomplete for Philadelphia locations
- **Date & Time**: Date/time pickers for travel planning
- **Available Hours**: 3-10 hour duration selection
- **Interests**: Multi-select categories (History, Museums, Parks, Entertainment, Shopping, Education)
- **Optimization Level**: Fast/Balanced/Thorough processing

### AI-Powered Itinerary Generation
- **Interest Matching**: Maps user preferences to specific Philadelphia attractions
- **Opening Hours Validation**: Filters places based on selected travel date
- **Fame-Based Prioritization**: Prioritizes popular attractions with high ratings
- **Route Optimization**: Uses Google Distance Matrix API for efficient routing
- **Time Allocation**: Smart scheduling based on place types and visit durations

### Interactive Results
- **Map Visualization**: Interactive map with optimized route and markers
- **Detailed Schedule**: Timed itinerary with arrival/departure times
- **Place Information**: Ratings, descriptions, crowd levels, and pricing
- **Summary Statistics**: Total duration, travel time, and optimization notes

## 🗺️ How It Works

1. **User Input**: Enter starting location, select date/time, choose interests
2. **AI Processing**: Advanced algorithms analyze 100+ Philadelphia attractions
3. **Route Optimization**: Google APIs calculate optimal travel routes
4. **Results Display**: Interactive map and detailed schedule generation

## 🏛️ Philadelphia Data

The app includes comprehensive data for 100+ verified Philadelphia attractions:
- Independence Hall & Liberty Bell
- Philadelphia Museum of Art
- Reading Terminal Market
- Fairmount Park
- Eastern State Penitentiary
- And many more historical sites, museums, parks, and entertainment venues

## 🔧 Technical Features

- **Real-time Google Maps integration**
- **Offline-capable place data**
- **Responsive mobile design**
- **Error handling with fallbacks**
- **Performance optimized algorithms**

## 🎯 Example Usage

1. Enter "1234 Market St, Philadelphia, PA" as starting address
2. Select tomorrow's date and 9:00 AM start time
3. Choose 6 available hours
4. Select "History" and "Museums" interests
5. Tap "Generate My Itinerary"
6. View optimized route on map and detailed schedule

## 📞 Support

For issues or questions:
- Check the full README.md for detailed documentation
- Review error messages for troubleshooting guidance
- Ensure Google API key has proper permissions

## 🎉 Enjoy Your Philadelphia Adventure!

The app will help you discover the best of Philadelphia with an optimized, personalized itinerary tailored to your interests and schedule.

