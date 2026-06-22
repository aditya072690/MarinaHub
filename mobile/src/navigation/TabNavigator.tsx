import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { TabParamList } from './types';
import { HomeStackNavigator, SearchStackNavigator } from './StackNavigators';
import FavoritesScreen from '../screens/FavoritesScreen';
import TripsScreen from '../screens/TripsScreen';
import AccountScreen from '../screens/AccountScreen';

import { Ionicons } from '@expo/vector-icons';

const Tab = createBottomTabNavigator<TabParamList>();

export default function TabNavigator() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarIcon: ({ focused, color, size }) => {
          let iconName: keyof typeof Ionicons.glyphMap = 'home';
          if (route.name === 'HomeStack') iconName = focused ? 'home' : 'home-outline';
          else if (route.name === 'SearchStack') iconName = focused ? 'search' : 'search-outline';
          else if (route.name === 'Favorites') iconName = focused ? 'heart' : 'heart-outline';
          else if (route.name === 'Trips') iconName = focused ? 'boat' : 'boat-outline';
          else if (route.name === 'Account') iconName = focused ? 'person' : 'person-outline';
          return <Ionicons name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: '#0F172A',
        tabBarInactiveTintColor: '#64748B',
      })}
    >
      <Tab.Screen name="HomeStack" component={HomeStackNavigator} options={{ title: 'Home' }} />
      <Tab.Screen name="SearchStack" component={SearchStackNavigator} options={{ title: 'Search' }} />
      <Tab.Screen name="Favorites" component={FavoritesScreen} options={{ title: 'Favorites', headerShown: true }} />
      <Tab.Screen name="Trips" component={TripsScreen} options={{ title: 'Trips', headerShown: true }} />
      <Tab.Screen name="Account" component={AccountScreen} options={{ title: 'Account', headerShown: true }} />
    </Tab.Navigator>
  );
}
