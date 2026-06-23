import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, ScrollView, Alert } from 'react-native';
import { supabase } from '../../lib/supabase';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { BookingStackParamList } from '../../navigation/types';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { useBookingContext } from '../../context/BookingContext';

type Props = NativeStackScreenProps<BookingStackParamList, 'Step1_Schedule'>;

export default function Step1_ScheduleScreen({ route, navigation }: Props) {
  const { boatId } = route.params;
  const { state, updateState } = useBookingContext();
  const [loading, setLoading] = useState(true);
  const [boat, setBoat] = useState<any>(null);

  const [showStartPicker, setShowStartPicker] = useState(false);
  const [showEndPicker, setShowEndPicker] = useState(false);
  const [pickerMode, setPickerMode] = useState<'date' | 'time'>('date');
  const [activePicker, setActivePicker] = useState<'start' | 'end' | null>(null);

  useEffect(() => {
    async function fetchBoat() {
      // Set boatId in context if not already
      if (state.boatId !== boatId) {
        updateState({ boatId });
      }

      const { data } = await supabase
        .from('boats')
        .select('id, name, hourly_rate, image_urls, capacity')
        .eq('id', boatId)
        .single();
        
      if (data) {
        setBoat(data);
        // Save base pricing info
        updateState({ 
          pricing: { 
            ...state.pricing, 
            baseRate: data.hourly_rate || 100 
          } 
        });
      }
      setLoading(false);
    }
    fetchBoat();
  }, [boatId]);

  const handleDateChange = (event: any, selectedDate?: Date) => {
    if (!selectedDate || event.type === 'dismissed') {
      setShowStartPicker(false);
      setShowEndPicker(false);
      return;
    }

    if (activePicker === 'start') {
      setShowStartPicker(false);
      
      if (pickerMode === 'time') {
        const hour = selectedDate.getHours();
        if (hour < 8 || hour >= 20) {
          Alert.alert('Invalid Time', 'Boat rentals are only available between 8:00 AM and 8:00 PM.');
          return;
        }
      }

      let newEnd = new Date(state.endDate);
      // Auto-adjust end date to be 4 hours later if we are changing start date
      newEnd = new Date(selectedDate);
      newEnd.setHours(newEnd.getHours() + 4);
      
      // Enforce same day
      if (newEnd.getDate() !== selectedDate.getDate()) {
        newEnd.setDate(selectedDate.getDate());
        newEnd.setHours(20, 0, 0, 0); // Max end time 8 PM
      }

      updateState({ startDate: selectedDate, endDate: newEnd });
      
    } else {
      setShowEndPicker(false);
      
      if (pickerMode === 'time') {
        const hour = selectedDate.getHours();
        if (hour < 8 || hour > 20 || (hour === 20 && selectedDate.getMinutes() > 0)) {
          Alert.alert('Invalid Time', 'All boats must be returned by 8:00 PM.');
          return;
        }
      }

      // Enforce same day return
      if (selectedDate.getDate() !== state.startDate.getDate() || selectedDate.getMonth() !== state.startDate.getMonth()) {
        Alert.alert('Invalid Date', 'Multi-day rentals are not supported. Please return the boat on the same day.');
        return;
      }

      let newStart = new Date(state.startDate);
      if (selectedDate <= state.startDate) {
        newStart = new Date(selectedDate);
        newStart.setHours(newStart.getHours() - 4);
        if (newStart.getHours() < 8) newStart.setHours(8, 0, 0, 0);
      }
      
      updateState({ startDate: newStart, endDate: selectedDate });
    }
  };

  const openPicker = (type: 'start' | 'end', mode: 'date' | 'time') => {
    setActivePicker(type);
    setPickerMode(mode);
    if (type === 'start') setShowStartPicker(true);
    else setShowEndPicker(true);
  };

  const handleNext = () => {
    navigation.navigate('Step2_Customer');
  };

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
        <View style={styles.heroContainer}>
          <Image source={{ uri: defaultImage }} style={styles.heroImage} contentFit="cover" />
          <View style={styles.heroOverlay} />
          <View style={styles.heroContent}>
            <Text style={styles.heroSubtitle}>Step 1 of 8</Text>
            <Text style={styles.heroTitle}>Pick a Schedule</Text>
          </View>
        </View>

        <View style={styles.content}>
          <Text style={styles.sectionTitle}>When are you going?</Text>
          <View style={styles.glassCard}>
            <View style={styles.dateRow}>
              <View style={styles.dateColumn}>
                <Text style={styles.dateLabel}>Start Date & Time</Text>
                <View style={styles.dateActions}>
                  <TouchableOpacity style={styles.datePill} onPress={() => openPicker('start', 'date')}>
                    <Ionicons name="calendar-outline" size={16} color="#0F172A" />
                    <Text style={styles.dateText}>{state.startDate.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.datePill} onPress={() => openPicker('start', 'time')}>
                    <Ionicons name="time-outline" size={16} color="#0F172A" />
                    <Text style={styles.dateText}>{state.startDate.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })}</Text>
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
                    <Text style={styles.dateText}>{state.endDate.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.datePill} onPress={() => openPicker('end', 'time')}>
                    <Ionicons name="time-outline" size={16} color="#0F172A" />
                    <Text style={styles.dateText}>{state.endDate.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })}</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          </View>
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <TouchableOpacity style={styles.primaryButton} onPress={handleNext}>
          <Text style={styles.primaryButtonText}>Next: Customer Details</Text>
          <Ionicons name="arrow-forward" size={20} color="#FFFFFF" />
        </TouchableOpacity>
      </View>

      {(showStartPicker || showEndPicker) && (
        <DateTimePicker
          value={activePicker === 'start' ? state.startDate : state.endDate}
          mode={pickerMode}
          display="default"
          minuteInterval={30}
          onChange={handleDateChange}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  scrollContent: { paddingBottom: 40 },
  heroContainer: { width: '100%', height: 200, position: 'relative' },
  heroImage: { width: '100%', height: '100%' },
  heroOverlay: { ...StyleSheet.absoluteFill, backgroundColor: 'rgba(15, 23, 42, 0.4)' },
  heroContent: { position: 'absolute', bottom: 20, left: 20, right: 20 },
  heroTitle: { fontSize: 28, fontWeight: '800', color: '#FFFFFF', textShadowColor: 'rgba(0,0,0,0.3)', textShadowRadius: 4 },
  heroSubtitle: { fontSize: 14, color: '#F1F5F9', fontWeight: '600', textTransform: 'uppercase', letterSpacing: 1 },
  content: { padding: 20 },
  sectionTitle: { fontSize: 18, fontWeight: '700', color: '#0F172A', marginBottom: 12 },
  glassCard: { backgroundColor: '#FFFFFF', borderRadius: 16, padding: 16, marginBottom: 20, borderWidth: 1, borderColor: '#E2E8F0' },
  dateRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  dateColumn: { flex: 1 },
  dateLabel: { fontSize: 13, color: '#64748B', fontWeight: '600', textTransform: 'uppercase', marginBottom: 8 },
  dateActions: { flexDirection: 'row', gap: 8 },
  datePill: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F1F5F9', paddingVertical: 8, paddingHorizontal: 12, borderRadius: 8, gap: 6 },
  dateText: { fontSize: 15, fontWeight: '600', color: '#0F172A' },
  divider: { height: 1, backgroundColor: '#F1F5F9', marginVertical: 16 },
  footer: { backgroundColor: '#FFFFFF', padding: 20, paddingBottom: 36, borderTopWidth: 1, borderColor: '#E2E8F0' },
  primaryButton: { backgroundColor: '#0F172A', paddingVertical: 16, borderRadius: 12, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 8 },
  primaryButtonText: { color: '#FFFFFF', fontSize: 16, fontWeight: '700' },
});
