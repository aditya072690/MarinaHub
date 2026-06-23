import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, Alert, ScrollView } from 'react-native';
import { useStripe } from '@stripe/stripe-react-native';
import { supabase } from '../../lib/supabase';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { BookingStackParamList } from '../../navigation/types';
import { Ionicons } from '@expo/vector-icons';
import { useBookingContext } from '../../context/BookingContext';

type Props = NativeStackScreenProps<BookingStackParamList, 'Step8_Payment'>;

export default function Step8_PaymentScreen({ navigation }: Props) {
  const { initPaymentSheet, presentPaymentSheet } = useStripe();
  const [processing, setProcessing] = useState(false);
  const { state, resetState } = useBookingContext();

  async function checkout() {
    setProcessing(true);
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData?.session?.access_token;

      if (!token) {
        Alert.alert('Authentication Required', 'Please log in to complete your booking.');
        setProcessing(false);
        return;
      }

      const apiUrl = process.env.EXPO_PUBLIC_API_URL;
      
      const response = await fetch(`${apiUrl}/api/stripe/create-intent`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ 
          boatId: state.boatId, 
          startDate: state.startDate.toISOString(), 
          endDate: state.endDate.toISOString(),
          guestCount: state.customerDetails.guests,
          // You can also pass addons, waiver info, signature here if backend is ready to receive them
        }),
      });
      
      const responseData = await response.json();
      
      if (!response.ok) {
        throw new Error(responseData.error || 'Failed to initialize payment.');
      }

      const { clientSecret, bookingId: realBookingId } = responseData;

      const { error: initError } = await initPaymentSheet({
        merchantDisplayName: 'Marina Hub',
        paymentIntentClientSecret: clientSecret,
        style: 'alwaysDark',
        appearance: {
          colors: {
            primary: '#3B82F6',
            background: '#0F172A',
            componentBackground: '#1E293B',
            componentBorder: '#334155',
            componentDivider: '#334155',
            primaryText: '#F8FAFC',
            secondaryText: '#94A3B8',
            componentText: '#F8FAFC',
            placeholderText: '#64748B',
          }
        }
      });

      if (initError) throw new Error(initError.message);

      const { error: presentError } = await presentPaymentSheet();
      if (presentError) {
        if (presentError.code !== 'Canceled') {
          throw new Error(presentError.message);
        } else {
          setProcessing(false);
          return;
        }
      }

      // Success! Reset booking context and navigate away
      resetState();
      
      // Need to cast navigation because Confirmation is outside BookingStack
      navigation.getParent()?.navigate('Confirmation', { bookingId: realBookingId });

    } catch (error: any) {
      Alert.alert('Payment Error', error.message);
    } finally {
      setProcessing(false);
    }
  }

  return (
    <View style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color="#0F172A" />
          </TouchableOpacity>
          <View style={styles.headerText}>
            <Text style={styles.subtitle}>Step 8 of 8</Text>
            <Text style={styles.title}>Checkout</Text>
          </View>
        </View>

        <View style={styles.content}>
          <Text style={styles.sectionTitle}>Order Summary</Text>
          
          <View style={styles.glassCard}>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryLabel}>Customer</Text>
              <Text style={styles.summaryValue}>{state.customerDetails.fullName}</Text>
            </View>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryLabel}>Guests</Text>
              <Text style={styles.summaryValue}>{state.customerDetails.guests} passengers</Text>
            </View>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryLabel}>Start</Text>
              <Text style={styles.summaryValue}>{state.startDate.toLocaleString(undefined, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}</Text>
            </View>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryLabel}>End</Text>
              <Text style={styles.summaryValue}>{state.endDate.toLocaleString(undefined, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}</Text>
            </View>
          </View>

          <Text style={styles.sectionTitle}>Price Breakdown</Text>
          
          <View style={styles.glassCard}>
            <View style={styles.priceRow}>
              <Text style={styles.priceItem}>Base Rate</Text>
              <Text style={styles.priceItemValue}>${state.pricing.baseRate}</Text>
            </View>
            <View style={styles.priceRow}>
              <Text style={styles.priceItem}>Add-ons & Extras</Text>
              <Text style={styles.priceItemValue}>${state.pricing.subtotal - state.pricing.baseRate}</Text>
            </View>
            <View style={styles.priceRow}>
              <Text style={styles.priceItem}>Taxes</Text>
              <Text style={styles.priceItemValue}>${state.pricing.tax.toFixed(2)}</Text>
            </View>
            <View style={styles.divider} />
            <View style={styles.priceRow}>
              <Text style={styles.totalLabel}>Total</Text>
              <Text style={styles.totalValue}>${state.pricing.total.toFixed(2)}</Text>
            </View>
          </View>

          <View style={styles.secureCard}>
            <Ionicons name="lock-closed" size={20} color="#059669" />
            <Text style={styles.secureText}>Payments are secure and encrypted via Stripe.</Text>
          </View>
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <View style={styles.footerInfo}>
          <Text style={styles.footerPrice}>${state.pricing.total.toFixed(2)}</Text>
          <Text style={styles.footerSub}>Due Now</Text>
        </View>
        <TouchableOpacity style={styles.payButton} onPress={checkout} disabled={processing}>
          {processing ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <>
              <Text style={styles.payButtonText}>Pay securely</Text>
              <Ionicons name="checkmark-circle" size={20} color="#FFFFFF" />
            </>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  scrollContent: { paddingBottom: 40 },
  header: { padding: 20, paddingTop: 60, flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFFFFF', borderBottomWidth: 1, borderColor: '#E2E8F0' },
  backButton: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#F1F5F9', justifyContent: 'center', alignItems: 'center', marginRight: 16 },
  headerText: { flex: 1 },
  subtitle: { fontSize: 13, color: '#64748B', fontWeight: '600', textTransform: 'uppercase', letterSpacing: 1 },
  title: { fontSize: 24, fontWeight: '800', color: '#0F172A' },
  content: { padding: 20 },
  sectionTitle: { fontSize: 18, fontWeight: '700', color: '#0F172A', marginBottom: 12, marginTop: 8 },
  glassCard: { backgroundColor: '#FFFFFF', borderRadius: 16, padding: 16, marginBottom: 20, borderWidth: 1, borderColor: '#E2E8F0' },
  summaryItem: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#F1F5F9' },
  summaryLabel: { fontSize: 15, color: '#64748B' },
  summaryValue: { fontSize: 15, fontWeight: '600', color: '#0F172A' },
  priceRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 },
  priceItem: { fontSize: 15, color: '#475569' },
  priceItemValue: { fontSize: 15, fontWeight: '500', color: '#0F172A' },
  divider: { height: 1, backgroundColor: '#E2E8F0', marginVertical: 16 },
  totalLabel: { fontSize: 18, fontWeight: '700', color: '#0F172A' },
  totalValue: { fontSize: 20, fontWeight: '800', color: '#3B82F6' },
  secureCard: { flexDirection: 'row', alignItems: 'center', gap: 12, justifyContent: 'center', marginTop: 12 },
  secureText: { fontSize: 13, color: '#059669', fontWeight: '500' },
  footer: { backgroundColor: '#FFFFFF', padding: 20, paddingBottom: 36, borderTopWidth: 1, borderColor: '#E2E8F0', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  footerInfo: { flex: 1 },
  footerPrice: { fontSize: 24, fontWeight: '800', color: '#0F172A' },
  footerSub: { fontSize: 13, color: '#64748B', fontWeight: '500' },
  payButton: { backgroundColor: '#0F172A', paddingVertical: 16, paddingHorizontal: 24, borderRadius: 12, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 8 },
  payButtonText: { color: '#FFFFFF', fontSize: 16, fontWeight: '700' },
});
