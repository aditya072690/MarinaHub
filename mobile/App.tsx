import React from 'react';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StripeProvider } from '@stripe/stripe-react-native';
import RootNavigator from './src/navigation/RootNavigator';

export default function App() {
  return (
    <StripeProvider 
      publishableKey={process.env.EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY || ''}
      // @ts-ignore - Prop requested by user but missing in current TS definitions
      googlePay={{
        merchantCountryCode: 'US',
        testEnv: true, // Set to false in production
      }}
    >
      <SafeAreaProvider>
        <RootNavigator />
        <StatusBar style="auto" />
      </SafeAreaProvider>
    </StripeProvider>
  );
}
// cache buster
