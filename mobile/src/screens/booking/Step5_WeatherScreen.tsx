import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { BookingStackParamList } from '../../navigation/types';
import { Ionicons } from '@expo/vector-icons';
import { useBookingContext } from '../../context/BookingContext';
import { supabase } from '../../lib/supabase';

type Props = NativeStackScreenProps<BookingStackParamList, 'Step5_Weather'>;

export default function Step5_WeatherScreen({ navigation }: Props) {
  const { state } = useBookingContext();
  const [weather, setWeather] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchWeather() {
      try {
        // Fetch marina lat/lng
        const { data: boatData } = await supabase
          .from('boats')
          .select('marina_id')
          .eq('id', state.boatId)
          .single();
          
        let lat = 25.7617; // Default Miami
        let lng = -80.1918;
        let marinaName = "the marina";

        if (boatData?.marina_id) {
          const { data: marinaData } = await supabase
            .from('marinas')
            .select('lat, lng, name')
            .eq('id', boatData.marina_id)
            .single();
          if (marinaData && marinaData.lat && marinaData.lng) {
            lat = marinaData.lat;
            lng = marinaData.lng;
            marinaName = marinaData.name;
          }
        }

        // Fetch from Open-Meteo
        const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}&current_weather=true&hourly=temperature_2m,windspeed_10m&timezone=auto`;
        const res = await fetch(url);
        const data = await res.json();

        setWeather({
          current: data.current_weather,
          marinaName
        });
      } catch (err) {
        console.error('Failed to fetch weather', err);
      } finally {
        setLoading(false);
      }
    }
    fetchWeather();
  }, [state.boatId]);

  const handleNext = () => {
    navigation.navigate('Step6_Waiver');
  };

  const isWindy = weather?.current?.windspeed > 25; // >25 km/h is quite windy

  return (
    <View style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color="#0F172A" />
          </TouchableOpacity>
          <View style={styles.headerText}>
            <Text style={styles.subtitle}>Step 5 of 8</Text>
            <Text style={styles.title}>Weather Check</Text>
          </View>
        </View>

        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#0F172A" />
            <Text style={styles.loadingText}>Fetching forecast...</Text>
          </View>
        ) : weather ? (
          <View style={styles.content}>
            <Text style={styles.description}>Current conditions at {weather.marinaName}</Text>

            <View style={styles.weatherCard}>
              <View style={styles.weatherMain}>
                <Ionicons name="partly-sunny" size={64} color="#F59E0B" />
                <Text style={styles.tempText}>{Math.round(weather.current.temperature)}°C</Text>
              </View>
              
              <View style={styles.weatherDetails}>
                <View style={styles.weatherDetailItem}>
                  <Ionicons name="leaf-outline" size={20} color="#64748B" />
                  <Text style={styles.weatherDetailText}>{weather.current.windspeed} km/h Wind</Text>
                </View>
                <View style={styles.weatherDetailItem}>
                  <Ionicons name="compass-outline" size={20} color="#64748B" />
                  <Text style={styles.weatherDetailText}>{weather.current.winddirection}° Dir</Text>
                </View>
              </View>
            </View>

            {isWindy && (
              <View style={styles.warningCard}>
                <Ionicons name="warning" size={24} color="#B45309" />
                <Text style={styles.warningText}>High wind advisory. Please be cautious and consider adding a Captain Service if you are not experienced.</Text>
              </View>
            )}

            {!isWindy && (
              <View style={styles.goodCard}>
                <Ionicons name="checkmark-circle" size={24} color="#047857" />
                <Text style={styles.goodText}>Conditions are great for boating!</Text>
              </View>
            )}

          </View>
        ) : (
          <View style={styles.content}>
            <Text style={styles.errorText}>Weather forecast unavailable.</Text>
          </View>
        )}
      </ScrollView>

      <View style={styles.footer}>
        <TouchableOpacity style={styles.primaryButton} onPress={handleNext}>
          <Text style={styles.primaryButtonText}>Next: Sign Waiver</Text>
          <Ionicons name="arrow-forward" size={20} color="#FFFFFF" />
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
  description: { fontSize: 16, color: '#475569', marginBottom: 20 },
  loadingContainer: { padding: 40, alignItems: 'center' },
  loadingText: { marginTop: 12, fontSize: 15, color: '#64748B' },
  weatherCard: { backgroundColor: '#FFFFFF', borderRadius: 20, padding: 24, alignItems: 'center', borderWidth: 1, borderColor: '#E2E8F0', shadowColor: '#0F172A', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.05, shadowRadius: 16, marginBottom: 24 },
  weatherMain: { alignItems: 'center', marginBottom: 24 },
  tempText: { fontSize: 48, fontWeight: '800', color: '#0F172A', marginTop: 8 },
  weatherDetails: { flexDirection: 'row', gap: 24 },
  weatherDetailItem: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  weatherDetailText: { fontSize: 15, color: '#475569', fontWeight: '500' },
  warningCard: { flexDirection: 'row', backgroundColor: '#FEF3C7', padding: 16, borderRadius: 12, borderWidth: 1, borderColor: '#FDE68A', gap: 12 },
  warningText: { flex: 1, fontSize: 14, color: '#92400E', lineHeight: 20 },
  goodCard: { flexDirection: 'row', backgroundColor: '#ECFDF5', padding: 16, borderRadius: 12, borderWidth: 1, borderColor: '#A7F3D0', gap: 12, alignItems: 'center' },
  goodText: { flex: 1, fontSize: 15, color: '#065F46', fontWeight: '500' },
  errorText: { fontSize: 16, color: '#EF4444', textAlign: 'center' },
  footer: { backgroundColor: '#FFFFFF', padding: 20, paddingBottom: 36, borderTopWidth: 1, borderColor: '#E2E8F0' },
  primaryButton: { backgroundColor: '#0F172A', paddingVertical: 16, borderRadius: 12, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 8 },
  primaryButtonText: { color: '#FFFFFF', fontSize: 16, fontWeight: '700' },
});
