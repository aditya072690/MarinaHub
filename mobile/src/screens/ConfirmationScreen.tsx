import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import QRCode from 'react-native-qrcode-svg';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { HomeStackParamList } from '../navigation/types';
import { supabase } from '../lib/supabase';

type Props = NativeStackScreenProps<HomeStackParamList, 'Confirmation'>;

export default function ConfirmationScreen({ route, navigation }: Props) {
  const { bookingId } = route.params;
  const [status, setStatus] = useState('Confirmed');

  useEffect(() => {
    // Realtime subscription for status changes
    const channel = supabase
      .channel(`booking-${bookingId}`)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'bookings', filter: `id=eq.${bookingId}` },
        (payload) => {
          setStatus(payload.new.status);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [bookingId]);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Booking Successful!</Text>
      <Text style={styles.subtitle}>Your trip is locked in.</Text>

      <View style={styles.card}>
        <Text style={styles.label}>Booking Reference</Text>
        <Text style={styles.bookingId}>{bookingId}</Text>
        
        <View style={styles.qrContainer}>
          <QRCode
            value={bookingId}
            size={200}
            color="black"
            backgroundColor="white"
          />
        </View>

        <View style={styles.statusBadge}>
          <Text style={styles.statusText}>{status}</Text>
        </View>
      </View>

      <TouchableOpacity
        style={styles.doneButton}
        onPress={() => navigation.navigate('Home')}
      >
        <Text style={styles.doneButtonText}>Back to Home</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 24,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#10B981',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#64748B',
    marginBottom: 32,
  },
  card: {
    width: '100%',
    padding: 24,
    backgroundColor: '#F8FAFC',
    borderRadius: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  label: {
    fontSize: 14,
    color: '#64748B',
    marginBottom: 4,
  },
  bookingId: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#0F172A',
    marginBottom: 24,
  },
  qrContainer: {
    padding: 16,
    backgroundColor: '#fff',
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    marginBottom: 24,
  },
  statusBadge: {
    backgroundColor: '#D1FAE5',
    paddingVertical: 6,
    paddingHorizontal: 16,
    borderRadius: 20,
  },
  statusText: {
    color: '#059669',
    fontWeight: 'bold',
  },
  doneButton: {
    marginTop: 48,
    backgroundColor: '#0F172A',
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 8,
    width: '100%',
    alignItems: 'center',
  },
  doneButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});
