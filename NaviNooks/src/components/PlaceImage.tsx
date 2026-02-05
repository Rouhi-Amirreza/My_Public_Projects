import React, { useState, useEffect } from 'react';
import {
  View,
  Image,
  StyleSheet,
  ActivityIndicator,
  Text,
  Dimensions,
} from 'react-native';
import GooglePlacesImageService from '../services/GooglePlacesImageService';
import { PlaceRecommendation } from '../types';

interface PlaceImageProps {
  place: PlaceRecommendation;
  width?: number;
  height?: number;
  borderRadius?: number;
  fallbackIcon?: string;
  resizeMode?: 'cover' | 'contain' | 'stretch' | 'center';
}

const PlaceImage: React.FC<PlaceImageProps> = ({
  place,
  width = 80,
  height = 80,
  borderRadius = 12,
  fallbackIcon = '🏛️',
  resizeMode = 'cover',
}) => {
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    loadPlaceImage();
  }, [place.place_id]);

  const loadPlaceImage = async () => {
    try {
      setLoading(true);
      setError(false);

      console.log(`📸 Loading image for ${place.name} (${place.place_id})`);

      // Use Google Places Photos API to get image
      const imageUrl = await GooglePlacesImageService.getPlacePhotoUrl(
        place.place_id,
        place.name,
        Math.max(width, height) * 2, // Request higher resolution for better quality
        Math.max(width, height) * 2
      );

      if (imageUrl) {
        setImageUri(imageUrl);
        console.log(`✅ Loaded image for ${place.name}: ${imageUrl.substring(0, 80)}...`);
      } else {
        console.log(`❌ No image available for ${place.name}`);
      }
      
      setLoading(false);
    } catch (err) {
      console.error(`❌ Error loading image for ${place.name}:`, err);
      setError(true);
      setLoading(false);
    }
  };

  const renderContent = () => {
    if (loading) {
      return (
        <View style={[styles.placeholder, { width, height, borderRadius }]}>
          <ActivityIndicator size="small" color="#00D9FF" />
        </View>
      );
    }

    if (error || !imageUri) {
      return (
        <View style={[styles.placeholder, { width, height, borderRadius }]}>
          <Text style={styles.fallbackIcon}>{fallbackIcon}</Text>
        </View>
      );
    }

    return (
      <Image
        source={{ uri: imageUri }}
        style={[styles.image, { width, height, borderRadius }]}
        resizeMode={resizeMode}
        onError={() => {
          console.warn(`Failed to load image for ${place.name}`);
          setError(true);
        }}
      />
    );
  };

  return (
    <View style={styles.container}>
      {renderContent()}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    overflow: 'hidden',
  },
  image: {
    backgroundColor: '#1C1C1E',
  },
  placeholder: {
    backgroundColor: '#2C2C2E',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  fallbackIcon: {
    fontSize: 24,
    color: '#98989A',
  },
});

export default PlaceImage;