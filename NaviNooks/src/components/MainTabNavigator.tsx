import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Text, View } from 'react-native';
import SmartItineraryPage from '../screens/SmartItineraryPage';
import DriveTestPage from '../screens/DriveTestPage';
import { ItineraryFormData } from '../types';

const Tab = createBottomTabNavigator();

interface MainTabNavigatorProps {
  onGenerateItinerary: (formData: ItineraryFormData) => void;
  lastFormData?: ItineraryFormData | null;
}

const MainTabNavigator: React.FC<MainTabNavigatorProps> = ({ onGenerateItinerary, lastFormData }) => {
  return (
    <Tab.Navigator
      screenOptions={{
        tabBarStyle: {
          backgroundColor: '#1a1a1a',
          borderTopColor: '#333333',
          borderTopWidth: 1,
          height: 70,
          paddingBottom: 10,
          paddingTop: 10,
        },
        tabBarActiveTintColor: '#4ECDC4',
        tabBarInactiveTintColor: '#888888',
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: '600',
        },
        headerShown: false,
      }}
    >
      <Tab.Screen
        name="Itinerary"
        options={{
          tabBarIcon: ({ color, size, focused }) => (
            <View style={{ alignItems: 'center', justifyContent: 'center' }}>
              <Text style={{ fontSize: 20, color: focused ? '#4ECDC4' : '#888888' }}>
                🗺️
              </Text>
            </View>
          ),
          tabBarLabel: 'Smart Itinerary',
        }}
      >
        {() => (
          <SmartItineraryPage 
            onGenerateItinerary={onGenerateItinerary}
            initialFormData={lastFormData}
          />
        )}
      </Tab.Screen>
      
      <Tab.Screen
        name="DriveTest"
        component={DriveTestPage}
        options={{
          tabBarIcon: ({ color, size, focused }) => (
            <View style={{ alignItems: 'center', justifyContent: 'center' }}>
              <Text style={{ fontSize: 20, color: focused ? '#4ECDC4' : '#888888' }}>
                🚗
              </Text>
            </View>
          ),
          tabBarLabel: 'Drive Test',
        }}
      />
    </Tab.Navigator>
  );
};

export default MainTabNavigator;