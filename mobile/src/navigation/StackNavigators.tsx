import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { HomeStackParamList, SearchStackParamList } from './types';
import HomeScreen from '../screens/HomeScreen';
import SearchScreen from '../screens/SearchScreen';
import MarinaDetailScreen from '../screens/MarinaDetailScreen';
import BoatDetailScreen from '../screens/BoatDetailScreen';
import BookingFlowScreen from '../screens/BookingFlowScreen';
import ConfirmationScreen from '../screens/ConfirmationScreen';

const HomeStack = createNativeStackNavigator<HomeStackParamList>();
const SearchStack = createNativeStackNavigator<SearchStackParamList>();

export function HomeStackNavigator() {
  return (
    <HomeStack.Navigator>
      <HomeStack.Screen name="Home" component={HomeScreen} options={{ headerShown: false }} />
      <HomeStack.Screen name="MarinaDetail" component={MarinaDetailScreen} options={{ title: 'Marina' }} />
      <HomeStack.Screen name="BoatDetail" component={BoatDetailScreen} options={{ title: 'Boat' }} />
      <HomeStack.Screen name="BookingFlow" component={BookingFlowScreen} options={{ title: 'Book' }} />
      <HomeStack.Screen name="Confirmation" component={ConfirmationScreen} options={{ headerShown: false }} />
    </HomeStack.Navigator>
  );
}

export function SearchStackNavigator() {
  return (
    <SearchStack.Navigator>
      <SearchStack.Screen name="Search" component={SearchScreen} options={{ headerShown: false }} />
      <SearchStack.Screen name="MarinaDetail" component={MarinaDetailScreen} options={{ title: 'Marina' }} />
      <SearchStack.Screen name="BoatDetail" component={BoatDetailScreen} options={{ title: 'Boat' }} />
      <SearchStack.Screen name="BookingFlow" component={BookingFlowScreen} options={{ title: 'Book' }} />
      <SearchStack.Screen name="Confirmation" component={ConfirmationScreen} options={{ headerShown: false }} />
    </SearchStack.Navigator>
  );
}
