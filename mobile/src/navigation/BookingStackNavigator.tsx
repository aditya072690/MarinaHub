import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { BookingStackParamList } from './types';
import { BookingProvider } from '../context/BookingContext';

import Step1_ScheduleScreen from '../screens/booking/Step1_ScheduleScreen';
import Step2_CustomerScreen from '../screens/booking/Step2_CustomerScreen';
import Step3_AddonsScreen from '../screens/booking/Step3_AddonsScreen';
import Step4_MarinaInfoScreen from '../screens/booking/Step4_MarinaInfoScreen';
import Step5_WeatherScreen from '../screens/booking/Step5_WeatherScreen';
import Step6_WaiverScreen from '../screens/booking/Step6_WaiverScreen';
import Step7_SignatureScreen from '../screens/booking/Step7_SignatureScreen';
import Step8_PaymentScreen from '../screens/booking/Step8_PaymentScreen';

const Stack = createNativeStackNavigator<BookingStackParamList>();

export default function BookingStackNavigator() {
  return (
    <BookingProvider>
      <Stack.Navigator screenOptions={{ headerShown: false, contentStyle: { backgroundColor: '#F8FAFC' } }}>
        <Stack.Screen name="Step1_Schedule" component={Step1_ScheduleScreen} />
        <Stack.Screen name="Step2_Customer" component={Step2_CustomerScreen} />
        <Stack.Screen name="Step3_Addons" component={Step3_AddonsScreen} />
        <Stack.Screen name="Step4_MarinaInfo" component={Step4_MarinaInfoScreen} />
        <Stack.Screen name="Step5_Weather" component={Step5_WeatherScreen} />
        <Stack.Screen name="Step6_Waiver" component={Step6_WaiverScreen} />
        <Stack.Screen name="Step7_Signature" component={Step7_SignatureScreen} />
        <Stack.Screen name="Step8_Payment" component={Step8_PaymentScreen} />
      </Stack.Navigator>
    </BookingProvider>
  );
}
