import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, ActivityIndicator, ScrollView } from 'react-native';
import { useStripe } from '@stripe/stripe-react-native';
import { supabase } from '../lib/supabase';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { HomeStackParamList } from '../navigation/types';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';

type Props = NativeStackScreenProps<HomeStackParamList, 'BookingFlow'>;

export default function BookingFlowScreen({ route, navigation }: Props) {
  const { boatId } = route.params;
  const { initPaymentSheet, presentPaymentSheet } = useStripe();
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [boat, setBoat] = useState<any>(null);

  const [startDate, setStartDate] = useState(() => {
    const d = new Date();
    d.setHours(9, 0, 0, 0);
    return d;
  });
  
  const [endDate, setEndDate] = useState(() => {
    const d = new Date();
    d.setHours(13, 0, 0, 0); // Default to 4 hour booking
    return d;
  });
  
  const [guests, setGuests] = useState(2);
  const [showStartPicker, setShowStartPicker] = useState(false);
  const [showEndPicker, setShowEndPicker] = useState(false);
  const [pickerMode, setPickerMode] = useState<'date' | 'time'>('date');
  const [activePicker, setActivePicker] = useState<'start' | 'end' | null>(null);

  useEffect(() => {
    async function fetchBoat() {
      const { data } = await supabase
        .from('boats')
        .select('id, name, hourly_rate, image_urls, capacity')
        .eq('id', boatId)
        .single();
        
      if (data) setBoat(data);
      setLoading(false);
    }
    fetchBoat();
  }, [boatId]);

  // Calculate hours safely
  const diffMs = endDate.getTime() - startDate.getTime();
  const hours = Math.max(1, Math.ceil(diffMs / (1000 * 60 * 60)));
  const rate = boat?.hourly_rate || 100; // fallback
  const subtotal = rate * hours;
  const tax = subtotal * 0.08; // 8% estimated tax
  const total = subtotal + tax;

  const handleDateChange = (event: any, selectedDate?: Date) => {
    if (activePicker === 'start') {
      setShowStartPicker(false);
      if (selectedDate) {
        setStartDate(selectedDate);
        if (selectedDate >= endDate) {
          const newEnd = new Date(selectedDate);
          newEnd.setHours(newEnd.getHours() + 4);
          setEndDate(newEnd);
        }
      }
    } else {
      setShowEndPicker(false);
      if (selectedDate) {
        setEndDate(selectedDate);
        if (selectedDate <= startDate) {
          const newStart = new Date(selectedDate);
          newStart.setHours(newStart.getHours() - 4);
          setStartDate(newStart);
        }
      }
    }
  };

  const openPicker = (type: 'start' | 'end', mode: 'date' | 'time') => {
    setActivePicker(type);
    setPickerMode(mode);
    if (type === 'start') setShowStartPicker(true);
    else setShowEndPicker(true);
  };

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

      const apiUrl = process.env.EXPO_PUBLIC_API_URL || 'http://10.0.2.2:3000';
      
      const response = await fetch(`${apiUrl}/api/stripe/create-intent`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ 
          boatId, 
          startDate: startDate.toISOString(), 
          endDate: endDate.toISOString(),
          guestCount: guests
        }),
      });
      
      const responseData = await response.json();
      
      if (!response.ok) {
        throw new Error(responseData.error || 'Failed to initialize payment on the server. Make sure your local backend is running!');
      }

      const { clientSecret, bookingId: realBookingId } = responseData;

      const { error: initError } = await initPaymentSheet({
        merchantDisplayName: 'Marina Hub',
        paymentIntentClientSecret: clientSecret,
        appearance: {
          colors: {
            primary: '#0F172A',
            background: '#FFFFFF',
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

      navigation.navigate('Confirmation', { bookingId: realBookingId });
    } catch (error: any) {
      if (error.message.includes('Network request failed')) {
        Alert.alert('Connection Error', 'Could not connect to the backend server. Please ensure Next.js is running and accessible.');
      } else {
        Alert.alert('Payment Error', error.message);
      }
    } finally {
      setProcessing(false);
    }
  }

  if (loading || !boat) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#0F172A" />
      </View>
    );
  }

  const defaultImage = boat.image_urls?.[0] || 'https://images.unsplash.com/photo-1540946485063-a40da27545f8';

  return (
    <View style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        {/* Hero Header */}
        <View style={styles.heroContainer}>
          <Image source={{ uri: defaultImage }} style={styles.heroImage} contentFit="cover" />
          <View style={styles.heroOverlay} />
          <View style={styles.heroContent}>
            <Text style={styles.heroTitle}>{boat.name}</Text>
            <Text style={styles.heroSubtitle}>Confirm your booking</Text>
          </View>
        </View>

        <View style={styles.content}>
          {/* Schedule Section */}
          <Text style={styles.sectionTitle}>Schedule</Text>
          <View style={styles.glassCard}>
            <View style={styles.dateRow}>
              <View style={styles.dateColumn}>
                <Text style={styles.dateLabel}>Start Date & Time</Text>
                <View style={styles.dateActions}>
                  <TouchableOpacity style={styles.datePill} onPress={() => openPicker('start', 'date')}>
                    <Ionicons name="calendar-outline" size={16} color="#0F172A" />
                    <Text style={styles.dateText}>{startDate.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.datePill} onPress={() => openPicker('start', 'time')}>
                    <Ionicons name="time-outline" size={16} color="#0F172A" />
                    <Text style={styles.dateText}>{startDate.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })}</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>

            <View style={styles.divider} />

            <View style={styles.dateRow}>
              <View style={styles.dateColumn}>
                <Text style={styles.dateLabel}>End Date & Time</Text>
                <View style={styles.dateActions}>
                  <TouchableOpacity style={styles.datePill} onPress={() => openPicker('end', 'date')}>
                    <Ionicons name="calendar-outline" size={16} color="#0F172A" />
                    <Text style={styles.dateText}>{endDate.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.datePill} onPress={() => openPicker('end', 'time')}>
                    <Ionicons name="time-outline" size={16} color="#0F172A" />
                    <Text style={styles.dateText}>{endDate.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })}</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          </View>

          {/* Guests Section */}
          <Text style={styles.sectionTitle}>Guests</Text>
          <View style={styles.glassCard}>
            <View style={styles.guestRow}>
              <View>
                <Text style={styles.guestTitle}>Passengers</Text>
                <Text style={styles.guestSubtitle}>Max capacity: {boat.capacity || 10}</Text>
              </View>
              <View style={styles.counter}>
                <TouchableOpacity 
                  style={[styles.counterBtn, guests <= 1 && styles.counterBtnDisabled]} 
                  onPress={() => setGuests(Math.max(1, guests - 1))}
                  disabled={guests <= 1}
                >
                  <Ionicons name="remove" size={20} color={guests <= 1 ? "#94A3B8" : "#0F172A"} />
                </TouchableOpacity>
                <Text style={styles.counterValue}>{guests}</Text>
                <TouchableOpacity 
                  style={[styles.counterBtn, guests >= (boat.capacity || 10) && styles.counterBtnDisabled]} 
                  onPress={() => setGuests(Math.min(boat.capacity || 10, guests + 1))}
                  disabled={guests >= (boat.capacity || 10)}
                >
                  <Ionicons name="add" size={20} color={guests >= (boat.capacity || 10) ? "#94A3B8" : "#0F172A"} />
                </TouchableOpacity>
              </View>
            </View>
          </View>

          {/* Price Breakdown */}
          <Text style={styles.sectionTitle}>Price Breakdown</Text>
          <View style={styles.glassCard}>
            <View style={styles.priceRow}>
              <Text style={styles.priceItem}>${rate.toFixed(2)} x {hours} hours</Text>
              <Text style={styles.priceItemValue}>${subtotal.toFixed(2)}</Text>
            </View>
            <View style={styles.priceRow}>
              <Text style={styles.priceItem}>Est. Taxes & Fees</Text>
              <Text style={styles.priceItemValue}>${tax.toFixed(2)}</Text>
            </View>
            <View style={styles.divider} />
            <View style={styles.priceRow}>
              <Text style={styles.totalLabel}>Total</Text>
              <Text style={styles.totalValue}>${total.toFixed(2)}</Text>
            </View>
          </View>
        </View>
      </ScrollView>

      {/* Bottom Sticky Action */}
      <View style={styles.footer}>
        <View style={styles.footerInfo}>
          <Text style={styles.footerPrice}>${total.toFixed(2)}</Text>
          <Text style={styles.footerSub}>Total Estimate</Text>
        </View>
        <TouchableOpacity style={styles.payButton} onPress={checkout} disabled={processing}>
          {processing ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.payButtonText}>Book Now</Text>
          )}
        </TouchableOpacity>
      </View>

      {(showStartPicker || showEndPicker) && (
        <DateTimePicker
          value={activePicker === 'start' ? startDate : endDate}
          mode={pickerMode}
          display="spinner"
          onChange={handleDateChange}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
  },
  scrollContent: {
    paddingBottom: 40,
  },
  heroContainer: {
    width: '100%',
    height: 240,
    position: 'relative',
  },
  heroImage: {
    width: '100%',
    height: '100%',
  },
  heroOverlay: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(15, 23, 42, 0.4)',
  },
  heroContent: {
    position: 'absolute',
    bottom: 24,
    left: 20,
    right: 20,
  },
  heroTitle: {
    fontSize: 28,
    fontWeight: '800',
    color: '#FFFFFF',
    textShadowColor: 'rgba(0,0,0,0.3)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  heroSubtitle: {
    fontSize: 16,
    color: '#F1F5F9',
    marginTop: 4,
    fontWeight: '500',
  },
  content: {
    padding: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 12,
    marginTop: 8,
  },
  glassCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 20,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 12,
    elevation: 2,
    borderWidth: 1,
    borderColor: 'rgba(226, 232, 240, 0.8)',
  },
  dateRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  dateColumn: {
    flex: 1,
  },
  dateLabel: {
    fontSize: 13,
    color: '#64748B',
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  dateActions: {
    flexDirection: 'row',
    gap: 8,
  },
  datePill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F1F5F9',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    gap: 6,
  },
  dateText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#0F172A',
  },
  divider: {
    height: 1,
    backgroundColor: '#F1F5F9',
    marginVertical: 16,
  },
  guestRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  guestTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#0F172A',
  },
  guestSubtitle: {
    fontSize: 13,
    color: '#64748B',
    marginTop: 2,
  },
  counter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  counterBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F1F5F9',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  counterBtnDisabled: {
    opacity: 0.5,
  },
  counterValue: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0F172A',
    minWidth: 20,
    textAlign: 'center',
  },
  priceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  priceItem: {
    fontSize: 15,
    color: '#475569',
  },
  priceItemValue: {
    fontSize: 15,
    fontWeight: '500',
    color: '#0F172A',
  },
  totalLabel: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0F172A',
  },
  totalValue: {
    fontSize: 20,
    fontWeight: '800',
    color: '#3B82F6',
  },
  footer: {
    backgroundColor: '#FFFFFF',
    padding: 20,
    paddingBottom: 36,
    borderTopWidth: 1,
    borderColor: '#E2E8F0',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.05,
    shadowRadius: 12,
    elevation: 10,
  },
  footerInfo: {
    flex: 1,
  },
  footerPrice: {
    fontSize: 24,
    fontWeight: '800',
    color: '#0F172A',
  },
  footerSub: {
    fontSize: 13,
    color: '#64748B',
    fontWeight: '500',
  },
  payButton: {
    backgroundColor: '#0F172A',
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 12,
    minWidth: 160,
    alignItems: 'center',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
  },
  payButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
});
