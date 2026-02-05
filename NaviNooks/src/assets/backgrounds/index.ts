// City background images
// Note: Add actual city images to this folder and update these imports

// For now, we'll use a fallback approach since we don't have actual images
// In a real implementation, you would add:
// - philadelphia-skyline.jpg
// - miami-beach.jpg
// - new-york-skyline.jpg
// etc.

export const cityBackgrounds = {
  philadelphia: {
    // Fallback: You can add a beautiful Philadelphia skyline image here
    uri: 'https://images.unsplash.com/photo-1518655187624-5c56b24b8c9f?w=800&q=80',
    local: null, // require('./philadelphia-skyline.jpg') when you add the actual image
  },
  miami: {
    // Fallback: You can add a beautiful Miami beach/skyline image here  
    uri: 'https://images.unsplash.com/photo-1514646761052-b39cb27dc8b1?w=800&q=80',
    local: null, // require('./miami-beach.jpg') when you add the actual image
  },
  // Add more cities as needed
  default: {
    uri: 'https://images.unsplash.com/photo-1477959858617-67f85cf4f1df?w=800&q=80',
    local: null,
  },
};

export default cityBackgrounds;